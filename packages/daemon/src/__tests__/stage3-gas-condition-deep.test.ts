/**
 * Deep branch coverage tests for stage3-policy.ts stageGasCondition function.
 *
 * Covers uncovered branches:
 * - gasCondition disabled via settings (gas_condition.enabled = 'false')
 * - gasCondition settings key not registered (catch block)
 * - max_pending_count from settings, valid/invalid/missing
 * - max_pending_count limit exceeded
 * - timeout from request, from settings, clamped by max_timeout
 * - timeout settings not registered (catch)
 * - max_timeout from settings, valid/invalid
 * - rpcUrl from settings, not found (catch)
 * - No settingsService at all (gasCondition enabled by default)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { stageGasCondition } from '../pipeline/stage3-policy.js';

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
    publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: 'eoa',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();

  db.insert(schema.transactions).values({
    id: txId, walletId, type: 'TRANSFER', status: 'PENDING',
    toAddress: '0x' + 'cd'.repeat(20), amount: '1000000000000000000',
    chain: 'ethereum', network: 'ethereum-mainnet',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();
}

function makeCtx(walletId: string, txId: string, gasCondition?: object, settingsOverrides?: Record<string, string>) {
  const settingsMap = new Map<string, string>();
  if (settingsOverrides) {
    for (const [k, v] of Object.entries(settingsOverrides)) {
      settingsMap.set(k, v);
    }
  }

  const settingsService = settingsOverrides !== undefined ? {
    get: vi.fn().mockImplementation((key: string) => {
      if (settingsMap.has(key)) return settingsMap.get(key)!;
      throw new Error(`Key not found: ${key}`);
    }),
  } : undefined;

  return {
    db,
    sqlite,
    walletId,
    wallet: { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    resolvedNetwork: 'ethereum-mainnet',
    request: {
      type: 'TRANSFER' as const,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000000000000000',
      ...(gasCondition ? { gasCondition } : {}),
    },
    txId,
    sessionId: 'test-session',
    notificationService: { notify: vi.fn().mockResolvedValue(undefined) },
    settingsService,
  };
}

describe('stageGasCondition deep branches', () => {
  it('no-op when no gasCondition in request', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId);
    // Should not throw
    await stageGasCondition(ctx as any);
  });

  it('halts pipeline with gasCondition present and enabled', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('GAS_WAITING');
  });

  it('proceeds normally when gasCondition disabled', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'false',
    });

    // Should not throw (gas condition disabled)
    await stageGasCondition(ctx as any);
  });

  it('enabled by default when settings key not registered', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    // settingsService throws for all keys (simulating unregistered)
    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {});

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');
  });

  it('enabled by default when no settingsService', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' });
    // settingsService is undefined

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');
  });

  it('respects max_pending_count limit', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    // Create some GAS_WAITING transactions
    for (let i = 0; i < 3; i++) {
      const gId = generateId();
      db.insert(schema.transactions).values({
        id: gId, walletId, type: 'TRANSFER', status: 'GAS_WAITING',
        toAddress: '0x' + 'cd'.repeat(20), amount: '100',
        chain: 'ethereum', network: 'ethereum-mainnet',
        createdAt: new Date(), updatedAt: new Date(),
      }).run();
    }

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
      'gas_condition.max_pending_count': '3',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('pending limit reached');
  });

  it('uses default max_pending_count (100) when setting invalid', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
      'gas_condition.max_pending_count': 'invalid',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');
  });

  it('uses request timeout when provided', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000', timeout: 600 }, {
      'gas_condition.enabled': 'true',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('timeout: 600s');
  });

  it('uses settings default timeout when request has none', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
      'gas_condition.default_timeout_sec': '120',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('timeout: 120s');
  });

  it('uses hardcoded 3600 when settings timeout invalid', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
      'gas_condition.default_timeout_sec': '10', // too low (< 60)
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('timeout: 3600s');
  });

  it('clamps timeout to max_timeout_sec', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000', timeout: 100000 }, {
      'gas_condition.enabled': 'true',
      'gas_condition.max_timeout_sec': '3600',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('timeout: 3600s');
  });

  it('uses default max_timeout_sec (86400) when setting invalid', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000', timeout: 100000 }, {
      'gas_condition.enabled': 'true',
      'gas_condition.max_timeout_sec': 'invalid',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('timeout: 86400s');
  });

  it('resolves rpcUrl from settings', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
      'rpc.evm_ethereum_mainnet': 'https://eth.example.com',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    const meta = JSON.parse(tx!.bridgeMetadata!);
    expect(meta.rpcUrl).toBe('https://eth.example.com');
  });

  it('uses empty rpcUrl when settings key not found', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    const meta = JSON.parse(tx!.bridgeMetadata!);
    expect(meta.rpcUrl).toBe('');
  });

  it('sends notification with gasCondition details', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000', maxPriorityFee: '2000000000' }, {
      'gas_condition.enabled': 'true',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');

    expect(ctx.notificationService!.notify).toHaveBeenCalledWith(
      'TX_GAS_WAITING', walletId, expect.objectContaining({
        txId,
        maxGasPrice: '30000000000',
        maxPriorityFee: '2000000000',
      }), expect.anything(),
    );
  });

  it('handles gasCondition without maxPriorityFee', async () => {
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeCtx(walletId, txId, { maxGasPrice: '30000000000' }, {
      'gas_condition.enabled': 'true',
    });

    await expect(stageGasCondition(ctx as any)).rejects.toThrow('waiting for gas condition');

    expect(ctx.notificationService!.notify).toHaveBeenCalledWith(
      'TX_GAS_WAITING', walletId, expect.objectContaining({
        maxPriorityFee: '',
      }), expect.anything(),
    );
  });
});
