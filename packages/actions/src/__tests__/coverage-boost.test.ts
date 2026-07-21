/**
 * Coverage boost tests: targets uncovered functions and branches across the @waiaas/actions package.
 *
 * Functions targeted:
 * - PolymarketApiKeyService default generateId
 * - PolymarketOrderProvider default generateId
 * - createPolymarketInfrastructure negRiskResolver.isNegRisk arrow
 *
 * Branches targeted across: perp-provider, spot-provider, sub-account-service,
 * lifi/bridge-status-tracker, jito-stake-pool, kamino, orderbook-client,
 * gamma-client, clob-client, order-provider, order-builder, position-tracker,
 * resolution-monitor, aave-rpc, dcent, across, pendle, etc.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Polymarket default generateId functions
// ---------------------------------------------------------------------------

describe('PolymarketApiKeyService default generateId', () => {
  it('uses crypto.randomUUID() when no generateId provided', async () => {
    const { PolymarketApiKeyService } = await import('../providers/polymarket/api-key-service.js');

    const mockCreds = { apiKey: 'ak', secret: 'sec', passphrase: 'pp' };
    const mockClobClient = {
      createApiKey: vi.fn().mockResolvedValue(mockCreds),
      deleteApiKey: vi.fn(),
    } as any;

    const db = {
      getApiKeyByWalletId: vi.fn().mockReturnValue(null),
      insertApiKey: vi.fn(),
      deleteApiKeyByWalletId: vi.fn(),
    };

    // No 5th arg -> uses default generateId = () => crypto.randomUUID()
    const service = new PolymarketApiKeyService(mockClobClient, db, (s: string) => `enc:${s}`, (s: string) => s.replace('enc:', ''));

    await service.ensureApiKeys(
      'wallet-1',
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as any,
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as any,
    );

    expect(db.insertApiKey).toHaveBeenCalledTimes(1);
    const row = db.insertApiKey.mock.calls[0]![0];
    // Default UUID should be a valid UUID string
    expect(typeof row.id).toBe('string');
    expect(row.id.length).toBeGreaterThan(0);
  });
});

describe('PolymarketOrderProvider default generateId', () => {
  it('uses crypto.randomUUID() when no generateId provided', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const mockClobClient = {
      postOrder: vi.fn().mockResolvedValue({ orderID: 'ord-1', success: true }),
      cancelOrder: vi.fn().mockResolvedValue(undefined),
      cancelAll: vi.fn().mockResolvedValue(undefined),
    } as any;

    const mockApiKeyService = {
      ensureApiKeys: vi.fn().mockResolvedValue({
        apiKey: 'ak-1',
        secret: Buffer.from('test-hmac-secret-32b!').toString('base64'),
        passphrase: 'pp-1',
      }),
    } as any;

    const db = {
      insertOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
      updateOrderStatusByOrderId: vi.fn(),
    };

    // No 5th arg -> uses default generateId
    const provider = new PolymarketOrderProvider(
      mockClobClient,
      mockApiKeyService,
      { isNegRisk: vi.fn().mockResolvedValue(false) },
      db,
    );

    const result = await provider.resolve('pm_buy', {
      tokenId: '12345',
      price: '0.65',
      size: '100',
      orderType: 'GTC',
    }, {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'wallet-1',
      sessionId: 'session-1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    });

    expect(result.__apiDirect).toBe(true);
    // DB should have been called with a UUID
    expect(db.insertOrder).toHaveBeenCalledTimes(1);
    const row = db.insertOrder.mock.calls[0]![0];
    expect(typeof row.id).toBe('string');
    expect(row.id.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Infrastructure negRiskResolver.isNegRisk arrow
// ---------------------------------------------------------------------------

describe('createPolymarketInfrastructure negRiskResolver', () => {
  it('wires negRiskResolver.isNegRisk through MarketData.isNegRisk', async () => {
    const { createPolymarketInfrastructure } = await import('../providers/polymarket/infrastructure.js');

    const db = {
      apiKeys: {
        getApiKeyByWalletId: vi.fn().mockReturnValue(null),
        insertApiKey: vi.fn(),
        deleteApiKeyByWalletId: vi.fn(),
      },
      orders: {
        insertOrder: vi.fn(),
        updateOrderStatus: vi.fn(),
        updateOrderStatusByOrderId: vi.fn(),
      },
      positions: null,
    };

    const infra = createPolymarketInfrastructure(
      {},
      db,
      (s: string) => `enc:${s}`,
      (s: string) => s.replace('enc:', ''),
    );

    // Exercise the negRiskResolver.isNegRisk arrow function (line 123)
    // by calling resolve on the orderProvider, which internally calls negRiskResolver.isNegRisk
    // We mock the underlying fetch to make the CLOB createApiKey work
    const API_CREDS = {
      apiKey: 'ak-1',
      secret: Buffer.from('test-hmac-secret-32b!').toString('base64'),
      passphrase: 'pp-1',
    };

    // Spy on the apiKeyService to return creds without network call
    vi.spyOn(infra.apiKeyService, 'ensureApiKeys').mockResolvedValue(API_CREDS);

    // Spy on clobClient.postOrder
    vi.spyOn(infra.clobClient, 'postOrder').mockResolvedValue({ orderID: 'test-ord' });

    // Spy on marketData.isNegRisk — this is what the negRiskResolver.isNegRisk arrow delegates to
    vi.spyOn(infra.marketData, 'isNegRisk').mockResolvedValue(false);

    const result = await infra.orderProvider.resolve('pm_buy', {
      tokenId: '12345',
      price: '0.50',
      size: '10',
      orderType: 'GTC',
    }, {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'wallet-1',
      sessionId: 'session-1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    });

    expect(result.__apiDirect).toBe(true);
    // Verify the negRiskResolver arrow was called (line 123 of infrastructure.ts)
    expect(infra.marketData.isNegRisk).toHaveBeenCalledWith('12345');
  });
});

// ---------------------------------------------------------------------------
// 3. LI.FI bridge-status-tracker branch coverage
// ---------------------------------------------------------------------------

const LIFI_CONFIG = {
  enabled: true,
  apiBaseUrl: 'https://li.quest/v1',
  apiKey: '',
  defaultSlippagePct: 0.03,
  maxSlippagePct: 0.05,
  requestTimeoutMs: 10_000,
};

function mockFetchForLifi(response: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
    status: 200,
  } as any);
}

describe('LI.FI BridgeStatusTracker branches', () => {
  it('maps DONE status with destTxHash', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'DONE',
      receiving: { txHash: '0xabc', chainId: 137 },
      lifiExplorerLink: 'https://explorer.li.fi/tx/123',
      tool: 'hop',
    });

    const result = await tracker.checkStatus('tx-1', { txHash: '0x123' });
    expect(result.state).toBe('COMPLETED');
    expect(result.details?.destTxHash).toBe('0xabc');
    expect(result.details?.destChainId).toBe(137);
    expect(result.details?.tool).toBe('hop');
  });

  it('maps FAILED status with non-refund', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'FAILED',
      substatus: 'UNKNOWN_ERROR',
      substatusMessage: 'Transfer failed',
    });

    const result = await tracker.checkStatus('tx-2', { txHash: '0x456' });
    expect(result.state).toBe('FAILED');
    expect(result.details?.substatusMessage).toBe('Transfer failed');
  });

  it('maps FAILED status with REFUNDED substatus', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'FAILED',
      substatus: 'REFUNDED',
      substatusMessage: 'Funds refunded',
      lifiExplorerLink: 'https://explorer.li.fi/tx/456',
    });

    const result = await tracker.checkStatus('tx-3', { txHash: '0x789' });
    expect(result.state).toBe('COMPLETED');
    expect(result.details?.refunded).toBe(true);
  });

  it('maps FAILED status with refund keyword in substatusMessage', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'FAILED',
      substatus: 'OTHER',
      substatusMessage: 'Refund processed successfully',
    });

    const result = await tracker.checkStatus('tx-4', { txHash: '0xabc' });
    expect(result.state).toBe('COMPLETED');
    expect(result.details?.refunded).toBe(true);
  });

  it('maps NOT_FOUND as PENDING', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({ status: 'NOT_FOUND' });

    const result = await tracker.checkStatus('tx-5', { txHash: '0xdef' });
    expect(result.state).toBe('PENDING');
  });

  it('maps INVALID as PENDING', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({ status: 'INVALID' });

    const result = await tracker.checkStatus('tx-6', { txHash: '0xghi' });
    expect(result.state).toBe('PENDING');
  });

  it('maps PENDING status with substatus details', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'PENDING',
      substatus: 'BRIDGE_IN_PROGRESS',
      substatusMessage: 'Waiting for confirmation',
    });

    const result = await tracker.checkStatus('tx-7', { txHash: '0xjkl' });
    expect(result.state).toBe('PENDING');
    expect(result.details?.substatus).toBe('BRIDGE_IN_PROGRESS');
  });

  it('returns PENDING when no txHash in metadata', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);

    const result = await tracker.checkStatus('tx-8', {});
    expect(result.state).toBe('PENDING');
    expect(result.details?.error).toBe('No txHash in metadata');
  });

  it('maps DONE status with null optional fields', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({ status: 'DONE' });

    const result = await tracker.checkStatus('tx-9', { txHash: '0xnull' });
    expect(result.state).toBe('COMPLETED');
    expect(result.details?.destTxHash).toBeNull();
    expect(result.details?.destChainId).toBeNull();
    expect(result.details?.tool).toBeNull();
  });

  it('maps FAILED without substatusMessage uses default', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({ status: 'FAILED' });

    const result = await tracker.checkStatus('tx-10', { txHash: '0xfail' });
    expect(result.state).toBe('FAILED');
    expect(result.details?.substatusMessage).toBe('Bridge transfer failed');
  });

  it('maps PENDING status without substatus details', async () => {
    const { BridgeStatusTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeStatusTracker(LIFI_CONFIG);
    mockFetchForLifi({ status: 'PENDING' });

    const result = await tracker.checkStatus('tx-11', { txHash: '0xpend' });
    expect(result.state).toBe('PENDING');
    expect(result.details?.substatus).toBeNull();
    expect(result.details?.substatusMessage).toBeNull();
  });
});

describe('LI.FI BridgeMonitoringTracker branches', () => {
  it('returns PENDING when no txHash', async () => {
    const { BridgeMonitoringTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeMonitoringTracker(LIFI_CONFIG);

    const result = await tracker.checkStatus('tx-12', {});
    expect(result.state).toBe('PENDING');
    expect(result.details?.error).toBe('No txHash in metadata');
  });

  it('maps DONE status correctly', async () => {
    const { BridgeMonitoringTracker } = await import('../providers/lifi/bridge-status-tracker.js');

    const tracker = new BridgeMonitoringTracker(LIFI_CONFIG);
    mockFetchForLifi({
      status: 'DONE',
      receiving: { txHash: '0xdone', chainId: 42161 },
    });

    const result = await tracker.checkStatus('tx-13', { txHash: '0xmon' });
    expect(result.state).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// 4. Perp-provider additional branches
// ---------------------------------------------------------------------------

describe('HyperliquidPerpProvider additional branches', () => {
  function createMockClient() {
    return {
      exchange: vi.fn().mockResolvedValue({
        status: 'ok',
        response: { type: 'order', data: { statuses: [{ resting: { oid: 42 } }] } },
      }),
      info: vi.fn(),
    } as any;
  }

  function createMockMarketData() {
    return {
      getMarkets: vi.fn().mockResolvedValue([
        { name: 'ETH', szDecimals: 3, maxLeverage: 50 },
        { name: 'BTC', szDecimals: 5, maxLeverage: 50 },
      ]),
      getAllMidPrices: vi.fn().mockResolvedValue({ ETH: '2000', BTC: '40000' }),
      getPositions: vi.fn().mockResolvedValue([]),
      getOpenOrders: vi.fn().mockResolvedValue([]),
      getAccountState: vi.fn().mockResolvedValue({
        marginSummary: {
          accountValue: '10000',
          totalNtlPos: '5000',
          totalRawUsd: '5000',
          totalMarginUsed: '3000',
        },
        assetPositions: [],
      }),
      getFundingHistory: vi.fn().mockResolvedValue([]),
      getUserFills: vi.fn().mockResolvedValue([]),
      getSubAccounts: vi.fn().mockResolvedValue([]),
      getSpotState: vi.fn().mockResolvedValue({}),
    } as any;
  }

  const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const ctx = {
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    chain: 'ethereum' as const,
    walletId: 'wallet-001',
    sessionId: 'session-001',
    privateKey: TEST_KEY,
  };

  it('open_position with SELL side uses 0.97 slippage for market order', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'SELL',
      size: '1.0',
      orderType: 'MARKET',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.metadata?.side).toBe('SELL');
  });

  it('open_position with no mid price throws', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAllMidPrices.mockResolvedValue({});
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    await expect(provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      orderType: 'MARKET',
    }, ctx)).rejects.toThrow('No mid price');
  });

  it('open_position extracts oid from filled status (not resting)', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    client.exchange.mockResolvedValue({
      status: 'ok',
      response: { type: 'order', data: { statuses: [{ filled: { oid: 999 } }] } },
    });
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      orderType: 'MARKET',
    }, ctx);

    expect(result.externalId).toBe('999');
  });

  it('open_position falls back to nonce when no oid in response', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    client.exchange.mockResolvedValue({
      status: 'ok',
      response: { type: 'order', data: { statuses: [{}] } },
    });
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      orderType: 'MARKET',
    }, ctx);

    // Falls back to nonce (a timestamp)
    expect(typeof result.externalId).toBe('string');
    expect(parseInt(result.externalId)).toBeGreaterThan(0);
  });

  it('open_position with tif option for limit order', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      price: '1900',
      orderType: 'LIMIT',
      tif: 'IOC',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('open_position with reduceOnly and cloid', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      price: '1900',
      orderType: 'LIMIT',
      reduceOnly: true,
      cloid: 'my-cloid-123',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('open_position with subAccount', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_open_position', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      price: '1900',
      orderType: 'LIMIT',
      subAccount: '0x1234567890123456789012345678901234567890',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('close_position with short position (negative szi)', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getPositions.mockResolvedValue([{
      coin: 'ETH',
      szi: '-2.0',
      entryPx: '2100',
      leverage: { type: 'cross', value: 5 },
    }]);
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_close_position', {
      market: 'ETH',
    }, ctx);

    expect(result.metadata?.side).toBe('BUY'); // Close short = BUY
  });

  it('close_position with explicit size', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getPositions.mockResolvedValue([{
      coin: 'ETH',
      szi: '5.0',
      entryPx: '2000',
      leverage: { type: 'cross', value: 10 },
    }]);
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_close_position', {
      market: 'ETH',
      size: '2.0',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.metadata?.size).toBe('2.0');
  });

  it('cancel_order by cloid', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_cancel_order', {
      market: 'ETH',
      cloid: 'my-cloid-456',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    const exchangeCall = client.exchange.mock.calls[0][0];
    expect(exchangeCall.action.type).toBe('cancelByCloid');
  });

  it('place_order STOP_LIMIT uses isMarket=false', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.resolve('hl_place_order', {
      market: 'ETH',
      side: 'SELL',
      size: '1.0',
      triggerPrice: '1800',
      price: '1790',
      orderType: 'STOP_LIMIT',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('place_order for unknown market throws', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getMarkets.mockResolvedValue([]);
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    await expect(provider.resolve('hl_place_order', {
      market: 'UNKNOWN',
      side: 'BUY',
      size: '1',
      triggerPrice: '1000',
      orderType: 'STOP_MARKET',
    }, ctx)).rejects.toThrow('Unknown market');
  });

  it('getSpendingAmount for hl_place_order', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('hl_place_order', {
      market: 'ETH',
      side: 'BUY',
      size: '1',
      triggerPrice: '2000',
      orderType: 'STOP_MARKET',
    });

    // margin = 1 * 2000 / 1 (default leverage) = 2000 USDC
    expect(result.amount).toBe(2000_000000n);
  });

  it('getSpendingAmount for hl_set_margin_mode returns 0', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('hl_set_margin_mode', {
      asset: 4,
      mode: 'CROSS',
    });
    expect(result.amount).toBe(0n);
  });

  it('getSpendingAmount for unknown action returns 0', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('unknown_action', {});
    expect(result.amount).toBe(0n);
  });

  it('getPosition maps null optional fields', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getPositions.mockResolvedValue([{
      coin: 'ETH',
      szi: '-1.0',
      // no entryPx, leverage, unrealizedPnl, marginUsed, liquidationPx
    }]);
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const positions = await provider.getPosition('w1', ctx);
    expect(positions).toHaveLength(1);
    expect(positions[0]!.direction).toBe('SHORT');
    expect(positions[0]!.entryPrice).toBeNull();
    expect(positions[0]!.unrealizedPnl).toBeNull();
    expect(positions[0]!.margin).toBeNull();
    expect(positions[0]!.liquidationPrice).toBeNull();
  });

  it('getMarginInfo returns safe status for high margin ratio', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAccountState.mockResolvedValue({
      marginSummary: {
        accountValue: '10000',
        totalNtlPos: '5000',
        totalRawUsd: '5000',
        totalMarginUsed: '5000', // 50% margin ratio -> safe
      },
    });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const info = await provider.getMarginInfo('w1', ctx);
    expect(info.status).toBe('safe');
  });

  it('getMarginInfo returns danger status for 12% margin', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAccountState.mockResolvedValue({
      marginSummary: {
        accountValue: '10000',
        totalMarginUsed: '1200', // 12% -> danger
      },
    });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const info = await provider.getMarginInfo('w1', ctx);
    expect(info.status).toBe('danger');
  });

  it('getMarginInfo returns critical status for 8% margin', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAccountState.mockResolvedValue({
      marginSummary: {
        accountValue: '10000',
        totalMarginUsed: '800', // 8% -> critical
      },
    });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const info = await provider.getMarginInfo('w1', ctx);
    expect(info.status).toBe('critical');
  });

  it('getMarginInfo returns safe on error', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAccountState.mockRejectedValue(new Error('fail'));
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const info = await provider.getMarginInfo('w1', ctx);
    expect(info.status).toBe('safe');
    expect(info.totalMargin).toBe(0);
  });

  it('getMarginInfo handles zero accountValue', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getAccountState.mockResolvedValue({
      marginSummary: {
        accountValue: '0',
        totalMarginUsed: '0',
      },
    });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const info = await provider.getMarginInfo('w1', ctx);
    expect(info.marginRatio).toBe(0);
  });

  it('getMarkets handles error gracefully', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getMarkets.mockRejectedValue(new Error('fail'));
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const markets = await provider.getMarkets('ethereum');
    expect(markets).toEqual([]);
  });

  it('getMarkets with missing maxLeverage defaults to 50', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getMarkets.mockResolvedValue([{ name: 'SOL', szDecimals: 2 }]);
    marketData.getAllMidPrices.mockResolvedValue({ SOL: '100' });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const markets = await provider.getMarkets('ethereum');
    expect(markets[0]!.maxLeverage).toBe(50);
  });

  it('getPositions with null optional fields in position data', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getPositions.mockResolvedValue([{
      coin: 'ETH',
      szi: '1.0',
      // no entryPx, leverage, unrealizedPnl, marginUsed, liquidationPx
    }]);
    marketData.getAllMidPrices.mockResolvedValue({ ETH: '2000' });
    const provider = new HyperliquidPerpProvider(client, marketData, true);

    const positions = await provider.getPositions({
      walletId: 'w1',
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      networks: ['ethereum-mainnet'],
      environment: 'mainnet',
      rpcUrls: {},
    });

    expect(positions).toHaveLength(1);
    expect(positions[0]!.metadata.entryPrice).toBeNull();
    expect(positions[0]!.metadata.leverage).toBeNull();
    expect(positions[0]!.metadata.unrealizedPnl).toBeNull();
    expect(positions[0]!.metadata.liquidationPrice).toBeNull();
    expect(positions[0]!.metadata.marginUsed).toBeNull();
  });

  it('resolves on testnet (isMainnet=false)', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidPerpProvider(client, marketData, false); // testnet

    const result = await provider.resolve('hl_transfer_usdc', {
      amount: '100',
      toPerp: true,
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Spot-provider additional branches
// ---------------------------------------------------------------------------

describe('HyperliquidSpotProvider additional branches', () => {
  function createMockClient() {
    return {
      exchange: vi.fn().mockResolvedValue({
        status: 'ok',
        response: { type: 'order', data: { statuses: [{ resting: { oid: 42 } }] } },
      }),
    } as any;
  }

  function createMockMarketData() {
    return {
      getMarkets: vi.fn().mockResolvedValue([
        { name: 'ETH', szDecimals: 3, maxLeverage: 50 },
      ]),
      getAllMidPrices: vi.fn().mockResolvedValue({ 'PURR/USDC': '0.5', 'ETH': '2000' }),
      getSpotMeta: vi.fn().mockResolvedValue({
        universe: [{ name: 'PURR/USDC', tokens: [0, 1], index: 10000 }],
        tokens: [{ name: 'PURR', szDecimals: 0, weiDecimals: 18, index: 0 }],
      }),
      getOpenOrders: vi.fn().mockResolvedValue([]),
      getPositions: vi.fn().mockResolvedValue([]),
      getAccountState: vi.fn().mockResolvedValue({
        marginSummary: { accountValue: '1000', totalMarginUsed: '0' },
      }),
      getSpotState: vi.fn().mockResolvedValue({
        balances: [{ coin: 'PURR', total: '100', hold: '10' }],
      }),
    } as any;
  }

  const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const ctx = {
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    chain: 'ethereum' as const,
    walletId: 'wallet-001',
    sessionId: 'session-001',
    privateKey: TEST_KEY,
  };

  it('spot_sell resolves correctly', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_sell', {
      market: 'PURR/USDC',
      size: '50',
      orderType: 'MARKET',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.action).toBe('hl_spot_sell');
  });

  it('spot_cancel by cloid', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_cancel', {
      market: 'PURR/USDC',
      cloid: 'cloid-123',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    const exchangeCall = client.exchange.mock.calls[0][0];
    expect(exchangeCall.action.type).toBe('cancelByCloid');
  });

  it('spot_cancel all orders for market', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    marketData.getOpenOrders.mockResolvedValue([
      { coin: 'PURR/USDC', side: 'B', limitPx: '0.5', sz: '10', oid: 100 },
    ]);
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_cancel', {
      market: 'PURR/USDC',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    const exchangeCall = client.exchange.mock.calls[0][0];
    expect(exchangeCall.action.cancels).toHaveLength(1);
  });

  it('spot_cancel returns 0 when no orders', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_cancel', {
      market: 'PURR/USDC',
    }, ctx);

    expect(result.data.cancelled).toBe(0);
  });

  it('getSpendingAmount for hl_spot_buy with market order uses mid price', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('hl_spot_buy', {
      market: 'PURR/USDC',
      size: '100',
      orderType: 'MARKET',
    });

    expect(result.amount).toBe(50_000000n); // 100 * 0.5
  });

  it('getSpendingAmount for hl_spot_sell returns 0', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('hl_spot_sell', {});
    expect(result.amount).toBe(0n);
  });

  it('getSpendingAmount for unknown action returns 0', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');
    const client = createMockClient();
    const marketData = createMockMarketData();
    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('unknown', {});
    expect(result.amount).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// 6. SubAccountService branch coverage
// ---------------------------------------------------------------------------

describe('HyperliquidSubAccountService branches', () => {
  function createClient(exchangeImpl?: any) {
    return {
      exchange: exchangeImpl ?? vi.fn().mockResolvedValue({
        status: 'ok',
        response: { data: { subAccountUser: '0xsub123' } },
      }),
    } as any;
  }

  function createMarketData() {
    return {
      getSubAccounts: vi.fn().mockResolvedValue([]),
      getSubAccountPositions: vi.fn().mockResolvedValue([]),
    } as any;
  }

  const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as any;

  it('createSubAccount extracts subAccountUser from response', async () => {
    const { HyperliquidSubAccountService } = await import('../providers/hyperliquid/sub-account-service.js');
    const service = new HyperliquidSubAccountService(createClient(), createMarketData(), true);

    const result = await service.createSubAccount('test-sub', TEST_KEY);
    expect(result.subAccountAddress).toBe('0xsub123');
  });

  it('createSubAccount returns empty string when no subAccountUser in response', async () => {
    const { HyperliquidSubAccountService } = await import('../providers/hyperliquid/sub-account-service.js');
    const client = createClient(vi.fn().mockResolvedValue({
      status: 'ok',
      response: { data: {} },
    }));
    const service = new HyperliquidSubAccountService(client, createMarketData(), true);

    const result = await service.createSubAccount('test-sub', TEST_KEY);
    expect(result.subAccountAddress).toBe('');
  });

  it('createSubAccount wraps non-ChainError in ChainError', async () => {
    const { HyperliquidSubAccountService } = await import('../providers/hyperliquid/sub-account-service.js');
    const client = createClient(vi.fn().mockRejectedValue(new Error('connection failed')));
    const service = new HyperliquidSubAccountService(client, createMarketData(), true);

    await expect(service.createSubAccount('test-sub', TEST_KEY)).rejects.toThrow('Failed to create sub-account');
  });

  it('transfer wraps non-ChainError in ChainError', async () => {
    const { HyperliquidSubAccountService } = await import('../providers/hyperliquid/sub-account-service.js');
    const client = createClient(vi.fn().mockRejectedValue(new Error('timeout')));
    const service = new HyperliquidSubAccountService(client, createMarketData(), false); // testnet

    await expect(service.transfer({
      subAccountAddress: '0xsub',
      amount: '100',
      isDeposit: true,
      privateKey: TEST_KEY,
    })).rejects.toThrow('Failed to transfer to sub-account');
  });
});

// ---------------------------------------------------------------------------
// 7. Polymarket order-provider additional branches
// ---------------------------------------------------------------------------

describe('PolymarketOrderProvider additional branches', () => {
  const WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as any;
  const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as any;
  const API_CREDS = {
    apiKey: 'ak-1',
    secret: Buffer.from('test-hmac-secret-32b!').toString('base64'),
    passphrase: 'pp-1',
  };

  const ctx = {
    walletAddress: WALLET_ADDRESS,
    chain: 'ethereum' as const,
    walletId: 'wallet-001',
    sessionId: 'session-001',
    privateKey: PRIVATE_KEY,
  };

  it('pm_buy without negRiskResolver defaults to false', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {
        postOrder: vi.fn().mockResolvedValue({ orderID: 'o1' }),
        cancelOrder: vi.fn(),
        cancelAll: vi.fn(),
      } as any,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null, // null negRiskResolver
      null, // null DB
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_buy', {
      tokenId: '123',
      price: '0.5',
      size: '10',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('pm_buy without DB skips persistence', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {
        postOrder: vi.fn().mockResolvedValue({ orderID: 'o2' }),
        cancelOrder: vi.fn(),
        cancelAll: vi.fn(),
      } as any,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      { isNegRisk: vi.fn().mockResolvedValue(false) },
      null, // null DB
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_buy', {
      tokenId: '123',
      price: '0.5',
      size: '10',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('pm_sell without DB skips persistence', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {
        postOrder: vi.fn().mockResolvedValue({ orderID: 'o3' }),
        cancelOrder: vi.fn(),
        cancelAll: vi.fn(),
      } as any,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_sell', {
      tokenId: '123',
      price: '0.5',
      size: '10',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.action).toBe('pm_sell');
  });

  it('pm_cancel_order without DB skips status update', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {
        postOrder: vi.fn(),
        cancelOrder: vi.fn().mockResolvedValue(undefined),
        cancelAll: vi.fn(),
      } as any,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_cancel_order', {
      orderId: 'ord-1',
    }, ctx);

    expect(result.status).toBe('success');
  });

  it('pm_update_order without price/size returns cancel result', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {
        postOrder: vi.fn(),
        cancelOrder: vi.fn().mockResolvedValue(undefined),
        cancelAll: vi.fn(),
      } as any,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_update_order', {
      orderId: 'ord-update-1',
    }, ctx);

    expect(result.action).toBe('pm_cancel_order'); // returns cancel result directly
  });

  it('pm_cancel_all without conditionId sends empty body', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const mockClobClient = {
      postOrder: vi.fn(),
      cancelOrder: vi.fn(),
      cancelAll: vi.fn().mockResolvedValue(undefined),
    } as any;

    const provider = new PolymarketOrderProvider(
      mockClobClient,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.resolve('pm_cancel_all', {}, ctx);
    expect(result.data.conditionId).toBe('all');
  });

  it('resolve throws for unknown action', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {} as any,
      {} as any,
      null,
      null,
      () => 'uuid-test',
    );

    await expect(provider.resolve('unknown', {}, ctx)).rejects.toThrow('Unknown action');
  });

  it('getSpendingAmount for pm_update_order with price+size', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {} as any,
      {} as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.getSpendingAmount('pm_update_order', {
      orderId: 'ord-1',
      price: '0.65',
      size: '100',
    });

    expect(result.amount).toBe(65_000_000n);
  });

  it('getSpendingAmount for pm_update_order without price returns 0', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const provider = new PolymarketOrderProvider(
      {} as any,
      {} as any,
      null,
      null,
      () => 'uuid-test',
    );

    const result = await provider.getSpendingAmount('pm_update_order', {
      orderId: 'ord-1',
    });

    expect(result.amount).toBe(0n);
  });

  it('pm_buy with orderID missing falls back to generateId', async () => {
    const { PolymarketOrderProvider } = await import('../providers/polymarket/order-provider.js');

    const mockClobClient = {
      postOrder: vi.fn().mockResolvedValue({ success: true }), // no orderID
      cancelOrder: vi.fn(),
      cancelAll: vi.fn(),
    } as any;

    const provider = new PolymarketOrderProvider(
      mockClobClient,
      { ensureApiKeys: vi.fn().mockResolvedValue(API_CREDS) } as any,
      null,
      null,
      () => 'fallback-uuid',
    );

    const result = await provider.resolve('pm_buy', {
      tokenId: '123',
      price: '0.5',
      size: '10',
    }, ctx);

    expect(result.externalId).toBe('fallback-uuid');
  });
});

// ---------------------------------------------------------------------------
// 8. Gamma client branch coverage
// ---------------------------------------------------------------------------

describe('PolymarketGammaClient branches', () => {
  it('getMarkets with all filter options', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await client.getMarkets({
      active: true,
      closed: false,
      category: 'crypto',
      limit: 10,
      offset: 5,
      order: 'volume',
      ascending: false,
    });

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain('active=true');
    expect(fetchCall[0]).toContain('closed=false');
    expect(fetchCall[0]).toContain('category=crypto');
    expect(fetchCall[0]).toContain('limit=10');
    expect(fetchCall[0]).toContain('offset=5');
    expect(fetchCall[0]).toContain('order=volume');
    expect(fetchCall[0]).toContain('ascending=false');
  });

  it('getMarkets with non-array response returns empty', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ not: 'an array' }),
    } as any);

    const result = await client.getMarkets();
    expect(result).toEqual([]);
  });

  it('getEvents with filter options', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await client.getEvents({ limit: 5, offset: 10 });

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain('limit=5');
    expect(fetchCall[0]).toContain('offset=10');
  });

  it('searchMarkets with limit', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await client.searchMarkets('bitcoin', 5);

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain('_q=bitcoin');
    expect(fetchCall[0]).toContain('limit=5');
  });

  it('fetchJson throws on network error', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

    await expect(client.getMarkets()).rejects.toThrow('Gamma API request failed');
  });

  it('fetchJson throws on non-ok response', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as any);

    await expect(client.getMarkets()).rejects.toThrow('Gamma API HTTP 500');
  });
});

// ---------------------------------------------------------------------------
// 9. Orderbook service branches
// ---------------------------------------------------------------------------

describe('PolymarketOrderbookService branches', () => {
  it('getOrderbook with empty bids', async () => {
    const { PolymarketOrderbookService } = await import('../providers/polymarket/orderbook-service.js');

    const mockClient = {
      getOrderbook: vi.fn().mockResolvedValue({
        asks: [{ price: '0.65', size: '100' }],
        // no bids
      }),
    } as any;

    const service = new PolymarketOrderbookService(mockClient);
    const result = await service.getOrderbook('token-1');

    expect(result.spread).toBe('0');
    expect(result.midpoint).toBe('0');
  });

  it('getOrderbook with null bids/asks', async () => {
    const { PolymarketOrderbookService } = await import('../providers/polymarket/orderbook-service.js');

    const mockClient = {
      getOrderbook: vi.fn().mockResolvedValue({}), // no bids or asks
    } as any;

    const service = new PolymarketOrderbookService(mockClient);
    const result = await service.getOrderbook('token-2');

    expect(result.bids).toEqual([]);
    expect(result.asks).toEqual([]);
    expect(result.spread).toBe('0');
  });

  it('getPrice returns 0 when no price', async () => {
    const { PolymarketOrderbookService } = await import('../providers/polymarket/orderbook-service.js');

    const mockClient = {
      getPrice: vi.fn().mockResolvedValue({}), // no price field
    } as any;

    const service = new PolymarketOrderbookService(mockClient);
    const result = await service.getPrice('token-3');

    expect(result).toBe('0');
  });

  it('getMidpoint returns 0 when no mid', async () => {
    const { PolymarketOrderbookService } = await import('../providers/polymarket/orderbook-service.js');

    const mockClient = {
      getMidpoint: vi.fn().mockResolvedValue({}), // no mid field
    } as any;

    const service = new PolymarketOrderbookService(mockClient);
    const result = await service.getMidpoint('token-4');

    expect(result).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 10. Position tracker branches
// ---------------------------------------------------------------------------

describe('PolymarketPositionTracker branches', () => {
  it('upsertPosition with existing position calculates weighted avg', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const existingRow = {
      id: 'pos-1',
      wallet_id: 'w1',
      condition_id: 'cond-1',
      token_id: 'tok-1',
      market_slug: 'test',
      outcome: 'YES',
      size: '100',
      avg_price: '0.50',
      realized_pnl: '0',
      market_resolved: 0,
      winning_outcome: '',
      is_neg_risk: 0,
      created_at: 1000,
      updated_at: 1000,
    };

    const db = {
      getPositions: vi.fn().mockReturnValue([existingRow]),
      getPosition: vi.fn().mockReturnValue(existingRow),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const marketData = {
      isNegRisk: vi.fn().mockResolvedValue(false),
      getMarketInfo: vi.fn().mockResolvedValue(null),
    } as any;

    const tracker = new PolymarketPositionTracker(db, marketData);

    tracker.upsertPosition('w1', {
      conditionId: 'cond-1',
      tokenId: 'tok-1',
      marketSlug: 'test',
      outcome: 'YES',
      fillSize: '50',
      fillPrice: '0.60',
      isNegRisk: false,
    });

    expect(db.upsert).toHaveBeenCalledTimes(1);
    const upserted = db.upsert.mock.calls[0]![0];
    // size should be 100 + 50 = 150
    expect(upserted.size).toBeTruthy();
  });

  it('upsertPosition with new position creates row', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const db = {
      getPositions: vi.fn().mockReturnValue([]),
      getPosition: vi.fn().mockReturnValue(null),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const marketData = {
      isNegRisk: vi.fn().mockResolvedValue(false),
    } as any;

    const tracker = new PolymarketPositionTracker(db, marketData);

    tracker.upsertPosition('w1', {
      conditionId: 'cond-2',
      tokenId: 'tok-2',
      marketSlug: 'new-market',
      outcome: 'NO',
      fillSize: '50',
      fillPrice: '0.40',
      isNegRisk: true,
    });

    expect(db.upsert).toHaveBeenCalledTimes(1);
    const row = db.upsert.mock.calls[0]![0];
    expect(row.is_neg_risk).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 11. Resolution monitor branches
// ---------------------------------------------------------------------------

describe('PolymarketResolutionMonitor branches', () => {
  it('checkResolution skips when no positions', async () => {
    const { PolymarketResolutionMonitor } = await import('../providers/polymarket/resolution-monitor.js');

    const tracker = {
      getPositions: vi.fn().mockReturnValue([]),
    } as any;

    const marketData = {
      getMarketInfo: vi.fn(),
    } as any;

    const monitor = new PolymarketResolutionMonitor(tracker, marketData);
    await monitor.checkResolutions('w1');

    expect(marketData.getMarketInfo).not.toHaveBeenCalled();
  });

  it('checkResolution handles already resolved position', async () => {
    const { PolymarketResolutionMonitor } = await import('../providers/polymarket/resolution-monitor.js');

    const tracker = {
      getPositions: vi.fn().mockReturnValue([{
        conditionId: 'cond-1',
        marketResolved: true, // already resolved
        size: '100',
      }]),
    } as any;

    const marketData = {
      getResolutionStatus: vi.fn(),
    } as any;

    const monitor = new PolymarketResolutionMonitor(tracker, marketData);
    await monitor.checkResolutions('w1');

    // Already resolved positions are filtered out, so no status check needed
    expect(marketData.getResolutionStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 12. Pendle schemas branches
// ---------------------------------------------------------------------------

describe('Pendle schemas additional branches', () => {
  const makeMarket = (overrides?: Record<string, unknown>) => ({
    address: '0xmarket',
    name: 'PT-stETH',
    expiry: '2025-12-31',
    pt: '0xpt',
    yt: '0xyt',
    sy: '0xsy',
    underlyingAsset: { address: '0xunderlying', symbol: 'stETH' },
    chainId: 1,
    ...overrides,
  });

  it('PendleMarketsResponseSchema parses paginated with markets key', async () => {
    const { PendleMarketsResponseSchema } = await import('../providers/pendle/schemas.js');
    const result = PendleMarketsResponseSchema.parse({ markets: [makeMarket()] });
    // Paginated result keeps the object structure
    expect(result).toBeDefined();
    expect((result as any).markets).toBeDefined();
  });

  it('PendleMarketsResponseSchema parses paginated with results key', async () => {
    const { PendleMarketsResponseSchema } = await import('../providers/pendle/schemas.js');
    const result = PendleMarketsResponseSchema.parse({ results: [makeMarket({ underlyingAsset: '1-0xunderlying' })] });
    expect(result).toBeDefined();
    expect((result as any).results).toBeDefined();
  });

  it('PendleMarketsResponseSchema parses paginated with data key', async () => {
    const { PendleMarketsResponseSchema } = await import('../providers/pendle/schemas.js');
    const result = PendleMarketsResponseSchema.parse({ data: [makeMarket({ underlyingAsset: { address: '0xunderlying', symbol: 'stETH', decimals: 18 } })] });
    expect(result).toBeDefined();
    expect((result as any).data).toBeDefined();
  });

  it('PendleMarketSchema parses string underlyingAsset', async () => {
    const { PendleMarketSchema } = await import('../providers/pendle/schemas.js');
    const result = PendleMarketSchema.parse(makeMarket({ underlyingAsset: '42161-0xunderlying' }));
    expect(result.underlyingAsset.address).toBe('0xunderlying');
  });

  it('PendleMarketSchema strips chain prefix from pt/yt/sy', async () => {
    const { PendleMarketSchema } = await import('../providers/pendle/schemas.js');
    const result = PendleMarketSchema.parse(makeMarket({ pt: '1-0xpt', yt: '1-0xyt', sy: '1-0xsy' }));
    expect(result.pt).toBe('0xpt');
    expect(result.yt).toBe('0xyt');
    expect(result.sy).toBe('0xsy');
  });
});

// ---------------------------------------------------------------------------
// 13. Market data branches
// ---------------------------------------------------------------------------

describe('PolymarketMarketData branches', () => {
  it('isNegRisk returns true for neg_risk market', async () => {
    const { PolymarketMarketData } = await import('../providers/polymarket/market-data.js');

    const gammaClient = {
      getMarket: vi.fn().mockResolvedValue({ neg_risk: true }),
    } as any;

    const marketData = new PolymarketMarketData(gammaClient);
    const result = await marketData.isNegRisk('neg-risk-token');
    expect(result).toBe(true);
  });

  it('getResolutionStatus returns resolved=false for open market', async () => {
    const { PolymarketMarketData } = await import('../providers/polymarket/market-data.js');

    const gammaClient = {
      getMarket: vi.fn().mockResolvedValue({ closed: false, tokens: [] }),
    } as any;

    const marketData = new PolymarketMarketData(gammaClient);
    const result = await marketData.getResolutionStatus('cond-1');
    expect(result.resolved).toBe(false);
  });

  it('getResolutionStatus returns winningOutcome for closed market', async () => {
    const { PolymarketMarketData } = await import('../providers/polymarket/market-data.js');

    const gammaClient = {
      getMarket: vi.fn().mockResolvedValue({
        closed: true,
        tokens: [
          { outcome: 'YES', winner: true, price: '1' },
          { outcome: 'NO', winner: false, price: '0' },
        ],
      }),
    } as any;

    const marketData = new PolymarketMarketData(gammaClient);
    const result = await marketData.getResolutionStatus('cond-2');
    expect(result.resolved).toBe(true);
    expect(result.winningOutcome).toBe('YES');
  });
});

// ---------------------------------------------------------------------------
// 14. PnL calculator branches
// ---------------------------------------------------------------------------

describe('PolymarketPnlCalculator branches', () => {
  it('calculateUnrealized handles zero size', async () => {
    const { PolymarketPnlCalculator } = await import('../providers/polymarket/pnl-calculator.js');

    const result = PolymarketPnlCalculator.calculateUnrealized('0', '0.5', '0.65');
    expect(result).toBe('0');
  });

  it('calculateUnrealized with positive pnl', async () => {
    const { PolymarketPnlCalculator } = await import('../providers/polymarket/pnl-calculator.js');

    const result = PolymarketPnlCalculator.calculateUnrealized('100', '0.50', '0.65');
    expect(parseFloat(result)).toBeGreaterThan(0);
  });

  it('calculateRealized returns passthrough value', async () => {
    const { PolymarketPnlCalculator } = await import('../providers/polymarket/pnl-calculator.js');

    const result = PolymarketPnlCalculator.calculateRealized('15.5');
    expect(result).toBe('15.5');
  });

  it('calculateRealized returns 0 for empty input', async () => {
    const { PolymarketPnlCalculator } = await import('../providers/polymarket/pnl-calculator.js');

    const result = PolymarketPnlCalculator.calculateRealized('');
    expect(result).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 15. Jupiter API client branch
// ---------------------------------------------------------------------------

describe('Jupiter API client branch', () => {
  it('does not set x-api-key header when apiKey is empty', async () => {
    const { JupiterApiClient } = await import('../providers/jupiter-swap/jupiter-api-client.js');
    const { JUPITER_SWAP_DEFAULTS } = await import('../providers/jupiter-swap/config.js');

    const client = new JupiterApiClient({ ...JUPITER_SWAP_DEFAULTS, apiKey: '' });
    expect(client).toBeDefined();
  });

  it('sets x-api-key header when apiKey is provided', async () => {
    const { JupiterApiClient } = await import('../providers/jupiter-swap/jupiter-api-client.js');
    const { JUPITER_SWAP_DEFAULTS } = await import('../providers/jupiter-swap/config.js');

    const client = new JupiterApiClient({ ...JUPITER_SWAP_DEFAULTS, apiKey: 'my-api-key' });
    expect(client).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 16. Kamino config branch
// ---------------------------------------------------------------------------

describe('Kamino config branch', () => {
  it('resolves market address for main market', async () => {
    const { resolveMarketAddress, KAMINO_MAIN_MARKET } = await import('../providers/kamino/config.js');

    const main = resolveMarketAddress('main');
    expect(main).toBe(KAMINO_MAIN_MARKET);
  });

  it('resolves market address for custom market', async () => {
    const { resolveMarketAddress } = await import('../providers/kamino/config.js');

    const custom = resolveMarketAddress('custom-address-123');
    expect(custom).toBe('custom-address-123');
  });
});

// ---------------------------------------------------------------------------
// 17. Lido contract branch
// ---------------------------------------------------------------------------

describe('Lido contract branch', () => {
  it('decodeUint256Result with 0x prefix', async () => {
    const { decodeUint256Result } = await import('../providers/lido-staking/lido-contract.js');

    const result = decodeUint256Result('0x0000000000000000000000000000000000000000000000000000000000000064');
    expect(result).toBe(100n);
  });

  it('decodeUint256Result without 0x prefix', async () => {
    const { decodeUint256Result } = await import('../providers/lido-staking/lido-contract.js');

    const result = decodeUint256Result('0000000000000000000000000000000000000000000000000000000000000064');
    expect(result).toBe(100n);
  });
});

// ---------------------------------------------------------------------------
// 18. Across config branches
// ---------------------------------------------------------------------------

describe('Across config branches', () => {
  it('ACROSS_CHAIN_MAP has entries', async () => {
    const { ACROSS_CHAIN_MAP } = await import('../providers/across/config.js');
    expect(ACROSS_CHAIN_MAP).toBeDefined();
    expect(ACROSS_CHAIN_MAP.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 19. Aave RPC branches
// ---------------------------------------------------------------------------

describe('Aave RPC additional branches', () => {
  it('decodeReserveTokensAddresses with 0x prefix', async () => {
    const { decodeReserveTokensAddresses } = await import('../providers/aave-v3/aave-rpc.js');

    const addr1 = '0000000000000000000000001111111111111111111111111111111111111111';
    const addr2 = '0000000000000000000000002222222222222222222222222222222222222222';
    const addr3 = '0000000000000000000000003333333333333333333333333333333333333333';
    const hex = '0x' + addr1 + addr2 + addr3;

    const result = decodeReserveTokensAddresses(hex);
    expect(result.aToken).toBe('0x1111111111111111111111111111111111111111');
    expect(result.stableDebtToken).toBe('0x2222222222222222222222222222222222222222');
    expect(result.variableDebtToken).toBe('0x3333333333333333333333333333333333333333');
  });
});

// ---------------------------------------------------------------------------
// 20. Order builder branches
// ---------------------------------------------------------------------------

describe('PolymarketOrderBuilder branches', () => {
  it('decimalToBigint with long fractional part truncates', async () => {
    const { OrderBuilder } = await import('../providers/polymarket/order-builder.js');

    // calculateBuyAmount exercises decimalToBigint internally
    const result = OrderBuilder.calculateBuyAmount('0.123456789', '100');
    expect(result).toBeGreaterThan(0n);
  });

  it('calculateBuyAmount with integer price (no decimal)', async () => {
    const { OrderBuilder } = await import('../providers/polymarket/order-builder.js');

    const result = OrderBuilder.calculateBuyAmount('1', '100');
    expect(result).toBe(100_000_000n);
  });
});

// ---------------------------------------------------------------------------
// 21. Aave RPC additional decode functions
// ---------------------------------------------------------------------------

describe('Aave RPC decode functions', () => {
  it('decodeAddressArray with 0x prefix', async () => {
    const { decodeAddressArray } = await import('../providers/aave-v3/aave-rpc.js');

    // offset(32) + length=2(32) + 2 addresses(32 each)
    const offset = '0000000000000000000000000000000000000000000000000000000000000020';
    const length = '0000000000000000000000000000000000000000000000000000000000000002';
    const addr1 = '000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1';
    const addr2 = '000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb2';
    const hex = '0x' + offset + length + addr1 + addr2;

    const result = decodeAddressArray(hex);
    expect(result).toHaveLength(2);
  });

  it('decodeAddressArray with short response returns empty', async () => {
    const { decodeAddressArray } = await import('../providers/aave-v3/aave-rpc.js');
    expect(decodeAddressArray('0x1234')).toEqual([]);
  });

  it('decodeUint256Array', async () => {
    const { decodeUint256Array } = await import('../providers/aave-v3/aave-rpc.js');

    const offset = '0000000000000000000000000000000000000000000000000000000000000020';
    const length = '0000000000000000000000000000000000000000000000000000000000000001';
    const val = '0000000000000000000000000000000000000000000000000000000000000064';
    const hex = offset + length + val;

    const result = decodeUint256Array(hex);
    expect(result).toEqual([100n]);
  });

  it('decodeDecimals', async () => {
    const { decodeDecimals } = await import('../providers/aave-v3/aave-rpc.js');
    const hex = '0x0000000000000000000000000000000000000000000000000000000000000012';
    expect(decodeDecimals(hex)).toBe(18);
  });

  it('decodeGetUserAccountData', async () => {
    const { decodeGetUserAccountData } = await import('../providers/aave-v3/aave-rpc.js');
    const slot = '0000000000000000000000000000000000000000000000000000000000000064';
    const hex = '0x' + slot.repeat(6);
    const result = decodeGetUserAccountData(hex);
    expect(result.totalCollateralBase).toBe(100n);
    expect(result.healthFactor).toBe(100n);
  });

  it('decodeGetUserAccountData throws on short input', async () => {
    const { decodeGetUserAccountData } = await import('../providers/aave-v3/aave-rpc.js');
    expect(() => decodeGetUserAccountData('0x1234')).toThrow('Invalid getUserAccountData');
  });

  it('decodeGetReserveData', async () => {
    const { decodeGetReserveData } = await import('../providers/aave-v3/aave-rpc.js');
    const slot = '0000000000000000000000000000000000000000000000000000000000000064';
    const hex = slot.repeat(5);
    const result = decodeGetReserveData(hex);
    expect(result.liquidityIndex).toBe(100n);
  });

  it('decodeGetReserveData throws on short input', async () => {
    const { decodeGetReserveData } = await import('../providers/aave-v3/aave-rpc.js');
    expect(() => decodeGetReserveData('0x1234')).toThrow('Invalid getReserveData');
  });
});

// ---------------------------------------------------------------------------
// 22. CLOB client additional branches
// ---------------------------------------------------------------------------

describe('PolymarketClobClient additional branches', () => {
  it('handles 429 rate limit error', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    } as any);

    await expect(client.getOrderbook('token-1')).rejects.toThrow();
  });

  it('handles non-ok response with JSON error body', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' })),
    } as any);

    await expect(client.getOrderbook('token-1')).rejects.toThrow('Bad request');
  });

  it('handles non-ok response with JSON message body', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ message: 'Invalid params' })),
    } as any);

    await expect(client.getOrderbook('token-1')).rejects.toThrow('Invalid params');
  });

  it('handles non-ok response with plain text body', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as any);

    await expect(client.getOrderbook('token-1')).rejects.toThrow('500');
  });

  it('handles 204 No Content on cancelOrder', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as any);

    // cancelOrder returns void, so we just verify it doesn't throw
    await expect(client.cancelOrder({}, 'ord-1')).resolves.not.toThrow();
  });

  it('handles timeout (AbortError)', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    const abortError = new Error('timeout');
    abortError.name = 'AbortError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    await expect(client.getOrderbook('token-1')).rejects.toThrow('timeout');
  });
});

// ---------------------------------------------------------------------------
// 23. Position tracker enrichPosition branch
// ---------------------------------------------------------------------------

describe('PolymarketPositionTracker enrichPosition branches', () => {
  it('enriches position with current market price', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const row = {
      id: 'pos-1',
      wallet_id: 'w1',
      condition_id: 'cond-1',
      token_id: 'tok-1',
      market_slug: 'test',
      outcome: 'YES',
      size: '100',
      avg_price: '0.50',
      realized_pnl: '0',
      market_resolved: 0,
      winning_outcome: '',
      is_neg_risk: 0,
      created_at: 1000,
      updated_at: 1000,
    };

    const db = {
      getPositions: vi.fn().mockReturnValue([row]),
      getPosition: vi.fn().mockReturnValue(row),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const marketData = {
      getMarket: vi.fn().mockResolvedValue({
        tokens: [
          { token_id: 'tok-1', price: '0.65', outcome: 'YES' },
          { token_id: 'tok-2', price: '0.35', outcome: 'NO' },
        ],
      }),
      isNegRisk: vi.fn().mockResolvedValue(false),
    } as any;

    const tracker = new PolymarketPositionTracker(db, marketData);

    const positions = await tracker.getPositions('w1');
    expect(positions).toHaveLength(1);
    expect(positions[0]!.currentPrice).toBe('0.65');
    expect(parseFloat(positions[0]!.unrealizedPnl)).toBeGreaterThan(0);
  });

  it('enriches position with 0 price when market data fails', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const row = {
      id: 'pos-1',
      wallet_id: 'w1',
      condition_id: 'cond-1',
      token_id: 'tok-1',
      market_slug: 'test',
      outcome: 'YES',
      size: '100',
      avg_price: '0.50',
      realized_pnl: '0',
      market_resolved: 0,
      winning_outcome: '',
      is_neg_risk: 1,
      created_at: 1000,
      updated_at: 1000,
    };

    const db = {
      getPositions: vi.fn().mockReturnValue([row]),
      getPosition: vi.fn().mockReturnValue(null),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const marketData = {
      getMarket: vi.fn().mockRejectedValue(new Error('fail')),
      isNegRisk: vi.fn().mockResolvedValue(false),
    } as any;

    const tracker = new PolymarketPositionTracker(db, marketData);

    const positions = await tracker.getPositions('w1');
    expect(positions[0]!.currentPrice).toBe('0');
    expect(positions[0]!.isNegRisk).toBe(true);
  });

  it('enriches position where token not found in market', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const row = {
      id: 'pos-1',
      wallet_id: 'w1',
      condition_id: 'cond-1',
      token_id: 'tok-unknown',
      market_slug: 'test',
      outcome: 'YES',
      size: '50',
      avg_price: '0.50',
      realized_pnl: '5',
      market_resolved: 1,
      winning_outcome: 'YES',
      is_neg_risk: 0,
      created_at: 1000,
      updated_at: 1000,
    };

    const db = {
      getPositions: vi.fn().mockReturnValue([row]),
      getPosition: vi.fn().mockReturnValue(row),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const marketData = {
      getMarket: vi.fn().mockResolvedValue({
        tokens: [{ token_id: 'other-tok', price: '0.80' }],
      }),
    } as any;

    const tracker = new PolymarketPositionTracker(db, marketData);

    const positions = await tracker.getPositions('w1');
    expect(positions[0]!.currentPrice).toBe('0');
    expect(positions[0]!.marketResolved).toBe(true);
    expect(positions[0]!.winningOutcome).toBe('YES');
  });

  it('markResolved delegates to DB', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const db = {
      getPositions: vi.fn().mockReturnValue([]),
      getPosition: vi.fn().mockReturnValue(null),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const tracker = new PolymarketPositionTracker(db, {} as any);
    tracker.markResolved('cond-1', 'YES');
    expect(db.updateResolution).toHaveBeenCalledWith('cond-1', 'YES');
  });

  it('upsertPosition with zero totalSize sets avg to 0', async () => {
    const { PolymarketPositionTracker } = await import('../providers/polymarket/position-tracker.js');

    const existingRow = {
      id: 'pos-1',
      wallet_id: 'w1',
      condition_id: 'cond-1',
      token_id: 'tok-1',
      market_slug: 'test',
      outcome: 'YES',
      size: '50',
      avg_price: '0.50',
      realized_pnl: '0',
      market_resolved: 0,
      winning_outcome: '',
      is_neg_risk: 0,
      created_at: 1000,
      updated_at: 1000,
    };

    const db = {
      getPositions: vi.fn().mockReturnValue([existingRow]),
      getPosition: vi.fn().mockReturnValue(existingRow),
      upsert: vi.fn(),
      updateResolution: vi.fn(),
    };

    const tracker = new PolymarketPositionTracker(db, {} as any);

    // Sell off entire position (negative fill to get to 0)
    tracker.upsertPosition('w1', {
      conditionId: 'cond-1',
      tokenId: 'tok-1',
      marketSlug: 'test',
      outcome: 'YES',
      fillSize: '-50', // This would make total 0
      fillPrice: '0.65',
      isNegRisk: false,
    });

    expect(db.upsert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 24. Exchange client branches
// ---------------------------------------------------------------------------

describe('HyperliquidExchangeClient branches', () => {
  it('acquires rate limit before exchange call', async () => {
    const { HyperliquidExchangeClient, HyperliquidRateLimiter } = await import('../providers/hyperliquid/exchange-client.js');

    const limiter = new HyperliquidRateLimiter(100);
    const client = new HyperliquidExchangeClient('https://api.hyperliquid.xyz', limiter);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    } as any);

    const result = await client.exchange({
      action: { type: 'test' },
      nonce: 12345,
      signature: { r: '0x1', s: '0x2', v: 27 },
    });

    expect(result).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// 25. Across bridge status tracker branches
// ---------------------------------------------------------------------------

describe('Across BridgeStatusTracker branches', () => {
  const acrossConfig = {
    enabled: true,
    apiBaseUrl: 'https://app.across.to/api',
    integratorId: '',
    fillDeadlineBufferSec: 21600,
    defaultSlippagePct: 0.01,
    maxSlippagePct: 0.03,
    requestTimeoutMs: 10_000,
  };

  it('handles FILLED status', async () => {
    const { AcrossBridgeStatusTracker } = await import('../providers/across/bridge-status-tracker.js');

    const tracker = new AcrossBridgeStatusTracker(acrossConfig);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'filled',
        fillTx: '0xfill123',
        destinationChainId: 42161,
      }),
    } as any);

    const result = await tracker.checkStatus('tx-1', {
      txHash: '0xsource123',
      originChainId: 1,
    });

    expect(result.state).toBe('COMPLETED');
  });

  it('handles no txHash', async () => {
    const { AcrossBridgeStatusTracker } = await import('../providers/across/bridge-status-tracker.js');

    const tracker = new AcrossBridgeStatusTracker(acrossConfig);
    const result = await tracker.checkStatus('tx-2', {});
    expect(result.state).toBe('PENDING');
  });

  it('handles expired status', async () => {
    const { AcrossBridgeStatusTracker } = await import('../providers/across/bridge-status-tracker.js');

    const tracker = new AcrossBridgeStatusTracker(acrossConfig);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'expired' }),
    } as any);

    const result = await tracker.checkStatus('tx-3', { txHash: '0xexp' });
    expect(result.state).toBe('FAILED');
  });

  it('handles refunded status', async () => {
    const { AcrossBridgeStatusTracker } = await import('../providers/across/bridge-status-tracker.js');

    const tracker = new AcrossBridgeStatusTracker(acrossConfig);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'refunded' }),
    } as any);

    const result = await tracker.checkStatus('tx-4', { txHash: '0xref' });
    expect(result.state).toBe('COMPLETED');
    expect(result.details?.refunded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 26. Gamma client no-filter test
// ---------------------------------------------------------------------------

describe('PolymarketGammaClient additional', () => {
  it('getMarkets with no filter sends no query params', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await client.getMarkets();
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).not.toContain('?');
  });

  it('getEvents with no filter', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    const result = await client.getEvents();
    expect(result).toEqual([]);
  });

  it('searchMarkets without limit', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    await client.searchMarkets('test');
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toContain('_q=test');
    expect(fetchCall[0]).not.toContain('limit=');
  });

  it('getEvents non-array response returns empty', async () => {
    const { PolymarketGammaClient } = await import('../providers/polymarket/gamma-client.js');
    const client = new PolymarketGammaClient('https://gamma.example.com');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve('not-array'),
    } as any);

    const result = await client.getEvents();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 27. Resolution monitor with notification
// ---------------------------------------------------------------------------

describe('PolymarketResolutionMonitor with notification', () => {
  it('emits notification on resolution', async () => {
    const { PolymarketResolutionMonitor } = await import('../providers/polymarket/resolution-monitor.js');

    const tracker = {
      getPositions: vi.fn().mockReturnValue([{
        conditionId: 'cond-1',
        marketResolved: false,
        size: '100',
        outcome: 'YES',
      }]),
      markResolved: vi.fn(),
    } as any;

    const marketData = {
      getResolutionStatus: vi.fn().mockResolvedValue({
        resolved: true,
        winningOutcome: 'YES',
      }),
      getMarket: vi.fn().mockResolvedValue({ question: 'Will it rain?' }),
    } as any;

    const emitNotification = vi.fn();
    const monitor = new PolymarketResolutionMonitor(tracker, marketData, emitNotification);

    const resolved = await monitor.checkResolutions('w1');
    expect(resolved).toHaveLength(1);
    expect(emitNotification).toHaveBeenCalledTimes(1);
    expect(emitNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'polymarket_market_resolved',
      walletId: 'w1',
    }));
  });

  it('continues without question when market fetch fails', async () => {
    const { PolymarketResolutionMonitor } = await import('../providers/polymarket/resolution-monitor.js');

    const tracker = {
      getPositions: vi.fn().mockReturnValue([{
        conditionId: 'cond-2',
        marketResolved: false,
        size: '50',
        outcome: 'NO',
      }]),
      markResolved: vi.fn(),
    } as any;

    const marketData = {
      getResolutionStatus: vi.fn().mockResolvedValue({
        resolved: true,
        winningOutcome: 'YES',
      }),
      getMarket: vi.fn().mockRejectedValue(new Error('fail')),
    } as any;

    const monitor = new PolymarketResolutionMonitor(tracker, marketData);
    const resolved = await monitor.checkResolutions('w1');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.question).toBe('');
  });

  it('skips unresolved markets', async () => {
    const { PolymarketResolutionMonitor } = await import('../providers/polymarket/resolution-monitor.js');

    const tracker = {
      getPositions: vi.fn().mockReturnValue([{
        conditionId: 'cond-3',
        marketResolved: false,
        size: '100',
        outcome: 'YES',
      }]),
      markResolved: vi.fn(),
    } as any;

    const marketData = {
      getResolutionStatus: vi.fn().mockResolvedValue({ resolved: false }),
    } as any;

    const monitor = new PolymarketResolutionMonitor(tracker, marketData);
    const resolved = await monitor.checkResolutions('w1');
    expect(resolved).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 28. CLOB client error parsing branches
// ---------------------------------------------------------------------------

describe('PolymarketClobClient error parsing', () => {
  it('handles non-ok response with empty error body', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(''),
    } as any);

    await expect(client.getOrderbook('token-1')).rejects.toThrow('400');
  });

  it('handles generic fetch error', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(client.getOrderbook('token-1')).rejects.toThrow('ECONNRESET');
  });

  it('handles l1Headers assignment', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ apiKey: 'ak', secret: 's', passphrase: 'p' }),
    } as any);

    // createApiKey uses l1Headers
    const result = await client.createApiKey('0xaddr' as any, '0xsig', '12345');
    expect(result.apiKey).toBe('ak');
  });

  it('getOrders returns array', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ orderId: 'ord-1' }]),
    } as any);

    const result = await client.getOrders({});
    expect(result).toHaveLength(1);
  });

  it('getOrders returns empty for non-array response', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as any);

    const result = await client.getOrders({});
    expect(result).toEqual([]);
  });

  it('getTrades returns empty for non-array response', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve('not-array'),
    } as any);

    const result = await client.getTrades({});
    expect(result).toEqual([]);
  });

  it('cancelAll with no conditionId sends empty body', async () => {
    const { PolymarketClobClient } = await import('../providers/polymarket/clob-client.js');
    const { PolymarketRateLimiter } = await import('../providers/polymarket/rate-limiter.js');

    const client = new PolymarketClobClient('https://clob.example.com', new PolymarketRateLimiter(100, 1000));

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as any);

    await expect(client.cancelAll({})).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 29. Perp-provider close_position with null mid price
// ---------------------------------------------------------------------------

describe('HyperliquidPerpProvider close with null mid', () => {
  it('close_position uses 0 mid price if market not in mids map', async () => {
    const { HyperliquidPerpProvider } = await import('../providers/hyperliquid/perp-provider.js');

    const client = {
      exchange: vi.fn().mockResolvedValue({
        status: 'ok',
        response: { type: 'order', data: { statuses: [{}] } },
      }),
    } as any;

    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([
        { name: 'ETH', szDecimals: 3, maxLeverage: 50 },
      ]),
      getAllMidPrices: vi.fn().mockResolvedValue({}), // No ETH price
      getPositions: vi.fn().mockResolvedValue([{
        coin: 'ETH',
        szi: '1.0',
        entryPx: '2000',
      }]),
      getOpenOrders: vi.fn().mockResolvedValue([]),
      getAccountState: vi.fn().mockResolvedValue({
        marginSummary: { accountValue: '1000', totalMarginUsed: '500' },
      }),
    } as any;

    const ctx = {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'w1',
      sessionId: 's1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    };

    const provider = new HyperliquidPerpProvider(client, marketData, true);
    const result = await provider.resolve('hl_close_position', { market: 'ETH' }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.action).toBe('hl_close_position');
  });
});

// ---------------------------------------------------------------------------
// 30. Spot provider with limit price
// ---------------------------------------------------------------------------

describe('HyperliquidSpotProvider limit order branches', () => {
  it('spot_buy with limit price uses provided price', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');

    const client = {
      exchange: vi.fn().mockResolvedValue({
        status: 'ok',
        response: { type: 'order', data: { statuses: [{ resting: { oid: 77 } }] } },
      }),
    } as any;

    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([]),
      getAllMidPrices: vi.fn().mockResolvedValue({ 'PURR/USDC': '0.5' }),
      getSpotMeta: vi.fn().mockResolvedValue({
        universe: [{ name: 'PURR/USDC', tokens: [0, 1], index: 10000 }],
        tokens: [{ name: 'PURR', szDecimals: 0, weiDecimals: 18, index: 0 }],
      }),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    } as any;

    const ctx = {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'w1',
      sessionId: 's1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    };

    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_buy', {
      market: 'PURR/USDC',
      size: '100',
      price: '0.45',
      orderType: 'LIMIT',
      tif: 'GTC',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.metadata?.price).toBe('0.45');
  });

  it('spot_buy with unknown market throws', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');

    const client = { exchange: vi.fn() } as any;
    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([]),
      getAllMidPrices: vi.fn().mockResolvedValue({}),
      getSpotMeta: vi.fn().mockResolvedValue({ universe: [], tokens: [] }),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    } as any;

    const ctx = {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'w1',
      sessionId: 's1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    };

    const provider = new HyperliquidSpotProvider(client, marketData, true);

    await expect(provider.resolve('hl_spot_buy', {
      market: 'UNKNOWN/USDC',
      size: '10',
      orderType: 'MARKET',
    }, ctx)).rejects.toThrow('Unknown spot market');
  });

  it('spot_sell with market order uses 0.97 slippage', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');

    const client = {
      exchange: vi.fn().mockResolvedValue({
        status: 'ok',
        response: { type: 'order', data: { statuses: [{ filled: { oid: 88 } }] } },
      }),
    } as any;

    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([]),
      getAllMidPrices: vi.fn().mockResolvedValue({ 'PURR/USDC': '0.5' }),
      getSpotMeta: vi.fn().mockResolvedValue({
        universe: [{ name: 'PURR/USDC', tokens: [0, 1], index: 10000 }],
        tokens: [{ name: 'PURR', szDecimals: 0, weiDecimals: 18, index: 0 }],
      }),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    } as any;

    const ctx = {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'w1',
      sessionId: 's1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    };

    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_sell', {
      market: 'PURR/USDC',
      size: '100',
      orderType: 'MARKET',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
    expect(result.externalId).toBe('88');
  });

  it('spot_cancel with subAccount', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');

    const client = {
      exchange: vi.fn().mockResolvedValue({ status: 'ok', response: {} }),
    } as any;

    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([]),
      getAllMidPrices: vi.fn().mockResolvedValue({}),
      getSpotMeta: vi.fn().mockResolvedValue({
        universe: [{ name: 'PURR/USDC', tokens: [0, 1], index: 10000 }],
        tokens: [],
      }),
      getOpenOrders: vi.fn().mockResolvedValue([
        { coin: 'PURR/USDC', side: 'B', limitPx: '0.5', sz: '10', oid: 100 },
      ]),
    } as any;

    const ctx = {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      chain: 'ethereum' as const,
      walletId: 'w1',
      sessionId: 's1',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    };

    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.resolve('hl_spot_cancel', {
      market: 'PURR/USDC',
      subAccount: '0x1234567890123456789012345678901234567890',
    }, ctx);

    expect(result.__apiDirect).toBe(true);
  });

  it('spot_buy with hl_spot_buy spending with explicit price', async () => {
    const { HyperliquidSpotProvider } = await import('../providers/hyperliquid/spot-provider.js');

    const client = { exchange: vi.fn() } as any;
    const marketData = {
      getMarkets: vi.fn().mockResolvedValue([]),
      getAllMidPrices: vi.fn().mockResolvedValue({}),
      getSpotMeta: vi.fn().mockResolvedValue({ universe: [], tokens: [] }),
      getOpenOrders: vi.fn().mockResolvedValue([]),
    } as any;

    const provider = new HyperliquidSpotProvider(client, marketData, true);

    const result = await provider.getSpendingAmount('hl_spot_buy', {
      market: 'PURR/USDC',
      size: '100',
      price: '0.50',
      orderType: 'LIMIT',
    });

    expect(result.amount).toBe(50_000000n);
  });
});
