/**
 * Deep coverage tests for stage5-execute.ts EOA retry branches.
 *
 * Covers uncovered branches in the retry loop:
 * - TRANSIENT ChainError with retry exhaustion (retryCount >= 3)
 * - STALE ChainError with retry and exhaustion (retryCount >= 1)
 * - Unknown ChainError category (default case)
 * - ApiDirectResult path (action provider off-chain results)
 * - Simulation failure with full notification/audit/eventBus branches
 * - CONTRACT_DEPLOY audit log with bytecodeHash
 * - sessionId null -> 'system' fallback in audit logs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { ChainError, WAIaaSError } from '@waiaas/core';

// Mock sleep to skip delays in retry tests
vi.mock('../pipeline/sleep.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

let sqlite: DatabaseType;
let db: BetterSQLite3Database<typeof schema>;

beforeEach(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  db = conn.db;
  pushSchema(sqlite);
});

afterEach(() => {
  try { sqlite.close(); } catch { /* ok */ }
});

function insertWalletAndTx(walletId: string, txId: string, txType = 'TRANSFER') {
  db.insert(schema.wallets).values({
    id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
    publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: 'eoa',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();

  db.insert(schema.transactions).values({
    id: txId, walletId, type: txType, status: 'PENDING',
    toAddress: '0x' + 'cd'.repeat(20), amount: '1000000000000000000',
    chain: 'ethereum', network: 'ethereum-mainnet',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();
}

function makeCtx(walletId: string, txId: string, adapterOverrides = {}) {
  return {
    db,
    sqlite,
    adapter: {
      buildTransaction: vi.fn().mockResolvedValue({ to: '0x5678', value: '1000000000000000000' }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
      signTransaction: vi.fn().mockResolvedValue('0xsigned'),
      submitTransaction: vi.fn().mockResolvedValue({ txHash: '0x' + 'ab'.repeat(32) }),
      estimateGas: vi.fn().mockResolvedValue(21000n),
      buildContractCall: vi.fn().mockResolvedValue({ to: '', data: '0x6000', value: 0n }),
      ...adapterOverrides,
    },
    keyStore: {
      decryptPrivateKey: vi.fn().mockResolvedValue(new Uint8Array(32)),
      releaseKey: vi.fn(),
    },
    masterPassword: 'test-password',
    walletId,
    wallet: {
      publicKey: '0x' + 'ab'.repeat(20),
      chain: 'ethereum',
      environment: 'mainnet',
      accountType: 'eoa',
      aaProvider: null,
    },
    resolvedNetwork: 'ethereum-mainnet',
    resolvedRpcUrl: 'http://localhost:8545',
    request: {
      type: 'TRANSFER' as const,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000000000000000',
    },
    txId,
    sessionId: 'test-session',
    metricsCounter: {
      increment: vi.fn(),
      recordLatency: vi.fn(),
    },
    notificationService: {
      notify: vi.fn().mockResolvedValue(undefined),
    },
    eventBus: {
      emit: vi.fn(),
    },
    contractNameRegistry: undefined,
    amountUsd: undefined,
    settingsService: undefined,
    forexRateService: undefined,
  };
}

describe('stage5Execute EOA retry branches', () => {
  it('TRANSIENT error retries up to 3 times then fails', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const transientError = new ChainError('RPC_TIMEOUT', 'ethereum', { message: 'Request timed out' });
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(transientError),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow('max retries exceeded');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toContain('max retries exceeded');

    // Should have been called 4 times (initial + 3 retries)
    expect(ctx.adapter.submitTransaction).toHaveBeenCalledTimes(4);

    // Notification
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );

    // EventBus
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
      error: expect.stringContaining('max retries exceeded'),
    }));
  });

  it('TRANSIENT error succeeds on second attempt', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const transientError = new ChainError('RPC_TIMEOUT', 'ethereum', { message: 'Request timed out' });
    let callCount = 0;
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw transientError;
        return Promise.resolve({ txHash: '0x' + 'ab'.repeat(32) });
      }),
    });

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('STALE error retries once then fails', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const staleError = new ChainError('BLOCKHASH_EXPIRED', 'ethereum', { message: 'Blockhash expired' });
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(staleError),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow('stale retry exhausted');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toContain('stale retry exhausted');

    // Should have been called 2 times (initial + 1 retry)
    expect(ctx.adapter.submitTransaction).toHaveBeenCalledTimes(2);

    // Notification
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );

    // EventBus
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
      error: expect.stringContaining('stale retry exhausted'),
    }));
  });

  it('STALE error succeeds on second attempt (rebuild)', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const staleError = new ChainError('BLOCKHASH_EXPIRED', 'ethereum', { message: 'Blockhash expired' });
    let callCount = 0;
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw staleError;
        return Promise.resolve({ txHash: '0x' + 'ab'.repeat(32) });
      }),
    });

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('unknown ChainError category treated as permanent', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const unknownError = (() => { const e = new ChainError('INSUFFICIENT_FUNDS', 'ethereum', { message: 'Something unknown' }); (e as any).category = 'UNKNOWN'; return e; })();
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(unknownError),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('PERMANENT error with full audit/notification/eventBus', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const permError = new ChainError('INSUFFICIENT_FUNDS', 'ethereum', { message: 'Not enough ETH' });
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(permError),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow();

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('simulation failure with full audit/notification/eventBus', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, {
      simulateTransaction: vi.fn().mockResolvedValue({ success: false, error: 'Insufficient funds' }),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    // Audit log
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_FAILED');
    expect(auditRows.length).toBeGreaterThanOrEqual(1);

    // Metrics
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('rpc.errors', expect.anything());
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.failed', expect.anything());

    // Notification
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId, error: 'Insufficient funds' }), expect.anything(),
    );

    // EventBus
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
      error: 'Insufficient funds',
    }));
  });

  it('simulation failure without error message uses default', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, {
      simulateTransaction: vi.fn().mockResolvedValue({ success: false }),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.error).toContain('Simulation failed');
  });

  it('sessionId null falls back to system in audit logs', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    ctx.sessionId = undefined as any;

    await stage5Execute(ctx as any);

    // Check audit log actor is 'system'
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_SUBMITTED') as any[];
    if (auditRows.length > 0) {
      expect(auditRows[0].actor).toBe('system');
    }
  });

  it('CONTRACT_DEPLOY type includes bytecodeHash in audit log', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();

    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
      publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: 'eoa',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    db.insert(schema.transactions).values({
      id: txId, walletId, type: 'CONTRACT_DEPLOY', status: 'PENDING',
      toAddress: null, amount: '0',
      chain: 'ethereum', network: 'ethereum-mainnet',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    const ctx = makeCtx(walletId, txId);
    ctx.request = {
      type: 'CONTRACT_DEPLOY' as any,
      bytecode: '0x60806040',
    } as any;

    await stage5Execute(ctx as any);

    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_SUBMITTED') as any[];
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    const details = JSON.parse(auditRows[0].details);
    expect(details.bytecodeHash).toBeTruthy();
    expect(details.type).toBe('CONTRACT_DEPLOY');
  });
});

describe('stage5Execute ApiDirectResult path', () => {
  it('skips on-chain execution for ApiDirectResult', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).actionResult = {
      provider: 'test-provider',
      action: 'test-action',
      externalId: 'ext-123',
      status: 'SUCCESS',
      data: { foo: 'bar' },
    };

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
    const meta = JSON.parse(tx!.metadata!);
    expect(meta.apiDirect).toBe(true);
    expect(meta.provider).toBe('test-provider');
    expect(meta.action).toBe('test-action');
    expect(meta.externalId).toBe('ext-123');

    // Should NOT call adapter methods
    expect(ctx.adapter.buildTransaction).not.toHaveBeenCalled();
    expect(ctx.adapter.submitTransaction).not.toHaveBeenCalled();

    // Audit log
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_CONFIRMED') as any[];
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    const details = JSON.parse(auditRows[0].details);
    expect(details.apiDirect).toBe(true);

    // Notification
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_CONFIRMED', walletId, expect.objectContaining({
        txId,
        provider: 'test-provider',
        externalId: 'ext-123',
      }), expect.anything(),
    );

    // EventBus
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:completed', expect.objectContaining({
      txId,
      txHash: 'ext-123',
      type: 'CONTRACT_CALL',
    }));

    // Metrics
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.completed', expect.anything());
  });

  it('ApiDirectResult with metadata field', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).actionResult = {
      provider: 'hyperliquid',
      action: 'place_order',
      externalId: 'order-456',
      status: 'FILLED',
      data: { price: '1234.56' },
      metadata: { market: 'ETH-PERP', side: 'long' },
    };

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    const meta = JSON.parse(tx!.metadata!);
    expect(meta.market).toBe('ETH-PERP');
    expect(meta.side).toBe('long');
  });

  it('ApiDirectResult without sqlite skips audit log', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).sqlite = undefined;
    (ctx as any).actionResult = {
      provider: 'test',
      action: 'test',
      externalId: 'ext-1',
      status: 'OK',
      data: {},
    };

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });
});

describe('stage5Execute TX_SUBMITTED audit branches', () => {
  it('no sqlite skips audit log on submit success', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).sqlite = undefined;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('PERMANENT error without sqlite skips audit log', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const permError = new ChainError('INSUFFICIENT_FUNDS', 'ethereum', { message: 'Not enough' });
    const ctx = makeCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(permError),
    });
    (ctx as any).sqlite = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow();

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('no metricsCounter: operations proceed without error', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).metricsCounter = undefined;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('no notificationService: operations proceed without error', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).notificationService = undefined;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('no eventBus: operations proceed without error', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    (ctx as any).eventBus = undefined;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });
});
