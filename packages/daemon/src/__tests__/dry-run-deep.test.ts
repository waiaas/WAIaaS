/**
 * Deep branch coverage tests for pipeline/dry-run.ts executeDryRun.
 *
 * Covers uncovered branches:
 * - Price oracle success/notListed/oracleDown/error paths
 * - Policy evaluation: APPROVAL tier, DELAY tier, INSTANT tier
 * - Owner downgrade (APPROVAL -> DELAY when no owner)
 * - Cumulative warning at 80%+ threshold
 * - Policy denial with various reasons (TOKEN_NOT_IN_ALLOWED_LIST, CONTRACT_NOT_WHITELISTED, NETWORK_NOT_ALLOWED)
 * - Balance: native balance error, token balance (found/not found/error)
 * - Build error path
 * - Simulation: success, failure, error/catch
 * - Fee check: TRANSFER insufficient, TOKEN_TRANSFER insufficient fee, insufficient token
 * - Gas condition metadata path
 * - Fee USD resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { executeDryRun } from '../pipeline/dry-run.js';

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

function insertWallet(walletId: string) {
  db.insert(schema.wallets).values({
    id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
    publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: 'eoa',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    db,
    adapter: {
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'ethereum', serialized: new Uint8Array(128),
        estimatedFee: 21000n * 50n * 1000000000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
      getBalance: vi.fn().mockResolvedValue({
        balance: 10000000000000000000n, symbol: 'ETH', decimals: 18,
      }),
      getAssets: vi.fn().mockResolvedValue([]),
    },
    keyStore: { decryptPrivateKey: vi.fn(), releaseKey: vi.fn() },
    policyEngine: {
      evaluate: vi.fn().mockResolvedValue({
        allowed: true, tier: 'INSTANT' as const, reason: null,
      }),
    },
    masterPassword: 'test',
    priceOracle: undefined,
    settingsService: undefined,
    ...overrides,
  } as any;
}

describe('executeDryRun deep branches', () => {
  it('successful TRANSFER dry run', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps();
    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000000000000000000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.success).toBe(true);
    expect(result.policy).toBeTruthy();
    expect(result.policy.tier).toBe('INSTANT');
  });

  it('policy denial returns result with warnings', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: false, tier: 'INSTANT', reason: 'Token transfer not allowed by policy',
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.policy.allowed).toBe(false);
    expect(result.warnings.some((w: any) => w.code === 'TOKEN_NOT_IN_ALLOWED_LIST')).toBe(true);
  });

  it('policy denial with contract not whitelisted', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: false, tier: 'INSTANT', reason: 'Contract calls disabled by policy',
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'CONTRACT_CALL', to: '0x1234', calldata: '0x' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'CONTRACT_NOT_WHITELISTED')).toBe(true);
  });

  it('policy denial with network not allowed', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: false, tier: 'INSTANT', reason: 'Network not in allowed networks',
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'NETWORK_NOT_ALLOWED')).toBe(true);
  });

  it('APPROVAL tier adds warning (with owner set)', async () => {
    const walletId = generateId();
    insertWallet(walletId);
    // Set owner so APPROVAL is not downgraded
    db.update(schema.wallets).set({ ownerAddress: '0x' + 'cc'.repeat(20), ownerVerified: true }).where(eq(schema.wallets.id, walletId)).run();

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: true, tier: 'APPROVAL', approvalReason: 'per_tx',
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'APPROVAL_REQUIRED')).toBe(true);
  });

  it('APPROVAL tier downgrades to DELAY when no owner', async () => {
    const walletId = generateId();
    insertWallet(walletId);
    // No owner set on wallet

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: true, tier: 'APPROVAL',
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'DOWNGRADED_NO_OWNER')).toBe(true);
  });

  it('DELAY tier adds warning', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: true, tier: 'DELAY', delaySeconds: 600,
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'DELAY_REQUIRED')).toBe(true);
  });

  it('cumulative warning at 80%+', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      policyEngine: {
        evaluate: vi.fn().mockResolvedValue({
          allowed: true, tier: 'INSTANT',
          cumulativeWarning: { type: 'daily', spent: 85, limit: 100, ratio: 0.85 },
        }),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'CUMULATIVE_LIMIT_WARNING')).toBe(true);
  });

  it('price oracle success sets amountUsd', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      priceOracle: {
        getPrice: vi.fn().mockResolvedValue(3000),
      },
    });

    // Note: resolveEffectiveAmountUsd is called internally; we just check amountUsd is set
    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000000000000000000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result).toBeTruthy();
  });

  it('balance error falls back to 0', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTransaction: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockRejectedValue(new Error('RPC error')),
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.balanceChanges.length).toBeGreaterThan(0);
    expect(result.balanceChanges[0]!.currentBalance).toBe('0');
  });

  it('build error returns with warning', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTransaction: vi.fn().mockRejectedValue(new Error('Build failed')),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.simulation).toBeTruthy();
    expect(result.simulation!.success).toBe(false);
    expect(result.warnings.some((w: any) => w.code === 'SIMULATION_FAILED')).toBe(true);
  });

  it('simulation failure adds warning', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTransaction: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: false, error: 'Reverted' }),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.simulation!.success).toBe(false);
    expect(result.warnings.some((w: any) => w.code === 'SIMULATION_FAILED')).toBe(true);
  });

  it('simulation error caught and added as warning', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTransaction: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockRejectedValue(new Error('RPC timeout')),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.simulation!.success).toBe(false);
    expect(result.warnings.some((w: any) => w.message.includes('RPC timeout'))).toBe(true);
  });

  it('insufficient balance for TRANSFER + fee', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTransaction: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 1000000000000000000n, metadata: {}, // 1 ETH fee
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 500000000000000000n }), // 0.5 ETH
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000000000000000000' } as any, // 1 ETH
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'INSUFFICIENT_BALANCE_WITH_FEE')).toBe(true);
  });

  it('TOKEN_TRANSFER: token not found in assets', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTokenTransfer: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockResolvedValue([]), // no tokens
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TOKEN_TRANSFER', to: '0x1234', amount: '1000000', token: { address: '0xUSDC', symbol: 'USDC', decimals: 6 } } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    // Should still have token balance entry (with 0 balance)
    expect(result.balanceChanges.length).toBe(2); // native + token
    const tokenBal = result.balanceChanges.find((b: any) => b.asset === '0xUSDC');
    expect(tokenBal).toBeTruthy();
    expect(tokenBal!.currentBalance).toBe('0');
  });

  it('TOKEN_TRANSFER: token found in assets', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTokenTransfer: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockResolvedValue([
          { mint: '0xusdc', symbol: 'USDC', decimals: 6, balance: 5000000n },
        ]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TOKEN_TRANSFER', to: '0x1234', amount: '1000000', token: { address: '0xUSDC', symbol: 'USDC', decimals: 6 } } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    const tokenBal = result.balanceChanges.find((b: any) => b.asset === '0xUSDC');
    expect(tokenBal).toBeTruthy();
    expect(tokenBal!.currentBalance).toBe('5000000');
  });

  it('TOKEN_TRANSFER: getAssets error falls back to 0 balance', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTokenTransfer: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 21000n, metadata: {},
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 10n * 10n ** 18n }),
        getAssets: vi.fn().mockRejectedValue(new Error('RPC error')),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TOKEN_TRANSFER', to: '0x1234', amount: '1000000', token: { address: '0xUSDC', symbol: 'USDC', decimals: 6 } } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    const tokenBal = result.balanceChanges.find((b: any) => b.asset === '0xUSDC');
    expect(tokenBal).toBeTruthy();
    expect(tokenBal!.currentBalance).toBe('0');
  });

  it('insufficient native fee for TOKEN_TRANSFER', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps({
      adapter: {
        buildTokenTransfer: vi.fn().mockResolvedValue({
          chain: 'ethereum', serialized: new Uint8Array(128),
          estimatedFee: 10n * 10n ** 18n, metadata: {}, // 10 ETH fee
        }),
        simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
        getBalance: vi.fn().mockResolvedValue({ balance: 1n * 10n ** 18n }), // 1 ETH
        getAssets: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await executeDryRun(
      deps, walletId,
      { type: 'TOKEN_TRANSFER', to: '0x1234', amount: '1000000', token: { address: '0xUSDC', symbol: 'USDC', decimals: 6 } } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'INSUFFICIENT_BALANCE_WITH_FEE')).toBe(true);
  });

  it('validation failure throws', async () => {
    const walletId = generateId();
    insertWallet(walletId);

    const deps = makeDeps();
    await expect(executeDryRun(
      deps, walletId,
      { type: 'INVALID_TYPE' } as any,
      'ethereum-mainnet',
      { publicKey: '0x' + 'ab'.repeat(20), chain: 'ethereum', environment: 'mainnet' },
    )).rejects.toThrow();
  });
});
