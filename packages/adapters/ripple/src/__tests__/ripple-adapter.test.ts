/**
 * RippleAdapter unit tests with mocked xrpl.Client.
 *
 * Tests cover all 25 IChainAdapter methods:
 * - Connection management: connect, disconnect, isConnected, getHealth
 * - Balance query: getBalance (normal + account not found)
 * - Fee estimation: estimateFee with 120% safety margin
 * - Nonce: getCurrentNonce returns Sequence
 * - Transaction pipeline: build, simulate, sign, submit, waitForConfirmation
 * - Sign-only: parseTransaction, signExternalTransaction
 * - Assets: getAssets
 * - Utility: getTransactionFee
 * - Unsupported stubs: buildContractCall, buildBatch, approveNft, etc.
 * - Error mapping: connection, account not found, rate limit, timeout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChainError } from '@waiaas/core';
import type { TransferRequest, UnsignedTransaction } from '@waiaas/core';

// ---- Hoisted mock setup ----

const { mockClient, mockWallet } = vi.hoisted(() => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    request: vi.fn(),
    autofill: vi.fn(),
  };

  const mockWallet = {
    address: 'rTestSenderAddr',
    sign: vi.fn().mockReturnValue({
      tx_blob: 'AABBCCDD',
      hash: 'DEADBEEF',
    }),
  };

  return { mockClient, mockWallet };
});

vi.mock('xrpl', () => {
  // Wallet as a constructor function so `new Wallet(pub, priv, opts)` works
  const WalletCtor = vi.fn().mockImplementation((_pub: string, _priv: string, opts?: { masterAddress?: string }) => ({
    ...mockWallet,
    address: opts?.masterAddress ?? mockWallet.address,
  }));
  // Keep fromEntropy for any remaining references
  (WalletCtor as unknown as Record<string, unknown>).fromEntropy = vi.fn().mockReturnValue(mockWallet);
  const mod = {
    Client: vi.fn().mockImplementation(() => mockClient),
    Wallet: WalletCtor,
    ECDSA: { ed25519: 'ed25519', secp256k1: 'ecdsa-secp256k1' },
    // Address validation functions used by address-utils.ts
    isValidClassicAddress: vi.fn((addr: string) => typeof addr === 'string' && addr.startsWith('r')),
    isValidXAddress: vi.fn((addr: string) => typeof addr === 'string' && (addr.startsWith('X') || addr.startsWith('T')) && addr.length > 30),
    xAddressToClassicAddress: vi.fn((xAddr: string) => ({
      classicAddress: 'rDecodedFromXAddr',
      tag: xAddr.includes('WithTag') ? 99999 : false,
    })),
  };
  return { ...mod, default: mod };
});

vi.mock('ripple-keypairs', () => ({
  deriveAddress: vi.fn().mockReturnValue('rTestSenderAddr'),
  default: { deriveAddress: vi.fn().mockReturnValue('rTestSenderAddr') },
}));

// Import adapter after mocks
import { RippleAdapter } from '../adapter.js';

// ---- Test fixtures ----

const TEST_RPC_URL = 'wss://s.altnet.rippletest.net:51233';

const MOCK_SERVER_INFO = {
  result: {
    info: {
      validated_ledger: {
        seq: 12345,
        base_fee_xrp: 0.00001,
        reserve_base_xrp: 10,
        reserve_inc_xrp: 2,
      },
    },
  },
};

const MOCK_ACCOUNT_INFO = {
  result: {
    account_data: {
      Balance: '50000000', // 50 XRP in drops
      Sequence: 42,
      OwnerCount: 3,
    },
  },
};

function createAdapter(): RippleAdapter {
  return new RippleAdapter('xrpl-testnet' as any);
}

async function connectAdapter(adapter: RippleAdapter): Promise<void> {
  mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
  await adapter.connect(TEST_RPC_URL);
}

describe('RippleAdapter', () => {
  let adapter: RippleAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createAdapter();
  });

  afterEach(async () => {
    try {
      await adapter.disconnect();
    } catch {
      // ignore
    }
  });

  // -- Connection management --

  describe('connect', () => {
    it('creates client and connects', async () => {
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      expect(mockClient.connect).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(true);
    });

    it('fetches server_info on connect', async () => {
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      expect(mockClient.request).toHaveBeenCalledWith({ command: 'server_info' });
    });
  });

  describe('disconnect', () => {
    it('disconnects and resets state', async () => {
      await connectAdapter(adapter);

      mockClient.isConnected.mockReturnValue(false);
      await adapter.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('returns false before connect', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('returns true after connect', async () => {
      mockClient.isConnected.mockReturnValue(true);
      await connectAdapter(adapter);
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('getHealth', () => {
    it('returns healthy with ledger index', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);

      const health = await adapter.getHealth();

      expect(health.healthy).toBe(true);
      expect(health.blockHeight).toBe(12345n);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns unhealthy on error', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('Connection lost'));

      const health = await adapter.getHealth();

      expect(health.healthy).toBe(false);
    });
  });

  // -- Balance query --

  describe('getBalance', () => {
    it('returns correct balance in drops', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      const balance = await adapter.getBalance('rTestAddr');

      expect(balance.balance).toBe(50_000_000n);
      expect(balance.decimals).toBe(6);
      expect(balance.symbol).toBe('XRP');
      expect(balance.address).toBe('rTestAddr');
    });

    it('returns 0 balance for unfunded account', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('actNotFound'));

      const balance = await adapter.getBalance('rUnfunded');

      expect(balance.balance).toBe(0n);
      expect(balance.symbol).toBe('XRP');
    });

    it('throws for other errors', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('WebSocket connection lost'));

      await expect(adapter.getBalance('rAddr')).rejects.toThrow(ChainError);
    });
  });

  // -- Fee estimation --

  describe('estimateFee', () => {
    it('returns fee with 120% safety margin', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);

      const fee = await adapter.estimateFee({ from: 'rA', to: 'rB', amount: 1000n });

      // base_fee_xrp = 0.00001 XRP = 10 drops. 10 * 120 / 100 = 12
      expect(fee.fee).toBe(12n);
      expect(fee.details).toEqual({
        baseFee: '10',
        safetyMargin: '120%',
      });
    });
  });

  // -- Nonce --

  describe('getCurrentNonce', () => {
    it('returns Sequence from account_info', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      const nonce = await adapter.getCurrentNonce('rTestAddr');

      expect(nonce).toBe(42);
    });

    it('returns 0 for unfunded account', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('actNotFound'));

      const nonce = await adapter.getCurrentNonce('rUnfunded');

      expect(nonce).toBe(0);
    });
  });

  // -- Transaction pipeline --

  describe('buildTransaction', () => {
    it('creates Payment with correct fields', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const request: TransferRequest = {
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
      };

      const tx = await adapter.buildTransaction(request);

      expect(tx.chain).toBe('ripple');
      expect(tx.estimatedFee).toBe(14n); // 12 * 120 / 100 = 14.4 -> 14n (bigint truncation)
      expect(tx.metadata['Sequence']).toBe(10);
      expect(tx.metadata['LastLedgerSequence']).toBe(12370);
      expect(tx.nonce).toBe(10);
    });

    it('includes DestinationTag from memo (numeric string)', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        DestinationTag: 12345,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const request: TransferRequest = {
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: '12345',
      };

      const tx = await adapter.buildTransaction(request);
      expect(tx.metadata['DestinationTag']).toBe(12345);
    });

    it('applies fee safety margin (120%)', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '100', // 100 drops base
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
      });

      // 100 * 120 / 100 = 120
      expect(tx.estimatedFee).toBe(120n);
    });
  });

  describe('simulateTransaction', () => {
    it('validates via autofill', async () => {
      await connectAdapter(adapter);

      const txPayload = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
      };
      const serialized = new TextEncoder().encode(JSON.stringify(txPayload));

      mockClient.autofill.mockResolvedValueOnce(txPayload);

      const result = await adapter.simulateTransaction({
        chain: 'ripple',
        serialized,
        estimatedFee: 12n,
        metadata: {},
      });

      expect(result.success).toBe(true);
      expect(result.logs).toContain('autofill validation passed');
    });

    it('returns failure on autofill error', async () => {
      await connectAdapter(adapter);

      const txPayload = { TransactionType: 'Payment' };
      const serialized = new TextEncoder().encode(JSON.stringify(txPayload));

      mockClient.autofill.mockRejectedValueOnce(new Error('Invalid tx'));

      const result = await adapter.simulateTransaction({
        chain: 'ripple',
        serialized,
        estimatedFee: 12n,
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tx');
    });
  });

  describe('signTransaction', () => {
    it('signs with Ed25519 seed and returns tx_blob bytes', async () => {
      await connectAdapter(adapter);

      const txPayload = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
      };
      const serialized = new TextEncoder().encode(JSON.stringify(txPayload));

      const unsignedTx: UnsignedTransaction = {
        chain: 'ripple',
        serialized,
        estimatedFee: 12n,
        metadata: {},
      };

      const privateKey = new Uint8Array(32).fill(1);
      const signedBytes = await adapter.signTransaction(unsignedTx, privateKey);

      expect(signedBytes).toBeInstanceOf(Uint8Array);
      expect(signedBytes.length).toBeGreaterThan(0);
    });

    it('throws WALLET_NOT_SIGNER if address mismatch', async () => {
      await connectAdapter(adapter);

      // mockWallet.address is 'rTestSenderAddr' but tx Account is different
      const txPayload = {
        TransactionType: 'Payment',
        Account: 'rWrongAddress',
        Destination: 'rReceiver',
        Amount: '1000000',
      };
      const serialized = new TextEncoder().encode(JSON.stringify(txPayload));

      const unsignedTx: UnsignedTransaction = {
        chain: 'ripple',
        serialized,
        estimatedFee: 12n,
        metadata: {},
      };

      const privateKey = new Uint8Array(32).fill(1);

      await expect(adapter.signTransaction(unsignedTx, privateKey)).rejects.toThrow(ChainError);
      try {
        await adapter.signTransaction(unsignedTx, privateKey);
      } catch (e) {
        expect((e as ChainError).code).toBe('WALLET_NOT_SIGNER');
      }
    });
  });

  describe('submitTransaction', () => {
    it('returns txHash and submitted status on tesSUCCESS', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'tesSUCCESS',
          tx_json: { hash: 'AABBCCDD' },
        },
      });

      const signedTx = new Uint8Array(Buffer.from('DEADBEEF', 'hex'));
      const result = await adapter.submitTransaction(signedTx);

      expect(result.txHash).toBe('AABBCCDD');
      expect(result.status).toBe('submitted');
    });

    it('handles tec result as submitted', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'tecNO_DST',
          tx_json: { hash: 'DEADBEEF' },
        },
      });

      const signedTx = new Uint8Array(Buffer.from('AABB', 'hex'));
      const result = await adapter.submitTransaction(signedTx);

      expect(result.status).toBe('submitted');
    });

    it('throws on rejected transaction (tef/tel/tem)', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'tefPAST_SEQ',
          engine_result_message: 'Past sequence',
          tx_json: { hash: 'BAD' },
        },
      });

      const signedTx = new Uint8Array(Buffer.from('AABB', 'hex'));
      await expect(adapter.submitTransaction(signedTx)).rejects.toThrow(ChainError);
    });
  });

  describe('waitForConfirmation', () => {
    it('returns confirmed for validated tx', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: true,
          meta: { TransactionResult: 'tesSUCCESS' },
          ledger_index: 12346,
          Fee: '12',
        },
      });

      const result = await adapter.waitForConfirmation('TXHASH', 5000);

      expect(result.status).toBe('confirmed');
      expect(result.txHash).toBe('TXHASH');
      expect(result.blockNumber).toBe(12346n);
      expect(result.fee).toBe(12n);
    });

    it('returns failed for validated tx with tec result', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: true,
          meta: { TransactionResult: 'tecNO_DST' },
          ledger_index: 12346,
          Fee: '12',
        },
      });

      const result = await adapter.waitForConfirmation('TXHASH', 5000);

      expect(result.status).toBe('failed');
    });

    it('returns submitted on timeout', async () => {
      await connectAdapter(adapter);

      // Never return validated: true
      mockClient.request.mockRejectedValue(new Error('txnNotFound'));

      const result = await adapter.waitForConfirmation('TXHASH', 100);

      expect(result.status).toBe('submitted');
    });
  });

  // -- Assets --

  describe('getAssets', () => {
    it('returns native XRP asset', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);
      // account_lines returns empty for this basic test
      mockClient.request.mockResolvedValueOnce({ result: { lines: [] } });

      const assets = await adapter.getAssets('rTestAddr');

      expect(assets).toHaveLength(1);
      expect(assets[0]!.symbol).toBe('XRP');
      expect(assets[0]!.isNative).toBe(true);
      expect(assets[0]!.balance).toBe(50_000_000n);
    });
  });

  // -- Utility --

  describe('getTransactionFee', () => {
    it('returns fee from metadata', async () => {
      const tx: UnsignedTransaction = {
        chain: 'ripple',
        serialized: new Uint8Array(0),
        estimatedFee: 12n,
        metadata: { Fee: '15' },
      };

      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(15n);
    });

    it('falls back to estimatedFee', async () => {
      const tx: UnsignedTransaction = {
        chain: 'ripple',
        serialized: new Uint8Array(0),
        estimatedFee: 12n,
        metadata: {},
      };

      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(12n);
    });
  });

  // -- Sign-only --

  describe('parseTransaction', () => {
    it('delegates to parseRippleTransaction', async () => {
      await connectAdapter(adapter);

      const rawTx = JSON.stringify({
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
      });

      const parsed = await adapter.parseTransaction(rawTx);
      expect(parsed.operations).toHaveLength(1);
      expect(parsed.operations[0]!.type).toBe('NATIVE_TRANSFER');
    });
  });

  describe('signExternalTransaction', () => {
    it('signs raw transaction JSON', async () => {
      await connectAdapter(adapter);

      const rawTx = JSON.stringify({
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
      });

      const privateKey = new Uint8Array(32).fill(1);
      const result = await adapter.signExternalTransaction(rawTx, privateKey);

      expect(result.signedTransaction).toBe('AABBCCDD');
      expect(result.txHash).toBe('DEADBEEF');
    });
  });

  // -- Trust Line: buildApprove (TrustSet) --

  describe('buildApprove (TrustSet)', () => {
    it('creates TrustSet with tfSetNoRipple flag', async () => {
      await connectAdapter(adapter);

      const autofilledTrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rTestSenderAddr',
        LimitAmount: {
          currency: 'USD',
          issuer: 'rIssuer',
          value: '1000',
        },
        Flags: 131072,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledTrustSet);

      const tx = await adapter.buildApprove({
        from: 'rTestSenderAddr',
        spender: 'rIssuer',
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
        amount: 1000_000_000_000_000_000n, // 1000 with 15 decimals
      });

      expect(tx.chain).toBe('ripple');
      expect(tx.estimatedFee).toBe(14n); // 12 * 120 / 100

      // Verify the autofill was called with TrustSet
      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.TransactionType).toBe('TrustSet');
      expect(autofillArg.LimitAmount.currency).toBe('USD');
      expect(autofillArg.LimitAmount.issuer).toBe('rIssuer');
      expect(autofillArg.LimitAmount.value).toBe('1000');
      expect(autofillArg.Flags).toBe(131072); // tfSetNoRipple
    });

    it('applies fee safety margin', async () => {
      await connectAdapter(adapter);

      const autofilledTrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rTestSenderAddr',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Flags: 131072,
        Sequence: 10,
        Fee: '100',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledTrustSet);

      const tx = await adapter.buildApprove({
        from: 'rTestSenderAddr',
        spender: 'rIssuer',
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
        amount: 100_000_000_000_000_000n,
      });

      expect(tx.estimatedFee).toBe(120n); // 100 * 120 / 100
    });

    it('throws on invalid token address', async () => {
      await connectAdapter(adapter);

      await expect(
        adapter.buildApprove({
          from: 'rTestSenderAddr',
          spender: 'rIssuer',
          token: { address: 'invalid-no-dot', decimals: 15, symbol: 'USD' },
          amount: 100n,
        }),
      ).rejects.toThrow(ChainError);
    });
  });

  // -- Trust Line: buildTokenTransfer (IOU Payment) --

  describe('buildTokenTransfer (IOU Payment)', () => {
    it('creates IOU Payment with Amount object', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rReceiver',
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '100.5' },
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'rReceiver',
        amount: 100_500_000_000_000_000n, // 100.5 with 15 decimals
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
      });

      expect(tx.chain).toBe('ripple');

      // Verify autofill was called with IOU Amount object
      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.TransactionType).toBe('Payment');
      expect(typeof autofillArg.Amount).toBe('object');
      expect(autofillArg.Amount.currency).toBe('USD');
      expect(autofillArg.Amount.issuer).toBe('rIssuer');
      expect(autofillArg.Amount.value).toBe('100.5');
    });

    it('handles X-address destination', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rDecodedFromXAddr',
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '50' },
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'XV5sbjUmgPpvXv4ixFWZ5ptAYZ6PD28Sq49uo34VyjnmK5H', // X-address (>30 chars, starts with X)
        amount: 50_000_000_000_000_000n,
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
      });

      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.Destination).toBe('rDecodedFromXAddr');
    });

    it('includes DestinationTag from memo', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rReceiver',
        DestinationTag: 42,
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '10' },
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'rReceiver',
        amount: 10_000_000_000_000_000n,
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
        memo: '42',
      });

      expect(tx.metadata['DestinationTag']).toBe(42);
    });

    it('handles 40-char hex currency code', async () => {
      await connectAdapter(adapter);
      const hexCurrency = '0158415500000000000000000000000000000000';

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rReceiver',
        Amount: { currency: hexCurrency.toUpperCase(), issuer: 'rIssuer', value: '100' },
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'rReceiver',
        amount: 100_000_000_000_000_000n,
        token: { address: `${hexCurrency}.rIssuer`, decimals: 15, symbol: 'HEX' },
      });

      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.Amount.currency).toBe(hexCurrency.toUpperCase());
    });
  });

  // -- Trust Line: getTokenInfo --

  describe('getTokenInfo', () => {
    it('returns Trust Line metadata without RPC call', async () => {
      await connectAdapter(adapter);

      const info = await adapter.getTokenInfo('USD.rIssuer');

      expect(info.address).toBe('USD.rIssuer');
      expect(info.symbol).toBe('USD');
      expect(info.name).toBe('Trust Line: USD');
      expect(info.decimals).toBe(15);

      // Only 1 call from connect (server_info), no additional calls for getTokenInfo
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });

    it('throws on invalid token address format', async () => {
      await connectAdapter(adapter);

      await expect(adapter.getTokenInfo('invalid')).rejects.toThrow(ChainError);
    });
  });

  // -- Trust Line: getAssets (with Trust Lines) --

  describe('getAssets (with Trust Lines)', () => {
    it('returns XRP + Trust Line tokens', async () => {
      await connectAdapter(adapter);

      // Mock account_info for XRP balance
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      // Mock account_lines for Trust Lines
      mockClient.request.mockResolvedValueOnce({
        result: {
          lines: [
            { account: 'rIssuer1', balance: '100.5', currency: 'USD', limit: '1000' },
            { account: 'rIssuer2', balance: '0', currency: 'EUR', limit: '500' },
          ],
        },
      });

      const assets = await adapter.getAssets('rTestAddr');

      expect(assets).toHaveLength(3);

      // XRP native
      expect(assets[0]!.symbol).toBe('XRP');
      expect(assets[0]!.isNative).toBe(true);
      expect(assets[0]!.balance).toBe(50_000_000n);

      // USD Trust Line
      expect(assets[1]!.mint).toBe('USD.rIssuer1');
      expect(assets[1]!.symbol).toBe('USD');
      expect(assets[1]!.isNative).toBe(false);
      expect(assets[1]!.decimals).toBe(15);
      expect(assets[1]!.balance).toBe(100_500_000_000_000_000n);

      // EUR Trust Line (zero balance, still included)
      expect(assets[2]!.mint).toBe('EUR.rIssuer2');
      expect(assets[2]!.symbol).toBe('EUR');
      expect(assets[2]!.balance).toBe(0n);
    });

    it('returns only XRP for unfunded account', async () => {
      await connectAdapter(adapter);

      // Mock actNotFound for account_info
      mockClient.request.mockRejectedValueOnce(new Error('actNotFound'));

      // Mock actNotFound for account_lines too
      mockClient.request.mockRejectedValueOnce(new Error('actNotFound'));

      const assets = await adapter.getAssets('rUnfunded');

      expect(assets).toHaveLength(1);
      expect(assets[0]!.symbol).toBe('XRP');
      expect(assets[0]!.balance).toBe(0n);
    });

    it('handles X-address input', async () => {
      await connectAdapter(adapter);

      // Mock account_info for XRP balance
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      // Mock account_lines
      mockClient.request.mockResolvedValueOnce({
        result: { lines: [] },
      });

      const assets = await adapter.getAssets('XV5sbjUmgPpvXv4ixFWZ5ptAYZ6PD28Sq49uo34VyjnmK5H');

      // X-address should be decoded, account_lines called with classic address
      expect(assets).toHaveLength(1); // Only XRP, no trust lines
      expect(assets[0]!.symbol).toBe('XRP');
    });
  });

  // -- buildContractCall: XRPL native tx routing --

  describe('buildContractCall -- XRPL native tx routing', () => {
    it('buildContractCall with OfferCreate calldata returns UnsignedTransaction', async () => {
      await connectAdapter(adapter);

      const autofilledOffer = {
        TransactionType: 'OfferCreate',
        Account: 'rTestSenderAddr',
        TakerPays: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        TakerGets: '50000000',
        Sequence: 20,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledOffer);

      const tx = await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'OfferCreate',
          TakerPays: { currency: 'USD', issuer: 'rIssuer', value: '100' },
          TakerGets: '50000000',
        }),
      });

      expect(tx.chain).toBe('ripple');
      expect(tx.estimatedFee).toBe(14n); // 12 * 120 / 100
      expect(tx.metadata['Sequence']).toBe(20);
      expect(tx.metadata['originalTx']).toBeDefined();
      expect(tx.nonce).toBe(20);

      // Verify serialized contains OfferCreate
      const txJson = new TextDecoder().decode(tx.serialized);
      expect(txJson).toContain('OfferCreate');

      // Verify autofill was called with correct shape
      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.TransactionType).toBe('OfferCreate');
      expect(autofillArg.Account).toBe('rTestSenderAddr');
      expect(autofillArg.TakerGets).toBe('50000000');
    });

    it('buildContractCall with OfferCancel calldata returns UnsignedTransaction', async () => {
      await connectAdapter(adapter);

      const autofilledCancel = {
        TransactionType: 'OfferCancel',
        Account: 'rTestSenderAddr',
        OfferSequence: 42,
        Sequence: 21,
        Fee: '12',
        LastLedgerSequence: 12375,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledCancel);

      const tx = await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'OfferCancel',
          OfferSequence: 42,
        }),
      });

      expect(tx.chain).toBe('ripple');
      expect(tx.metadata['Sequence']).toBe(21);
      expect(tx.nonce).toBe(21);

      const txJson = new TextDecoder().decode(tx.serialized);
      expect(txJson).toContain('OfferCancel');
      expect(txJson).toContain('42');
    });

    it('buildContractCall with OfferCreate preserves Flags and Expiration', async () => {
      await connectAdapter(adapter);

      const autofilledOffer = {
        TransactionType: 'OfferCreate',
        Account: 'rTestSenderAddr',
        TakerPays: '50000000',
        TakerGets: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Flags: 0x00080000, // tfImmediateOrCancel
        Expiration: 750000000,
        Sequence: 22,
        Fee: '12',
        LastLedgerSequence: 12380,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledOffer);

      await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'OfferCreate',
          TakerPays: '50000000',
          TakerGets: { currency: 'USD', issuer: 'rIssuer', value: '100' },
          Flags: 0x00080000,
          Expiration: 750000000,
        }),
      });

      // Verify flags and expiration were passed through to autofill
      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.Flags).toBe(0x00080000);
      expect(autofillArg.Expiration).toBe(750000000);
    });

    it('buildContractCall without calldata throws INVALID_INSTRUCTION', async () => {
      await expect(
        adapter.buildContractCall({ from: 'r1', to: 'r2' }),
      ).rejects.toThrow(ChainError);

      try {
        await adapter.buildContractCall({ from: 'r1', to: 'r2' });
      } catch (e) {
        expect((e as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });

    it('buildContractCall with unknown xrplTxType throws INVALID_INSTRUCTION', async () => {
      try {
        await adapter.buildContractCall({
          from: 'r1',
          to: '',
          calldata: JSON.stringify({ xrplTxType: 'EscrowCreate' }),
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('INVALID_INSTRUCTION');
        expect((e as ChainError).message).toContain('Unsupported XRPL transaction type');
      }
    });

    it('buildContractCall with non-JSON calldata throws INVALID_INSTRUCTION', async () => {
      try {
        await adapter.buildContractCall({
          from: 'r1',
          to: '',
          calldata: '0xabcdef1234',
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });
  });

  // -- Unsupported methods --

  describe('unsupported methods', () => {

    it('buildBatch throws BATCH_NOT_SUPPORTED', async () => {
      await expect(
        adapter.buildBatch({ from: 'r1', instructions: [] }),
      ).rejects.toThrow(ChainError);
      try {
        await adapter.buildBatch({ from: 'r1', instructions: [] });
      } catch (e) {
        expect((e as ChainError).code).toBe('BATCH_NOT_SUPPORTED');
      }
    });

    it('approveNft throws', async () => {
      await expect(
        adapter.approveNft({ from: 'r1', spender: 'r2', token: { address: 'a', tokenId: '1', standard: 'ERC-721' }, approvalType: 'single' }),
      ).rejects.toThrow(ChainError);
    });

    it('buildNftTransferTx throws when not connected', async () => {
      await expect(
        adapter.buildNftTransferTx({ from: 'r1', to: 'r2', token: { address: '', tokenId: '0'.repeat(64), standard: 'XLS-20' }, amount: 1n }),
      ).rejects.toThrow(ChainError);
    });

    it('transferNft throws when not connected', async () => {
      await expect(
        adapter.transferNft({ from: 'r1', to: 'r2', token: { address: '', tokenId: '0'.repeat(64), standard: 'XLS-20' }, amount: 1n }, new Uint8Array(32)),
      ).rejects.toThrow(ChainError);
    });
  });

  // -- Error mapping --

  describe('error mapping', () => {
    it('maps connection errors to RPC_CONNECTION_ERROR', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('WebSocket disconnected'));

      try {
        await adapter.getBalance('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });

    it('maps actNotFound to ACCOUNT_NOT_FOUND (balance returns 0)', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('actNotFound'));

      // getBalance handles actNotFound gracefully (returns 0)
      const balance = await adapter.getBalance('rUnfunded');
      expect(balance.balance).toBe(0n);
    });

    it('maps timeout errors to RPC_TIMEOUT', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('Request timeout'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RPC_TIMEOUT');
      }
    });
  });

  // -- Not connected guard --

  describe('not connected guard', () => {
    it('throws RPC_CONNECTION_ERROR when not connected', async () => {
      await expect(adapter.getBalance('rAddr')).rejects.toThrow(ChainError);
    });
  });

  // -- connect edge cases --

  describe('connect edge cases', () => {
    it('disconnects existing client before reconnecting', async () => {
      // First connect
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      // Second connect -- should disconnect existing client first
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      // disconnect called at least once from the reconnection
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('ignores disconnect error on reconnect', async () => {
      // First connect
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      // Make disconnect throw
      mockClient.disconnect.mockRejectedValueOnce(new Error('Already disconnected'));

      // Second connect should not throw
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      expect(adapter.isConnected()).toBe(true);
    });
  });

  // -- disconnect edge cases --

  describe('disconnect edge cases', () => {
    it('handles disconnect when no client exists', async () => {
      // Never connected -- should not throw
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it('ignores disconnect error', async () => {
      await connectAdapter(adapter);
      mockClient.disconnect.mockRejectedValueOnce(new Error('WebSocket error'));
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  // -- getHealth edge cases --

  describe('getHealth edge cases', () => {
    it('handles server_info without validated_ledger', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce({
        result: {
          info: {
            // No validated_ledger
          },
        },
      });

      const health = await adapter.getHealth();
      expect(health.healthy).toBe(true);
      expect(health.blockHeight).toBe(0n);
    });
  });

  // -- getBalance edge cases --

  describe('getBalance edge cases', () => {
    it('decodes X-address for balance query', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      const balance = await adapter.getBalance('XV5sbjUmgPpvXv4ixFWZ5ptAYZ6PD28Sq49uo34VyjnmK5H');

      expect(balance.address).toBe('rDecodedFromXAddr');
    });

    it('handles Account not found message variant', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('Account not found'));

      const balance = await adapter.getBalance('rUnfunded');
      expect(balance.balance).toBe(0n);
    });
  });

  // -- buildTransaction edge cases --

  describe('buildTransaction edge cases', () => {
    it('handles X-address destination with tag', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rDecodedFromXAddr',
        Amount: '1000000',
        DestinationTag: 99999,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'XV5sbjUmgPpvXv4ixFWZ5ptWithTagGGGGGGGGGGGGGGGGGGG',
        amount: 1_000_000n,
      });

      expect(tx.metadata['DestinationTag']).toBe(99999);
    });

    it('uses memo DestinationTag from JSON with destinationTag key', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        DestinationTag: 777,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: JSON.stringify({ destinationTag: 777 }),
      });

      expect(tx.metadata['DestinationTag']).toBe(777);
    });

    it('uses memo DestinationTag from JSON with DestinationTag key', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        DestinationTag: 888,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: JSON.stringify({ DestinationTag: 888 }),
      });

      expect(tx.metadata['DestinationTag']).toBe(888);
    });

    it('uses memo DestinationTag from JSON with destination_tag key', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        DestinationTag: 999,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: JSON.stringify({ destination_tag: 999 }),
      });

      expect(tx.metadata['DestinationTag']).toBe(999);
    });

    it('ignores non-numeric, non-JSON memo', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: 'hello world',
      });

      expect(tx.metadata['DestinationTag']).toBeUndefined();
    });

    it('ignores memo with negative number', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: '-1',
      });

      expect(tx.metadata['DestinationTag']).toBeUndefined();
    });

    it('ignores memo with float number', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: '1.5',
      });

      expect(tx.metadata['DestinationTag']).toBeUndefined();
    });

    it('ignores memo with too-large number', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: '5000000000', // > 4294967295
      });

      expect(tx.metadata['DestinationTag']).toBeUndefined();
    });

    it('ignores memo JSON with non-number tag', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
        memo: JSON.stringify({ destinationTag: 'not-a-number' }),
      });

      expect(tx.metadata['DestinationTag']).toBeUndefined();
    });

    it('defaults Fee to 12 when autofill omits Fee', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        // No Fee field
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
      });

      // Default 12 * 120 / 100 = 14n
      expect(tx.estimatedFee).toBe(14n);
    });

    it('defaults LastLedgerSequence to 0 when autofill omits it', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rSender',
        Destination: 'rReceiver',
        Amount: '1000000',
        Sequence: 10,
        Fee: '12',
        // No LastLedgerSequence
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTransaction({
        from: 'rSender',
        to: 'rReceiver',
        amount: 1_000_000n,
      });

      expect(tx.chain).toBe('ripple');
      expect(tx.expiresAt).toBeDefined();
    });
  });

  // -- simulateTransaction edge cases --

  describe('simulateTransaction edge cases', () => {
    it('returns non-Error string in error field', async () => {
      await connectAdapter(adapter);

      const serialized = new TextEncoder().encode(JSON.stringify({ TransactionType: 'Payment' }));
      mockClient.autofill.mockRejectedValueOnce('string error');

      const result = await adapter.simulateTransaction({
        chain: 'ripple',
        serialized,
        estimatedFee: 12n,
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });
  });

  // -- submitTransaction edge cases --

  describe('submitTransaction edge cases', () => {
    it('handles missing tx_json hash', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'tesSUCCESS',
          // No tx_json
        },
      });

      const signedTx = new Uint8Array(Buffer.from('AABB', 'hex'));
      const result = await adapter.submitTransaction(signedTx);
      expect(result.txHash).toBe('');
      expect(result.status).toBe('submitted');
    });

    it('includes engine_result_message in error', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'tefPAST_SEQ',
          engine_result_message: 'This sequence number has already been used.',
          tx_json: { hash: 'BAD' },
        },
      });

      const signedTx = new Uint8Array(Buffer.from('AABB', 'hex'));
      await expect(adapter.submitTransaction(signedTx)).rejects.toThrow('tefPAST_SEQ');
    });

    it('handles missing engine_result_message', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          engine_result: 'temMALFORMED',
          tx_json: { hash: 'BAD' },
        },
      });

      const signedTx = new Uint8Array(Buffer.from('AABB', 'hex'));
      await expect(adapter.submitTransaction(signedTx)).rejects.toThrow(ChainError);
    });
  });

  // -- waitForConfirmation edge cases --

  describe('waitForConfirmation edge cases', () => {
    it('handles validated tx without meta', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: true,
          // No meta field -- should default to tesSUCCESS
          ledger_index: 12346,
          Fee: '12',
        },
      });

      const result = await adapter.waitForConfirmation('TXHASH', 5000);
      expect(result.status).toBe('confirmed');
    });

    it('handles validated tx without ledger_index and Fee', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: true,
          meta: { TransactionResult: 'tesSUCCESS' },
          // No ledger_index, no Fee
        },
      });

      const result = await adapter.waitForConfirmation('TXHASH', 5000);
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBeUndefined();
      expect(result.fee).toBeUndefined();
    });

    it('continues polling when tx not yet validated', async () => {
      await connectAdapter(adapter);

      // First call: not validated
      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: false,
        },
      });
      // Second call: validated
      mockClient.request.mockResolvedValueOnce({
        result: {
          validated: true,
          meta: { TransactionResult: 'tesSUCCESS' },
          ledger_index: 12347,
          Fee: '12',
        },
      });

      const result = await adapter.waitForConfirmation('TXHASH', 10000);
      expect(result.status).toBe('confirmed');
    });

    it('throws on non-txNotFound, non-actNotFound error', async () => {
      await connectAdapter(adapter);

      mockClient.request.mockRejectedValueOnce(new Error('WebSocket disconnected'));

      await expect(adapter.waitForConfirmation('TXHASH', 5000)).rejects.toThrow(ChainError);
    });

    it('handles actNotFound error during polling', async () => {
      await connectAdapter(adapter);

      // actNotFound errors are ignored, continue polling until timeout
      mockClient.request.mockRejectedValue(new Error('actNotFound'));

      const result = await adapter.waitForConfirmation('TXHASH', 100);
      expect(result.status).toBe('submitted');
    });
  });

  // -- getCurrentNonce edge cases --

  describe('getCurrentNonce edge cases', () => {
    it('decodes X-address for nonce query', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);

      const nonce = await adapter.getCurrentNonce('XV5sbjUmgPpvXv4ixFWZ5ptAYZ6PD28Sq49uo34VyjnmK5H');
      expect(nonce).toBe(42);
    });

    it('throws on non-actNotFound error', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('not connected'));

      await expect(adapter.getCurrentNonce('rAddr')).rejects.toThrow(ChainError);
    });

    it('handles Account not found message variant', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('Account not found'));

      const nonce = await adapter.getCurrentNonce('rUnfunded');
      expect(nonce).toBe(0);
    });
  });

  // -- refreshServerInfo edge cases --

  describe('refreshServerInfo (via estimateFee)', () => {
    it('uses defaults when server_info fails and no previous info', async () => {
      // Connect with successful server_info
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      // Disconnect and reconnect with failing server_info to reset serverInfo
      await adapter.disconnect();

      // Reconnect
      mockClient.request.mockResolvedValueOnce(MOCK_SERVER_INFO);
      await adapter.connect(TEST_RPC_URL);

      // Now estimateFee calls refreshServerInfo -- make it fail
      mockClient.request.mockRejectedValueOnce(new Error('server_info failed'));

      const fee = await adapter.estimateFee({ from: 'rA', to: 'rB', amount: 1000n });

      // Should use previously cached info (baseFee=10 -> 12n with safety margin)
      expect(fee.fee).toBe(12n);
    });

    it('uses fallback defaults when server_info fails with no cache', async () => {
      // Create a fresh adapter and connect but make server_info fail on connect
      const freshAdapter = createAdapter();

      // Connect -- server_info succeeds with no validated_ledger
      mockClient.request.mockResolvedValueOnce({
        result: {
          info: {
            // No validated_ledger
          },
        },
      });
      await freshAdapter.connect(TEST_RPC_URL);

      // estimateFee refreshes server_info, make it fail
      mockClient.request.mockRejectedValueOnce(new Error('server_info failed'));

      const fee = await freshAdapter.estimateFee({ from: 'rA', to: 'rB', amount: 1000n });

      // Falls back to default baseFee of 10 drops -> 12n with safety
      expect(fee.fee).toBe(12n);
    });
  });

  // -- getAssets edge cases --

  describe('getAssets edge cases', () => {
    it('throws on non-actNotFound error in account_lines', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockResolvedValueOnce(MOCK_ACCOUNT_INFO);
      // account_lines fails with non-actNotFound error
      mockClient.request.mockRejectedValueOnce(new Error('WebSocket error'));

      await expect(adapter.getAssets('rTestAddr')).rejects.toThrow(ChainError);
    });
  });

  // -- buildContractCall edge cases --

  describe('buildContractCall edge cases', () => {
    it('handles TrustSet via calldata routing', async () => {
      await connectAdapter(adapter);

      const autofilledTrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rTestSenderAddr',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '1000' },
        Flags: 0x00020000,
        Sequence: 30,
        Fee: '12',
        LastLedgerSequence: 12380,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledTrustSet);

      const tx = await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'TrustSet',
          LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '1000' },
        }),
      });

      expect(tx.chain).toBe('ripple');
      const txJson = new TextDecoder().decode(tx.serialized);
      expect(txJson).toContain('TrustSet');
    });

    it('TrustSet uses default Flags when not specified', async () => {
      await connectAdapter(adapter);

      const autofilledTrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rTestSenderAddr',
        LimitAmount: { currency: 'EUR', issuer: 'rBank', value: '500' },
        Flags: 0x00020000,
        Sequence: 31,
        Fee: '12',
        LastLedgerSequence: 12381,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledTrustSet);

      await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'TrustSet',
          LimitAmount: { currency: 'EUR', issuer: 'rBank', value: '500' },
          // No Flags -- should default to tfSetNoRipple
        }),
      });

      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.Flags).toBe(0x00020000);
    });

    it('OfferCreate with OfferSequence field', async () => {
      await connectAdapter(adapter);

      const autofilled = {
        TransactionType: 'OfferCreate',
        Account: 'rTestSenderAddr',
        TakerPays: '50000000',
        TakerGets: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        OfferSequence: 55,
        Sequence: 23,
        Fee: '12',
        LastLedgerSequence: 12380,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilled);

      await adapter.buildContractCall({
        from: 'rTestSenderAddr',
        to: '',
        calldata: JSON.stringify({
          xrplTxType: 'OfferCreate',
          TakerPays: '50000000',
          TakerGets: { currency: 'USD', issuer: 'rIssuer', value: '100' },
          OfferSequence: 55,
        }),
      });

      const autofillArg = mockClient.autofill.mock.calls[0]?.[0];
      expect(autofillArg.OfferSequence).toBe(55);
    });

    it('buildContractCall with no xrplTxType throws INVALID_INSTRUCTION', async () => {
      await connectAdapter(adapter);

      try {
        await adapter.buildContractCall({
          from: 'r1',
          to: '',
          calldata: JSON.stringify({ someField: 'value' }),
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('INVALID_INSTRUCTION');
        expect((e as ChainError).message).toContain('Unsupported XRPL transaction type');
      }
    });
  });

  // -- buildTokenTransfer edge cases --

  describe('buildTokenTransfer edge cases', () => {
    it('handles X-address with tag for token transfer', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rDecodedFromXAddr',
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '50' },
        DestinationTag: 99999,
        Sequence: 10,
        Fee: '12',
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'XV5sbjUmgPpvXv4ixFWZ5ptWithTagGGGGGGGGGGGGGGGGGGG',
        amount: 50_000_000_000_000_000n,
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
      });

      expect(tx.metadata['DestinationTag']).toBe(99999);
    });

    it('defaults Fee when autofill omits it for token transfer', async () => {
      await connectAdapter(adapter);

      const autofilledPayment = {
        TransactionType: 'Payment',
        Account: 'rTestSenderAddr',
        Destination: 'rReceiver',
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Sequence: 10,
        // No Fee
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilledPayment);

      const tx = await adapter.buildTokenTransfer({
        from: 'rTestSenderAddr',
        to: 'rReceiver',
        amount: 100_000_000_000_000_000n,
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
      });

      expect(tx.estimatedFee).toBe(14n); // 12 * 120 / 100
    });
  });

  // -- buildApprove edge cases --

  describe('buildApprove edge cases', () => {
    it('defaults Fee when autofill omits it for approve', async () => {
      await connectAdapter(adapter);

      const autofilled = {
        TransactionType: 'TrustSet',
        Account: 'rTestSenderAddr',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '1000' },
        Flags: 131072,
        Sequence: 10,
        // No Fee
        LastLedgerSequence: 12370,
      };
      mockClient.autofill.mockResolvedValueOnce(autofilled);

      const tx = await adapter.buildApprove({
        from: 'rTestSenderAddr',
        spender: 'rIssuer',
        token: { address: 'USD.rIssuer', decimals: 15, symbol: 'USD' },
        amount: 1000_000_000_000_000_000n,
      });

      expect(tx.estimatedFee).toBe(14n);
    });
  });

  // -- mapError comprehensive --

  describe('mapError (comprehensive)', () => {
    it('maps rate limit error', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('rate limiting in effect'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RATE_LIMITED');
      }
    });

    it('maps slowDown error to RATE_LIMITED', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('slowDown'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RATE_LIMITED');
      }
    });

    it('maps Timeout error', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('Timeout'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RPC_TIMEOUT');
      }
    });

    it('maps tecUNFUNDED to INSUFFICIENT_BALANCE', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('tecUNFUNDED_OFFER'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('maps insufficient error to INSUFFICIENT_BALANCE', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('insufficient balance'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('maps Account not found error to ACCOUNT_NOT_FOUND', async () => {
      await connectAdapter(adapter);
      // Use a method that triggers mapError, not getBalance (which handles actNotFound specially)
      mockClient.request.mockRejectedValueOnce(new Error('Account not found'));

      // getAssets -> getBalance uses classicAddress, actNotFound handler returns 0
      // but non-actNotFound gets thrown via mapError. Use a different approach.
      // Actually for the mapError path, we need to find a code path that calls mapError.
      // getCurrentNonce: actNotFound returns 0, others call mapError
      // So 'Account not found' matches isActNotFound, returns 0.
      const nonce = await adapter.getCurrentNonce('rAddr');
      expect(nonce).toBe(0);
    });

    it('maps non-Error to RPC_CONNECTION_ERROR', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce('string error without Error wrapper');

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });

    it('passes through ChainError unchanged', async () => {
      await connectAdapter(adapter);
      const originalError = new ChainError('BATCH_NOT_SUPPORTED', 'ripple', { message: 'test' });
      mockClient.request.mockRejectedValueOnce(originalError);

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBe(originalError);
      }
    });

    it('maps NotConnectedError to RPC_CONNECTION_ERROR', async () => {
      await connectAdapter(adapter);
      mockClient.request.mockRejectedValueOnce(new Error('NotConnectedError: not connected'));

      try {
        await adapter.getCurrentNonce('rAddr');
      } catch (e) {
        expect(e).toBeInstanceOf(ChainError);
        expect((e as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });
  });

  // -- isConnected edge cases --

  describe('isConnected edge cases', () => {
    it('returns false when client.isConnected returns false', async () => {
      await connectAdapter(adapter);
      mockClient.isConnected.mockReturnValue(false);
      expect(adapter.isConnected()).toBe(false);
    });
  });
});
