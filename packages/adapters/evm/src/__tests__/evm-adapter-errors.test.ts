/**
 * EvmAdapter error path and branch coverage tests.
 *
 * Phase 446-01 Task 1: Tests for mapError(), error rethrow branches,
 * waitForConfirmation fallback, getAssets multicall failure, getTokenInfo
 * partial failure, NFT unsupported standard, signExternalTransaction errors,
 * getTransactionFee metadata null fallback, and other uncovered branches.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WAIaaSError, ChainError } from '@waiaas/core';
import { EvmAdapter } from '../adapter.js';

// Mock client object with all methods
const mockClient = {
  getBlockNumber: vi.fn(),
  getBalance: vi.fn(),
  getTransactionCount: vi.fn(),
  estimateGas: vi.fn(),
  estimateFeesPerGas: vi.fn(),
  call: vi.fn(),
  sendRawTransaction: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  getTransactionReceipt: vi.fn(),
  multicall: vi.fn(),
  readContract: vi.fn(),
  chain: { id: 1 } as { id: number } | undefined,
};

// Mock viem module
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => mockClient),
    serializeTransaction: vi.fn(() => '0xf8deadbeef'),
    parseTransaction: vi.fn(() => ({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
      value: 1000000000000000000n,
      nonce: 5,
      gas: 25200n,
      maxFeePerGas: 30000000000n,
      maxPriorityFeePerGas: 1000000000n,
      chainId: 1,
      type: 'eip1559' as const,
    })),
    hexToBytes: vi.fn((hex: string) => {
      const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
      }
      return bytes;
    }),
    toHex: vi.fn((bytes: Uint8Array) => {
      return '0x' + Buffer.from(bytes).toString('hex');
    }),
    encodeFunctionData: vi.fn(() => '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001'),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    signTransaction: vi.fn(async () => '0xsigned_tx_hex_data'),
  })),
}));

const TEST_FROM = '0x1234567890abcdef1234567890abcdef12345678';
const TEST_TO = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
const TEST_TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('EvmAdapter error paths and branch coverage', () => {
  let adapter: EvmAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient.chain = { id: 1 };
    adapter = new EvmAdapter('ethereum-mainnet');
    await adapter.connect('https://eth-mainnet.example.com');
  });

  // -- mapError() branches --

  describe('mapError via buildTransaction', () => {
    beforeEach(() => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
    });

    it('maps "insufficient balance" to INSUFFICIENT_BALANCE', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('insufficient balance for transfer'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 999n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('maps "nonce too low" to NONCE_TOO_LOW', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('nonce too low'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('NONCE_TOO_LOW');
      }
    });

    it('maps "connection" error to RPC_CONNECTION_ERROR via mapError', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('connection reset by peer'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });

    it('maps "econnrefused" error to RPC_CONNECTION_ERROR', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:8545'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });

    it('maps "fetch failed" error to RPC_CONNECTION_ERROR', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('fetch failed'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_CONNECTION_ERROR');
      }
    });

    it('maps "timeout" error to RPC_TIMEOUT', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('timeout exceeded'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_TIMEOUT');
      }
    });

    it('maps "timed out" error to RPC_TIMEOUT', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('request timed out after 30s'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_TIMEOUT');
      }
    });

    it('maps generic error to CHAIN_ERROR', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('some random error'));

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        // mapError returns WAIaaSError for unknown errors
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });

    it('handles non-Error thrown value (string) via mapError', async () => {
      mockClient.estimateGas.mockRejectedValue('string error message');

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        // cause should be undefined when error is not an Error instance
        expect((error as WAIaaSError).cause).toBeUndefined();
      }
    });

    it('rethrows ChainError directly', async () => {
      const chainErr = new ChainError('NONCE_TOO_LOW', 'evm', { message: 'already used' });
      mockClient.estimateGas.mockRejectedValue(chainErr);

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('rethrows WAIaaSError directly', async () => {
      const waiaasErr = new WAIaaSError('CHAIN_ERROR', { message: 'custom' });
      mockClient.estimateGas.mockRejectedValue(waiaasErr);

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(waiaasErr);
      }
    });
  });

  // -- buildContractCall error paths --

  describe('buildContractCall error paths', () => {
    beforeEach(() => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
    });

    it('throws INVALID_INSTRUCTION for empty calldata', async () => {
      try {
        await adapter.buildContractCall({ from: TEST_FROM, to: TEST_TO, calldata: '' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });

    it('throws INVALID_INSTRUCTION for "0x" only calldata', async () => {
      try {
        await adapter.buildContractCall({ from: TEST_FROM, to: TEST_TO, calldata: '0x' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });

    it('throws INVALID_INSTRUCTION for calldata with only 2-byte selector', async () => {
      try {
        await adapter.buildContractCall({ from: TEST_FROM, to: TEST_TO, calldata: '0xabcd' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });

    it('maps insufficient funds in buildContractCall catch block', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('insufficient funds for gas'));

      try {
        await adapter.buildContractCall({
          from: TEST_FROM,
          to: TEST_TO,
          calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INSUFFICIENT_BALANCE');
      }
    });

    it('rethrows ChainError in buildContractCall', async () => {
      const chainErr = new ChainError('NONCE_TOO_LOW', 'evm', { message: 'nonce' });
      mockClient.estimateGas.mockRejectedValue(chainErr);

      try {
        await adapter.buildContractCall({
          from: TEST_FROM,
          to: TEST_TO,
          calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('rethrows WAIaaSError in buildContractCall', async () => {
      const waiaasErr = new WAIaaSError('CHAIN_ERROR', { message: 'custom' });
      mockClient.estimateGas.mockRejectedValue(waiaasErr);

      try {
        await adapter.buildContractCall({
          from: TEST_FROM,
          to: TEST_TO,
          calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(waiaasErr);
      }
    });

    it('maps generic error via mapError in buildContractCall', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('some unknown error'));

      try {
        await adapter.buildContractCall({
          from: TEST_FROM,
          to: TEST_TO,
          calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- submitTransaction error paths --

  describe('submitTransaction error paths', () => {
    it('throws NONCE_ALREADY_USED for "nonce ... already" error', async () => {
      mockClient.sendRawTransaction.mockRejectedValue(new Error('nonce already used'));

      try {
        await adapter.submitTransaction(new Uint8Array([0x01]));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('NONCE_ALREADY_USED');
      }
    });

    it('rethrows ChainError in submitTransaction', async () => {
      const chainErr = new ChainError('INSUFFICIENT_BALANCE', 'evm', { message: 'no funds' });
      mockClient.sendRawTransaction.mockRejectedValue(chainErr);

      try {
        await adapter.submitTransaction(new Uint8Array([0x01]));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('maps generic error via mapError in submitTransaction', async () => {
      mockClient.sendRawTransaction.mockRejectedValue(new Error('unknown submit error'));

      try {
        await adapter.submitTransaction(new Uint8Array([0x01]));
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- waitForConfirmation branches --

  describe('waitForConfirmation branches', () => {
    it('returns confirmed on successful receipt', async () => {
      mockClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 100n,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
      });

      const result = await adapter.waitForConfirmation('0xabc');
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(100n);
    });

    it('returns failed on reverted receipt', async () => {
      mockClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'reverted',
        blockNumber: 100n,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
      });

      const result = await adapter.waitForConfirmation('0xabc');
      expect(result.status).toBe('failed');
    });

    it('falls back to getTransactionReceipt on first error - confirmed', async () => {
      mockClient.waitForTransactionReceipt.mockRejectedValue(new Error('timeout'));
      mockClient.getTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 101n,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
      });

      const result = await adapter.waitForConfirmation('0xabc');
      expect(result.status).toBe('confirmed');
      expect(result.blockNumber).toBe(101n);
    });

    it('falls back to getTransactionReceipt on first error - reverted', async () => {
      mockClient.waitForTransactionReceipt.mockRejectedValue(new Error('timeout'));
      mockClient.getTransactionReceipt.mockResolvedValue({
        status: 'reverted',
        blockNumber: 102n,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
      });

      const result = await adapter.waitForConfirmation('0xabc');
      expect(result.status).toBe('failed');
      expect(result.blockNumber).toBe(102n);
    });

    it('returns submitted when both receipt calls fail', async () => {
      mockClient.waitForTransactionReceipt.mockRejectedValue(new Error('timeout'));
      mockClient.getTransactionReceipt.mockRejectedValue(new Error('not found'));

      const result = await adapter.waitForConfirmation('0xabc');
      expect(result.status).toBe('submitted');
    });
  });

  // -- getBalance error branches --

  describe('getBalance error branches', () => {
    it('includes error message from Error instance', async () => {
      mockClient.getBalance.mockRejectedValue(new Error('RPC unavailable'));

      try {
        await adapter.getBalance(TEST_FROM);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        expect((error as WAIaaSError).message).toContain('RPC unavailable');
        expect((error as WAIaaSError).cause).toBeInstanceOf(Error);
      }
    });

    it('handles non-Error thrown value in getBalance', async () => {
      mockClient.getBalance.mockRejectedValue('string error');

      try {
        await adapter.getBalance(TEST_FROM);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        expect((error as WAIaaSError).message).toContain('string error');
        expect((error as WAIaaSError).cause).toBeUndefined();
      }
    });
  });

  // -- getAssets branches --

  describe('getAssets branches', () => {
    it('returns only native when no allowedTokens', async () => {
      mockClient.getBalance.mockResolvedValue(1000n);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(1);
      expect(assets[0]!.mint).toBe('native');
    });

    it('handles multicall failure with fallback to readContract', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('multicall failed') },
      ]);
      mockClient.readContract.mockResolvedValue(500000n); // fallback balance

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets.length).toBeGreaterThanOrEqual(2);
      // Should have native + fallback token
      const tokenAsset = assets.find(a => a.mint === TEST_TOKEN);
      expect(tokenAsset).toBeDefined();
      expect(tokenAsset!.balance).toBe(500000n);
    });

    it('skips token when multicall fails and fallback readContract also fails', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('multicall failed') },
      ]);
      mockClient.readContract.mockRejectedValue(new Error('readContract also failed'));

      const assets = await adapter.getAssets(TEST_FROM);
      // Should only have native, token skipped
      expect(assets).toHaveLength(1);
      expect(assets[0]!.mint).toBe('native');
    });

    it('skips token when balance is 0', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 0n },
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(1); // only native
    });

    it('skips token when fallback balance is 0', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('fail') },
      ]);
      mockClient.readContract.mockResolvedValue(0n);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(1); // only native
    });

    it('uses default symbol/name/decimals when undefined in tokenDef', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN }, // no symbol, name, decimals
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 100n },
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      const tokenAsset = assets.find(a => a.mint === TEST_TOKEN);
      expect(tokenAsset).toBeDefined();
      expect(tokenAsset!.symbol).toBe('');
      expect(tokenAsset!.name).toBe('');
      expect(tokenAsset!.decimals).toBe(18);
    });

    it('sorts tokens by balance descending when multiple tokens present', async () => {
      const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      adapter.setAllowedTokens([
        { address: TOKEN_A, symbol: 'AAA', name: 'Token A', decimals: 18 },
        { address: TOKEN_B, symbol: 'BBB', name: 'Token B', decimals: 18 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 100n },  // AAA: smaller
        { status: 'success', result: 200n },  // BBB: larger
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(3); // native + 2 tokens
      expect(assets[0]!.mint).toBe('native');
      expect(assets[1]!.symbol).toBe('BBB'); // larger balance first
      expect(assets[2]!.symbol).toBe('AAA');
    });

    it('sorts by symbol alphabetically when balances equal', async () => {
      const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      adapter.setAllowedTokens([
        { address: TOKEN_B, symbol: 'ZZZ', name: 'Token Z', decimals: 18 },
        { address: TOKEN_A, symbol: 'AAA', name: 'Token A', decimals: 18 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 100n }, // same balance
        { status: 'success', result: 100n }, // same balance
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(3);
      expect(assets[1]!.symbol).toBe('AAA'); // alphabetical first
      expect(assets[2]!.symbol).toBe('ZZZ');
    });

    it('does not sort when only native asset (assets.length <= 1)', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 0n }, // zero balance, skipped
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(1); // only native, no sort needed
    });

    it('maps errors via mapError in getAssets catch block', async () => {
      mockClient.getBalance.mockRejectedValue(new Error('timed out'));

      try {
        await adapter.getAssets(TEST_FROM);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_TIMEOUT');
      }
    });

    it('uses default values for fallback token with missing properties', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN }, // no symbol, name, decimals
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('fail') },
      ]);
      mockClient.readContract.mockResolvedValue(50n);

      const assets = await adapter.getAssets(TEST_FROM);
      const tokenAsset = assets.find(a => a.mint === TEST_TOKEN);
      expect(tokenAsset).toBeDefined();
      expect(tokenAsset!.symbol).toBe('');
      expect(tokenAsset!.name).toBe('');
      expect(tokenAsset!.decimals).toBe(18);
    });
  });

  // -- getTokenInfo partial failure branches --

  describe('getTokenInfo multicall partial failure', () => {
    it('uses default decimals (18) when multicall fails for decimals', async () => {
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('no decimals') },
        { status: 'success', result: 'TKN' },
        { status: 'success', result: 'Token Name' },
      ]);

      const info = await adapter.getTokenInfo(TEST_TOKEN);
      expect(info.decimals).toBe(18);
      expect(info.symbol).toBe('TKN');
      expect(info.name).toBe('Token Name');
    });

    it('uses default symbol ("") when multicall fails for symbol', async () => {
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 8 },
        { status: 'failure', error: new Error('no symbol') },
        { status: 'success', result: 'Some Token' },
      ]);

      const info = await adapter.getTokenInfo(TEST_TOKEN);
      expect(info.decimals).toBe(8);
      expect(info.symbol).toBe('');
      expect(info.name).toBe('Some Token');
    });

    it('uses default name ("") when multicall fails for name', async () => {
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 6 },
        { status: 'success', result: 'USDC' },
        { status: 'failure', error: new Error('no name') },
      ]);

      const info = await adapter.getTokenInfo(TEST_TOKEN);
      expect(info.decimals).toBe(6);
      expect(info.symbol).toBe('USDC');
      expect(info.name).toBe('');
    });

    it('uses all defaults when all multicall calls fail', async () => {
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('fail') },
        { status: 'failure', error: new Error('fail') },
        { status: 'failure', error: new Error('fail') },
      ]);

      const info = await adapter.getTokenInfo(TEST_TOKEN);
      expect(info.decimals).toBe(18);
      expect(info.symbol).toBe('');
      expect(info.name).toBe('');
    });

    it('rethrows ChainError in getTokenInfo', async () => {
      const chainErr = new ChainError('RPC_CONNECTION_ERROR', 'evm', { message: 'conn error' });
      mockClient.multicall.mockRejectedValue(chainErr);

      try {
        await adapter.getTokenInfo(TEST_TOKEN);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('maps generic error in getTokenInfo', async () => {
      mockClient.multicall.mockRejectedValue(new Error('unknown multicall error'));

      try {
        await adapter.getTokenInfo(TEST_TOKEN);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- signTransaction error paths --

  describe('signTransaction error paths', () => {
    it('rethrows ChainError from signTransaction', async () => {
      const { privateKeyToAccount } = await import('viem/accounts');
      (privateKeyToAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        signTransaction: vi.fn().mockRejectedValue(
          new ChainError('INVALID_RAW_TRANSACTION', 'evm', { message: 'bad tx' }),
        ),
      });

      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array([0xf8]),
        estimatedFee: 100n,
        metadata: {},
      };

      try {
        await adapter.signTransaction(tx, new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_RAW_TRANSACTION');
      }
    });

    it('maps generic error in signTransaction via mapError', async () => {
      const { privateKeyToAccount } = await import('viem/accounts');
      (privateKeyToAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        signTransaction: vi.fn().mockRejectedValue(new Error('signing failed')),
      });

      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array([0xf8]),
        estimatedFee: 100n,
        metadata: {},
      };

      try {
        await adapter.signTransaction(tx, new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        // mapError converts generic errors to CHAIN_ERROR
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- signExternalTransaction error branches --

  describe('signExternalTransaction error branches', () => {
    it('throws INVALID_RAW_TRANSACTION when parse fails', async () => {
      const { parseTransaction: mockParse } = await import('viem');
      (mockParse as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('invalid hex');
      });

      try {
        await adapter.signExternalTransaction('0xbaddata', new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_RAW_TRANSACTION');
      }
    });

    it('wraps non-ChainError from signing as INVALID_RAW_TRANSACTION', async () => {
      const { parseTransaction: mockParse } = await import('viem');
      (mockParse as ReturnType<typeof vi.fn>).mockReturnValue({
        to: TEST_TO,
        value: 1n,
        type: 'eip1559',
      });

      const { privateKeyToAccount } = await import('viem/accounts');
      (privateKeyToAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        signTransaction: vi.fn().mockRejectedValue(new Error('signing failed')),
      });

      try {
        await adapter.signExternalTransaction('0xvalidhex', new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_RAW_TRANSACTION');
        expect((error as ChainError).message).toContain('signing failed');
      }
    });

    it('rethrows ChainError from signExternalTransaction', async () => {
      const { parseTransaction: mockParse } = await import('viem');
      (mockParse as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('parse error');
      });

      try {
        await adapter.signExternalTransaction('0xbad', new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        // The inner catch creates a ChainError, outer catch rethrows it
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_RAW_TRANSACTION');
      }
    });

    it('uses eip1559 as default type when parsed.type is null', async () => {
      const { parseTransaction: mockParse } = await import('viem');
      (mockParse as ReturnType<typeof vi.fn>).mockReturnValue({
        to: TEST_TO,
        value: 1n,
        type: null, // null type -> defaults to 'eip1559'
      });

      const { privateKeyToAccount } = await import('viem/accounts');
      (privateKeyToAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        signTransaction: vi.fn().mockResolvedValue('0xsigned'),
      });

      const result = await adapter.signExternalTransaction('0xvalidhex', new Uint8Array(32));
      expect(result.signedTransaction).toBe('0xsigned');
    });
  });

  // -- getTransactionFee branches --

  describe('getTransactionFee branches', () => {
    it('calculates fee from gasLimit and maxFeePerGas', async () => {
      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array(0),
        estimatedFee: 999n,
        metadata: { gasLimit: 100n, maxFeePerGas: 10n },
      };
      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(1000n);
    });

    it('falls back to estimatedFee when gasLimit is null', async () => {
      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array(0),
        estimatedFee: 999n,
        metadata: { gasLimit: null, maxFeePerGas: 10n },
      };
      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(999n);
    });

    it('falls back to estimatedFee when maxFeePerGas is null', async () => {
      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array(0),
        estimatedFee: 888n,
        metadata: { gasLimit: 100n, maxFeePerGas: null },
      };
      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(888n);
    });

    it('falls back to estimatedFee when both are null', async () => {
      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array(0),
        estimatedFee: 777n,
        metadata: { gasLimit: null, maxFeePerGas: null },
      };
      const fee = await adapter.getTransactionFee(tx);
      expect(fee).toBe(777n);
    });
  });

  // -- estimateFee error paths --

  describe('estimateFee error paths', () => {
    it('rethrows ChainError in estimateFee', async () => {
      const chainErr = new ChainError('INSUFFICIENT_BALANCE', 'evm', { message: 'no balance' });
      mockClient.estimateFeesPerGas.mockRejectedValue(chainErr);

      try {
        await adapter.estimateFee({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('maps generic error in estimateFee via mapError', async () => {
      mockClient.estimateFeesPerGas.mockRejectedValue(new Error('fee estimation failed'));

      try {
        await adapter.estimateFee({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- buildTokenTransfer error paths --

  describe('buildTokenTransfer error paths', () => {
    beforeEach(() => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
    });

    it('rethrows ChainError in buildTokenTransfer', async () => {
      const chainErr = new ChainError('NONCE_TOO_LOW', 'evm', { message: 'nonce' });
      mockClient.estimateGas.mockRejectedValue(chainErr);

      try {
        await adapter.buildTokenTransfer({
          from: TEST_FROM,
          to: TEST_TO,
          amount: 1000000n,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('maps generic error via mapError in buildTokenTransfer', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('unknown error'));

      try {
        await adapter.buildTokenTransfer({
          from: TEST_FROM,
          to: TEST_TO,
          amount: 1000000n,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- buildApprove error paths --

  describe('buildApprove error paths', () => {
    beforeEach(() => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
    });

    it('rethrows ChainError in buildApprove', async () => {
      const chainErr = new ChainError('NONCE_TOO_LOW', 'evm', { message: 'nonce' });
      mockClient.estimateGas.mockRejectedValue(chainErr);

      try {
        await adapter.buildApprove({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
          amount: 1000000n,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('maps generic error via mapError in buildApprove', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('approve failed'));

      try {
        await adapter.buildApprove({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
          amount: 1000000n,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
      }
    });
  });

  // -- NFT error paths --

  describe('NFT error paths', () => {
    it('buildNftTransferTx throws UNSUPPORTED_NFT_STANDARD for unknown standard', async () => {
      try {
        await adapter.buildNftTransferTx({
          from: TEST_FROM,
          to: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'unknown' as 'ERC-721' },
          amount: 1n,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('UNSUPPORTED_NFT_STANDARD');
      }
    });

    it('approveNft throws UNSUPPORTED_NFT_STANDARD for unknown standard', async () => {
      try {
        await adapter.approveNft({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'unknown' as 'ERC-721' },
          approvalType: 'all',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('UNSUPPORTED_NFT_STANDARD');
      }
    });

    it('approveNft throws for ERC-1155 single approval', async () => {
      try {
        await adapter.approveNft({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-1155' },
          approvalType: 'single',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('UNSUPPORTED_NFT_STANDARD');
        expect((error as WAIaaSError).message).toContain('does not support single token approval');
      }
    });

    it('approveNft builds ERC-721 setApprovalForAll for "all" type', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(50000n);

      const tx = await adapter.approveNft({
        from: TEST_FROM,
        spender: TEST_TO,
        token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
        approvalType: 'all',
      });

      expect(tx.metadata.approvalType).toBe('all');
    });

    it('detectNftStandard wraps non-WAIaaSError', async () => {
      mockClient.readContract.mockRejectedValue(new Error('unexpected RPC error'));

      try {
        await adapter.detectNftStandard(TEST_TOKEN);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('UNSUPPORTED_NFT_STANDARD');
        expect((error as WAIaaSError).message).toContain('unexpected RPC error');
      }
    });
  });

  // -- getCurrentNonce error paths --

  describe('getCurrentNonce error paths', () => {
    it('includes Error message in CHAIN_ERROR', async () => {
      mockClient.getTransactionCount.mockRejectedValue(new Error('nonce fetch failed'));

      try {
        await adapter.getCurrentNonce(TEST_FROM);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        expect((error as WAIaaSError).message).toContain('nonce fetch failed');
        expect((error as WAIaaSError).cause).toBeInstanceOf(Error);
      }
    });

    it('handles non-Error thrown value in getCurrentNonce', async () => {
      mockClient.getTransactionCount.mockRejectedValue('string nonce error');

      try {
        await adapter.getCurrentNonce(TEST_FROM);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        expect((error as WAIaaSError).message).toContain('string nonce error');
        expect((error as WAIaaSError).cause).toBeUndefined();
      }
    });
  });

  // -- constructor chain.id fallback --

  describe('chain.id fallback', () => {
    it('uses chainId 1 as fallback when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(21000n);

      const result = await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  // -- buildNftTransferTx and approveNft error rethrow --

  describe('NFT rethrow error branches', () => {
    it('buildNftTransferTx rethrows ChainError directly', async () => {
      const chainErr = new ChainError('INSUFFICIENT_BALANCE', 'evm', { message: 'no funds' });
      mockClient.getTransactionCount.mockRejectedValue(chainErr);

      try {
        await adapter.buildNftTransferTx({
          from: TEST_FROM,
          to: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
          amount: 1n,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('approveNft rethrows ChainError directly', async () => {
      const chainErr = new ChainError('INSUFFICIENT_BALANCE', 'evm', { message: 'no funds' });
      mockClient.getTransactionCount.mockRejectedValue(chainErr);

      try {
        await adapter.approveNft({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
          approvalType: 'single',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(chainErr);
      }
    });

    it('approveNft rethrows WAIaaSError directly', async () => {
      const waiaasErr = new WAIaaSError('CHAIN_ERROR', { message: 'custom' });
      mockClient.getTransactionCount.mockRejectedValue(waiaasErr);

      try {
        await adapter.approveNft({
          from: TEST_FROM,
          spender: TEST_TO,
          token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
          approvalType: 'single',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(waiaasErr);
      }
    });
  });

  // -- chain.id fallback in all build methods --

  describe('chain.id fallback in buildTokenTransfer', () => {
    it('uses chainId 1 when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(60000n);

      const result = await adapter.buildTokenTransfer({
        from: TEST_FROM,
        to: TEST_TO,
        amount: 1000000n,
        token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
      });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  describe('chain.id fallback in buildContractCall', () => {
    it('uses chainId 1 when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(60000n);

      const result = await adapter.buildContractCall({
        from: TEST_FROM,
        to: TEST_TO,
        calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
      });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  describe('chain.id fallback in buildApprove', () => {
    it('uses chainId 1 when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(50000n);

      const result = await adapter.buildApprove({
        from: TEST_FROM,
        spender: TEST_TO,
        token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        amount: 1000000n,
      });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  describe('chain.id fallback in buildNftTransferTx', () => {
    it('uses chainId 1 when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(80000n);

      const result = await adapter.buildNftTransferTx({
        from: TEST_FROM,
        to: TEST_TO,
        token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
        amount: 1n,
      });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  describe('chain.id fallback in approveNft', () => {
    it('uses chainId 1 when client.chain is undefined', async () => {
      mockClient.chain = undefined;
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockResolvedValue(50000n);

      const result = await adapter.approveNft({
        from: TEST_FROM,
        spender: TEST_TO,
        token: { address: TEST_TOKEN, tokenId: '1', standard: 'ERC-721' },
        approvalType: 'all',
      });
      expect(result.metadata.chainId).toBe(1);
    });
  });

  // -- Non-Error thrown values for cause branches --

  describe('non-Error thrown values (cause branches)', () => {
    it('buildTransaction with non-Error "insufficient funds" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockRejectedValue('insufficient funds for gas');

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INSUFFICIENT_BALANCE');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('buildTransaction with non-Error "nonce too low" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockRejectedValue('nonce too low');

      try {
        await adapter.buildTransaction({ from: TEST_FROM, to: TEST_TO, amount: 1n });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('NONCE_TOO_LOW');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('simulateTransaction with non-Error extracts string message', async () => {
      mockClient.call.mockRejectedValue('simulation string error');

      const tx = {
        chain: 'ethereum' as const,
        serialized: new Uint8Array([0xf8]),
        estimatedFee: 100n,
        metadata: { from: TEST_FROM },
      };
      const result = await adapter.simulateTransaction(tx);
      expect(result.success).toBe(false);
      expect(result.error).toContain('simulation string error');
    });

    it('submitTransaction with non-Error "nonce already" has undefined cause', async () => {
      mockClient.sendRawTransaction.mockRejectedValue('nonce already used');

      try {
        await adapter.submitTransaction(new Uint8Array([0x01]));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('NONCE_ALREADY_USED');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('submitTransaction with non-Error generic uses mapError', async () => {
      mockClient.sendRawTransaction.mockRejectedValue('generic submit error');

      try {
        await adapter.submitTransaction(new Uint8Array([0x01]));
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as WAIaaSError).code).toBe('CHAIN_ERROR');
        expect((error as WAIaaSError).cause).toBeUndefined();
      }
    });

    it('buildContractCall with non-Error "insufficient funds" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockRejectedValue('insufficient funds');

      try {
        await adapter.buildContractCall({
          from: TEST_FROM,
          to: TEST_TO,
          calldata: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INSUFFICIENT_BALANCE');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('signExternalTransaction with non-Error in outer catch wraps as INVALID_RAW_TRANSACTION', async () => {
      // Parse succeeds, but signing throws a non-Error value
      const { parseTransaction: mockParse } = await import('viem');
      (mockParse as ReturnType<typeof vi.fn>).mockReturnValue({
        to: TEST_TO,
        value: 1n,
        type: 'eip1559',
      });

      const { privateKeyToAccount } = await import('viem/accounts');
      (privateKeyToAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        signTransaction: vi.fn().mockRejectedValue('string signing error'),
      });

      try {
        await adapter.signExternalTransaction('0xvalidhex', new Uint8Array(32));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('INVALID_RAW_TRANSACTION');
        expect((error as ChainError).message).toContain('string signing error');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('detectNftStandard with non-Error thrown value', async () => {
      mockClient.readContract.mockRejectedValue('nft detection string error');

      try {
        await adapter.detectNftStandard(TEST_TOKEN);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WAIaaSError);
        expect((error as WAIaaSError).code).toBe('UNSUPPORTED_NFT_STANDARD');
        expect((error as WAIaaSError).message).toContain('nft detection string error');
      }
    });

    it('mapError with non-Error "nonce too low" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      // Test the nonce too low branch via mapError (through buildTransaction fallback to mapError)
      // Use a non-Error that does NOT match "insufficient funds" or "nonce too low" in buildTransaction
      // but does match "nonce too low" in mapError
      // Actually, buildTransaction catches "nonce too low" before mapError.
      // To test mapError's nonce branch, throw from a path that goes through mapError.
      // buildTokenTransfer goes through mapError for all non-specific errors.
      mockClient.estimateGas.mockRejectedValue('nonce too low issue');

      try {
        await adapter.buildTokenTransfer({
          from: TEST_FROM,
          to: TEST_TO,
          amount: 1000000n,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        // buildTokenTransfer goes through mapError
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('NONCE_TOO_LOW');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('mapError with non-Error "connection" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockRejectedValue('connection refused');

      try {
        await adapter.buildTokenTransfer({
          from: TEST_FROM,
          to: TEST_TO,
          amount: 1000000n,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_CONNECTION_ERROR');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('mapError with non-Error "timeout" has undefined cause', async () => {
      mockClient.getTransactionCount.mockResolvedValue(0);
      mockClient.estimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      mockClient.estimateGas.mockRejectedValue('timeout exceeded');

      try {
        await adapter.buildTokenTransfer({
          from: TEST_FROM,
          to: TEST_TO,
          amount: 1000000n,
          token: { address: TEST_TOKEN, decimals: 6, symbol: 'USDC' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChainError);
        expect((error as ChainError).code).toBe('RPC_TIMEOUT');
        expect((error as ChainError).cause).toBeUndefined();
      }
    });

    it('getAssets fallback readContract failure with non-Error thrown value', async () => {
      adapter.setAllowedTokens([
        { address: TEST_TOKEN, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'failure', error: new Error('multicall failed') },
      ]);
      mockClient.readContract.mockRejectedValue('string readContract error');

      const assets = await adapter.getAssets(TEST_FROM);
      // Token should be skipped, only native remains
      expect(assets).toHaveLength(1);
      expect(assets[0]!.mint).toBe('native');
    });
  });

  // -- getAssets sort tie-break: b.balance < a.balance branch --

  describe('getAssets sort reverse order branch', () => {
    it('covers b.balance < a.balance return -1 branch', async () => {
      const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      adapter.setAllowedTokens([
        { address: TOKEN_A, symbol: 'AAA', name: 'Token A', decimals: 18 },
        { address: TOKEN_B, symbol: 'BBB', name: 'Token B', decimals: 18 },
      ]);
      mockClient.getBalance.mockResolvedValue(1000n);
      mockClient.multicall.mockResolvedValue([
        { status: 'success', result: 500n },  // AAA: larger
        { status: 'success', result: 100n },  // BBB: smaller
      ]);

      const assets = await adapter.getAssets(TEST_FROM);
      expect(assets).toHaveLength(3);
      expect(assets[0]!.mint).toBe('native');
      expect(assets[1]!.symbol).toBe('AAA'); // larger balance first
      expect(assets[2]!.symbol).toBe('BBB');
    });
  });
});
