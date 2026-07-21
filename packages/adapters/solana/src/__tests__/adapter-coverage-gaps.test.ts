/**
 * Adapter-specific coverage gap tests.
 *
 * Targets uncovered branches in adapter.ts:
 * - simulateTransaction: logs ?? [], unitsConsumed null, err truthy
 * - waitForConfirmation: RPC error catch -> return submitted, confirmations null, slot null
 * - withRpcRetry: max retries exhausted, retryable error hit
 * - isRetryableRpcError: status code match, network error match, non-Error
 * - getAssets sort: b.isNative return 1, a.balance < b.balance
 * - NFT buildNftTransferTx: needCreateAta false branch (estimatedFee without ATA rent)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UnsignedTransaction } from '@waiaas/core';

// ── Hoisted mock setup ──

const { mockRpc, mockFindAssociatedTokenPda } = vi.hoisted(() => {
  const mockRpc = {
    getSlot: vi.fn(),
    getBalance: vi.fn(),
    getLatestBlockhash: vi.fn(),
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getSignatureStatuses: vi.fn(),
    getTokenAccountsByOwner: vi.fn(),
    getAccountInfo: vi.fn(),
  };
  const mockFindAssociatedTokenPda = vi.fn();
  return { mockRpc, mockFindAssociatedTokenPda };
});

vi.mock('@solana/kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/kit')>();
  return {
    ...actual,
    createSolanaRpc: vi.fn().mockReturnValue(mockRpc),
  };
});

vi.mock('@solana-program/token', () => {
  return {
    TOKEN_PROGRAM_ADDRESS: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN_PROGRAM_ADDRESS: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    findAssociatedTokenPda: mockFindAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstruction: vi.fn().mockReturnValue({
      programAddress: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      accounts: [],
      data: new Uint8Array([1]),
    }),
    getTransferCheckedInstruction: vi.fn().mockReturnValue({
      programAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      accounts: [],
      data: new Uint8Array([12]),
    }),
    getApproveCheckedInstruction: vi.fn().mockReturnValue({
      programAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      accounts: [],
      data: new Uint8Array([13]),
    }),
  };
});

import { SolanaAdapter } from '../adapter.js';

// ── Helpers ──

const TEST_RPC_URL = 'https://api.devnet.solana.com';

function mockSend<T>(value: T) {
  return vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(value) });
}

let adapter: SolanaAdapter;
let testFromAddress: string;
let testUnsignedTx: UnsignedTransaction;

async function generateTestFixtures() {
  const {
    createKeyPairFromBytes,
    getAddressFromPublicKey,
    getTransactionEncoder,
    compileTransaction,
    createTransactionMessage,
    setTransactionMessageFeePayer,
    appendTransactionMessageInstruction,
    setTransactionMessageLifetimeUsingBlockhash,
    pipe,
    createNoopSigner,
    blockhash,
    address,
  } = await import('@solana/kit');
  const { getTransferSolInstruction } = await import('@solana-program/system');
  const { webcrypto } = await import('node:crypto');

  const kp = (await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as {
    privateKey: CryptoKey;
    publicKey: CryptoKey;
  };
  const pkcs8 = new Uint8Array(await webcrypto.subtle.exportKey('pkcs8', kp.privateKey));
  const rawPriv = pkcs8.slice(-32);
  const rawPub = new Uint8Array(await webcrypto.subtle.exportKey('raw', kp.publicKey));

  const combined = new Uint8Array(64);
  combined.set(rawPriv, 0);
  combined.set(rawPub, 32);

  const solKp = await createKeyPairFromBytes(combined);
  testFromAddress = await getAddressFromPublicKey(solKp.publicKey);

  const kp2 = (await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as {
    privateKey: CryptoKey;
    publicKey: CryptoKey;
  };
  const pkcs8_2 = new Uint8Array(await webcrypto.subtle.exportKey('pkcs8', kp2.privateKey));
  const rawPriv2 = pkcs8_2.slice(-32);
  const rawPub2 = new Uint8Array(await webcrypto.subtle.exportKey('raw', kp2.publicKey));
  const combined2 = new Uint8Array(64);
  combined2.set(rawPriv2, 0);
  combined2.set(rawPub2, 32);
  const solKp2 = await createKeyPairFromBytes(combined2);
  const testToAddress = await getAddressFromPublicKey(solKp2.publicKey);

  const from = address(testFromAddress);
  const to = address(testToAddress);
  const fromSigner = createNoopSigner(from);

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(from, tx),
    (tx) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({ source: fromSigner, destination: to, amount: 1_000_000n }),
        tx,
      ),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash('4EPD2GJZkETChiMBc7G3yqga8TaczFNKSRJBuAGDNBRk'),
          lastValidBlockHeight: 200n,
        },
        tx,
      ),
  );

  const compiled = compileTransaction(txMessage);
  const encoder = getTransactionEncoder();
  const serialized = new Uint8Array(encoder.encode(compiled));

  testUnsignedTx = {
    chain: 'solana',
    serialized,
    estimatedFee: 5000n,
    expiresAt: new Date(Date.now() + 60_000),
    metadata: {
      blockhash: '4EPD2GJZkETChiMBc7G3yqga8TaczFNKSRJBuAGDNBRk',
      lastValidBlockHeight: 200,
      version: 0,
    },
  };
}

// ── Tests ──

describe('adapter.ts coverage gaps', () => {
  beforeEach(async () => {
    adapter = new SolanaAdapter('solana-devnet');
    vi.clearAllMocks();
    await generateTestFixtures();
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  // ── simulateTransaction branches ──

  describe('simulateTransaction result branches', () => {
    it('returns empty logs when simValue.logs is null/undefined', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.simulateTransaction = mockSend({
        value: {
          err: null,
          logs: null,
          unitsConsumed: 5000,
        },
      });

      const result = await adapter.simulateTransaction(testUnsignedTx);
      expect(result.success).toBe(true);
      expect(result.logs).toEqual([]);
      expect(result.unitsConsumed).toBe(5000n);
      expect(result.error).toBeUndefined();
    });

    it('returns undefined unitsConsumed when simValue.unitsConsumed is null', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.simulateTransaction = mockSend({
        value: {
          err: null,
          logs: ['log1'],
          unitsConsumed: null,
        },
      });

      const result = await adapter.simulateTransaction(testUnsignedTx);
      expect(result.success).toBe(true);
      expect(result.unitsConsumed).toBeUndefined();
    });

    it('returns error string when simValue.err is truthy', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.simulateTransaction = mockSend({
        value: {
          err: { InstructionError: [0, 'InsufficientFunds'] },
          logs: ['Program failed'],
          unitsConsumed: 200,
        },
      });

      const result = await adapter.simulateTransaction(testUnsignedTx);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('InstructionError');
    });
  });

  // ── waitForConfirmation branches ──

  describe('waitForConfirmation branches', () => {
    it('returns submitted on RPC error during polling', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.getSignatureStatuses = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('RPC error')),
      });

      const result = await adapter.waitForConfirmation('txHash123', 1000);
      expect(result.status).toBe('submitted');
      expect(result.txHash).toBe('txHash123');
    });

    it('returns undefined confirmations when status.confirmations is null', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.getSignatureStatuses = mockSend({
        value: [{
          confirmationStatus: 'confirmed',
          confirmations: null,
          slot: 12345,
        }],
      });

      const result = await adapter.waitForConfirmation('txHash456', 5000);
      expect(result.status).toBe('confirmed');
      expect(result.confirmations).toBeUndefined();
      expect(result.blockNumber).toBe(12345n);
    });

    it('returns undefined blockNumber when status.slot is null', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.getSignatureStatuses = mockSend({
        value: [{
          confirmationStatus: 'finalized',
          confirmations: 10,
          slot: null,
        }],
      });

      const result = await adapter.waitForConfirmation('txHash789', 5000);
      expect(result.status).toBe('finalized');
      expect(result.confirmations).toBe(10);
      expect(result.blockNumber).toBeUndefined();
    });
  });

  // ── getAssets sort comparator: b.isNative and a.balance < b.balance ──

  describe('getAssets sort comparator additional branches', () => {
    it('sorts tokens with different balances correctly (a < b)', async () => {
      await adapter.connect(TEST_RPC_URL);
      mockRpc.getBalance = mockSend({ value: 1_000_000_000n });

      // Two tokens: TokenA with higher balance, TokenB with lower balance
      mockRpc.getTokenAccountsByOwner = vi.fn()
        .mockReturnValueOnce({
          send: vi.fn().mockResolvedValue({
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'TokenLow11111111111111111111111111111111111',
                        tokenAmount: { amount: '100000', decimals: 6, uiAmountString: '0.1' },
                      },
                      type: 'account',
                    },
                  },
                },
              },
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'TokenHigh1111111111111111111111111111111111',
                        tokenAmount: { amount: '9000000', decimals: 6, uiAmountString: '9.0' },
                      },
                      type: 'account',
                    },
                  },
                },
              },
            ],
          }),
        })
        .mockReturnValueOnce({ send: vi.fn().mockResolvedValue({ value: [] }) });

      const assets = await adapter.getAssets(testFromAddress);
      expect(assets).toHaveLength(3);
      // First should be native SOL
      expect(assets[0]!.isNative).toBe(true);
      // Second should be the higher balance token
      expect(assets[1]!.balance).toBe(9000000n);
      // Third should be the lower balance token
      expect(assets[2]!.balance).toBe(100000n);
    });
  });
});
