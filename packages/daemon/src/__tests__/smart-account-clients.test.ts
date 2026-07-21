/**
 * Tests for wallet-based AA provider URL resolution.
 *
 * Verifies resolveWalletBundlerUrl, resolveWalletPaymasterUrl, and
 * createSmartAccountBundlerClient with WalletProviderData interface.
 *
 * @see packages/daemon/src/infrastructure/smart-account/smart-account-clients.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock viem/account-abstraction
const mockCreateBundlerClient = vi.fn().mockReturnValue({ type: 'bundlerClient' });
const mockCreatePaymasterClient = vi.fn().mockReturnValue({
  type: 'paymasterClient',
  getPaymasterData: vi.fn(),
  getPaymasterStubData: vi.fn(),
});

vi.mock('viem/account-abstraction', () => ({
  createBundlerClient: (...args: unknown[]) => mockCreateBundlerClient(...args),
  createPaymasterClient: (...args: unknown[]) => mockCreatePaymasterClient(...args),
}));

// Mock viem
const mockHttp = vi.fn().mockReturnValue({ type: 'http' });
vi.mock('viem', () => ({
  http: (...args: unknown[]) => mockHttp(...args),
}));

import {
  resolveWalletBundlerUrl,
  resolveWalletPaymasterUrl,
  resolvePaymasterPolicyId,
  createSmartAccountBundlerClient,
} from '../infrastructure/smart-account/smart-account-clients.js';
import type { WalletProviderData } from '../infrastructure/smart-account/smart-account-clients.js';
import { WAIaaSError } from '@waiaas/core';

/** Minimal SettingsService mock */
function mockSettingsService(overrides: Record<string, string> = {}) {
  return { get: (key: string) => overrides[key] ?? '' } as any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSmartAccount() {
  return {
    address: '0x1234567890abcdef1234567890abcdef12345678' as const,
    type: 'smart' as const,
  } as any;
}

function mockPublicClient() {
  return {
    chain: { id: 11155111 },
    transport: { type: 'http' },
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('smart-account-clients (wallet-based provider)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // resolveWalletBundlerUrl
  // -------------------------------------------------------------------------

  describe('resolveWalletBundlerUrl', () => {
    it('resolves pimlico + apiKey + ethereum-sepolia', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'pk_test_123',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletBundlerUrl(wallet, 'ethereum-sepolia');
      expect(url).toBe('https://api.pimlico.io/v2/sepolia/rpc?apikey=pk_test_123');
    });

    it('resolves alchemy + apiKey + base-mainnet', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: 'ak_test_456',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletBundlerUrl(wallet, 'base-mainnet');
      expect(url).toBe('https://base-mainnet.g.alchemy.com/v2/ak_test_456');
    });

    it('resolves custom provider with aaBundlerUrl', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: 'https://my-bundler.example.com/rpc',
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletBundlerUrl(wallet, 'ethereum-sepolia');
      expect(url).toBe('https://my-bundler.example.com/rpc');
    });

    it('throws CHAIN_ERROR for pimlico + unsupported solana-mainnet', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'pk_test_123',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      expect(() => resolveWalletBundlerUrl(wallet, 'solana-mainnet')).toThrow(/pimlico/);
      expect(() => resolveWalletBundlerUrl(wallet, 'solana-mainnet')).toThrow(/solana-mainnet/);
    });

    it('throws CHAIN_ERROR when no provider configured (null)', () => {
      const wallet: WalletProviderData = {
        aaProvider: null,
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      expect(() => resolveWalletBundlerUrl(wallet, 'ethereum-sepolia')).toThrow(/not configured/i);
    });

    it('throws when custom provider has no bundlerUrl', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      expect(() => resolveWalletBundlerUrl(wallet, 'ethereum-sepolia')).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // resolveWalletPaymasterUrl
  // -------------------------------------------------------------------------

  describe('resolveWalletPaymasterUrl', () => {
    it('returns same URL as bundler for pimlico (unified endpoint)', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'pk_test_123',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletPaymasterUrl(wallet, 'ethereum-sepolia');
      expect(url).toBe('https://api.pimlico.io/v2/sepolia/rpc?apikey=pk_test_123');
    });

    it('returns aaPaymasterUrl for custom provider', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: 'https://bundler.example.com',
        aaPaymasterUrl: 'https://paymaster.example.com',
      };
      const url = resolveWalletPaymasterUrl(wallet, 'ethereum-sepolia');
      expect(url).toBe('https://paymaster.example.com');
    });

    it('returns null for custom provider without paymasterUrl', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: 'https://bundler.example.com',
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletPaymasterUrl(wallet, 'ethereum-sepolia');
      expect(url).toBeNull();
    });

    it('returns null when no provider configured', () => {
      const wallet: WalletProviderData = {
        aaProvider: null,
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const url = resolveWalletPaymasterUrl(wallet, 'ethereum-sepolia');
      expect(url).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // createSmartAccountBundlerClient
  // -------------------------------------------------------------------------

  describe('createSmartAccountBundlerClient', () => {
    it('creates BundlerClient with wallet provider data', () => {
      const walletProvider: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'pk_test_123',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };

      const result = createSmartAccountBundlerClient({
        client: mockPublicClient(),
        account: mockSmartAccount(),
        networkId: 'ethereum-sepolia',
        walletProvider,
      });

      expect(result).toBeDefined();
      expect(mockCreateBundlerClient).toHaveBeenCalledOnce();
      expect(mockHttp).toHaveBeenCalledWith(
        'https://api.pimlico.io/v2/sepolia/rpc?apikey=pk_test_123',
      );
    });

    it('throws CHAIN_ERROR when no provider configured', () => {
      const walletProvider: WalletProviderData = {
        aaProvider: null,
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };

      expect(() =>
        createSmartAccountBundlerClient({
          client: mockPublicClient(),
          account: mockSmartAccount(),
          networkId: 'ethereum-sepolia',
          walletProvider,
        }),
      ).toThrow(WAIaaSError);
    });

    it('includes paymaster for preset provider (unified endpoint)', () => {
      const walletProvider: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: 'ak_test_456',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };

      createSmartAccountBundlerClient({
        client: mockPublicClient(),
        account: mockSmartAccount(),
        networkId: 'ethereum-sepolia',
        walletProvider,
      });

      // PaymasterClient should be created (same URL as bundler for preset)
      expect(mockCreatePaymasterClient).toHaveBeenCalled();
      const bundlerArgs = mockCreateBundlerClient.mock.calls[0][0];
      expect(bundlerArgs).toHaveProperty('paymaster');
    });

    it('wraps paymaster methods with policyId context when policyId is set', () => {
      const mockGetPaymasterData = vi.fn().mockResolvedValue({ data: 'pm' });
      const mockGetPaymasterStubData = vi.fn().mockResolvedValue({ data: 'stub' });
      mockCreatePaymasterClient.mockReturnValueOnce({
        type: 'paymasterClient',
        getPaymasterData: mockGetPaymasterData,
        getPaymasterStubData: mockGetPaymasterStubData,
      });

      const walletProvider: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: 'ak_test_456',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: 'pol_test_789',
      };

      createSmartAccountBundlerClient({
        client: mockPublicClient(),
        account: mockSmartAccount(),
        networkId: 'ethereum-sepolia',
        walletProvider,
      });

      // The bundler client should be created with a paymaster option
      expect(mockCreateBundlerClient).toHaveBeenCalledOnce();
      const bundlerArgs = mockCreateBundlerClient.mock.calls[0][0];
      expect(bundlerArgs).toHaveProperty('paymaster');

      // The paymaster methods should be wrapped with context
      const paymaster = bundlerArgs.paymaster;
      expect(paymaster.getPaymasterData).toBeDefined();
      expect(paymaster.getPaymasterStubData).toBeDefined();

      // Call the wrapper functions to trigger the uncovered arrow functions
      const mockParams = { userOperation: {}, entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' };
      paymaster.getPaymasterData(mockParams);
      paymaster.getPaymasterStubData(mockParams);

      // Verify the wrapped calls include the sponsorshipPolicyId context
      expect(mockGetPaymasterData).toHaveBeenCalledWith({
        ...mockParams,
        context: { sponsorshipPolicyId: 'pol_test_789' },
      });
      expect(mockGetPaymasterStubData).toHaveBeenCalledWith({
        ...mockParams,
        context: { sponsorshipPolicyId: 'pol_test_789' },
      });
    });

    it('no paymaster for custom provider without paymasterUrl', () => {
      const walletProvider: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: 'https://bundler.example.com/rpc',
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };

      createSmartAccountBundlerClient({
        client: mockPublicClient(),
        account: mockSmartAccount(),
        networkId: 'ethereum-sepolia',
        walletProvider,
      });

      expect(mockCreatePaymasterClient).not.toHaveBeenCalled();
      const bundlerArgs = mockCreateBundlerClient.mock.calls[0][0];
      expect(bundlerArgs).not.toHaveProperty('paymaster');
    });
  });

  // -------------------------------------------------------------------------
  // Global default fallback (#275)
  // -------------------------------------------------------------------------

  describe('global default fallback (#275)', () => {
    it('resolveWalletBundlerUrl falls back to global API key when per-wallet is null', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({ 'smart_account.pimlico.api_key': 'global_pk_123' });
      const url = resolveWalletBundlerUrl(wallet, 'ethereum-sepolia', settings);
      expect(url).toBe('https://api.pimlico.io/v2/sepolia/rpc?apikey=global_pk_123');
    });

    it('per-wallet API key takes priority over global default', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'per_wallet_key',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({ 'smart_account.pimlico.api_key': 'global_pk_123' });
      const url = resolveWalletBundlerUrl(wallet, 'ethereum-sepolia', settings);
      expect(url).toContain('per_wallet_key');
      expect(url).not.toContain('global_pk_123');
    });

    it('throws CHAIN_ERROR when both per-wallet and global API key are absent', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({});
      expect(() => resolveWalletBundlerUrl(wallet, 'ethereum-sepolia', settings)).toThrow(/requires an API key/);
    });

    it('custom provider does not use global fallback', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'custom',
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({ 'smart_account.custom.api_key': 'should_not_use' });
      expect(() => resolveWalletBundlerUrl(wallet, 'ethereum-sepolia', settings)).toThrow(/bundler URL/);
    });

    it('resolvePaymasterPolicyId falls back to global default', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: 'key',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({ 'smart_account.alchemy.paymaster_policy_id': 'pol_global_789' });
      expect(resolvePaymasterPolicyId(wallet, settings)).toBe('pol_global_789');
    });

    it('per-wallet policyId takes priority over global default', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'alchemy',
        aaProviderApiKey: 'key',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: 'pol_wallet_abc',
      };
      const settings = mockSettingsService({ 'smart_account.alchemy.paymaster_policy_id': 'pol_global_789' });
      expect(resolvePaymasterPolicyId(wallet, settings)).toBe('pol_wallet_abc');
    });

    it('resolvePaymasterPolicyId returns null when both absent', () => {
      const wallet: WalletProviderData = {
        aaProvider: 'pimlico',
        aaProviderApiKey: 'key',
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      expect(resolvePaymasterPolicyId(wallet)).toBeNull();
    });

    it('Lite mode (aaProvider=null) ignores global settings', () => {
      const wallet: WalletProviderData = {
        aaProvider: null,
        aaProviderApiKey: null,
        aaBundlerUrl: null,
        aaPaymasterUrl: null,
        aaPaymasterPolicyId: null,
      };
      const settings = mockSettingsService({ 'smart_account.pimlico.api_key': 'global' });
      expect(resolvePaymasterPolicyId(wallet, settings)).toBeNull();
    });
  });
});
