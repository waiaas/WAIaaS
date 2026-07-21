/**
 * Deep branch coverage tests for stage5-execute.ts.
 *
 * Tests the main stage5Execute function with mocked adapter/context
 * to exercise retry logic, error handling, and notification branches.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { ChainError, WAIaaSError } from '@waiaas/core';

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

function insertWalletAndTx(walletId: string, txId: string) {
  db.insert(schema.wallets).values({
    id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
    publicKey: '0x1234', status: 'ACTIVE', accountType: 'eoa',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();

  db.insert(schema.transactions).values({
    id: txId, walletId, type: 'TRANSFER', status: 'PENDING',
    toAddress: '0x5678', amount: '1000000000000000000',
    chain: 'ethereum', network: 'ethereum-mainnet',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();
}

function makeMinimalCtx(walletId: string, txId: string, adapterOverrides = {}) {
  return {
    db,
    sqlite,
    adapter: {
      buildTransaction: vi.fn().mockResolvedValue({ to: '0x5678', value: '1000000000000000000' }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
      signTransaction: vi.fn().mockResolvedValue('0xsigned'),
      submitTransaction: vi.fn().mockResolvedValue({ txHash: '0x' + 'ab'.repeat(32) }),
      estimateGas: vi.fn().mockResolvedValue(21000n),
      ...adapterOverrides,
    },
    keyStore: {
      decryptPrivateKey: vi.fn().mockResolvedValue(new Uint8Array(32)),
      releaseKey: vi.fn(),
    },
    masterPassword: 'test-password',
    walletId,
    wallet: {
      publicKey: '0x1234',
      chain: 'ethereum',
      environment: 'mainnet',
      accountType: 'eoa',
      aaProvider: null,
    },
    resolvedNetwork: 'ethereum-mainnet',
    resolvedRpcUrl: 'http://localhost:8545',
    request: {
      type: 'TRANSFER' as const,
      to: '0x5678',
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
  };
}

describe('stage5Execute EOA path', () => {
  it('successful transaction: build -> simulate -> sign -> submit', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeMinimalCtx(walletId, txId);
    await stage5Execute(ctx as any);

    // Should update tx to SUBMITTED
    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
    expect(tx!.txHash).toBeTruthy();

    // Should emit events
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('wallet:activity', expect.objectContaining({
      activity: 'TX_SUBMITTED',
    }));
  });

  it('simulation failure: marks tx as FAILED', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeMinimalCtx(walletId, txId, {
      simulateTransaction: vi.fn().mockResolvedValue({ success: false, error: 'Insufficient funds' }),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toContain('Insufficient funds');

    // Should notify TX_FAILED
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );

    // Should emit transaction:failed
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
    }));
  });

  it('PERMANENT ChainError: marks FAILED', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeMinimalCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(
        new ChainError('INSUFFICIENT_FUNDS', 'Not enough ETH', 'PERMANENT'),
      ),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow();

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('CONTRACT_DEPLOY type uses buildContractCall', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();

    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
      publicKey: '0x1234', status: 'ACTIVE', accountType: 'eoa',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    db.insert(schema.transactions).values({
      id: txId, walletId, type: 'CONTRACT_DEPLOY', status: 'PENDING',
      toAddress: null, amount: '0',
      chain: 'ethereum', network: 'ethereum-mainnet',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    const ctx = makeMinimalCtx(walletId, txId, {
      buildContractCall: vi.fn().mockResolvedValue({ to: '', data: '0x60806040', value: 0n }),
    });
    ctx.request = {
      type: 'CONTRACT_DEPLOY' as any,
      bytecode: '0x60806040',
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('SUBMITTED');
  });

  it('Non-ChainError rethrown as-is', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeMinimalCtx(walletId, txId, {
      submitTransaction: vi.fn().mockRejectedValue(
        new WAIaaSError('ACTION_VALIDATION_FAILED', { message: 'Custom error' }),
      ),
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);
  });
});
