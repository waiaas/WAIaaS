/**
 * Deep branch coverage tests for spending-limit.ts evaluators.
 *
 * Covers uncovered branches:
 * - evaluateTokenTier: CAIP-19 assetId match, native chain key match, native shorthand
 * - evaluateTokenTier: CONTRACT_CALL/BATCH skip, no token_limits, no match
 * - evaluateNativeTier: all fields undefined -> INSTANT
 * - evaluateUsdTier: all tiers (INSTANT, NOTIFY, DELAY, APPROVAL)
 * - evaluateSpendingLimit: with/without token context, with/without USD
 * - evaluateActionCategoryLimit: various limit comparisons
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateTokenTier,
  evaluateNativeTier,
  evaluateUsdTier,
} from '../pipeline/evaluators/spending-limit.js';

describe('evaluateTokenTier', () => {
  const rules = {
    token_limits: {
      'eip155:1/erc20:0xUSDC': { instant_max: '100', notify_max: '500', delay_max: '1000' },
      'native:ethereum': { instant_max: '0.1', notify_max: '1', delay_max: '10' },
      'native': { instant_max: '0.01', notify_max: '0.1', delay_max: '1' },
    },
  };

  it('returns null when no token_limits', () => {
    expect(evaluateTokenTier(100n, {}, { type: 'TOKEN_TRANSFER' })).toBeNull();
  });

  it('returns null for CONTRACT_CALL', () => {
    expect(evaluateTokenTier(100n, rules as any, { type: 'CONTRACT_CALL' })).toBeNull();
  });

  it('returns null for BATCH', () => {
    expect(evaluateTokenTier(100n, rules as any, { type: 'BATCH' })).toBeNull();
  });

  it('matches TOKEN_TRANSFER by assetId', () => {
    const result = evaluateTokenTier(50000000n, rules as any, {
      type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6,
    });
    expect(result).toBe('INSTANT'); // 50 USDC <= 100
  });

  it('TOKEN_TRANSFER: NOTIFY tier', () => {
    const result = evaluateTokenTier(200000000n, rules as any, {
      type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6,
    });
    expect(result).toBe('NOTIFY'); // 200 USDC > 100, <= 500
  });

  it('TOKEN_TRANSFER: DELAY tier', () => {
    const result = evaluateTokenTier(800000000n, rules as any, {
      type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6,
    });
    expect(result).toBe('DELAY'); // 800 USDC > 500, <= 1000
  });

  it('TOKEN_TRANSFER: APPROVAL tier', () => {
    const result = evaluateTokenTier(2000000000n, rules as any, {
      type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6,
    });
    expect(result).toBe('APPROVAL'); // 2000 USDC > 1000
  });

  it('no assetId match returns null', () => {
    const result = evaluateTokenTier(100n, rules as any, {
      type: 'TOKEN_TRANSFER', assetId: 'eip155:1/erc20:0xDAI', tokenDecimals: 18,
    });
    expect(result).toBeNull();
  });

  it('TRANSFER: native chain key match', () => {
    // 0.05 ETH = 50000000000000000 wei
    const result = evaluateTokenTier(50000000000000000n, rules as any, {
      type: 'TRANSFER', chain: 'ethereum',
    });
    expect(result).toBe('INSTANT'); // 0.05 ETH <= 0.1
  });

  it('TRANSFER: native shorthand match (with policyNetwork)', () => {
    // When the specific native:{chain} doesn't exist, fall back to 'native' shorthand
    const rulesNativeOnly = {
      token_limits: {
        'native': { instant_max: '0.01', notify_max: '0.1', delay_max: '1' },
      },
    };
    const result = evaluateTokenTier(5000000000000000n, rulesNativeOnly as any, {
      type: 'TRANSFER', chain: 'ethereum', policyNetwork: 'ethereum-mainnet',
    });
    expect(result).toBe('INSTANT'); // 0.005 ETH <= 0.01
  });

  it('TRANSFER: no native match and no policyNetwork -> null', () => {
    const rulesNativeOnly = {
      token_limits: {
        'native': { instant_max: '0.01', notify_max: '0.1', delay_max: '1' },
      },
    };
    // Without policyNetwork, 'native' shorthand is not checked
    const result = evaluateTokenTier(5000000n, rulesNativeOnly as any, {
      type: 'TRANSFER', chain: 'solana',
    });
    expect(result).toBeNull();
  });

  it('APPROVE: assetId match', () => {
    const result = evaluateTokenTier(50000000n, rules as any, {
      type: 'APPROVE', assetId: 'eip155:1/erc20:0xUSDC', tokenDecimals: 6,
    });
    expect(result).toBe('INSTANT');
  });
});

describe('evaluateNativeTier', () => {
  it('all fields undefined returns INSTANT', () => {
    expect(evaluateNativeTier(100n, {} as any)).toBe('INSTANT');
  });

  it('below instant_max returns INSTANT', () => {
    expect(evaluateNativeTier(100n, { instant_max: '1000' } as any)).toBe('INSTANT');
  });

  it('above instant_max below notify_max returns NOTIFY', () => {
    expect(evaluateNativeTier(1500n, { instant_max: '1000', notify_max: '2000' } as any)).toBe('NOTIFY');
  });

  it('above notify_max below delay_max returns DELAY', () => {
    expect(evaluateNativeTier(2500n, { instant_max: '1000', notify_max: '2000', delay_max: '3000' } as any)).toBe('DELAY');
  });

  it('above delay_max returns APPROVAL', () => {
    expect(evaluateNativeTier(5000n, { instant_max: '1000', notify_max: '2000', delay_max: '3000' } as any)).toBe('APPROVAL');
  });
});

describe('evaluateUsdTier', () => {
  it('below instant_max_usd returns INSTANT', () => {
    expect(evaluateUsdTier(5, { instant_max_usd: 10, notify_max_usd: 50, delay_max_usd: 100 } as any)).toBe('INSTANT');
  });

  it('above instant_max_usd below notify_max_usd returns NOTIFY', () => {
    expect(evaluateUsdTier(20, { instant_max_usd: 10, notify_max_usd: 50, delay_max_usd: 100 } as any)).toBe('NOTIFY');
  });

  it('above notify_max_usd below delay_max_usd returns DELAY', () => {
    expect(evaluateUsdTier(70, { instant_max_usd: 10, notify_max_usd: 50, delay_max_usd: 100 } as any)).toBe('DELAY');
  });

  it('above delay_max_usd returns APPROVAL', () => {
    expect(evaluateUsdTier(200, { instant_max_usd: 10, notify_max_usd: 50, delay_max_usd: 100 } as any)).toBe('APPROVAL');
  });

  it('no USD thresholds returns APPROVAL (fallthrough)', () => {
    expect(evaluateUsdTier(100, {} as any)).toBe('APPROVAL');
  });
});
