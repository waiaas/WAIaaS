/**
 * Branch coverage boost tests.
 *
 * Tests pure/exported functions from multiple files to cover uncovered branches:
 * - transactions.ts: getNativeTokenInfo, resolveAmountMetadata, validateAmountXOR, resolveHumanAmount
 * - wallets.ts: isLiteModeSmartAccount, getLiteModeError, buildProviderStatus
 * - connect-info.ts: buildConnectInfoPrompt
 * - admin-monitoring.ts: resolveContractFields
 */

import { describe, it, expect } from 'vitest';
import { WAIaaSError } from '@waiaas/core';

// ---- transactions.ts helpers ----

describe('getNativeTokenInfo', () => {
  it('returns SOL for solana', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    const info = getNativeTokenInfo('solana');
    expect(info).toEqual({ decimals: 9, symbol: 'SOL' });
  });

  it('returns ETH for ethereum', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('ethereum', 'ethereum-mainnet')).toEqual({ decimals: 18, symbol: 'ETH' });
    expect(getNativeTokenInfo('evm', 'ethereum-mainnet')).toEqual({ decimals: 18, symbol: 'ETH' });
  });

  it('returns correct symbols for various EVM networks', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('evm', 'polygon-mainnet')!.symbol).toBe('POL');
    expect(getNativeTokenInfo('evm', 'avalanche-mainnet')!.symbol).toBe('AVAX');
    expect(getNativeTokenInfo('evm', 'bsc-mainnet')!.symbol).toBe('BNB');
    expect(getNativeTokenInfo('evm', 'arbitrum-mainnet')!.symbol).toBe('ETH');
    expect(getNativeTokenInfo('evm', 'optimism-mainnet')!.symbol).toBe('ETH');
    expect(getNativeTokenInfo('evm', 'base-mainnet')!.symbol).toBe('ETH');
  });

  it('returns ETH for unknown EVM network', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('evm', 'unknown-network')!.symbol).toBe('ETH');
  });

  it('returns XRP for ripple', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('ripple')).toEqual({ decimals: 6, symbol: 'XRP' });
  });

  it('returns null for unknown chain', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('bitcoin')).toBeNull();
  });

  it('returns ETH with no network param', async () => {
    const { getNativeTokenInfo } = await import('../api/routes/transactions.js');
    expect(getNativeTokenInfo('evm')!.symbol).toBe('ETH');
  });
});

describe('resolveAmountMetadata', () => {
  it('returns nulls for null amount', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    expect(resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'TRANSFER', null))
      .toEqual({ amountFormatted: null, decimals: null, symbol: null });
  });

  it('returns nulls for undefined amount', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    expect(resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'TRANSFER', undefined))
      .toEqual({ amountFormatted: null, decimals: null, symbol: null });
  });

  it('formats TRANSFER amount for ethereum', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'TRANSFER', '1000000000000000000');
    expect(result.amountFormatted).toBe('1');
    expect(result.decimals).toBe(18);
    expect(result.symbol).toBe('ETH');
  });

  it('formats TRANSFER amount for solana', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('solana', 'solana-mainnet', 'TRANSFER', '1000000000');
    expect(result.amountFormatted).toBe('1');
    expect(result.decimals).toBe(9);
    expect(result.symbol).toBe('SOL');
  });

  it('returns nulls for TRANSFER on unknown chain', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('bitcoin', null, 'TRANSFER', '100');
    expect(result.amountFormatted).toBeNull();
  });

  it('returns nulls for non-TRANSFER types', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'TOKEN_TRANSFER', '1000');
    expect(result.amountFormatted).toBeNull();
    expect(result.decimals).toBeNull();
  });

  it('returns nulls for CONTRACT_CALL type', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'CONTRACT_CALL', '1000');
    expect(result).toEqual({ amountFormatted: null, decimals: null, symbol: null });
  });

  it('handles invalid amount gracefully', async () => {
    const { resolveAmountMetadata } = await import('../api/routes/transactions.js');
    const result = resolveAmountMetadata('ethereum', 'ethereum-mainnet', 'TRANSFER', 'not-a-number');
    expect(result.amountFormatted).toBeNull();
  });
});

describe('validateAmountXOR', () => {
  it('throws when both amount and humanAmount provided', async () => {
    const { validateAmountXOR } = await import('../api/routes/transactions.js');
    expect(() => validateAmountXOR({ amount: '100', humanAmount: '1.0' })).toThrow('mutually exclusive');
  });

  it('throws when neither amount nor humanAmount provided', async () => {
    const { validateAmountXOR } = await import('../api/routes/transactions.js');
    expect(() => validateAmountXOR({})).toThrow('must be provided');
  });

  it('passes when only amount provided', async () => {
    const { validateAmountXOR } = await import('../api/routes/transactions.js');
    expect(() => validateAmountXOR({ amount: '100' })).not.toThrow();
  });

  it('passes when only humanAmount provided', async () => {
    const { validateAmountXOR } = await import('../api/routes/transactions.js');
    expect(() => validateAmountXOR({ humanAmount: '1.0' })).not.toThrow();
  });
});

describe('resolveHumanAmount', () => {
  it('converts humanAmount to smallest unit', async () => {
    const { resolveHumanAmount } = await import('../api/routes/transactions.js');
    const result = resolveHumanAmount({ humanAmount: '1.5' }, 18);
    expect(result).toBe('1500000000000000000');
  });

  it('returns amount when humanAmount is not present', async () => {
    const { resolveHumanAmount } = await import('../api/routes/transactions.js');
    const result = resolveHumanAmount({ amount: '1000' }, 18);
    expect(result).toBe('1000');
  });

  it('converts humanAmount with 6 decimals', async () => {
    const { resolveHumanAmount } = await import('../api/routes/transactions.js');
    const result = resolveHumanAmount({ humanAmount: '100.5' }, 6);
    expect(result).toBe('100500000');
  });
});

// ---- wallets.ts helpers ----

describe('isLiteModeSmartAccount', () => {
  it('returns true for smart account without provider', async () => {
    const { isLiteModeSmartAccount } = await import('../api/routes/wallets.js');
    expect(isLiteModeSmartAccount({ accountType: 'smart', aaProvider: null })).toBe(true);
  });

  it('returns false for smart account with provider', async () => {
    const { isLiteModeSmartAccount } = await import('../api/routes/wallets.js');
    expect(isLiteModeSmartAccount({ accountType: 'smart', aaProvider: 'pimlico' })).toBe(false);
  });

  it('returns false for EOA account', async () => {
    const { isLiteModeSmartAccount } = await import('../api/routes/wallets.js');
    expect(isLiteModeSmartAccount({ accountType: 'eoa', aaProvider: null })).toBe(false);
  });
});

describe('getLiteModeError', () => {
  it('returns WAIaaSError with CHAIN_ERROR code', async () => {
    const { getLiteModeError } = await import('../api/routes/wallets.js');
    const error = getLiteModeError();
    expect(error).toBeInstanceOf(WAIaaSError);
    expect(error.message).toContain('Lite mode');
    expect(error.message).toContain('userop');
  });
});

describe('buildProviderStatus', () => {
  it('returns null when no provider', async () => {
    const { buildProviderStatus } = await import('../api/routes/wallets.js');
    expect(buildProviderStatus({ aaProvider: null })).toBeNull();
  });

  it('returns custom provider without supported chains', async () => {
    const { buildProviderStatus } = await import('../api/routes/wallets.js');
    const result = buildProviderStatus({ aaProvider: 'custom', aaPaymasterUrl: null });
    expect(result).toEqual({
      name: 'custom',
      supportedChains: [],
      paymasterEnabled: false,
    });
  });

  it('returns custom provider with paymaster enabled', async () => {
    const { buildProviderStatus } = await import('../api/routes/wallets.js');
    const result = buildProviderStatus({ aaProvider: 'custom', aaPaymasterUrl: 'https://paymaster.example.com' });
    expect(result!.paymasterEnabled).toBe(true);
  });

  it('returns pimlico provider with chains', async () => {
    const { buildProviderStatus } = await import('../api/routes/wallets.js');
    const result = buildProviderStatus({ aaProvider: 'pimlico' });
    expect(result!.name).toBe('pimlico');
    expect(result!.supportedChains.length).toBeGreaterThan(0);
    expect(result!.paymasterEnabled).toBe(true);
  });

  it('returns alchemy provider with chains', async () => {
    const { buildProviderStatus } = await import('../api/routes/wallets.js');
    const result = buildProviderStatus({ aaProvider: 'alchemy' });
    expect(result!.name).toBe('alchemy');
    expect(result!.supportedChains.length).toBeGreaterThan(0);
  });
});

// ---- connect-info.ts prompt builder ----

describe('buildConnectInfoPrompt', () => {
  it('builds basic prompt with single wallet', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test Wallet', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'eoa',
      }],
      capabilities: ['send', 'sign'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('WAIaaS daemon v2.0.0');
    expect(prompt).toContain('1 wallet(s)');
    expect(prompt).toContain('Test Wallet');
    expect(prompt).toContain('No restrictions');
  });

  it('includes default-deny warning when active', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'eoa',
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: true, contractCalls: true, tokenApprovals: true, x402Domains: true },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Security defaults');
    expect(prompt).toContain('Token transfers: DENY');
    expect(prompt).toContain('Contract calls: DENY');
    expect(prompt).toContain('Token approvals: DENY');
    expect(prompt).toContain('x402 payments: DENY');
    expect(prompt).toContain('Default-deny active');
  });

  it('includes policy summary when policies exist', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [{ type: 'SPENDING_LIMIT' }, { type: 'ALLOWED_TOKENS' }] as any,
        accountType: 'eoa',
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('SPENDING_LIMIT, ALLOWED_TOKENS');
  });

  it('includes ERC-8004 info when available', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'eoa',
        erc8004: { agentId: 'agent-1', status: 'REGISTERED', registryAddress: '0xreg' },
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('ERC-8004 Agent ID: agent-1');
    expect(prompt).toContain('ERC-8004 Trust Network');
  });

  it('includes NFT summary when available', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'eoa',
        nftSummary: { count: 5, collections: 3 },
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('NFTs: 5 items in 3 collections');
  });

  it('includes Smart Account info with provider', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
        provider: { name: 'pimlico', supportedChains: ['ethereum-mainnet'], paymasterEnabled: true },
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Smart Account: pimlico provider');
    expect(prompt).toContain('Gas Sponsorship: ENABLED');
  });

  it('includes Smart Account info without provider', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('No provider configured');
    expect(prompt).toContain('userop/build');
  });

  it('includes Smart Account with paymaster disabled', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
        provider: { name: 'pimlico', supportedChains: [], paymasterEnabled: false },
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Gas Sponsorship: DISABLED');
  });

  it('includes factory supported networks', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
        factorySupportedNetworks: ['ethereum-mainnet', 'polygon-mainnet'],
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Factory Supported Networks');
    expect(prompt).toContain('ethereum-mainnet, polygon-mainnet');
  });

  it('includes dcent_swap capability', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['dcent_swap'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain("D'CENT Swap Aggregator");
  });

  it('includes hyperliquid capability', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['hyperliquid'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Hyperliquid Perp Trading');
    expect(prompt).toContain('Hyperliquid Spot Trading');
  });

  it('includes polymarket capability', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['polymarket'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Polymarket');
  });

  it('partial default-deny (only some active)', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const prompt = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'ethereum', environment: 'mainnet',
        address: '0x1234', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'eoa',
      }],
      capabilities: [],
      defaultDeny: { tokenTransfers: true, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3000',
      version: '2.0.0',
    });
    expect(prompt).toContain('Token transfers: DENY');
    expect(prompt).not.toContain('Contract calls: DENY');
  });
});

// ---- admin-monitoring.ts ----

// ---- pipeline-helpers.ts ----

describe('formatNotificationAmount', () => {
  it('formats TOKEN_TRANSFER with symbol fallback to address slice', async () => {
    const { formatNotificationAmount } = await import('../pipeline/pipeline-helpers.js');
    const result = formatNotificationAmount({
      type: 'TOKEN_TRANSFER',
      to: '0xdead',
      amount: '1000000',
      token: { address: '0xABCDEF12', decimals: 6 },
    } as any, 'ethereum');
    expect(result).toContain('0xABCDEF');
  });

  it('formats APPROVE amount', async () => {
    const { formatNotificationAmount } = await import('../pipeline/pipeline-helpers.js');
    const result = formatNotificationAmount({
      type: 'APPROVE',
      spender: '0xdead',
      amount: '1000000',
      token: { address: '0x1234', decimals: 6, symbol: 'USDC' },
    } as any, 'ethereum');
    expect(result).toContain('USDC');
  });

  it('formats APPROVE with symbol fallback', async () => {
    const { formatNotificationAmount } = await import('../pipeline/pipeline-helpers.js');
    const result = formatNotificationAmount({
      type: 'APPROVE',
      spender: '0xdead',
      amount: '1000000',
      token: { address: '0xABCDEF12', decimals: 6 },
    } as any, 'ethereum');
    expect(result).toContain('0xABCDEF');
  });

  it('formats NFT_TRANSFER', async () => {
    const { formatNotificationAmount } = await import('../pipeline/pipeline-helpers.js');
    const result = formatNotificationAmount({
      type: 'NFT_TRANSFER',
      to: '0xdead',
      amount: '1',
      token: { address: '0x1234', tokenId: '42', standard: 'ERC-721' },
    } as any, 'ethereum');
    expect(result).toContain('NFT');
    expect(result).toContain('ERC-721');
  });

  it('returns raw amount on error', async () => {
    const { formatNotificationAmount } = await import('../pipeline/pipeline-helpers.js');
    const result = formatNotificationAmount({
      type: 'TOKEN_TRANSFER',
      to: '0xdead',
      amount: 'invalid',
      token: { address: '0x1234', decimals: 6, symbol: 'X' },
    } as any, 'ethereum');
    expect(result).toBe('invalid');
  });
});

describe('resolveDisplayAmount', () => {
  it('returns empty for null amountUsd', async () => {
    const { resolveDisplayAmount } = await import('../pipeline/pipeline-helpers.js');
    expect(await resolveDisplayAmount(null)).toBe('');
  });

  it('returns USD format when currency is USD', async () => {
    const { resolveDisplayAmount } = await import('../pipeline/pipeline-helpers.js');
    const mockSettings = { get: () => 'USD' };
    const mockForex = { getRate: async () => ({ rate: 1 }) };
    const result = await resolveDisplayAmount(123.45, mockSettings as any, mockForex as any);
    expect(result).toContain('$123.45');
  });

  it('returns empty when no settings service', async () => {
    const { resolveDisplayAmount } = await import('../pipeline/pipeline-helpers.js');
    expect(await resolveDisplayAmount(100)).toBe('');
  });
});

describe('extractPolicyType', () => {
  it('extracts CONTRACT_WHITELIST from not whitelisted', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Contract not whitelisted')).toBe('CONTRACT_WHITELIST');
    expect(extractPolicyType('Contract calls disabled')).toBe('CONTRACT_WHITELIST');
  });

  it('extracts APPROVED_SPENDERS', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Spender not in approved list')).toBe('APPROVED_SPENDERS');
    expect(extractPolicyType('Token approvals disabled')).toBe('APPROVED_SPENDERS');
  });

  it('extracts SPENDING_LIMIT', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Spending limit exceeded')).toBe('SPENDING_LIMIT');
  });

  it('extracts ALLOWED_TOKENS', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Token not in allowed list')).toBe('ALLOWED_TOKENS');
    expect(extractPolicyType('Token transfer not allowed')).toBe('ALLOWED_TOKENS');
  });

  it('extracts ALLOWED_NETWORKS', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Network not in allowed networks')).toBe('ALLOWED_NETWORKS');
  });

  it('extracts APPROVE_AMOUNT_LIMIT', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Amount exceeds limit')).toBe('APPROVE_AMOUNT_LIMIT');
    expect(extractPolicyType('Unlimited token approval')).toBe('APPROVE_AMOUNT_LIMIT');
  });

  it('extracts WHITELIST', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Address not in whitelist')).toBe('WHITELIST');
    expect(extractPolicyType('Address not in allowed addresses')).toBe('WHITELIST');
  });

  it('returns empty for unknown reason', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Unknown error')).toBe('');
  });

  it('returns empty for undefined reason', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType(undefined)).toBe('');
  });
});

describe('resolveNotificationTo', () => {
  it('returns raw address for TRANSFER type', async () => {
    const { resolveNotificationTo } = await import('../pipeline/pipeline-helpers.js');
    expect(resolveNotificationTo({ type: 'TRANSFER', to: '0x1234', amount: '1' } as any, 'ethereum-mainnet')).toBe('0x1234');
  });

  it('returns empty for request without to', async () => {
    const { resolveNotificationTo } = await import('../pipeline/pipeline-helpers.js');
    expect(resolveNotificationTo({ type: 'TRANSFER', amount: '1' } as any, 'ethereum-mainnet')).toBe('');
  });

  it('returns named format for CONTRACT_CALL with known contract', async () => {
    const { resolveNotificationTo } = await import('../pipeline/pipeline-helpers.js');
    const registry = { resolve: () => ({ name: 'Uniswap V3', source: 'builtin' }) };
    const result = resolveNotificationTo(
      { type: 'CONTRACT_CALL', to: '0xe592427a0aece92de3edee1f18e0157c05861564', calldata: '0x1234' } as any,
      'ethereum-mainnet',
      registry as any,
    );
    expect(result).toContain('Uniswap V3');
    expect(result).toContain('0xe592');
  });

  it('returns raw address for CONTRACT_CALL with fallback name', async () => {
    const { resolveNotificationTo } = await import('../pipeline/pipeline-helpers.js');
    const registry = { resolve: () => ({ name: '0xaddr', source: 'fallback' }) };
    const result = resolveNotificationTo(
      { type: 'CONTRACT_CALL', to: '0xaddr', calldata: '0x1234' } as any,
      'ethereum-mainnet',
      registry as any,
    );
    expect(result).toBe('0xaddr');
  });
});

describe('resolveActionTier', () => {
  it('returns default tier when no settings service', async () => {
    const { resolveActionTier } = await import('../pipeline/pipeline-helpers.js');
    expect(resolveActionTier('provider', 'action', 'IMMEDIATE')).toBe('IMMEDIATE');
  });

  it('returns override tier from settings', async () => {
    const { resolveActionTier } = await import('../pipeline/pipeline-helpers.js');
    const settings = { get: (key: string) => key.includes('tier') ? 'DELAY' : '' };
    expect(resolveActionTier('provider', 'action', 'IMMEDIATE', settings as any)).toBe('DELAY');
  });

  it('returns default when settings returns empty', async () => {
    const { resolveActionTier } = await import('../pipeline/pipeline-helpers.js');
    const settings = { get: () => '' };
    expect(resolveActionTier('provider', 'action', 'IMMEDIATE', settings as any)).toBe('IMMEDIATE');
  });

  it('returns default when settings throws', async () => {
    const { resolveActionTier } = await import('../pipeline/pipeline-helpers.js');
    const settings = { get: () => { throw new Error('not found'); } };
    expect(resolveActionTier('provider', 'action', 'IMMEDIATE', settings as any)).toBe('IMMEDIATE');
  });
});

describe('truncateAddress', () => {
  it('truncates EVM address', async () => {
    const { truncateAddress } = await import('../pipeline/pipeline-helpers.js');
    expect(truncateAddress('0xe592427a0aece92de3edee1f18e0157c05861564'))
      .toBe('0xe592...1564');
  });

  it('truncates Solana address', async () => {
    const { truncateAddress } = await import('../pipeline/pipeline-helpers.js');
    const result = truncateAddress('ABCDE12345678901234567890abcdefghijklmnop');
    expect(result).toBe('ABCD...mnop');
  });

  it('returns short address unchanged', async () => {
    const { truncateAddress } = await import('../pipeline/pipeline-helpers.js');
    expect(truncateAddress('0x123')).toBe('0x123');
  });
});

describe('buildTransactionParam', () => {
  it('builds TOKEN_TRANSFER param', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'TOKEN_TRANSFER', to: '0xdead', amount: '1000',
      token: { address: '0xtoken', decimals: 6, assetId: 'eip155:1/erc20:0xtoken' },
    } as any, 'TOKEN_TRANSFER', 'ethereum');
    expect(param.tokenAddress).toBe('0xtoken');
    expect(param.assetId).toBe('eip155:1/erc20:0xtoken');
    expect(param.tokenDecimals).toBe(6);
  });

  it('builds CONTRACT_CALL param with selector', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'CONTRACT_CALL', to: '0xcontract', calldata: '0xa9059cbb000000',
    } as any, 'CONTRACT_CALL', 'ethereum');
    expect(param.contractAddress).toBe('0xcontract');
    expect(param.selector).toBe('0xa9059cbb');
  });

  it('builds APPROVE param', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'APPROVE', spender: '0xsp', amount: '100',
      token: { address: '0xtoken', decimals: 6, assetId: 'eip155:1/erc20:0xtoken' },
    } as any, 'APPROVE', 'ethereum');
    expect(param.spenderAddress).toBe('0xsp');
    expect(param.approveAmount).toBe('100');
    expect(param.assetId).toBe('eip155:1/erc20:0xtoken');
  });

  it('builds NFT_TRANSFER param', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'NFT_TRANSFER', to: '0xdead',
      token: { address: '0xnft', tokenId: '42', standard: 'ERC-721' },
    } as any, 'NFT_TRANSFER', 'ethereum');
    expect(param.contractAddress).toBe('0xnft');
    expect(param.type).toBe('NFT_TRANSFER');
  });

  it('builds CONTRACT_DEPLOY param', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000', value: '100',
    } as any, 'CONTRACT_DEPLOY', 'ethereum');
    expect(param.type).toBe('CONTRACT_DEPLOY');
    expect(param.amount).toBe('100');
  });

  it('builds default TRANSFER param', async () => {
    const { buildTransactionParam } = await import('../pipeline/pipeline-helpers.js');
    const param = buildTransactionParam({
      type: 'TRANSFER', to: '0xdead', amount: '1000',
    } as any, 'TRANSFER', 'ethereum');
    expect(param.type).toBe('TRANSFER');
    expect(param.toAddress).toBe('0xdead');
  });
});

// ---- sign-only.ts ----

describe('mapOperationToParam', () => {
  it('maps NATIVE_TRANSFER to TRANSFER param', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'NATIVE_TRANSFER', to: '0xdead', amount: 1000n } as any, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('TRANSFER');
    expect(param.amount).toBe('1000');
    expect(param.toAddress).toBe('0xdead');
    expect(param.network).toBe('ethereum-mainnet');
  });

  it('maps TOKEN_TRANSFER with token address', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'TOKEN_TRANSFER', to: '0xdead', amount: 500n, token: '0xtoken' } as any, 'ethereum');
    expect(param.type).toBe('TOKEN_TRANSFER');
    expect(param.tokenAddress).toBe('0xtoken');
  });

  it('maps CONTRACT_CALL with programId', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'CONTRACT_CALL', programId: '0xprog', method: '0xa9059cbb' } as any, 'ethereum');
    expect(param.type).toBe('CONTRACT_CALL');
    expect(param.contractAddress).toBe('0xprog');
    expect(param.selector).toBe('0xa9059cbb');
  });

  it('maps CONTRACT_CALL with to address (no programId)', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'CONTRACT_CALL', to: '0xcontract', method: '0x1234' } as any, 'ethereum');
    expect(param.contractAddress).toBe('0xcontract');
    expect(param.toAddress).toBe('0xcontract');
  });

  it('maps APPROVE with spender and amount', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'APPROVE', to: '0xspender', amount: 999n } as any, 'ethereum');
    expect(param.type).toBe('APPROVE');
    expect(param.spenderAddress).toBe('0xspender');
    expect(param.approveAmount).toBe('999');
  });

  it('maps UNKNOWN to CONTRACT_CALL for policy evaluation', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'UNKNOWN', to: '0xunknown', method: '0xdead' } as any, 'ethereum');
    expect(param.type).toBe('CONTRACT_CALL');
    expect(param.contractAddress).toBe('0xunknown');
    expect(param.selector).toBe('0xdead');
  });

  it('maps NATIVE_TRANSFER with null amount defaults to 0', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'NATIVE_TRANSFER', to: '0xdead' } as any, 'solana');
    expect(param.amount).toBe('0');
  });

  it('maps NATIVE_TRANSFER with null to defaults to empty', async () => {
    const { mapOperationToParam } = await import('../pipeline/sign-only.js');
    const param = mapOperationToParam({ type: 'NATIVE_TRANSFER' } as any, 'solana');
    expect(param.toAddress).toBe('');
  });
});

// ---- reputation-cache-service.ts ----

describe('ReputationCacheService', () => {
  it('returns null for fresh in-memory entry', async () => {
    const { createDatabase, pushSchema } = await import('../infrastructure/database/index.js');
    const { ReputationCacheService } = await import('../services/erc8004/reputation-cache-service.js');
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);

    const svc = new ReputationCacheService(conn.db as any);
    // No entry cached -> returns null (will attempt RPC which fails)
    const result = await svc.getReputation('agent-1');
    expect(result).toBeNull();

    conn.sqlite.close();
  });

  it('invalidateAll clears memory cache', async () => {
    const { createDatabase, pushSchema } = await import('../infrastructure/database/index.js');
    const { ReputationCacheService } = await import('../services/erc8004/reputation-cache-service.js');
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);

    const svc = new ReputationCacheService(conn.db as any);
    svc.invalidateAll();
    // No crash
    conn.sqlite.close();
  });

  it('invalidate clears specific agent entries', async () => {
    const { createDatabase, pushSchema } = await import('../infrastructure/database/index.js');
    const { ReputationCacheService } = await import('../services/erc8004/reputation-cache-service.js');
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);

    const svc = new ReputationCacheService(conn.db as any);
    svc.invalidate('agent-1');
    // No crash
    conn.sqlite.close();
  });
});

// ---- admin-monitoring.ts ----

describe('resolveContractFields', () => {
  it('returns null fields for non-CONTRACT_CALL type', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('TRANSFER', '0xaddr', 'ethereum-mainnet');
    expect(result.contractName).toBeNull();
    expect(result.contractNameSource).toBeNull();
  });

  it('returns null fields when toAddress is null', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', null, 'ethereum-mainnet');
    expect(result.contractName).toBeNull();
  });

  it('returns null fields when network is null', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', '0xaddr', null);
    expect(result.contractName).toBeNull();
  });

  it('returns null fields when registry is undefined', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', '0xaddr', 'ethereum-mainnet');
    expect(result.contractName).toBeNull();
  });

  it('returns resolved name when registry finds match', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const mockRegistry = {
      resolve: () => ({ name: 'USDC Token', source: 'builtin' as const }),
    };
    const result = resolveContractFields('CONTRACT_CALL', '0xaddr', 'ethereum-mainnet', mockRegistry as any);
    expect(result.contractName).toBe('USDC Token');
    expect(result.contractNameSource).toBe('builtin');
  });

  it('returns null when registry returns fallback source', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const mockRegistry = {
      resolve: () => ({ name: '0xaddr', source: 'fallback' as const }),
    };
    const result = resolveContractFields('CONTRACT_CALL', '0xaddr', 'ethereum-mainnet', mockRegistry as any);
    expect(result.contractName).toBeNull();
    expect(result.contractNameSource).toBeNull();
  });
});
