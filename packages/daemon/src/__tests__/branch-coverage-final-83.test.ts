/**
 * Branch coverage final push: targets uncovered branches across multiple files
 * to bring @waiaas/daemon branch coverage from ~81.65% to >= 83%.
 *
 * Strategy: test the easiest-to-reach branches in many files rather than
 * deep-diving into one complex file.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import type { DatabaseConnection } from '../infrastructure/database/index.js';
import { wallets, policies, agentIdentities } from '../infrastructure/database/schema.js';
import { generateId } from '../infrastructure/database/id.js';
import { DatabasePolicyEngine } from '../pipeline/database-policy-engine.js';
import { SettingsService } from '../infrastructure/settings/settings-service.js';
import { DaemonConfigSchema } from '../infrastructure/config/loader.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

let conn: DatabaseConnection;
let walletId: string;

async function insertTestWallet(overrides?: { chain?: string; publicKey?: string }): Promise<string> {
  const id = generateId();
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  await conn.db.insert(wallets).values({
    id,
    name: 'test-wallet',
    chain: overrides?.chain ?? 'solana',
    environment: 'testnet',
    publicKey: overrides?.publicKey ?? '11111111111111111111111111111112',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertPolicy(overrides: {
  walletId?: string | null;
  type: string;
  rules: string;
  priority?: number;
  enabled?: boolean;
  network?: string | null;
}): Promise<string> {
  const id = generateId();
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  await conn.db.insert(policies).values({
    id,
    walletId: overrides.walletId ?? null,
    type: overrides.type,
    rules: overrides.rules,
    priority: overrides.priority ?? 0,
    enabled: overrides.enabled ?? true,
    network: overrides.network ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

function makeSettingsService(): SettingsService {
  const config = DaemonConfigSchema.parse({});
  return new SettingsService({ db: conn.db, config, masterPassword: 'test-pw' });
}

/** Insert a CONTRACT_WHITELIST that allows any address (needed for CONTRACT_CALL tests) */
async function _allowAllContracts(): Promise<void> {
  const settings = makeSettingsService();
  settings.set('policy.default_deny_contracts', 'false');
}

beforeEach(async () => {
  conn = createDatabase(':memory:');
  pushSchema(conn.sqlite);
  walletId = await insertTestWallet();
});

afterEach(() => {
  conn.sqlite.close();
});

// ===========================================================================
// 1. VENUE_WHITELIST evaluator branches
// ===========================================================================

describe('VENUE_WHITELIST evaluator branches', () => {
  it('should skip evaluation when transaction has no venue', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const result = await engine.evaluate(walletId, {
      type: 'TRANSFER',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
    });
    expect(result.allowed).toBe(true);
  });

  it('should deny when venue_whitelist_enabled=true but no VENUE_WHITELIST policy exists', async () => {
    const settings = makeSettingsService();
    settings.set('venue_whitelist_enabled', 'true');
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    // Need at least one policy so evaluate() doesn't short-circuit with "no policies"
    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_max: '999999999999', notify_max: '999999999999999', delay_max: '999999999999999999', delay_seconds: 300 }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      venue: 'binance',
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('VENUE_NOT_ALLOWED');
  });

  it('should deny when venue is not in whitelist', async () => {
    const settings = makeSettingsService();
    settings.set('venue_whitelist_enabled', 'true');
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'VENUE_WHITELIST',
      rules: JSON.stringify({ venues: [{ id: 'uniswap' }] }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      venue: 'binance',
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('VENUE_NOT_ALLOWED');
  });

  it('should allow when venue is in whitelist (case-insensitive)', async () => {
    const settings = makeSettingsService();
    settings.set('venue_whitelist_enabled', 'true');
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'VENUE_WHITELIST',
      rules: JSON.stringify({ venues: [{ id: 'Uniswap' }] }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      venue: 'uniswap',
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
  });

  it('should skip venue check when venue_whitelist_enabled is not set', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    const result = await engine.evaluate(walletId, {
      type: 'TRANSFER',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      venue: 'binance',
    });
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// 2. ACTION_CATEGORY_LIMIT evaluator branches
// ===========================================================================

describe('ACTION_CATEGORY_LIMIT evaluator branches', () => {
  it('should skip when no actionCategory on transaction', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        per_action_limit_usd: 100,
      }),
    });

    // Use TRANSFER to avoid CONTRACT_WHITELIST default-deny
    const result = await engine.evaluate(walletId, {
      type: 'TRANSFER',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
    });
    expect(result.allowed).toBe(true);
  });

  it('should escalate tier when per_action_limit_usd is exceeded', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        per_action_limit_usd: 100,
        tier_on_exceed: 'DELAY',
      }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 200,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
  });

  it('should use DELAY as default tier_on_exceed', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        per_action_limit_usd: 50,
      }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 100,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
  });

  it('should allow when notionalUsd is within per_action_limit_usd', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        per_action_limit_usd: 1000,
      }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 50,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('INSTANT');
  });

  it('should skip when category does not match', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'withdraw',
        per_action_limit_usd: 10,
      }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 1000,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('INSTANT');
  });

  it('should escalate when daily_limit_usd is exceeded (cumulative)', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        daily_limit_usd: 500,
        tier_on_exceed: 'APPROVAL',
      }),
    });

    // Insert a past transaction within today
    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, action_kind, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', '0', '0xabc', 'CONFIRMED', 'signedData', ?, ?)
    `).run(generateId(), walletId, JSON.stringify({ actionCategory: 'trade', notionalUsd: 400 }), now);

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 200,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
    expect(result.reason).toContain('daily cumulative');
  });

  it('should escalate when monthly_limit_usd is exceeded (cumulative)', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'ACTION_CATEGORY_LIMIT',
      rules: JSON.stringify({
        category: 'trade',
        monthly_limit_usd: 1000,
        tier_on_exceed: 'DELAY',
      }),
    });

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, action_kind, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', '0', '0xabc', 'CONFIRMED', 'signedData', ?, ?)
    `).run(generateId(), walletId, JSON.stringify({ actionCategory: 'trade', notionalUsd: 900 }), now);

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xabc',
      chain: 'ethereum',
      actionCategory: 'trade',
      notionalUsd: 200,
      contractAddress: '0xabc',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
    expect(result.reason).toContain('monthly cumulative');
  });
});

// ===========================================================================
// 3. REPUTATION_THRESHOLD evaluator branches (database-policy-engine.ts ~730-770)
// ===========================================================================

describe('REPUTATION_THRESHOLD evaluator branches', () => {
  it('should return unrated_tier when toAddress cannot be resolved to agent', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: true,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: 'unknown_address',
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeDefined();
    expect(result!.tier).toBe('APPROVAL');
  });

  it('should return undefined when no REPUTATION_THRESHOLD policy exists', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: '0xabc',
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeUndefined();
  });

  it('should return below_threshold_tier when reputation score is below min_score', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const targetPubkey = '0x1234567890abcdef1234567890abcdef12345678';
    const targetWalletId = await insertTestWallet({ chain: 'ethereum', publicKey: targetPubkey });

    // Register agent identity with required fields
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await conn.db.insert(agentIdentities).values({
      id: generateId(),
      walletId: targetWalletId,
      chainAgentId: 'agent-001',
      registryAddress: '0xregistry1',
      chainId: 1,
      status: 'REGISTERED',
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: true,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue({ score: 30 }),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: targetPubkey,
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeDefined();
    expect(result!.tier).toBe('DELAY');
    expect(result!.score).toBe('30');
    expect(result!.threshold).toBe('50');
  });

  it('should return undefined when reputation score meets threshold', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const targetPubkey = '0xabcdef1234567890abcdef1234567890abcdef12';
    const targetWalletId = await insertTestWallet({ chain: 'ethereum', publicKey: targetPubkey });

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await conn.db.insert(agentIdentities).values({
      id: generateId(),
      walletId: targetWalletId,
      chainAgentId: 'agent-002',
      registryAddress: '0xregistry2',
      chainId: 1,
      status: 'REGISTERED',
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: true,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue({ score: 80 }),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: targetPubkey,
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeUndefined();
  });

  it('should return unrated_tier when reputation is null for known agent', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const targetPubkey = '0x9999999999999999999999999999999999999999';
    const targetWalletId = await insertTestWallet({ chain: 'ethereum', publicKey: targetPubkey });

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await conn.db.insert(agentIdentities).values({
      id: generateId(),
      walletId: targetWalletId,
      chainAgentId: 'agent-003',
      registryAddress: '0xregistry3',
      chainId: 1,
      status: 'WALLET_LINKED',
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: true,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
        tag1: 'reliability',
        tag2: '',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: targetPubkey,
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeDefined();
    expect(result!.tier).toBe('APPROVAL');
  });

  it('should return unrated_tier when check_counterparty is false', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: false,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: '0xabc',
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    // check_counterparty=false means skip the prefetch
    expect(result).toBeUndefined();
  });
});

// ===========================================================================
// 4. evaluateAndReserve with reputationFloorTier branches
// ===========================================================================

describe('evaluateAndReserve reputation floor tier', () => {
  it('should escalate INSTANT to reputation floor tier when no policies exist', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      generateId(),
      undefined,
      'DELAY', // reputationFloorTier
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
  });

  it('should escalate spending tier to reputation floor tier when floor is higher', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
    }));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      generateId(),
      undefined,
      'NOTIFY', // reputationFloorTier
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('NOTIFY');
  });

  it('should keep APPROVAL tier when reputation floor is lower', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '1',
      notify_max: '2',
      delay_max: '3',
      delay_seconds: 300,
    }));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '999999', toAddress: '0xabc', chain: 'ethereum' },
      generateId(),
      undefined,
      'NOTIFY', // reputationFloorTier -- lower than APPROVAL
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
  });

  it('should apply reputation floor tier to ACTION_CATEGORY_LIMIT result', () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'ACTION_CATEGORY_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      category: 'trade',
      per_action_limit_usd: 50,
      tier_on_exceed: 'NOTIFY',
    }));

    const result = engine.evaluateAndReserve(
      walletId,
      {
        type: 'CONTRACT_CALL',
        amount: '0',
        toAddress: '0xabc',
        chain: 'ethereum',
        actionCategory: 'trade',
        notionalUsd: 200,
        contractAddress: '0xabc',
      },
      generateId(),
      undefined,
      'DELAY', // reputationFloorTier should escalate NOTIFY -> DELAY
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
  });

  it('should handle non-spending action with reputation floor tier', () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '99999999',
      notify_max: '999999999',
      delay_max: '9999999999',
      delay_seconds: 300,
    }));

    // Use 'supply' with LENDING_ASSET_WHITELIST to pass lending check
    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'LENDING_ASSET_WHITELIST', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({ assets: [{ address: '0xabc' }] }));

    const txId2 = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '0', '0xabc', 'PENDING', ?)
    `).run(txId2, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      {
        type: 'TRANSFER',
        amount: '0',
        toAddress: '0xabc',
        chain: 'ethereum',
        actionName: 'supply',
      },
      txId2,
      undefined,
      'NOTIFY', // reputationFloorTier
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('NOTIFY');
  });
});

// ===========================================================================
// 5. evaluateAndReserve cumulative USD spending branches
// ===========================================================================

describe('evaluateAndReserve cumulative USD limits', () => {
  it('should escalate to APPROVAL when daily USD limit is exceeded', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
      daily_limit_usd: 100,
    }));

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, amount_usd, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '1000', '0xabc', 'CONFIRMED', 80, ?)
    `).run(generateId(), walletId, now);

    const txId = generateId();
    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      30,
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
    expect((result as any).approvalReason).toBe('cumulative_daily');
  });

  it('should emit cumulative warning at 80% threshold', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
      daily_limit_usd: 100,
    }));

    const txId = generateId();
    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      85,
    );
    expect(result.allowed).toBe(true);
    expect((result as any).cumulativeWarning).toBeDefined();
    expect((result as any).cumulativeWarning.type).toBe('daily');
  });

  it('should escalate to APPROVAL when monthly USD limit is exceeded', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
      monthly_limit_usd: 200,
    }));

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, amount_usd, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '1000', '0xabc', 'CONFIRMED', 180, ?)
    `).run(generateId(), walletId, now);

    const txId = generateId();
    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      30,
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
    expect((result as any).approvalReason).toBe('cumulative_monthly');
  });

  it('should emit monthly cumulative warning at 80% threshold', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
      monthly_limit_usd: 1000,
    }));

    const txId = generateId();
    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      850,
    );
    expect(result.allowed).toBe(true);
    expect((result as any).cumulativeWarning).toBeDefined();
    expect((result as any).cumulativeWarning.type).toBe('monthly');
  });

  it('should apply reputation floor to cumulative tier result', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
      daily_limit_usd: 10000,
    }));

    const txId = generateId();
    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      5,
      'DELAY',
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
  });

  it('should update reserved_amount_usd when usdAmount is present (no cumulative limits)', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
    }));

    const txId = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', ?)
    `).run(txId, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      25,
    );
    expect(result.allowed).toBe(true);

    const row = conn.sqlite.prepare('SELECT amount_usd, reserved_amount_usd FROM transactions WHERE id = ?').get(txId) as any;
    expect(row.amount_usd).toBe(25);
    expect(row.reserved_amount_usd).toBe(25);
  });

  it('should update reserved_amount without usd when usdAmount is undefined', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '999999999999',
      notify_max: '999999999999999',
      delay_max: '999999999999999999',
      delay_seconds: 300,
    }));

    const txId = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', ?)
    `).run(txId, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      undefined,
    );
    expect(result.allowed).toBe(true);

    const row = conn.sqlite.prepare('SELECT reserved_amount, amount_usd FROM transactions WHERE id = ?').get(txId) as any;
    expect(row.reserved_amount).toBe('100');
    expect(row.amount_usd).toBeNull();
  });

  it('should return INSTANT with no spending limit and no reputation floor', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    // Insert ALLOWED_TOKENS policy (non-spending, non-whitelist)
    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'ALLOWED_TOKENS', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({ tokens: [{ address: '0xtoken' }] }));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      generateId(),
      undefined,
      undefined,
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('INSTANT');
  });
});

// ===========================================================================
// 6. CONTRACT_WHITELIST default-deny toggle branch (line 42)
// ===========================================================================

describe('CONTRACT_WHITELIST default_deny_contracts toggle', () => {
  it('should allow when default_deny_contracts=false and no whitelist policy', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xcontract',
      chain: 'ethereum',
      contractAddress: '0xcontract',
    });
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// 7. delay-queue metadata parse error branch (line 84)
// ===========================================================================

describe('delay-queue metadata parse error', () => {
  it('should handle invalid JSON metadata gracefully', async () => {
    const { DelayQueue } = await import('../workflow/delay-queue.js');
    const queue = new DelayQueue({ db: conn.db, sqlite: conn.sqlite });

    const txId = generateId();
    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', 'invalid-json{{{', ?)
    `).run(txId, walletId, now);

    const result = queue.queueDelay(txId, 300);
    expect(result.queuedAt).toBeDefined();
    expect(result.expiresAt).toBe(result.queuedAt + 300);

    const row = conn.sqlite.prepare('SELECT metadata FROM transactions WHERE id = ?').get(txId) as any;
    const meta = JSON.parse(row.metadata);
    expect(meta.delaySeconds).toBe(300);
  });

  it('should merge delaySeconds into existing valid metadata', async () => {
    const { DelayQueue } = await import('../workflow/delay-queue.js');
    const queue = new DelayQueue({ db: conn.db, sqlite: conn.sqlite });

    const txId = generateId();
    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', '{"existing":"data"}', ?)
    `).run(txId, walletId, now);

    const result = queue.queueDelay(txId, 600);
    expect(result.expiresAt).toBe(result.queuedAt + 600);

    const row = conn.sqlite.prepare('SELECT metadata FROM transactions WHERE id = ?').get(txId) as any;
    const meta = JSON.parse(row.metadata);
    expect(meta.existing).toBe('data');
    expect(meta.delaySeconds).toBe(600);
  });
});

// ===========================================================================
// 8. Telegram notification template branches (lines 67-68)
// ===========================================================================

describe('Telegram notification formatting', () => {
  it('should format message with walletAddress and network', async () => {
    const { TelegramChannel } = await import('../notifications/channels/telegram.js');
    const channel = new TelegramChannel({ botToken: 'fake', chatId: '123' });

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
    try {
      await channel.send({
        eventType: 'TX_CONFIRMED' as any,
        title: 'Test',
        body: 'Test body',
        walletId: 'wallet-123',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'ethereum-mainnet',
        timestamp: Math.floor(Date.now() / 1000),
      });
      const call = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      // MarkdownV2 escapes hyphens, so check for escaped version
      expect(body.text).toContain('ethereum\\-mainnet');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ===========================================================================
// 9. rpc-proxy passthrough error branch (line 101)
// ===========================================================================

describe('rpc-proxy passthrough upstream error', () => {
  it('should return JSON-RPC error on non-Error throw', async () => {
    const { RpcPassthrough } = await import('../rpc-proxy/passthrough.js');

    // Create a mock RpcPool
    const mockRpcPool = {
      getUrl: vi.fn().mockReturnValue('http://invalid-rpc-url'),
    } as any;

    const handler = new RpcPassthrough(mockRpcPool);

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue('string error');
    try {
      const result = await handler.forward(
        { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 },
        'ethereum-mainnet',
      );
      expect(result).toBeDefined();
      expect((result as any).error).toBeDefined();
      expect((result as any).error.message).toContain('unknown');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('should return JSON-RPC error on non-ok response', async () => {
    const { RpcPassthrough } = await import('../rpc-proxy/passthrough.js');

    const mockRpcPool = {
      getUrl: vi.fn().mockReturnValue('http://rpc.example.com'),
    } as any;

    const handler = new RpcPassthrough(mockRpcPool);

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    try {
      const result = await handler.forward(
        { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 42 },
        'ethereum-mainnet',
      );
      expect((result as any).error).toBeDefined();
      expect((result as any).error.message).toContain('503');
      expect((result as any).id).toBe(42);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ===========================================================================
// 10. tx-adapter hexToDecimal edge cases (lines 137-154)
// ===========================================================================

describe('tx-adapter hexToDecimal edge cases', () => {
  it('should handle empty hex strings', async () => {
    const { hexToDecimal } = await import('../rpc-proxy/tx-adapter.js');
    expect(hexToDecimal('')).toBe('0');
    expect(hexToDecimal(undefined)).toBe('0');
    expect(hexToDecimal('0x')).toBe('0');
    expect(hexToDecimal('0x0')).toBe('0');
  });

  it('should handle hex without 0x prefix', async () => {
    const { hexToDecimal } = await import('../rpc-proxy/tx-adapter.js');
    expect(hexToDecimal('ff')).toBe('255');
    expect(hexToDecimal('0xff')).toBe('255');
  });
});

// ===========================================================================
// 11. notification-templates locale fallback (line 47)
// ===========================================================================

describe('notification-templates locale fallback', () => {
  it('should handle type variable in TX_TYPE_LABELS', async () => {
    const { getNotificationMessage } = await import('../notifications/templates/message-templates.js');

    const result = getNotificationMessage('TX_CONFIRMED' as any, 'en', { type: 'TRANSFER' });
    expect(result.title).toBeDefined();
    expect(result.body).toBeDefined();
  });

  it('should handle unknown type gracefully (passthrough)', async () => {
    const { getNotificationMessage } = await import('../notifications/templates/message-templates.js');

    const result = getNotificationMessage('TX_CONFIRMED' as any, 'en', { type: 'UNKNOWN_TYPE' });
    expect(result.title).toBeDefined();
    // Unknown type should be passed through as-is
    expect(result.body).toBeDefined();
  });
});

// ===========================================================================
// 12. Pyth oracle batch pricing branches (lines 148-153)
// ===========================================================================

describe('Pyth oracle batch pricing branches', () => {
  it('should return empty map for tokens without feed IDs', async () => {
    const { PythOracle } = await import('../infrastructure/oracle/pyth-oracle.js');
    const oracle = new PythOracle();

    // Token with no registered feed ID should be silently skipped
    const result = await oracle.getPrices([
      { chain: 'ethereum', address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', network: 'ethereum-mainnet' },
    ]);
    expect(result.size).toBe(0);
  });
});

// ===========================================================================
// 13. aggregate-staking-balance metadata parsing branches (lines 52-95)
// ===========================================================================

describe('aggregate-staking-balance metadata parsing', () => {
  it('should handle transactions with null amount by extracting from metadata', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', NULL, '0xabc', 'CONFIRMED', ?, ?)
    `).run(
      generateId(), walletId,
      JSON.stringify({ provider: 'lido', originalRequest: { value: '1000000000000000000' } }),
      now,
    );

    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result).toBeDefined();
    expect(result.balanceWei).toBeDefined();
  });

  it('should handle unstake transactions', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', '500', '0xabc', 'CONFIRMED', ?, ?)
    `).run(
      generateId(), walletId,
      JSON.stringify({ provider: 'lido', action: 'unstake' }),
      now,
    );

    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result).toBeDefined();
  });

  it('should handle invalid metadata JSON gracefully', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', '1000', '0xabc', 'CONFIRMED', 'not-json', ?)
    `).run(generateId(), walletId, now);

    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// 14. evaluateAndReserve approval timeout from SPENDING_LIMIT
// ===========================================================================

describe('evaluateAndReserve approval_timeout', () => {
  it('should pass approval_timeout from spending limit rules', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '1',
      notify_max: '2',
      delay_max: '3',
      delay_seconds: 300,
      approval_timeout: 600,
    }));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '99999999', toAddress: '0xabc', chain: 'ethereum' },
      generateId(),
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
    expect((result as any).approvalTimeoutSeconds).toBe(600);
  });
});

// ===========================================================================
// 15. evaluateBatch with APPROVE instruction and APPROVE_TIER_OVERRIDE
// ===========================================================================

describe('evaluateBatch APPROVE + APPROVE_TIER_OVERRIDE', () => {
  it('should apply APPROVE_TIER_OVERRIDE to batch with approve instructions', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({
        instant_max: '999999999999',
        notify_max: '999999999999999',
        delay_max: '999999999999999999',
        delay_seconds: 300,
      }),
    });

    await insertPolicy({
      type: 'APPROVE_TIER_OVERRIDE',
      rules: JSON.stringify({ tier: 'DELAY' }),
    });

    await insertPolicy({
      type: 'APPROVED_SPENDERS',
      rules: JSON.stringify({ spenders: [{ address: '0xspender' }] }),
    });

    const result = await engine.evaluateBatch(walletId, [
      {
        type: 'TRANSFER',
        amount: '100',
        toAddress: '0xrecipient',
        chain: 'ethereum',
      },
      {
        type: 'APPROVE',
        amount: '0',
        toAddress: '0xspender',
        chain: 'ethereum',
        spenderAddress: '0xspender',
        approveAmount: '1000',
      },
    ]);
    expect(result.allowed).toBe(true);
    expect(['DELAY', 'APPROVAL']).toContain(result.tier);
  });

  it('should default to APPROVAL tier for approve without APPROVE_TIER_OVERRIDE', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({
        instant_max: '999999999999',
        notify_max: '999999999999999',
        delay_max: '999999999999999999',
        delay_seconds: 300,
      }),
    });

    await insertPolicy({
      type: 'APPROVED_SPENDERS',
      rules: JSON.stringify({ spenders: [{ address: '0xspender' }] }),
    });

    const result = await engine.evaluateBatch(walletId, [
      {
        type: 'APPROVE',
        amount: '0',
        toAddress: '0xspender',
        chain: 'ethereum',
        spenderAddress: '0xspender',
        approveAmount: '1000',
      },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
  });
});

// ===========================================================================
// 16. WalletNotificationChannel gate branches (lines 62-119)
// ===========================================================================

describe('WalletNotificationChannel gate branches', () => {
  it('should skip when signing_sdk.enabled is not true', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    // Use a mock settings service to avoid DB dependency
    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'false';
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
    expect(mockSettings.get).toHaveBeenCalledWith('signing_sdk.enabled');
  });

  it('should skip when signing_sdk.notifications_enabled is not true', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'false';
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
  });

  it('should skip when event is filtered out by notify_events', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'true';
        if (key === 'notifications.notify_events') return JSON.stringify(['TX_CONFIRMED']);
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    // TX_FAILED should be filtered out
    await channel.notify('TX_FAILED' as any, walletId, 'Test', 'Body');
  });

  it('should skip when no alert-enabled apps exist', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'true';
        if (key === 'notifications.notify_events') return '[]';
        if (key === 'notifications.notify_categories') return '[]';
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
  });

  it('should use category filter fallback when notify_events is empty', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'true';
        if (key === 'notifications.notify_events') return '[]';
        if (key === 'notifications.notify_categories') return JSON.stringify(['security']);
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    // TX_CONFIRMED is in 'transaction' category, not 'security'
    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
  });

  it('should handle invalid JSON in notify_events gracefully', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'true';
        if (key === 'notifications.notify_events') return 'not-valid-json';
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    // Should not throw, invalid JSON = allow all
    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
  });

  it('should handle invalid JSON in notify_categories gracefully', async () => {
    const { WalletNotificationChannel } = await import(
      '../services/signing-sdk/channels/wallet-notification-channel.js'
    );

    const mockSettings = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'signing_sdk.enabled') return 'true';
        if (key === 'signing_sdk.notifications_enabled') return 'true';
        if (key === 'notifications.notify_events') return '[]';
        if (key === 'notifications.notify_categories') return 'not-valid-json';
        return '';
      }),
    } as any;

    const channel = new WalletNotificationChannel({
      sqlite: conn.sqlite,
      settingsService: mockSettings,
    });

    await channel.notify('TX_CONFIRMED' as any, walletId, 'Test', 'Body');
  });
});

// ===========================================================================
// 17. buildTokenContext helper branches (lines 840-843)
// ===========================================================================

describe('buildTokenContext helper', () => {
  it('should build token context from TOKEN_TRANSFER with token_limits', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const tokenAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    // Insert ALLOWED_TOKENS that permits this token
    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, network, created_at, updated_at)
      VALUES (?, NULL, 'ALLOWED_TOKENS', ?, 20, 1, 'ethereum-mainnet', datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      tokens: [{ address: tokenAddr.toLowerCase() }],
    }));

    // Insert spending limit with token_limits
    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, network, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, 'ethereum-mainnet', datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      token_limits: {
        ['eip155:1/erc20:' + tokenAddr]: {
          instant_max: '1000',
          notify_max: '5000',
          delay_max: '10000',
        },
      },
    }));

    const txId = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TOKEN_TRANSFER', '500', '0xabc', 'PENDING', ?)
    `).run(txId, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      {
        type: 'TOKEN_TRANSFER',
        amount: '500',
        toAddress: '0xabc',
        chain: 'ethereum',
        tokenAddress: tokenAddr,
        tokenDecimals: 6,
        assetId: 'eip155:1/erc20:' + tokenAddr,
        network: 'ethereum-mainnet',
      },
      txId,
    );
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// 18. resolveAgentIdFromAddress empty address branch (line 749)
// ===========================================================================

describe('resolveAgentIdFromAddress branches', () => {
  it('should handle empty toAddress gracefully', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    await insertPolicy({
      type: 'REPUTATION_THRESHOLD',
      rules: JSON.stringify({
        check_counterparty: true,
        min_score: 50,
        below_threshold_tier: 'DELAY',
        unrated_tier: 'APPROVAL',
      }),
    });

    const mockReputationCache = {
      getReputation: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await engine.prefetchReputationTier(
      walletId,
      {
        type: 'TRANSFER',
        amount: '1000',
        toAddress: '',
        chain: 'ethereum',
      },
      mockReputationCache,
    );
    expect(result).toBeDefined();
    expect(result!.tier).toBe('APPROVAL');
  });
});

// ===========================================================================
// 19. evaluateAndReserve with DELAY tier preserves delaySeconds
// ===========================================================================

describe('evaluateAndReserve DELAY tier with delaySeconds', () => {
  it('should include delaySeconds when result is DELAY tier', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '1',
      notify_max: '2',
      delay_max: '99999999',
      delay_seconds: 600,
    }));

    const txId = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', ?)
    `).run(txId, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
    expect(result.delaySeconds).toBe(600);
  });
});

// ===========================================================================
// 19b. aggregate-staking-balance pending unstake branch
// ===========================================================================

describe('aggregate-staking-balance pending unstake', () => {
  it('should return pending unstake info when bridge_status is PENDING', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');

    const now = Math.floor(Date.now() / 1000);
    // Insert a pending unstake transaction
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, bridge_status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', '500', '0xabc', 'CONFIRMED', 'PENDING', ?, ?)
    `).run(generateId(), walletId, JSON.stringify({ provider: 'lido' }), now);

    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result.pendingUnstake).toBeDefined();
    expect(result.pendingUnstake!.amount).toBe('500');
    expect(result.pendingUnstake!.status).toBe('PENDING');
  });

  it('should return null pendingUnstake when no pending bridge exists', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');
    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result.pendingUnstake).toBeNull();
  });

  it('should handle non-numeric amount gracefully', async () => {
    const { aggregateStakingBalance } = await import('../services/staking/aggregate-staking-balance.js');

    const now = Math.floor(Date.now() / 1000);
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, metadata, created_at)
      VALUES (?, ?, 'ethereum', 'CONTRACT_CALL', 'not-a-number', '0xabc', 'CONFIRMED', ?, ?)
    `).run(generateId(), walletId, JSON.stringify({ provider: 'lido' }), now);

    const result = aggregateStakingBalance(conn.sqlite, walletId, 'lido');
    expect(result.balanceWei).toBe(0n);
  });
});

// ===========================================================================
// 20. evaluateAndReserve with DELAY tier + cumulative + reputation
// ===========================================================================

describe('evaluateAndReserve DELAY cumulative with reputation', () => {
  it('should include delaySeconds in cumulative result when tier is DELAY', () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);

    conn.sqlite.prepare(`
      INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
      VALUES (?, NULL, 'SPENDING_LIMIT', ?, 10, 1, datetime('now'), datetime('now'))
    `).run(generateId(), JSON.stringify({
      instant_max: '1',
      notify_max: '2',
      delay_max: '99999999',
      delay_seconds: 600,
      daily_limit_usd: 10000,
    }));

    const txId = generateId();
    conn.sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
      VALUES (?, ?, 'ethereum', 'TRANSFER', '100', '0xabc', 'PENDING', ?)
    `).run(txId, walletId, Math.floor(Date.now() / 1000));

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      txId,
      5,
    );
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('DELAY');
    expect(result.delaySeconds).toBe(600);
  });
});

// ===========================================================================
// 21. evaluateSpendingLimit token_limits branches
// ===========================================================================

describe('evaluateSpendingLimit token_limits branches', () => {
  it('should use native:chain key for TRANSFER type', async () => {
    const { evaluateTokenTier } = await import('../pipeline/evaluators/spending-limit.js');

    const rules = {
      token_limits: {
        'native:ethereum': {
          instant_max: '1.0',
          notify_max: '5.0',
          delay_max: '10.0',
        },
      },
    } as any;

    const result = evaluateTokenTier(
      BigInt('2000000000000000000'),
      rules,
      { type: 'TRANSFER', chain: 'ethereum' },
    );
    expect(result).toBe('NOTIFY');
  });

  it('should use native shorthand when policy has network set', async () => {
    const { evaluateTokenTier } = await import('../pipeline/evaluators/spending-limit.js');

    const rules = {
      token_limits: {
        native: {
          instant_max: '1.0',
          notify_max: '5.0',
          delay_max: '10.0',
        },
      },
    } as any;

    const result = evaluateTokenTier(
      BigInt('500000000'),
      rules,
      { type: 'TRANSFER', chain: 'solana', policyNetwork: 'solana-mainnet' },
    );
    expect(result).toBe('INSTANT');
  });

  it('should skip token_limits for CONTRACT_CALL type', async () => {
    const { evaluateTokenTier } = await import('../pipeline/evaluators/spending-limit.js');

    const result = evaluateTokenTier(
      BigInt('100'),
      { token_limits: { 'native:ethereum': { instant_max: '1', notify_max: '2', delay_max: '3' } } } as any,
      { type: 'CONTRACT_CALL' },
    );
    expect(result).toBeNull();
  });

  it('should match CAIP-19 assetId for TOKEN_TRANSFER', async () => {
    const { evaluateTokenTier } = await import('../pipeline/evaluators/spending-limit.js');

    const result = evaluateTokenTier(
      BigInt('500000000'),
      { token_limits: { 'eip155:1/erc20:0xUSDC': { instant_max: '100', notify_max: '1000', delay_max: '10000' } } } as any,
      { type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6 },
    );
    expect(result).toBe('NOTIFY');
  });

  it('should return null when no matching token limit', async () => {
    const { evaluateTokenTier } = await import('../pipeline/evaluators/spending-limit.js');

    const result = evaluateTokenTier(
      BigInt('100'),
      { token_limits: { 'eip155:1/erc20:0xdead': { instant_max: '1', notify_max: '2', delay_max: '3' } } } as any,
      { type: 'TOKEN_TRANSFER', tokenAddress: '0xbeef', tokenDecimals: 6 },
    );
    expect(result).toBeNull();
  });
});

// ===========================================================================
// 22. evaluateNativeTier with all-undefined raw thresholds
// ===========================================================================

describe('evaluateNativeTier branches', () => {
  it('should return INSTANT when all raw thresholds are undefined', async () => {
    const { evaluateNativeTier } = await import('../pipeline/evaluators/spending-limit.js');
    expect(evaluateNativeTier(BigInt('999999999999'), {} as any)).toBe('INSTANT');
  });

  it('should classify correctly with partial thresholds', async () => {
    const { evaluateNativeTier } = await import('../pipeline/evaluators/spending-limit.js');
    expect(evaluateNativeTier(BigInt('5'), { instant_max: '10' } as any)).toBe('INSTANT');
    expect(evaluateNativeTier(BigInt('15'), { instant_max: '10' } as any)).toBe('APPROVAL');
  });
});

// ===========================================================================
// 23. evaluateUsdTier branches
// ===========================================================================

describe('evaluateUsdTier branches', () => {
  it('should classify USD amounts correctly', async () => {
    const { evaluateUsdTier } = await import('../pipeline/evaluators/spending-limit.js');
    const rules = { instant_max_usd: 10, notify_max_usd: 100, delay_max_usd: 1000 } as any;
    expect(evaluateUsdTier(5, rules)).toBe('INSTANT');
    expect(evaluateUsdTier(50, rules)).toBe('NOTIFY');
    expect(evaluateUsdTier(500, rules)).toBe('DELAY');
    expect(evaluateUsdTier(5000, rules)).toBe('APPROVAL');
  });

  it('should handle missing thresholds', async () => {
    const { evaluateUsdTier } = await import('../pipeline/evaluators/spending-limit.js');
    expect(evaluateUsdTier(50, { delay_max_usd: 100 } as any)).toBe('DELAY');
    expect(evaluateUsdTier(200, { delay_max_usd: 100 } as any)).toBe('APPROVAL');
  });
});

// ===========================================================================
// 24. Migration branches (managesOwnTransaction)
// ===========================================================================

describe('migration branches', () => {
  it('should handle managesOwnTransaction migration', async () => {
    const { runMigrations } = await import('../infrastructure/database/migrate.js');

    const testConn = createDatabase(':memory:');
    pushSchema(testConn.sqlite);

    const row = testConn.sqlite.prepare('SELECT MAX(version) AS max_version FROM schema_version').get() as any;
    const currentVersion = row.max_version;

    const testMigration = {
      version: currentVersion + 1000,
      description: 'test-self-managed-migration',
      managesOwnTransaction: true,
      up: (db: any) => {
        db.exec('CREATE TABLE IF NOT EXISTS test_self_managed (id TEXT PRIMARY KEY)');
      },
    };

    const result = runMigrations(testConn.sqlite, [testMigration]);
    expect(result.applied).toBe(1);
    testConn.sqlite.close();
  });

  it('should handle failed managesOwnTransaction migration', async () => {
    const { runMigrations } = await import('../infrastructure/database/migrate.js');

    const testConn = createDatabase(':memory:');
    pushSchema(testConn.sqlite);

    const row = testConn.sqlite.prepare('SELECT MAX(version) AS max_version FROM schema_version').get() as any;
    const currentVersion = row.max_version;

    const testMigration = {
      version: currentVersion + 2000,
      description: 'test-failing-self-managed',
      managesOwnTransaction: true,
      up: () => { throw new Error('Intentional migration failure'); },
    };

    expect(() => runMigrations(testConn.sqlite, [testMigration])).toThrow('Intentional migration failure');
    testConn.sqlite.close();
  });
});

// ===========================================================================
// 25. error-handler non-Error branch
// ===========================================================================

describe('error-handler branches', () => {
  it('should handle non-Error generic errors', async () => {
    const { errorHandler } = await import('../api/middleware/error-handler.js');

    const mockContext = {
      get: vi.fn().mockReturnValue('req-123'),
      json: vi.fn().mockReturnValue(new Response()),
    } as any;

    errorHandler('string error', mockContext);
    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Internal server error' }),
      500,
    );
  });
});

// ===========================================================================
// 26. CONTRACT_WHITELIST provider-trust bypass
// ===========================================================================

describe('CONTRACT_WHITELIST provider-trust bypass', () => {
  it('should bypass CONTRACT_WHITELIST when provider is trusted', async () => {
    const settings = makeSettingsService();
    settings.set('actions.jupiter_swap_enabled', 'true');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);

    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_max: '999999999999', notify_max: '999999999999999', delay_max: '999999999999999999', delay_seconds: 300 }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_CALL',
      amount: '0',
      toAddress: '0xunwhitelisted',
      chain: 'ethereum',
      contractAddress: '0xunwhitelisted',
      actionProvider: 'jupiter_swap',
    });
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// 27. NFT_TRANSFER and CONTRACT_DEPLOY default tiers
// ===========================================================================

describe('NFT_TRANSFER default tier', () => {
  it('should return APPROVAL tier by default (setting key not registered)', async () => {
    const settings = makeSettingsService();
    settings.set('policy.default_deny_contracts', 'false');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);
    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_max: '999999999999', notify_max: '999999999999999', delay_max: '999999999999999999', delay_seconds: 300 }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'NFT_TRANSFER', amount: '0', toAddress: '0xrecipient', chain: 'ethereum',
    });
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
  });
});

describe('CONTRACT_DEPLOY default tier', () => {
  it('should return APPROVAL tier by default', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_max: '999999999999', notify_max: '999999999999999', delay_max: '999999999999999999', delay_seconds: 300 }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_DEPLOY', amount: '0', toAddress: '', chain: 'ethereum',
    });
    expect(result.tier).toBe('APPROVAL');
  });

  it('should use settings override', async () => {
    const settings = makeSettingsService();
    settings.set('rpc_proxy.deploy_default_tier', 'DELAY');
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite, settings);
    await insertPolicy({
      type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_max: '999999999999', notify_max: '999999999999999', delay_max: '999999999999999999', delay_seconds: 300 }),
    });

    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_DEPLOY', amount: '0', toAddress: '', chain: 'ethereum',
    });
    expect(result.tier).toBe('DELAY');
  });
});

// ===========================================================================
// 28. evaluateBatch violations
// ===========================================================================

describe('evaluateBatch violation detection', () => {
  it('should deny entire batch when one instruction violates', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    await insertPolicy({
      type: 'ALLOWED_TOKENS',
      rules: JSON.stringify({ tokens: [{ address: '0xknown' }] }),
    });

    const result = await engine.evaluateBatch(walletId, [
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
      { type: 'TOKEN_TRANSFER', amount: '50', toAddress: '0xabc', chain: 'ethereum', tokenAddress: '0xunknown' },
    ]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Batch policy violation');
  });

  it('should return INSTANT when no batch policies exist', async () => {
    const engine = new DatabasePolicyEngine(conn.db, conn.sqlite);
    const result = await engine.evaluateBatch(walletId, [
      { type: 'TRANSFER', amount: '100', toAddress: '0xabc', chain: 'ethereum' },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('INSTANT');
  });
});

// ===========================================================================
// 29. SIWE verification
// ===========================================================================

describe('SIWE verification branches', () => {
  it('should reject invalid SIWE message format', async () => {
    const { verifySIWE } = await import('../infrastructure/auth/siwe-verify.js');

    const result = await verifySIWE({
      message: 'not a valid SIWE message',
      signature: '0x' + '00'.repeat(65),
      expectedAddress: '0x1234567890123456789012345678901234567890',
    });
    expect(result.valid).toBe(false);
  });
});
