/**
 * EvmIncomingSubscriber unit tests.
 *
 * Phase 225-02: IChainSubscriber interface compliance, ERC-20 Transfer detection
 * via getLogs, native ETH detection via getBlock(includeTransactions:true),
 * 10-block cap, per-wallet error isolation, and cursor management.
 *
 * All tests use mock viem client (no real network calls).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---- Mock setup ----

const mockClient = {
  getBlockNumber: vi.fn(),
  getLogs: vi.fn(),
  getBlock: vi.fn(),
};

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => mockClient),
    // Keep parseAbiItem real since it's a pure function
    parseAbiItem: actual.parseAbiItem,
  };
});

import { EvmIncomingSubscriber } from '../evm-incoming-subscriber.js';

// ---- Test fixtures ----

const TEST_RPC_URL = 'https://rpc.test.com';
const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
const TEST_SENDER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TEST_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC-like

let idCounter = 0;
const mockGenerateId = () => `test-id-${++idCounter}`;

// ---- Tests ----

describe('EvmIncomingSubscriber - IChainSubscriber interface', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
    });
  });

  it('chain property is "ethereum"', () => {
    expect(subscriber.chain).toBe('ethereum');
  });

  it('subscribe() adds wallet to subscriptions and fetches current block number', async () => {
    mockClient.getBlockNumber.mockResolvedValue(100n);

    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    expect(mockClient.getBlockNumber).toHaveBeenCalledOnce();
    expect(subscriber.subscribedWallets()).toEqual(['wallet-1']);
  });

  it('subscribe() is idempotent (second call with same walletId is no-op)', async () => {
    mockClient.getBlockNumber.mockResolvedValue(100n);

    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    expect(mockClient.getBlockNumber).toHaveBeenCalledOnce();
    expect(subscriber.subscribedWallets()).toEqual(['wallet-1']);
  });

  it('unsubscribe() removes wallet from subscriptions', async () => {
    mockClient.getBlockNumber.mockResolvedValue(100n);

    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());
    expect(subscriber.subscribedWallets()).toEqual(['wallet-1']);

    await subscriber.unsubscribe('wallet-1');
    expect(subscriber.subscribedWallets()).toEqual([]);
  });

  it('unsubscribe() is no-op for unknown walletId', async () => {
    await subscriber.unsubscribe('unknown-wallet');
    expect(subscriber.subscribedWallets()).toEqual([]);
  });

  it('subscribedWallets() returns current subscription IDs', async () => {
    mockClient.getBlockNumber.mockResolvedValue(100n);

    await subscriber.subscribe('wallet-a', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());
    await subscriber.subscribe('wallet-b', TEST_SENDER_ADDRESS, 'ethereum-mainnet', vi.fn());

    expect(subscriber.subscribedWallets()).toEqual(['wallet-a', 'wallet-b']);
  });

  it('connect() resolves immediately (no-op)', async () => {
    await expect(subscriber.connect()).resolves.toBeUndefined();
  });

  it('waitForDisconnect() returns a Promise that never resolves', async () => {
    const disconnectPromise = subscriber.waitForDisconnect();
    const SENTINEL = Symbol('sentinel');

    const result = await Promise.race([
      disconnectPromise,
      new Promise<typeof SENTINEL>((resolve) =>
        setTimeout(() => resolve(SENTINEL), 100),
      ),
    ]);

    expect(result).toBe(SENTINEL);
  });

  it('destroy() clears all subscriptions', async () => {
    mockClient.getBlockNumber.mockResolvedValue(100n);

    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'ethereum-mainnet', vi.fn());
    expect(subscriber.subscribedWallets()).toHaveLength(2);

    await subscriber.destroy();
    expect(subscriber.subscribedWallets()).toEqual([]);
  });
});

describe('EvmIncomingSubscriber - subscribe block number caching (#359)', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
    });
  });

  it('calls getBlockNumber only once for multiple wallets on the same network', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(200n);

    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'ethereum-sepolia', vi.fn());
    await subscriber.subscribe('wallet-3', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'ethereum-sepolia', vi.fn());

    // Only 1 RPC call despite 3 wallets on same network
    expect(mockClient.getBlockNumber).toHaveBeenCalledOnce();
    expect(subscriber.subscribedWallets()).toEqual(['wallet-1', 'wallet-2', 'wallet-3']);
  });

  it('calls getBlockNumber separately for different networks', async () => {
    mockClient.getBlockNumber
      .mockResolvedValueOnce(100n)  // ethereum-sepolia
      .mockResolvedValueOnce(500n); // arbitrum-mainnet

    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'arbitrum-mainnet', vi.fn());

    // 2 RPC calls for 2 different networks
    expect(mockClient.getBlockNumber).toHaveBeenCalledTimes(2);
  });

  it('second wallet on same network uses cached block number (no extra RPC call)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(150n);

    const onTx1 = vi.fn();
    const onTx2 = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', onTx1);
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'ethereum-mainnet', onTx2);

    expect(mockClient.getBlockNumber).toHaveBeenCalledOnce();

    // Verify both wallets start from same block by polling
    mockClient.getBlockNumber.mockResolvedValueOnce(151n);
    mockClient.getLogs.mockResolvedValueOnce([]); // wallet-1
    mockClient.getLogs.mockResolvedValueOnce([]); // wallet-2
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] }); // wallet-1
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] }); // wallet-2
    await subscriber.pollAll();

    // Both wallets should have been polled from block 151 (lastBlock was 150)
    // getBlock called twice: once per wallet (blocks 151 for each)
    expect(mockClient.getBlock).toHaveBeenCalledTimes(2);
  });

  it('reduces 8 wallets x 1 network from 8 to 1 getBlockNumber call', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(300n);

    for (let i = 0; i < 8; i++) {
      await subscriber.subscribe(
        `wallet-${i}`,
        `0x${i.toString().padStart(40, '0')}`,
        'ethereum-mainnet',
        vi.fn(),
      );
    }

    expect(mockClient.getBlockNumber).toHaveBeenCalledOnce();
    expect(subscriber.subscribedWallets()).toHaveLength(8);
  });

  it('8 wallets x 3 networks results in only 3 getBlockNumber calls', async () => {
    const networks = ['ethereum-mainnet', 'arbitrum-mainnet', 'base-mainnet'];
    mockClient.getBlockNumber
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce(200n)
      .mockResolvedValueOnce(300n);

    for (let i = 0; i < 8; i++) {
      await subscriber.subscribe(
        `wallet-${i}`,
        `0x${i.toString().padStart(40, '0')}`,
        networks[i % 3]!,
        vi.fn(),
      );
    }

    // 3 networks → 3 calls (not 8)
    expect(mockClient.getBlockNumber).toHaveBeenCalledTimes(3);
    expect(subscriber.subscribedWallets()).toHaveLength(8);
  });
});

describe('EvmIncomingSubscriber - pollAll ERC-20', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    mockClient.getBlockNumber.mockReset();
    mockClient.getLogs.mockReset();
    mockClient.getBlock.mockReset();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });
  });

  it('detects ERC-20 Transfer event and calls onTransaction with correct IncomingTransaction', async () => {
    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    // pollAll at block 105
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockResolvedValueOnce([
      {
        transactionHash: '0xabc123',
        args: {
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 1000000n, // 1 USDC
        },
        address: TEST_TOKEN_ADDRESS,
        blockNumber: 103n,
      },
    ]);
    // No native ETH in these blocks
    for (let i = 0; i < 5; i++) {
      mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    }

    await subscriber.pollAll();

    expect(onTransaction).toHaveBeenCalledOnce();
    const tx = onTransaction.mock.calls[0]![0];
    expect(tx).toMatchObject({
      id: 'test-id-1',
      txHash: '0xabc123',
      walletId: 'wallet-1',
      fromAddress: TEST_SENDER_ADDRESS,
      amount: '1000000',
      tokenAddress: TEST_TOKEN_ADDRESS,
      chain: 'ethereum',
      network: 'ethereum-sepolia',
      status: 'DETECTED',
      blockNumber: 103,
      confirmedAt: null,
    });
    expect(typeof tx.detectedAt).toBe('number');
  });

  it('updates lastBlock cursor after successful poll', async () => {
    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // First poll at block 105
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    for (let i = 0; i < 5; i++) {
      mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    }
    await subscriber.pollAll();

    // Second poll at block 106
    mockClient.getBlockNumber.mockResolvedValueOnce(106n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    await subscriber.pollAll();

    // getLogs should have been called with fromBlock:106n, toBlock:106n on second poll
    const secondCall = mockClient.getLogs.mock.calls[1]!;
    expect(secondCall[0]!).toMatchObject({
      fromBlock: 106n,
      toBlock: 106n,
    });
  });

  it('skips polling when no new blocks (lastBlock >= currentBlock)', async () => {
    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    // pollAll still at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();

    expect(mockClient.getLogs).not.toHaveBeenCalled();
    expect(mockClient.getBlock).not.toHaveBeenCalled();
    expect(onTransaction).not.toHaveBeenCalled();
  });
});

describe('EvmIncomingSubscriber - pollAll native ETH', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
    });
  });

  it('detects native ETH transfer and calls onTransaction with tokenAddress: null', async () => {
    // Subscribe at block 50
    mockClient.getBlockNumber.mockResolvedValueOnce(50n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    // pollAll at block 51
    mockClient.getBlockNumber.mockResolvedValueOnce(51n);
    mockClient.getLogs.mockResolvedValueOnce([]); // no ERC-20
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        {
          hash: '0xdef456',
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 1000000000000000000n, // 1 ETH
        },
      ],
    });

    await subscriber.pollAll();

    expect(onTransaction).toHaveBeenCalledOnce();
    const tx = onTransaction.mock.calls[0]![0];
    expect(tx).toMatchObject({
      id: 'test-id-1',
      txHash: '0xdef456',
      walletId: 'wallet-1',
      fromAddress: TEST_SENDER_ADDRESS,
      amount: '1000000000000000000',
      tokenAddress: null,
      chain: 'ethereum',
      network: 'ethereum-sepolia',
      status: 'DETECTED',
      blockNumber: 51,
      confirmedAt: null,
    });
  });

  it('skips string-only transactions (typeof tx === "string")', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(50n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(51n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        '0xhash_string_only', // hash-only without includeTransactions
      ],
    });

    await subscriber.pollAll();
    expect(onTransaction).not.toHaveBeenCalled();
  });

  it('skips transactions with value === 0n', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(50n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(51n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        {
          hash: '0xzero',
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 0n,
        },
      ],
    });

    await subscriber.pollAll();
    expect(onTransaction).not.toHaveBeenCalled();
  });

  it('skips transactions where tx.to does not match wallet address', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(50n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(51n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        {
          hash: '0xother',
          from: TEST_SENDER_ADDRESS,
          to: '0x0000000000000000000000000000000000000000', // different address
          value: 1000n,
        },
      ],
    });

    await subscriber.pollAll();
    expect(onTransaction).not.toHaveBeenCalled();
  });

  it('handles case-insensitive address matching', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(50n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(51n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        {
          hash: '0xcase',
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS.toLowerCase(), // lower case
          value: 500n,
        },
      ],
    });

    await subscriber.pollAll();
    expect(onTransaction).toHaveBeenCalledOnce();
  });
});

describe('EvmIncomingSubscriber - pollAll resilience', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    mockClient.getBlockNumber.mockReset();
    mockClient.getLogs.mockReset();
    mockClient.getBlock.mockReset();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });
  });

  it('caps block range at 10 blocks per poll cycle', async () => {
    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // pollAll: currentBlock is 120 (20 blocks behind), should only poll 10
    mockClient.getBlockNumber.mockResolvedValueOnce(120n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    // Should request getBlock for blocks 101-110 (10 blocks)
    for (let i = 0; i < 10; i++) {
      mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    }

    await subscriber.pollAll();

    // getLogs should be called with fromBlock:101n, toBlock:110n (capped at 10)
    expect(mockClient.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 101n,
        toBlock: 110n,
      }),
    );

    // getBlock should be called 10 times (blocks 101-110)
    expect(mockClient.getBlock).toHaveBeenCalledTimes(10);
  });

  it('per-wallet error isolation: one wallet failure does not affect others', async () => {
    // Subscribe two wallets at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx1 = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTx1);

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx2 = vi.fn();
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'ethereum-mainnet', onTx2);

    // pollAll at block 101
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);

    // First wallet: getLogs throws error
    mockClient.getLogs.mockRejectedValueOnce(new Error('RPC timeout'));

    // Second wallet: getLogs returns a transfer
    mockClient.getLogs.mockResolvedValueOnce([
      {
        transactionHash: '0xsecondwallet',
        args: {
          from: TEST_WALLET_ADDRESS,
          to: TEST_SENDER_ADDRESS,
          value: 500n,
        },
        address: TEST_TOKEN_ADDRESS,
        blockNumber: 101n,
      },
    ]);
    // Second wallet: getBlock for native ETH
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });

    // Suppress console.warn during test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await subscriber.pollAll();
    warnSpy.mockRestore();

    // wallet-1 should not have received any transactions (it threw)
    expect(onTx1).not.toHaveBeenCalled();

    // wallet-2 should have received the ERC-20 transfer
    expect(onTx2).toHaveBeenCalledOnce();
    expect(onTx2.mock.calls[0]![0]).toMatchObject({
      txHash: '0xsecondwallet',
      walletId: 'wallet-2',
    });
  });

  it('handles getLogs returning empty array gracefully', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });

    await subscriber.pollAll();

    expect(onTransaction).not.toHaveBeenCalled();
  });

  it('detects both ERC-20 and native ETH in the same poll cycle', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);

    // ERC-20 transfer
    mockClient.getLogs.mockResolvedValueOnce([
      {
        transactionHash: '0xerc20tx',
        args: {
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 2000000n,
        },
        address: TEST_TOKEN_ADDRESS,
        blockNumber: 101n,
      },
    ]);

    // Native ETH transfer in same block
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        {
          hash: '0xnatvetx',
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 5000000000000000000n,
        },
      ],
    });

    await subscriber.pollAll();

    expect(onTransaction).toHaveBeenCalledTimes(2);
    // First call: ERC-20
    expect(onTransaction.mock.calls[0]![0]).toMatchObject({
      tokenAddress: TEST_TOKEN_ADDRESS,
      txHash: '0xerc20tx',
    });
    // Second call: native ETH
    expect(onTransaction.mock.calls[1]![0]).toMatchObject({
      tokenAddress: null,
      txHash: '0xnatvetx',
    });
  });
});

describe('EvmIncomingSubscriber - L2 native ETH skip (#172)', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    mockClient.getBlockNumber.mockReset();
    mockClient.getLogs.mockReset();
    mockClient.getBlock.mockReset();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });
  });

  it('skips pollNativeETH on arbitrum-mainnet (L2)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'arbitrum-mainnet', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);

    await subscriber.pollAll();

    // getBlock should NOT be called (native ETH polling skipped on L2)
    expect(mockClient.getBlock).not.toHaveBeenCalled();
  });

  it('skips pollNativeETH on optimism-mainnet (L2)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'optimism-mainnet', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);

    await subscriber.pollAll();

    expect(mockClient.getBlock).not.toHaveBeenCalled();
  });

  it('skips pollNativeETH on base-mainnet (L2)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'base-mainnet', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);

    await subscriber.pollAll();

    expect(mockClient.getBlock).not.toHaveBeenCalled();
  });

  it('still runs pollNativeETH on ethereum-mainnet (L1)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });

    await subscriber.pollAll();

    // getBlock SHOULD be called for L1
    expect(mockClient.getBlock).toHaveBeenCalledOnce();
  });

  it('still runs pollNativeETH on ethereum-sepolia (L1 testnet)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });

    await subscriber.pollAll();

    expect(mockClient.getBlock).toHaveBeenCalledOnce();
  });

  it('still detects ERC-20 on L2 chains (only native ETH is skipped)', async () => {
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTransaction = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'arbitrum-mainnet', onTransaction);

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([
      {
        transactionHash: '0xarb_erc20',
        args: {
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 1000000n,
        },
        address: TEST_TOKEN_ADDRESS,
        blockNumber: 101n,
      },
    ]);

    await subscriber.pollAll();

    expect(onTransaction).toHaveBeenCalledOnce();
    expect(onTransaction.mock.calls[0]![0]).toMatchObject({
      txHash: '0xarb_erc20',
      tokenAddress: TEST_TOKEN_ADDRESS,
      network: 'arbitrum-mainnet',
    });
    // No getBlock calls
    expect(mockClient.getBlock).not.toHaveBeenCalled();
  });
});

describe('EvmIncomingSubscriber - per-wallet backoff (#175)', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    mockClient.getBlockNumber.mockReset();
    mockClient.getLogs.mockReset();
    mockClient.getBlock.mockReset();
    vi.useFakeTimers();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('per-wallet pollERC20 failure applies backoff and skips on next cycle', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', onTx);

    // First poll: getLogs fails
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('ResourceNotFoundRpcError'));
    await subscriber.pollAll();

    // Second immediate poll: wallet-1 should be skipped (backoff active)
    mockClient.getBlockNumber.mockResolvedValueOnce(106n);
    await subscriber.pollAll();

    // getLogs should have been called only once (the failed one)
    expect(mockClient.getLogs).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('per-wallet backoff increases exponentially', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // Fail 1: backoff 30s
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('RPC error'));
    await subscriber.pollAll();

    // Advance 30s (just past first backoff)
    vi.advanceTimersByTime(31_000);

    // Fail 2: backoff 60s
    mockClient.getBlockNumber.mockResolvedValueOnce(110n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('RPC error'));
    await subscriber.pollAll();

    // Advance only 31s (not enough for 60s backoff)
    vi.advanceTimersByTime(31_000);

    mockClient.getBlockNumber.mockResolvedValueOnce(115n);
    await subscriber.pollAll();

    // getLogs should only be called 2 times (the 2 failures), not 3
    expect(mockClient.getLogs).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('forces cursor advancement after 3 consecutive failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // Fail 3 times on the same block range
    for (let i = 0; i < 3; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(105n);
      mockClient.getLogs.mockRejectedValueOnce(new Error('ResourceNotFoundRpcError'));
      await subscriber.pollAll();
      vi.advanceTimersByTime(301_000); // advance past max backoff
    }

    // After 3 failures, cursor should have advanced to 105 (skipped blocks 101-105)
    // Next poll should use fromBlock > 105
    mockClient.getBlockNumber.mockResolvedValueOnce(110n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    vi.advanceTimersByTime(301_000); // advance past backoff
    await subscriber.pollAll();

    // getLogs should be called with fromBlock 106n (after forced advancement to 105)
    const lastCall = mockClient.getLogs.mock.calls[mockClient.getLogs.mock.calls.length - 1]!;
    expect(lastCall[0]).toMatchObject({ fromBlock: 106n });

    warnSpy.mockRestore();
  });

  it('resets per-wallet errorCount on successful poll', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Use L2 network to skip pollNativeETH (simplifies mocking)
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'arbitrum-mainnet', vi.fn());

    // Fail once (range [101,101])
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('RPC error'));
    await subscriber.pollAll();

    vi.advanceTimersByTime(31_000);

    // Succeed (range [101,101] — lastBlock still 100 after error)
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    await subscriber.pollAll();

    // Next poll without backoff (range [102,102])
    mockClient.getBlockNumber.mockResolvedValueOnce(102n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    await subscriber.pollAll();

    // getLogs called 3 times: 1 fail + 2 success
    expect(mockClient.getLogs).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });

  it('suppresses warn log below WARN_THRESHOLD (3)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // Fail twice (below threshold)
    for (let i = 0; i < 2; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(105n);
      mockClient.getLogs.mockRejectedValueOnce(new Error('RPC error'));
      await subscriber.pollAll();
      vi.advanceTimersByTime(301_000);
    }

    // No warn should have been emitted (errorCount < 3)
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('logs message-only (no full stack trace) at WARN_THRESHOLD', async () => {
    const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const loggedSubscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
      logger: mockLogger,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await loggedSubscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // Fail 3 times (reaching threshold)
    for (let i = 0; i < 3; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(105n);
      mockClient.getLogs.mockRejectedValueOnce(new Error('ResourceNotFoundRpcError'));
      await loggedSubscriber.pollAll();
      vi.advanceTimersByTime(301_000);
    }

    // warn called once at 3rd failure with message string (not Error object)
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    const warnMsg = mockLogger.warn.mock.calls[0]![0] as string;
    expect(typeof warnMsg).toBe('string');
    expect(warnMsg).toContain('consecutive: 3');
    expect(warnMsg).toContain('ResourceNotFoundRpcError');
  });

  it('per-wallet backoff does not affect other wallets', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Use L2 network to skip pollNativeETH
    // Both wallets on same network: getBlockNumber cached after first subscribe (#359)
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'arbitrum-mainnet', vi.fn());
    await subscriber.subscribe('wallet-2', TEST_SENDER_ADDRESS, 'arbitrum-mainnet', vi.fn());

    // First poll: wallet-1 fails, wallet-2 succeeds
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs
      .mockRejectedValueOnce(new Error('RPC error'))
      .mockResolvedValueOnce([]);
    await subscriber.pollAll();

    // Second poll: wallet-1 skipped (backoff), wallet-2 polls normally
    mockClient.getBlockNumber.mockResolvedValueOnce(102n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    await subscriber.pollAll();

    // getLogs called 3 times: wallet-1 fail + wallet-2 success + wallet-2 success
    expect(mockClient.getLogs).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });
});

describe('EvmIncomingSubscriber - backoff on RPC errors (#169)', () => {
  let subscriber: EvmIncomingSubscriber;

  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
    });
  });

  it('applies backoff after getBlockNumber RPC failure (429/500)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // First call fails (simulating 429)
    mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 429'));

    await subscriber.pollAll();

    // Second immediate call should be skipped (backoff)
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();

    // getBlockNumber should have been called only once (the failed one)
    expect(mockClient.getBlockNumber).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('escalates backoff exponentially up to 300s cap', async () => {
    const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const loggedSubscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      logger: mockLogger,
    });
    vi.useFakeTimers();

    // Fail 10 times
    for (let i = 0; i < 10; i++) {
      mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 429'));
      await loggedSubscriber.pollAll();
      // Advance past max backoff
      vi.advanceTimersByTime(301_000);
    }

    // After 10 failures, warn should have been called (threshold is 3)
    expect(mockLogger.warn).toHaveBeenCalled();
    // The warn message should contain backoff duration capped at 300s
    const lastWarnCall = mockLogger.warn.mock.calls[mockLogger.warn.mock.calls.length - 1]!;
    expect(lastWarnCall[0]).toContain('300s');

    vi.useRealTimers();
  });

  it('suppresses warn for first errors below threshold', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();

    // Fail twice (below WARN_THRESHOLD=3)
    mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 429'));
    await subscriber.pollAll();
    vi.advanceTimersByTime(31_000);

    mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 429'));
    await subscriber.pollAll();

    // warn should NOT have been called (errorCount < 3)
    expect(warnSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
    warnSpy.mockRestore();
  });
});

describe('EvmIncomingSubscriber - RPC Pool integration (#199)', () => {
  beforeEach(() => {
    // mockReset clears once-queues (mockResolvedValueOnce) leaked from prior tests
    mockClient.getBlockNumber.mockReset();
    mockClient.getLogs.mockReset();
    mockClient.getBlock.mockReset();
    idCounter = 0;
  });

  it('calls reportRpcFailure on global RPC error (getBlockNumber failure)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reportFailure = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      reportRpcFailure: reportFailure,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 429'));
    await subscriber.pollAll();

    expect(reportFailure).toHaveBeenCalledWith(TEST_RPC_URL);
    warnSpy.mockRestore();
  });

  it('calls reportRpcFailure on per-wallet error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reportFailure = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      reportRpcFailure: reportFailure,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('HTTP 408'));
    await subscriber.pollAll();

    expect(reportFailure).toHaveBeenCalledWith(TEST_RPC_URL);
    warnSpy.mockRestore();
  });

  it('calls reportRpcSuccess after a fully clean poll cycle', async () => {
    const reportSuccess = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      reportRpcSuccess: reportSuccess,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'arbitrum-mainnet', vi.fn());

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    await subscriber.pollAll();

    expect(reportSuccess).toHaveBeenCalledWith(TEST_RPC_URL);
  });

  it('does not call reportRpcSuccess when per-wallet error occurs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reportSuccess = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      reportRpcSuccess: reportSuccess,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockRejectedValueOnce(new Error('RPC error'));
    await subscriber.pollAll();

    expect(reportSuccess).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('re-resolves RPC URL each poll cycle via resolveRpcUrl callback', async () => {
    let callCount = 0;
    const urls = [TEST_RPC_URL, 'https://rpc2.test.com', 'https://rpc3.test.com'];
    const resolveRpcUrl = vi.fn(() => urls[Math.min(callCount++, urls.length - 1)]!);

    const subscriber = new EvmIncomingSubscriber({
      resolveRpcUrl,
      generateId: mockGenerateId,
    });

    // resolveRpcUrl called once in constructor
    expect(resolveRpcUrl).toHaveBeenCalledTimes(1);

    // Poll cycle 1: calls resolveRpcUrl again
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();
    expect(resolveRpcUrl).toHaveBeenCalledTimes(2);

    // Poll cycle 2: calls resolveRpcUrl again
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();
    expect(resolveRpcUrl).toHaveBeenCalledTimes(3);
  });

  it('switches to new RPC URL when resolveRpcUrl returns different URL', async () => {
    const { createPublicClient: mockCreate } = await import('viem');
    vi.mocked(mockCreate).mockClear();

    let currentUrl = TEST_RPC_URL;
    const resolveRpcUrl = () => currentUrl;

    const subscriber = new EvmIncomingSubscriber({
      resolveRpcUrl,
      generateId: mockGenerateId,
    });

    // Constructor creates first client
    expect(vi.mocked(mockCreate)).toHaveBeenCalledTimes(1);

    // Same URL → no new client
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();
    expect(vi.mocked(mockCreate)).toHaveBeenCalledTimes(1);

    // Different URL → new client created
    currentUrl = 'https://rpc2.test.com';
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();
    expect(vi.mocked(mockCreate)).toHaveBeenCalledTimes(2);
  });

  it('keeps current client when resolveRpcUrl throws (AllRpcFailedError)', async () => {
    const { createPublicClient: mockCreate } = await import('viem');
    vi.mocked(mockCreate).mockClear();

    let shouldThrow = false;
    const resolveRpcUrl = () => {
      if (shouldThrow) throw new Error('AllRpcFailedError');
      return TEST_RPC_URL;
    };

    const subscriber = new EvmIncomingSubscriber({
      resolveRpcUrl,
      generateId: mockGenerateId,
    });

    expect(vi.mocked(mockCreate)).toHaveBeenCalledTimes(1);

    // resolveRpcUrl throws → no new client, polls with existing client
    shouldThrow = true;
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();
    expect(vi.mocked(mockCreate)).toHaveBeenCalledTimes(1);
  });

  it('reports failure with correct URL after endpoint switch', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reportFailure = vi.fn();
    let currentUrl = TEST_RPC_URL;

    const subscriber = new EvmIncomingSubscriber({
      resolveRpcUrl: () => currentUrl,
      reportRpcFailure: reportFailure,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-sepolia', vi.fn());

    // Switch URL before poll
    currentUrl = 'https://rpc2.test.com';

    mockClient.getBlockNumber.mockRejectedValueOnce(new Error('HTTP 500'));
    await subscriber.pollAll();

    // Should report failure with the NEW URL (rpc2)
    expect(reportFailure).toHaveBeenCalledWith('https://rpc2.test.com');
    warnSpy.mockRestore();
  });

  it('single endpoint (no resolveRpcUrl) still works with static rpcUrl', async () => {
    const reportSuccess = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      reportRpcSuccess: reportSuccess,
      generateId: mockGenerateId,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.pollAll();

    expect(reportSuccess).toHaveBeenCalledWith(TEST_RPC_URL);
  });
});

describe('EvmIncomingSubscriber - additional branch coverage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses default generateId (crypto.randomUUID) when no generateId provided', async () => {
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', onTx);

    // Poll with a matching ERC-20 log
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([
      {
        transactionHash: '0xabc123',
        address: TEST_TOKEN_ADDRESS,
        args: {
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 1000000n,
        },
        blockNumber: 101n,
      },
    ]);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    await subscriber.pollAll();

    expect(onTx).toHaveBeenCalledOnce();
    const tx = onTx.mock.calls[0]![0];
    // Default generateId uses crypto.randomUUID, produces a UUID-like string
    expect(typeof tx.id).toBe('string');
    expect(tx.id.length).toBeGreaterThan(0);
  });

  it('handles non-Error thrown value in per-wallet error handler', async () => {
    vi.useFakeTimers();
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
      logger,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', vi.fn());

    // Throw a non-Error value from getLogs
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockRejectedValueOnce('string error value');
    await subscriber.pollAll();

    // Should not throw, wallet gets backoff
    // Advance past backoff, fail 2 more times to hit WARN_THRESHOLD
    vi.advanceTimersByTime(31_000);
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockRejectedValueOnce('string error 2');
    await subscriber.pollAll();

    vi.advanceTimersByTime(61_000);
    mockClient.getBlockNumber.mockResolvedValueOnce(105n);
    mockClient.getLogs.mockRejectedValueOnce('string error 3');
    await subscriber.pollAll();

    // At WARN_THRESHOLD (3), logger.warn should include the string error message
    expect(logger.warn).toHaveBeenCalled();
    const warnMsg = logger.warn.mock.calls[0]![0] as string;
    expect(warnMsg).toContain('string error 3');
  });

  it('cursor advancement uses currentBlock when range is smaller than MAX_BLOCK_RANGE', async () => {
    vi.useFakeTimers();
    const onAlert = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
      onRpcAlert: onAlert,
    });

    // Subscribe at block 100
    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', vi.fn());

    // currentBlock is 103 (only 3 blocks ahead, less than MAX_BLOCK_RANGE=10)
    // Fail 3 times to trigger cursor advancement
    for (let i = 0; i < 3; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(103n);
      mockClient.getLogs.mockRejectedValueOnce(new Error('fail'));
      await subscriber.pollAll();
      vi.advanceTimersByTime(301_000);
    }

    // On 3rd failure, should advance cursor to 103 (currentBlock, not lastBlock + MAX_BLOCK_RANGE)
    expect(onAlert).toHaveBeenCalledWith(expect.objectContaining({
      type: 'INCOMING_TX_RANGE_SKIPPED',
      toBlock: '103', // currentBlock, not 110 (100+10)
    }));
  });

  it('emits RPC_HEALTH_DEGRADED alert at exactly 5 consecutive errors', async () => {
    vi.useFakeTimers();
    const onAlert = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
      onRpcAlert: onAlert,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', vi.fn());

    // Fail 5 times, keep currentBlock advancing so lastBlock < currentBlock after cursor advancement
    for (let i = 0; i < 5; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(200n + BigInt(i * 20));
      mockClient.getLogs.mockRejectedValueOnce(new Error(`fail-${i}`));
      await subscriber.pollAll();
      vi.advanceTimersByTime(301_000);
    }

    // Should have emitted both RANGE_SKIPPED (at 3) and HEALTH_DEGRADED (at 5)
    const healthAlerts = onAlert.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type: string }).type === 'RPC_HEALTH_DEGRADED',
    );
    expect(healthAlerts).toHaveLength(1);
    expect(healthAlerts[0]![0]).toMatchObject({
      type: 'RPC_HEALTH_DEGRADED',
      walletId: 'wallet-1',
      errorCount: 5,
    });
  });

  it('does not re-emit RPC_HEALTH_DEGRADED for already alerted wallet', async () => {
    vi.useFakeTimers();
    const onAlert = vi.fn();
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
      onRpcAlert: onAlert,
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', vi.fn());

    // Fail 10 times, keep currentBlock advancing so polling is never skipped
    for (let i = 0; i < 10; i++) {
      mockClient.getBlockNumber.mockResolvedValueOnce(200n + BigInt(i * 20));
      mockClient.getLogs.mockRejectedValueOnce(new Error(`fail-${i}`));
      await subscriber.pollAll();
      vi.advanceTimersByTime(301_000);
    }

    // RPC_HEALTH_DEGRADED should only be emitted once (at errorCount === 5)
    const healthAlerts = onAlert.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type: string }).type === 'RPC_HEALTH_DEGRADED',
    );
    expect(healthAlerts).toHaveLength(1);
  });

  it('handles non-Error thrown in RPC-level catch (getBlockNumber)', async () => {
    vi.useFakeTimers();
    const reportFailure = vi.fn();
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      reportRpcFailure: reportFailure,
      logger,
    });

    // getBlockNumber throws a non-Error value
    mockClient.getBlockNumber.mockRejectedValueOnce('rpc string error');
    await subscriber.pollAll();

    expect(reportFailure).toHaveBeenCalledWith(TEST_RPC_URL);

    // Fail 2 more times to hit WARN_THRESHOLD (3) for global backoff
    vi.advanceTimersByTime(31_000);
    mockClient.getBlockNumber.mockRejectedValueOnce('rpc string error 2');
    await subscriber.pollAll();

    vi.advanceTimersByTime(61_000);
    mockClient.getBlockNumber.mockRejectedValueOnce('rpc string error 3');
    await subscriber.pollAll();

    expect(logger.warn).toHaveBeenCalled();
    const warnMsg = logger.warn.mock.calls[0]![0] as string;
    expect(warnMsg).toContain('rpc string error 3');
  });

  it('handles getLogs returning null (#203)', async () => {
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx = vi.fn();
    await subscriber.subscribe('wallet-1', TEST_WALLET_ADDRESS, 'ethereum-mainnet', onTx);

    // getLogs returns null instead of empty array
    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce(null);
    mockClient.getBlock.mockResolvedValueOnce({ transactions: [] });
    await subscriber.pollAll();

    // Should not throw, no transactions detected
    expect(onTx).not.toHaveBeenCalled();
  });

  it('skips transactions without to field in pollNativeETH', async () => {
    idCounter = 0;
    const subscriber = new EvmIncomingSubscriber({
      rpcUrl: TEST_RPC_URL,
      generateId: mockGenerateId,
      resolveTokenAddresses: () => [TEST_TOKEN_ADDRESS as `0x${string}`],
    });

    mockClient.getBlockNumber.mockResolvedValueOnce(100n);
    const onTx = vi.fn();
    await subscriber.subscribe(
      'wallet-1',
      TEST_WALLET_ADDRESS,
      'ethereum-mainnet',
      onTx,
    );

    mockClient.getBlockNumber.mockResolvedValueOnce(101n);
    mockClient.getLogs.mockResolvedValueOnce([]);
    mockClient.getBlock.mockResolvedValueOnce({
      transactions: [
        // Contract creation: tx object without 'to' (to is undefined/null)
        {
          hash: '0xcontractcreation',
          from: TEST_SENDER_ADDRESS,
          value: 100n,
        },
        // Valid tx to our wallet
        {
          hash: '0xvalidtx',
          from: TEST_SENDER_ADDRESS,
          to: TEST_WALLET_ADDRESS,
          value: 500n,
        },
      ],
    });
    await subscriber.pollAll();

    // Only the valid tx should be detected, contract creation skipped
    expect(onTx).toHaveBeenCalledOnce();
    expect(onTx.mock.calls[0]![0].txHash).toBe('0xvalidtx');
  });
});
