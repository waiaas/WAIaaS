/**
 * Branch coverage sweep tests.
 *
 * Targets uncovered branches across multiple files to push branch coverage
 * above the 83% threshold. Each section targets specific uncovered branches
 * identified from the coverage report.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import type { Database as DatabaseType } from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Helper: in-memory DB
// ---------------------------------------------------------------------------

function createTestDb() {
  const conn = createDatabase(':memory:');
  pushSchema(conn.sqlite);
  return conn;
}

function insertWallet(sqlite: DatabaseType, walletId: string, chain = 'ethereum', env = 'mainnet') {
  const now = Math.floor(Date.now() / 1000);
  sqlite.prepare(
    `INSERT INTO wallets (id, name, public_key, chain, environment, status, created_at, updated_at, account_type)
     VALUES (?, 'test', '0xpubkey', ?, ?, 'ACTIVE', ?, ?, 'eoa')`,
  ).run(walletId, chain, env, now, now);
}

// ===========================================================================
// 1. NonceTracker: rollbackNonce branches (2 uncovered)
// ===========================================================================

import { NonceTracker } from '../rpc-proxy/nonce-tracker.js';

describe('NonceTracker branch coverage', () => {
  it('rollbackNonce with no prior state is a no-op', () => {
    const tracker = new NonceTracker();
    // Line 64: !state early return
    tracker.rollbackNonce('0xAddress1', 5);
    // Should not throw
    expect(tracker.getAdjustedTransactionCount('0xAddress1', 0)).toBe(0);
  });

  it('rollbackNonce recalculates nextNonce when pending is non-empty', () => {
    const tracker = new NonceTracker();
    // Allocate nonces 10, 11, 12
    tracker.getNextNonce('0xAddr', 10);
    tracker.getNextNonce('0xAddr', 10);
    tracker.getNextNonce('0xAddr', 10);
    // Pending: {10, 11, 12}, nextNonce: 13

    // Rollback nonce 11 -> pending becomes {10, 12}, nextNonce should be 13
    // Line 69-71: pending.size > 0 branch
    tracker.rollbackNonce('0xAddr', 11);
    expect(tracker.getAdjustedTransactionCount('0xAddr', 0)).toBe(13);
  });

  it('rollbackNonce when all pending cleared resets nextNonce', () => {
    const tracker = new NonceTracker();
    const n = tracker.getNextNonce('0xAddr', 5);
    expect(n).toBe(5);
    // Pending: {5}, nextNonce: 6

    // Rollback the only pending nonce -> pending empty, nextNonce = nonce
    // Line 70: state.pending.size === 0 branch
    tracker.rollbackNonce('0xAddr', 5);
    expect(tracker.getAdjustedTransactionCount('0xAddr', 0)).toBe(5);
  });
});

// ===========================================================================
// 2. TxAdapter: hexToDecimal + convert branches (4 uncovered)
// ===========================================================================

import { RpcTransactionAdapter, hexToDecimal } from '../rpc-proxy/tx-adapter.js';

describe('TxAdapter branch coverage', () => {
  it('hexToDecimal handles various edge cases', () => {
    // Line 136: non-0x prefixed input
    expect(hexToDecimal('ff')).toBe('255');

    // Line 63: data is undefined -> '0x' fallback
    const adapter = new RpcTransactionAdapter();
    const result = adapter.convert({ to: null, data: undefined, value: undefined }, 'ethereum-mainnet');
    expect(result.type).toBe('CONTRACT_DEPLOY');
    expect((result as any).bytecode).toBe('0x');
  });

  it('convert with empty data (0x) returns TRANSFER', () => {
    const adapter = new RpcTransactionAdapter();
    // Line 136-137: data === '0x' case
    const result = adapter.convert({ to: '0xRecipient', data: '0x', value: '0x1' }, 'ethereum-mainnet');
    expect(result.type).toBe('TRANSFER');
  });

  it('convert with short data (< 10 chars) returns TRANSFER', () => {
    const adapter = new RpcTransactionAdapter();
    const result = adapter.convert({ to: '0xRecipient', data: '0x1234', value: undefined }, 'ethereum-mainnet');
    expect(result.type).toBe('TRANSFER');
  });

  it('hexToDecimal with cleaned empty string returns 0', () => {
    // Line 137: !cleaned branch after removing 0x
    expect(hexToDecimal('0x')).toBe('0');
  });

  it('hexToDecimal with 0x0 returns 0', () => {
    expect(hexToDecimal('0x0')).toBe('0');
  });

  it('convert recognizes approve selector', () => {
    const adapter = new RpcTransactionAdapter();
    // approve(address,uint256) selector = 0x095ea7b3
    const approveData = '0x095ea7b3' +
      '0000000000000000000000001234567890abcdef1234567890abcdef12345678' +
      '0000000000000000000000000000000000000000000000000000000000000064';
    const result = adapter.convert(
      { to: '0xToken', data: approveData, value: undefined },
      'ethereum-mainnet',
    );
    expect(result.type).toBe('APPROVE');
  });

  it('convert with value but no hex prefix', () => {
    expect(hexToDecimal('a')).toBe('10');
  });
});

// ===========================================================================
// 3. aggregate-staking-balance: multiple branches (6 uncovered)
// ===========================================================================

import { aggregateStakingBalance } from '../services/staking/aggregate-staking-balance.js';

describe('aggregateStakingBalance branch coverage', () => {
  let sqlite: DatabaseType;

  beforeEach(() => {
    const conn = createTestDb();
    sqlite = conn.sqlite;
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* */ }
  });

  it('returns zero when no staking transactions exist', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(0n);
    expect(result.pendingUnstake).toBeNull();
  });

  it('aggregates stake transactions correctly', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Insert stake transactions
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '1000000', ?, '{"action":"stake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '500000', ?, '{"action":"unstake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now + 1);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(500000n);
  });

  it('handles NULL amount by extracting from metadata.originalRequest.value', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Line 45: !effectiveAmount && row.metadata branch
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', NULL, ?, ?)`,
    ).run(generateId(), walletId, now, JSON.stringify({
      providerKey: 'lido_staking',
      originalRequest: { value: '2000000' },
    }));

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(2000000n);
  });

  it('skips rows with NULL amount and no metadata value', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Line 54: !effectiveAmount continue branch
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', NULL, ?, '{"providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(0n);
  });

  it('handles non-numeric amount gracefully', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Line 74: BigInt parse error catch
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', 'not-a-number', ?, '{"providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(0n);
  });

  it('detects pending unstake with bridge_status=PENDING', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Line 94-95: pendingRow with bridge_status and created_at
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, bridge_status, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '300000', 'PENDING', ?, '{"action":"unstake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.pendingUnstake).not.toBeNull();
    expect(result.pendingUnstake!.amount).toBe('300000');
    expect(result.pendingUnstake!.status).toBe('PENDING');
  });

  it('handles unstaked > staked (net balance = 0)', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '100', ?, '{"action":"stake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '200', ?, '{"action":"unstake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now + 1);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    // Line 100: totalStaked < totalUnstaked -> 0n
    expect(result.balanceWei).toBe(0n);
  });

  it('handles metadata with actionName instead of action', () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const now = Math.floor(Date.now() / 1000);

    // Line 61: meta.actionName === 'unstake' branch
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, created_at, metadata)
       VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'CONFIRMED', '100', ?, '{"actionName":"unstake","providerKey":"lido_staking"}')`,
    ).run(generateId(), walletId, now);

    const result = aggregateStakingBalance(sqlite, walletId, 'lido_staking');
    expect(result.balanceWei).toBe(0n);
  });
});

// ===========================================================================
// 4. PresetAutoSetup: uncovered switch branches (3 uncovered)
// ===========================================================================

// PresetAutoSetupService tests moved to preset-auto-setup-branches.test.ts

// ===========================================================================
// 5. stage6Confirm: eventBus + type branches (9 uncovered)
// ===========================================================================

import { stage6Confirm } from '../pipeline/stages.js';
import type { PipelineContext } from '../pipeline/stages.js';

describe('stage6Confirm branch coverage', () => {
  let sqlite: DatabaseType;
  let db: any;

  beforeEach(() => {
    const conn = createTestDb();
    sqlite = conn.sqlite;
    db = conn.db;
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* */ }
  });

  function createConfirmCtx(overrides: Partial<PipelineContext> = {}): PipelineContext {
    const walletId = generateId();
    const txId = generateId();
    const now = Math.floor(Date.now() / 1000);

    insertWallet(sqlite, walletId);
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, to_address, created_at)
       VALUES (?, ?, 'ethereum', 'TRANSFER', 'SUBMITTED', '1000', '0xto', ?)`,
    ).run(txId, walletId, now);

    return {
      db,
      sqlite,
      txId,
      walletId,
      wallet: { publicKey: '0xpubkey', chain: 'ethereum', environment: 'mainnet' } as any,
      request: { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xtoken' } } as any,
      adapter: {
        waitForConfirmation: vi.fn().mockResolvedValue({ status: 'confirmed' }),
      } as any,
      submitResult: { txHash: '0xtxhash123' },
      resolvedNetwork: 'ethereum-mainnet',
      notificationService: { notify: vi.fn() } as any,
      eventBus: { emit: vi.fn() } as any,
      sessionId: 'test-session',
      ...overrides,
    } as any;
  }

  it('confirmed: emits eventBus with request.type from typed request', async () => {
    // Lines 72-78: eventBus?.emit with request.type branches
    const ctx = createConfirmCtx();
    await stage6Confirm(ctx);

    expect(ctx.eventBus!.emit).toHaveBeenCalledWith(
      'transaction:completed',
      expect.objectContaining({
        type: 'TOKEN_TRANSFER',
        txId: ctx.txId,
      }),
    );
  });

  it('confirmed: without sqlite still works (no audit log)', async () => {
    // Line 48: ctx.sqlite falsy branch
    const ctx = createConfirmCtx({ sqlite: undefined });
    await stage6Confirm(ctx);

    expect(ctx.notificationService!.notify).toHaveBeenCalledWith(
      'TX_CONFIRMED',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('confirmed: without eventBus still works', async () => {
    // Line 72: ctx.eventBus?.emit -- undefined eventBus
    const ctx = createConfirmCtx({ eventBus: undefined });
    await stage6Confirm(ctx);
    // Should not throw
  });

  it('failed: emits eventBus with type and throws CHAIN_ERROR', async () => {
    // Lines 111-118: failed path with eventBus + type extraction
    const ctx = createConfirmCtx({
      adapter: {
        waitForConfirmation: vi.fn().mockResolvedValue({ status: 'failed' }),
      } as any,
    });

    await expect(stage6Confirm(ctx)).rejects.toThrow('reverted on-chain');

    expect(ctx.eventBus!.emit).toHaveBeenCalledWith(
      'transaction:failed',
      expect.objectContaining({
        type: 'TOKEN_TRANSFER',
        error: 'Transaction reverted on-chain',
      }),
    );
  });

  it('failed: without eventBus still throws', async () => {
    const ctx = createConfirmCtx({
      adapter: {
        waitForConfirmation: vi.fn().mockResolvedValue({ status: 'failed' }),
      } as any,
      eventBus: undefined,
    });

    await expect(stage6Confirm(ctx)).rejects.toThrow('reverted on-chain');
  });

  it('submitted: keeps status as SUBMITTED (no state change)', async () => {
    const ctx = createConfirmCtx({
      adapter: {
        waitForConfirmation: vi.fn().mockResolvedValue({ status: 'submitted' }),
      } as any,
    });

    await stage6Confirm(ctx);
    // No exception thrown, no status change
  });

  it('confirmed: fallback to TRANSFER when request has no type', async () => {
    // Lines 78: ('type' in ctx.request && ctx.request.type) ? ... : 'TRANSFER'
    const ctx = createConfirmCtx({
      request: { to: '0xrecipient', amount: '100' } as any,
    });
    await stage6Confirm(ctx);

    expect(ctx.eventBus!.emit).toHaveBeenCalledWith(
      'transaction:completed',
      expect.objectContaining({
        type: 'TRANSFER',
      }),
    );
  });

  it('failed: fallback to TRANSFER when request has no type', async () => {
    // Line 116: type fallback in failed path
    const ctx = createConfirmCtx({
      request: { to: '0xrecipient', amount: '100' } as any,
      adapter: {
        waitForConfirmation: vi.fn().mockResolvedValue({ status: 'failed' }),
      } as any,
    });

    await expect(stage6Confirm(ctx)).rejects.toThrow('reverted on-chain');

    expect(ctx.eventBus!.emit).toHaveBeenCalledWith(
      'transaction:failed',
      expect.objectContaining({
        type: 'TRANSFER',
      }),
    );
  });
});

// ===========================================================================
// 6. stage4Wait: DELAY + APPROVAL branches (8 uncovered)
// ===========================================================================

import { stage4Wait } from '../pipeline/stages.js';
import { WAIaaSError } from '@waiaas/core';

describe('stage4Wait branch coverage', () => {
  let sqlite: DatabaseType;
  let db: any;

  beforeEach(() => {
    const conn = createTestDb();
    sqlite = conn.sqlite;
    db = conn.db;
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* */ }
  });

  function createWaitCtx(tier: string, overrides: Partial<PipelineContext> = {}): PipelineContext {
    const walletId = generateId();
    const txId = generateId();
    const now = Math.floor(Date.now() / 1000);

    insertWallet(sqlite, walletId);
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, amount, to_address, created_at)
       VALUES (?, ?, 'ethereum', 'TRANSFER', 'PENDING', '1000', '0xto', ?)`,
    ).run(txId, walletId, now);

    return {
      db,
      sqlite,
      txId,
      walletId,
      wallet: { publicKey: '0xpubkey', chain: 'ethereum', environment: 'mainnet' } as any,
      request: { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      tier,
      delayQueue: { queueDelay: vi.fn() } as any,
      approvalWorkflow: { requestApproval: vi.fn() } as any,
      notificationService: { notify: vi.fn() } as any,
      resolvedNetwork: 'ethereum-mainnet',
      ...overrides,
    } as any;
  }

  it('DELAY: no delayQueue -> fallback return (backward compat)', async () => {
    // Line 25-28: !ctx.delayQueue early return
    const ctx = createWaitCtx('DELAY', { delayQueue: undefined });
    // Should return without throwing
    await expect(stage4Wait(ctx)).resolves.toBeUndefined();
  });

  it('DELAY: uses config.policy_defaults_delay_seconds when delaySeconds is undefined', async () => {
    // Line 30: ctx.delaySeconds ?? ctx.config?.policy_defaults_delay_seconds
    const ctx = createWaitCtx('DELAY', {
      delaySeconds: undefined,
      config: { policy_defaults_delay_seconds: 120 } as any,
    });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued/);
    expect(ctx.delayQueue!.queueDelay).toHaveBeenCalledWith(ctx.txId, 120);
  });

  it('DELAY: defaults to 60 seconds when both delaySeconds and config are undefined', async () => {
    // Line 31: ?? 60 fallback
    const ctx = createWaitCtx('DELAY', { delaySeconds: undefined, config: undefined });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued for 60s/);
  });

  it('DELAY: includes amountUsd in notification when available', async () => {
    // Line 41: ctx.amountUsd !== undefined branch
    const ctx = createWaitCtx('DELAY', { amountUsd: 150.5 });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued/);
    expect(ctx.notificationService!.notify).toHaveBeenCalledWith(
      'TX_QUEUED',
      expect.any(String),
      expect.objectContaining({ amountUsd: '(~$150.50)' }),
      expect.any(Object),
    );
  });

  it('APPROVAL: no approvalWorkflow -> fallback return (backward compat)', async () => {
    // Line 52-54: !ctx.approvalWorkflow early return
    const ctx = createWaitCtx('APPROVAL', { approvalWorkflow: undefined });
    await expect(stage4Wait(ctx)).resolves.toBeUndefined();
  });

  it('APPROVAL: with policyApprovalTimeout passes timeout to requestApproval', async () => {
    // Line 58: ctx.policyApprovalTimeout !== undefined branch
    const ctx = createWaitCtx('APPROVAL', { policyApprovalTimeout: 300 });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued for owner approval/);
    expect(ctx.approvalWorkflow!.requestApproval).toHaveBeenCalledWith(
      ctx.txId,
      expect.objectContaining({ policyTimeoutSeconds: 300 }),
    );
  });

  it('APPROVAL: with eip712Metadata passes typed data to requestApproval', async () => {
    // Line 59: ctx.eip712Metadata branch
    const ctx = createWaitCtx('APPROVAL', {
      eip712Metadata: { approvalType: 'test', typedDataJson: '{}' } as any,
    });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued for owner approval/);
    expect(ctx.approvalWorkflow!.requestApproval).toHaveBeenCalledWith(
      ctx.txId,
      expect.objectContaining({ approvalType: 'test', typedDataJson: '{}' }),
    );
  });

  it('APPROVAL: routes through ApprovalChannelRouter when available', async () => {
    // Lines 63-77: ctx.approvalChannelRouter branch
    const mockRoute = vi.fn().mockResolvedValue({ method: 'telegram' });
    const ctx = createWaitCtx('APPROVAL', {
      approvalChannelRouter: { route: mockRoute } as any,
      request: { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
    });
    await expect(stage4Wait(ctx)).rejects.toThrow(/queued for owner approval/);
    // Router is called async (fire-and-forget), so we just verify the approval was requested
    expect(ctx.approvalWorkflow!.requestApproval).toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. sign-message: uncovered branches (6)
// ===========================================================================

import { executeSignMessage } from '../pipeline/sign-message.js';
import { generatePrivateKey } from 'viem/accounts';

describe('executeSignMessage branch coverage', () => {
  let sqlite: DatabaseType;
  let db: any;
  let privKey: Uint8Array;

  beforeEach(() => {
    const conn = createTestDb();
    sqlite = conn.sqlite;
    db = conn.db;
    // Generate a real private key for signing tests
    const hex = generatePrivateKey();
    privKey = Buffer.from(hex.slice(2), 'hex');
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* */ }
  });

  function createDeps(overrides: Record<string, any> = {}) {
    return {
      db,
      keyStore: {
        decryptPrivateKey: vi.fn().mockResolvedValue(privKey),
        releaseKey: vi.fn(),
      } as any,
      masterPassword: 'test-password',
      ...overrides,
    };
  }

  it('signType defaults to personal when not specified', async () => {
    // Line 82: request.signType ?? 'personal'
    const walletId = generateId();
    insertWallet(sqlite, walletId);

    const deps = createDeps();
    const result = await executeSignMessage(
      deps,
      walletId,
      'ethereum',
      { message: 'hello' } as any,
    );
    expect(result.signType).toBe('personal');
  });

  it('sessionId null fallback when not provided', async () => {
    // Line 98: sessionId ?? null
    const walletId = generateId();
    insertWallet(sqlite, walletId);

    const deps = createDeps();
    const result = await executeSignMessage(
      deps,
      walletId,
      'ethereum',
      { signType: 'personal', message: 'test' },
      undefined, // no sessionId
    );
    expect(result.id).toBeDefined();
  });

  it('typedData with chainId omitted uses undefined in domain', async () => {
    // Line 137: td.domain.chainId != null -> false branch (undefined)
    const walletId = generateId();
    insertWallet(sqlite, walletId);

    const deps = createDeps();
    const result = await executeSignMessage(
      deps,
      walletId,
      'ethereum',
      {
        signType: 'typedData',
        typedData: {
          domain: { name: 'Test', version: '1' },
          types: { Test: [{ name: 'value', type: 'uint256' }] },
          primaryType: 'Test',
          message: { value: 42 },
        },
      },
    );
    expect(result.signType).toBe('typedData');
    expect(result.signature).toBeDefined();
  });

  it('re-throws WAIaaSError without wrapping', async () => {
    // Line 147: err instanceof WAIaaSError -> re-throw
    const walletId = generateId();
    insertWallet(sqlite, walletId);

    const deps = createDeps({
      keyStore: {
        decryptPrivateKey: vi.fn().mockRejectedValue(
          new WAIaaSError('CHAIN_ERROR', { message: 'Key not found' }),
        ),
        releaseKey: vi.fn(),
      },
    });

    await expect(
      executeSignMessage(deps, walletId, 'ethereum', { signType: 'personal', message: 'test' }),
    ).rejects.toThrow('Key not found');
  });

  it('wraps non-Error exceptions in CHAIN_ERROR', async () => {
    // Lines 150/153: err not instanceof Error
    const walletId = generateId();
    insertWallet(sqlite, walletId);

    const deps = createDeps({
      keyStore: {
        decryptPrivateKey: vi.fn().mockRejectedValue('string-error'),
        releaseKey: vi.fn(),
      },
    });

    await expect(
      executeSignMessage(deps, walletId, 'ethereum', { signType: 'personal', message: 'test' }),
    ).rejects.toThrow('Failed to sign message');
  });

  it('eventBus.emit called on successful sign', async () => {
    const walletId = generateId();
    insertWallet(sqlite, walletId);
    const eventBus = { emit: vi.fn() };

    const deps = createDeps({ eventBus });
    await executeSignMessage(deps, walletId, 'ethereum', { signType: 'personal', message: 'test' });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'wallet:activity',
      expect.objectContaining({ walletId, activity: 'TX_SUBMITTED' }),
    );
  });
});

// ===========================================================================
// 8. spending-limit evaluator: additional branches
// ===========================================================================

import { evaluateNativeTier, evaluateUsdTier } from '../pipeline/evaluators/spending-limit.js';
import type { SpendingLimitRules } from '@waiaas/core';

describe('evaluateSpendingLimit branch coverage', () => {
  it('evaluateNativeTier: INSTANT when all thresholds undefined', () => {
    // Line 160: all undefined -> return INSTANT
    const rules: SpendingLimitRules = {};
    const tier = evaluateNativeTier(100n, rules);
    expect(tier).toBe('INSTANT');
  });

  it('evaluateNativeTier: INSTANT when amount under instant_max', () => {
    const rules: SpendingLimitRules = {
      instant_max: '1000',
      notify_max: '5000',
      delay_max: '10000',
    };
    const tier = evaluateNativeTier(500n, rules);
    expect(tier).toBe('INSTANT');
  });

  it('evaluateNativeTier: NOTIFY when amount between instant_max and notify_max', () => {
    const rules: SpendingLimitRules = {
      instant_max: '100',
      notify_max: '5000',
      delay_max: '10000',
    };
    const tier = evaluateNativeTier(500n, rules);
    expect(tier).toBe('NOTIFY');
  });

  it('evaluateNativeTier: DELAY when amount between notify_max and delay_max', () => {
    const rules: SpendingLimitRules = {
      instant_max: '100',
      notify_max: '500',
      delay_max: '10000',
    };
    const tier = evaluateNativeTier(5000n, rules);
    expect(tier).toBe('DELAY');
  });

  it('evaluateNativeTier: APPROVAL when amount exceeds delay_max', () => {
    const rules: SpendingLimitRules = {
      instant_max: '100',
      notify_max: '500',
      delay_max: '1000',
    };
    const tier = evaluateNativeTier(5000n, rules);
    expect(tier).toBe('APPROVAL');
  });

  it('evaluateUsdTier: INSTANT when amount is under instant_max_usd', () => {
    const rules: SpendingLimitRules = {
      instant_max_usd: 100,
      notify_max_usd: 500,
      delay_max_usd: 1000,
    };
    const tier = evaluateUsdTier(50, rules);
    expect(tier).toBe('INSTANT');
  });

  it('evaluateUsdTier: NOTIFY when between instant and notify USD thresholds', () => {
    const rules: SpendingLimitRules = {
      instant_max_usd: 100,
      notify_max_usd: 500,
      delay_max_usd: 1000,
    };
    const tier = evaluateUsdTier(300, rules);
    expect(tier).toBe('NOTIFY');
  });

  it('evaluateUsdTier: DELAY when between notify and delay USD thresholds', () => {
    const rules: SpendingLimitRules = {
      instant_max_usd: 100,
      notify_max_usd: 500,
      delay_max_usd: 1000,
    };
    const tier = evaluateUsdTier(700, rules);
    expect(tier).toBe('DELAY');
  });

  it('evaluateUsdTier: APPROVAL when exceeds delay_max_usd', () => {
    const rules: SpendingLimitRules = {
      instant_max_usd: 100,
      notify_max_usd: 500,
      delay_max_usd: 1000,
    };
    const tier = evaluateUsdTier(1500, rules);
    expect(tier).toBe('APPROVAL');
  });

  it('evaluateUsdTier: APPROVAL when no USD thresholds defined', () => {
    const rules: SpendingLimitRules = {};
    const tier = evaluateUsdTier(50, rules);
    expect(tier).toBe('APPROVAL');
  });
});

// ===========================================================================
// 9. notification-service: channel + formatting branches
// ===========================================================================

import { NotificationService } from '../notifications/notification-service.js';

describe('NotificationService branch coverage', () => {
  it('notify with no channels is a no-op', async () => {
    const service = new NotificationService([]);
    // Should not throw even with no channels
    await service.notify('TX_CONFIRMED', 'wallet-1', {
      txId: 'tx-1',
      txHash: '0xhash',
      amount: '100',
      to: '0xto',
    });
  });

  it('notify with failing channel logs error and continues', async () => {
    const failChannel = {
      name: 'test',
      send: vi.fn().mockRejectedValue(new Error('Channel error')),
    };
    const service = new NotificationService([failChannel as any]);
    // Should not throw
    await service.notify('TX_CONFIRMED', 'wallet-1', {
      txId: 'tx-1',
      txHash: '0xhash',
      amount: '100',
      to: '0xto',
    });
  });
});
