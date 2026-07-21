/**
 * Coverage tests for MCP tool/resource handlers with low line coverage.
 *
 * Covers the async handler bodies that were previously unexercised:
 * - resources/skills.ts (skill template resource)
 * - tools: list-sessions, get-policies, hyperliquid (10 tools),
 *   list-incoming-transactions, get-incoming-summary, get-tokens,
 *   connect-info, encode-calldata, sign-transaction, wc-disconnect,
 *   wc-status, wc-connect, sign-message
 */

import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient, ApiResult } from '../api-client.js';

// Tool imports
import { registerListSessions } from '../tools/list-sessions.js';
import { registerGetPolicies } from '../tools/get-policies.js';
import { registerHyperliquidTools } from '../tools/hyperliquid.js';
import { registerListIncomingTransactions } from '../tools/list-incoming-transactions.js';
import { registerGetIncomingSummary } from '../tools/get-incoming-summary.js';
import { registerGetTokens } from '../tools/get-tokens.js';
import { registerConnectInfo } from '../tools/connect-info.js';
import { registerEncodeCalldata } from '../tools/encode-calldata.js';
import { registerSignTransaction } from '../tools/sign-transaction.js';
import { registerWcDisconnect } from '../tools/wc-disconnect.js';
import { registerWcStatus } from '../tools/wc-status.js';
import { registerWcConnect } from '../tools/wc-connect.js';
import { registerSignMessage } from '../tools/sign-message.js';
import { registerGetAddress } from '../tools/get-address.js';
import { registerGetBalance } from '../tools/get-balance.js';
import { registerGetAssets } from '../tools/get-assets.js';
import { registerGetNonce } from '../tools/get-nonce.js';
import { registerGetWalletInfo } from '../tools/get-wallet-info.js';
import { registerGetTransaction } from '../tools/get-transaction.js';
import { registerListTransactions } from '../tools/list-transactions.js';
import { registerSimulateTransaction } from '../tools/simulate-transaction.js';
import { registerApproveToken } from '../tools/approve-token.js';
import { registerSendBatch } from '../tools/send-batch.js';
import { registerSendToken } from '../tools/send-token.js';
import { registerGetProviderStatus } from '../tools/get-provider-status.js';
import { registerX402Fetch } from '../tools/x402-fetch.js';
import { registerPolymarketTools } from '../tools/polymarket.js';
import { registerResolveAsset } from '../tools/resolve-asset.js';

// Resource imports
import { registerSkillResources } from '../resources/skills.js';

// --- Mock ApiClient ---
function createMockApiClient(responses?: Map<string, ApiResult<unknown>>): ApiClient {
  const defaultOk: ApiResult<unknown> = { ok: true, data: { mock: true } };

  return {
    get: vi.fn(async (path: string) => responses?.get(`GET:${path}`) ?? defaultOk),
    post: vi.fn(async (path: string, _body: unknown) => responses?.get(`POST:${path}`) ?? defaultOk),
    put: vi.fn(async (path: string, _body: unknown) => responses?.get(`PUT:${path}`) ?? defaultOk),
    delete: vi.fn(async (path: string) => responses?.get(`DELETE:${path}`) ?? defaultOk),
  } as unknown as ApiClient;
}

// --- Tool handler extraction ---
function getToolHandler(
  registerFn: (server: McpServer, apiClient: ApiClient) => void,
  apiClient: ApiClient,
): (args: Record<string, unknown>) => Promise<unknown> {
  let capturedHandler: ((args: Record<string, unknown>, extra: unknown) => Promise<unknown>) | undefined;
  const server = {
    tool: (...fnArgs: unknown[]) => {
      capturedHandler = fnArgs[fnArgs.length - 1] as typeof capturedHandler;
    },
  } as unknown as McpServer;

  registerFn(server, apiClient);

  if (!capturedHandler) throw new Error('Handler not captured');
  const handler = capturedHandler;
  return (args) => handler(args, {}) as Promise<unknown>;
}

// --- Named tool handler extraction (for multi-tool registers like hyperliquid) ---
function getNamedToolHandlers(
  registerFn: (server: McpServer, apiClient: ApiClient) => void,
  apiClient: ApiClient,
): Map<string, (args: Record<string, unknown>) => Promise<unknown>> {
  const handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
  const server = {
    tool: (...fnArgs: unknown[]) => {
      const name = fnArgs[0] as string;
      const handler = fnArgs[fnArgs.length - 1] as (args: Record<string, unknown>, extra: unknown) => Promise<unknown>;
      handlers.set(name, (args) => handler(args, {}) as Promise<unknown>);
    },
  } as unknown as McpServer;

  registerFn(server, apiClient);
  return handlers;
}

// --- Resource handler extraction (for template resources) ---
function getResourceTemplateHandler(
  registerFn: (server: McpServer, apiClient: ApiClient, ctx?: unknown) => void,
  apiClient: ApiClient,
  walletContext?: unknown,
): { handler: (uri: URL, variables: Record<string, unknown>) => Promise<unknown>; template: unknown } {
  let capturedHandler: ((uri: URL, variables: Record<string, unknown>, extra: unknown) => Promise<unknown>) | undefined;
  let capturedTemplate: unknown;
  const server = {
    resource: (...fnArgs: unknown[]) => {
      capturedHandler = fnArgs[fnArgs.length - 1] as typeof capturedHandler;
      // Template is the second arg (ResourceTemplate instance)
      capturedTemplate = fnArgs[1];
    },
  } as unknown as McpServer;

  registerFn(server, apiClient, walletContext as undefined);

  if (!capturedHandler) throw new Error('Handler not captured');
  const handler = capturedHandler;
  return {
    handler: (uri, variables) => handler(uri, variables, {}) as Promise<unknown>,
    template: capturedTemplate,
  };
}

// ======================= RESOURCE: skills.ts =======================

describe('waiaas://skills/{name} resource template', () => {
  it('registers resource template and handler resolves skill content on success', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/skills/wallet', { ok: true, data: { name: 'wallet', content: '# Wallet Skill\nAPI reference...' } }],
    ]);
    const apiClient = createMockApiClient(responses);
    const { handler, template } = getResourceTemplateHandler(registerSkillResources, apiClient);

    // Verify template was created (ResourceTemplate instance)
    expect(template).toBeDefined();

    const result = await handler(new URL('waiaas://skills/wallet'), { name: 'wallet' }) as {
      contents: Array<{ uri: string; text: string; mimeType: string }>;
    };

    expect(apiClient.get).toHaveBeenCalledWith('/v1/skills/wallet');
    expect(result.contents[0]!.uri).toBe('waiaas://skills/wallet');
    expect(result.contents[0]!.text).toBe('# Wallet Skill\nAPI reference...');
    expect(result.contents[0]!.mimeType).toBe('text/markdown');
  });

  it('returns error via toResourceResult on API failure', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/skills/unknown', {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Skill not found', retryable: false },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const { handler } = getResourceTemplateHandler(registerSkillResources, apiClient);

    const result = await handler(new URL('waiaas://skills/unknown'), { name: 'unknown' }) as {
      contents: Array<{ text: string }>;
    };

    const parsed = JSON.parse(result.contents[0]!.text) as Record<string, unknown>;
    expect(parsed['error']).toBe(true);
    expect(parsed['code']).toBe('NOT_FOUND');
  });

  it('returns expired session info on session expiry', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/skills/admin', {
        ok: false,
        expired: true,
        message: 'Session expired',
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const { handler } = getResourceTemplateHandler(registerSkillResources, apiClient);

    const result = await handler(new URL('waiaas://skills/admin'), { name: 'admin' }) as {
      contents: Array<{ text: string }>;
    };

    const parsed = JSON.parse(result.contents[0]!.text) as Record<string, unknown>;
    expect(parsed['session_expired']).toBe(true);
  });

  it('prefixes description with wallet name when walletContext provided', () => {
    const apiClient = createMockApiClient();
    let capturedMeta: Record<string, unknown> | undefined;
    const server = {
      resource: (...fnArgs: unknown[]) => {
        // metadata is the 3rd arg (index 2) for template resources
        capturedMeta = fnArgs[2] as Record<string, unknown>;
      },
    } as unknown as McpServer;

    registerSkillResources(server, apiClient, { walletName: 'myWallet' });

    expect(capturedMeta).toBeDefined();
    expect(capturedMeta!['description']).toBe('[myWallet] WAIaaS API skill reference files');
  });

  it('list callback returns all 8 skill resources', async () => {
    const apiClient = createMockApiClient();
    // Use a real McpServer to verify the list callback works
    const { template } = getResourceTemplateHandler(registerSkillResources, apiClient);

    // The ResourceTemplate has a listCallback property
    const tmpl = template as { listCallback?: () => Promise<unknown> };
    if (tmpl.listCallback) {
      const result = await tmpl.listCallback() as { resources: Array<{ uri: string }> };
      expect(result.resources).toHaveLength(8);
      expect(result.resources[0]!.uri).toBe('waiaas://skills/quickstart');
    }
  });
});

// ======================= TOOL: list-sessions =======================

describe('list_sessions tool', () => {
  it('calls GET /v1/sessions with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerListSessions, apiClient);

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/sessions');
  });

  it('passes wallet_id, limit, offset as query params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerListSessions, apiClient);

    await handler({ wallet_id: 'w1', limit: 10, offset: 5 });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/sessions?'),
    );
    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('walletId=w1');
    expect(call).toContain('limit=10');
    expect(call).toContain('offset=5');
  });
});

// ======================= TOOL: get-policies =======================

describe('get_policies tool', () => {
  it('calls GET /v1/policies with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetPolicies, apiClient);

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/policies');
  });

  it('passes wallet_id, limit, offset as query params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetPolicies, apiClient);

    await handler({ wallet_id: 'w2', limit: 25, offset: 10 });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('walletId=w2');
    expect(call).toContain('limit=25');
    expect(call).toContain('offset=10');
  });
});

// ======================= TOOL: get-tokens =======================

describe('get_tokens tool', () => {
  it('calls GET /v1/tokens with network param', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetTokens, apiClient);

    await handler({ network: 'ethereum-sepolia' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/tokens?');
    expect(call).toContain('network=ethereum-sepolia');
  });
});

// ======================= TOOL: connect-info =======================

describe('connect_info tool', () => {
  it('calls GET /v1/connect-info', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/connect-info', { ok: true, data: { wallets: [], capabilities: [] } }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerConnectInfo, apiClient);

    const result = await handler({}) as { content: Array<{ text: string }> };

    expect(apiClient.get).toHaveBeenCalledWith('/v1/connect-info');
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['wallets']).toEqual([]);
  });
});

// ======================= TOOL: encode-calldata =======================

describe('encode_calldata tool', () => {
  it('calls POST /v1/utils/encode-calldata with abi, functionName, args', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerEncodeCalldata, apiClient);

    const abi = [{ type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }] }];
    await handler({ abi, functionName: 'transfer', args: ['0xabc'] });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/utils/encode-calldata', {
      abi,
      functionName: 'transfer',
      args: ['0xabc'],
    });
  });

  it('defaults args to empty array when omitted', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerEncodeCalldata, apiClient);

    await handler({ abi: [], functionName: 'foo' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/utils/encode-calldata', {
      abi: [],
      functionName: 'foo',
      args: [],
    });
  });

  it('includes walletId when wallet_id provided', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerEncodeCalldata, apiClient);

    await handler({ abi: [], functionName: 'foo', wallet_id: 'w3' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/utils/encode-calldata', {
      abi: [],
      functionName: 'foo',
      args: [],
      walletId: 'w3',
    });
  });
});

// ======================= TOOL: sign-transaction =======================

describe('sign_transaction tool', () => {
  it('calls POST /v1/transactions/sign with transaction only', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSignTransaction, apiClient);

    await handler({ transaction: 'base64encodedtx' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/sign', {
      transaction: 'base64encodedtx',
    });
  });

  it('includes network and walletId when provided', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSignTransaction, apiClient);

    await handler({ transaction: '0xdeadbeef', network: 'polygon-mainnet', wallet_id: 'w4' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/sign', {
      transaction: '0xdeadbeef',
      network: 'polygon-mainnet',
      walletId: 'w4',
    });
  });
});

// ======================= TOOL: sign-message =======================

describe('sign_message tool', () => {
  it('calls POST /v1/transactions/sign-message with message only', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSignMessage, apiClient);

    await handler({ message: 'Hello World' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/sign-message', {
      message: 'Hello World',
    });
  });

  it('passes all optional fields when provided', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSignMessage, apiClient);

    const typedData = {
      domain: { name: 'Test', chainId: 1 },
      types: { EIP712Domain: [{ name: 'name', type: 'string' }] },
      primaryType: 'EIP712Domain',
      message: { name: 'Test' },
    };
    await handler({
      message: '0xdead',
      sign_type: 'typedData',
      typed_data: typedData,
      network: 'ethereum-mainnet',
      wallet_id: 'w5',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/sign-message', {
      message: '0xdead',
      signType: 'typedData',
      typedData,
      network: 'ethereum-mainnet',
      walletId: 'w5',
    });
  });
});

// ======================= TOOL: wc-connect =======================

describe('wc_connect tool', () => {
  it('calls POST /v1/wallet/wc/pair with empty body', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcConnect, apiClient);

    await handler({});

    expect(apiClient.post).toHaveBeenCalledWith('/v1/wallet/wc/pair', {});
  });

  it('includes walletId when wallet_id provided', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcConnect, apiClient);

    await handler({ wallet_id: 'w6' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/wallet/wc/pair', { walletId: 'w6' });
  });
});

// ======================= TOOL: wc-status =======================

describe('wc_status tool', () => {
  it('calls GET /v1/wallet/wc/session with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcStatus, apiClient);

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallet/wc/session');
  });

  it('passes wallet_id as query param', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcStatus, apiClient);

    await handler({ wallet_id: 'w7' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallet/wc/session?walletId=w7');
  });
});

// ======================= TOOL: wc-disconnect =======================

describe('wc_disconnect tool', () => {
  it('calls DELETE /v1/wallet/wc/session with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcDisconnect, apiClient);

    await handler({});

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/wallet/wc/session');
  });

  it('passes wallet_id as query param', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerWcDisconnect, apiClient);

    await handler({ wallet_id: 'w8' });

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/wallet/wc/session?walletId=w8');
  });
});

// ======================= TOOL: list-incoming-transactions =======================

describe('list_incoming_transactions tool', () => {
  it('calls GET /v1/wallet/incoming with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerListIncomingTransactions, apiClient);

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallet/incoming');
  });

  it('passes all filter params as query string', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerListIncomingTransactions, apiClient);

    await handler({
      limit: 50,
      cursor: 'abc123',
      chain: 'ethereum',
      network: 'eip155:1',
      status: 'CONFIRMED',
      token: '0xtoken',
      from_address: '0xsender',
      since: 1700000000,
      until: 1700099999,
      wallet_id: 'w9',
    });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallet/incoming?');
    expect(call).toContain('limit=50');
    expect(call).toContain('cursor=abc123');
    expect(call).toContain('chain=ethereum');
    expect(call).toContain('network=eip155%3A1');
    expect(call).toContain('status=CONFIRMED');
    expect(call).toContain('token=0xtoken');
    expect(call).toContain('from_address=0xsender');
    expect(call).toContain('since=1700000000');
    expect(call).toContain('until=1700099999');
    expect(call).toContain('wallet_id=w9');
  });
});

// ======================= TOOL: get-incoming-summary =======================

describe('get_incoming_summary tool', () => {
  it('calls GET /v1/wallet/incoming/summary with no params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetIncomingSummary, apiClient);

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallet/incoming/summary');
  });

  it('passes all filter params', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetIncomingSummary, apiClient);

    await handler({
      period: 'weekly',
      chain: 'solana',
      network: 'solana-mainnet',
      since: 1700000000,
      until: 1700099999,
      wallet_id: 'w10',
    });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallet/incoming/summary?');
    expect(call).toContain('period=weekly');
    expect(call).toContain('chain=solana');
    expect(call).toContain('network=solana-mainnet');
    expect(call).toContain('since=1700000000');
    expect(call).toContain('until=1700099999');
    expect(call).toContain('wallet_id=w10');
  });
});

// ======================= TOOLS: hyperliquid (10 tools) =======================

describe('Hyperliquid tools', () => {
  it('hl_get_positions calls correct endpoint with params', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_positions')!;

    await handler({ wallet_id: 'w1', sub_account: '0xabc' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallets/w1/hyperliquid/positions');
    expect(call).toContain('subAccount=0xabc');
  });

  it('hl_get_positions defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_positions')!;

    await handler({});

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallets/default/hyperliquid/positions');
  });

  it('hl_get_open_orders calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_open_orders')!;

    await handler({ wallet_id: 'w2', sub_account: '0xdef' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallets/w2/hyperliquid/orders');
    expect(call).toContain('subAccount=0xdef');
  });

  it('hl_get_markets calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_markets')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/hyperliquid/markets');
  });

  it('hl_get_funding_rates calls with market and optional start_time', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_funding_rates')!;

    await handler({ market: 'ETH', start_time: '1700000000' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/hyperliquid/funding-rates');
    expect(call).toContain('market=ETH');
    expect(call).toContain('startTime=1700000000');
  });

  it('hl_get_funding_rates without start_time', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_funding_rates')!;

    await handler({ market: 'BTC' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('market=BTC');
    expect(call).not.toContain('startTime');
  });

  it('hl_get_account_state calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_account_state')!;

    await handler({ wallet_id: 'w3' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/w3/hyperliquid/account');
  });

  it('hl_get_trade_history calls with limit param', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_trade_history')!;

    await handler({ wallet_id: 'w4', limit: '50' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallets/w4/hyperliquid/fills');
    expect(call).toContain('limit=50');
  });

  it('hl_get_trade_history defaults to "default" walletId without limit', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_trade_history')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/fills');
  });

  it('hl_get_spot_balances calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_spot_balances')!;

    await handler({ wallet_id: 'w5' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/w5/hyperliquid/spot/balances');
  });

  it('hl_get_spot_markets calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_spot_markets')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/hyperliquid/spot/markets');
  });

  it('hl_list_sub_accounts calls correct endpoint', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_list_sub_accounts')!;

    await handler({ wallet_id: 'w6' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/w6/hyperliquid/sub-accounts');
  });

  it('hl_get_sub_positions calls correct endpoint with sub_account', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_sub_positions')!;

    await handler({ wallet_id: 'w7', sub_account: '0x123abc' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/w7/hyperliquid/sub-accounts/0x123abc/positions');
  });

  it('hl_get_sub_positions defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_sub_positions')!;

    await handler({ sub_account: '0xdef' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/sub-accounts/0xdef/positions');
  });

  it('hl_get_open_orders defaults to "default" walletId without sub_account', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_open_orders')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/orders');
  });

  it('hl_get_account_state defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_account_state')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/account');
  });

  it('hl_get_spot_balances defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_get_spot_balances')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/spot/balances');
  });

  it('hl_list_sub_accounts defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerHyperliquidTools, apiClient);
    const handler = handlers.get('waiaas_hl_list_sub_accounts')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/hyperliquid/sub-accounts');
  });
});

// ======================= Branch coverage for optional params =======================

describe('branch coverage: get_address wallet_id param', () => {
  it('passes wallet_id as query param when provided', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetAddress, apiClient);

    await handler({ wallet_id: 'w1' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallet/address?walletId=w1');
  });
});

describe('branch coverage: get_balance optional params', () => {
  it('passes network, display_currency, wallet_id', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetBalance, apiClient);

    await handler({ network: 'polygon-mainnet', display_currency: 'KRW', wallet_id: 'w2' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('network=polygon-mainnet');
    expect(call).toContain('display_currency=KRW');
    expect(call).toContain('walletId=w2');
  });
});

describe('branch coverage: get_assets optional params', () => {
  it('passes network, display_currency, wallet_id', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetAssets, apiClient);

    await handler({ network: 'all', display_currency: 'EUR', wallet_id: 'w3' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('network=all');
    expect(call).toContain('display_currency=EUR');
    expect(call).toContain('walletId=w3');
  });
});

describe('branch coverage: get_nonce wallet_id param', () => {
  it('passes wallet_id as query param', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetNonce, apiClient);

    await handler({ wallet_id: 'w4' });

    expect(apiClient.get).toHaveBeenCalledWith('/v1/nonce?walletId=w4');
  });
});

describe('branch coverage: get_transaction optional params', () => {
  it('passes display_currency and wallet_id', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerGetTransaction, apiClient);

    await handler({ transaction_id: 'tx1', display_currency: 'JPY', wallet_id: 'w5' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/transactions/tx1');
    expect(call).toContain('display_currency=JPY');
    expect(call).toContain('walletId=w5');
  });
});

describe('branch coverage: list_transactions optional params', () => {
  it('passes display_currency and wallet_id', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerListTransactions, apiClient);

    await handler({ limit: 10, cursor: 'c1', display_currency: 'GBP', wallet_id: 'w6' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('display_currency=GBP');
    expect(call).toContain('walletId=w6');
  });
});

describe('branch coverage: get_wallet_info combined API calls', () => {
  it('handles wallet_id and combines address+networks+detail', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/wallet/address?walletId=w7', {
        ok: true,
        data: { walletId: 'w7', address: '0xabc', chain: 'ethereum' },
      }],
      ['GET:/v1/wallets/w7/networks', {
        ok: true,
        data: { networks: ['ethereum-mainnet', 'polygon-mainnet'] },
      }],
      ['GET:/v1/wallets/w7', {
        ok: true,
        data: { accountType: 'smart', signerKey: '0xsigner', deployed: false },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerGetWalletInfo, apiClient);

    const result = await handler({ wallet_id: 'w7' }) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['accountType']).toBe('smart');
    expect(parsed['signerKey']).toBe('0xsigner');
    expect(parsed['deployed']).toBe(false);
    expect(parsed['networks']).toEqual(['ethereum-mainnet', 'polygon-mainnet']);
  });

  it('handles networks failure gracefully (empty array)', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/wallet/address', {
        ok: true,
        data: { walletId: 'w8', address: '0xdef' },
      }],
      ['GET:/v1/wallets/w8/networks', {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'No networks', retryable: false },
      }],
      ['GET:/v1/wallets/w8', {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'No detail', retryable: false },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerGetWalletInfo, apiClient);

    const result = await handler({}) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['networks']).toEqual([]);
    expect(parsed['accountType']).toBe('eoa');
    expect(parsed['signerKey']).toBeNull();
    expect(parsed['deployed']).toBe(true);
  });

  it('returns detail defaults when fields are missing from response', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/wallet/address', {
        ok: true,
        data: { walletId: 'w9', address: '0x123' },
      }],
      ['GET:/v1/wallets/w9/networks', {
        ok: true,
        data: { networks: [] },
      }],
      ['GET:/v1/wallets/w9', {
        ok: true,
        data: {},  // No accountType, signerKey, deployed fields
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerGetWalletInfo, apiClient);

    const result = await handler({}) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['accountType']).toBe('eoa');
    expect(parsed['signerKey']).toBeNull();
    expect(parsed['deployed']).toBe(true);
  });
});

describe('branch coverage: simulate_transaction optional fields', () => {
  it('passes all optional fields for CONTRACT_CALL type', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSimulateTransaction, apiClient);

    await handler({
      to: '0xcontract',
      amount: '0',
      type: 'CONTRACT_CALL',
      calldata: '0xabcdef',
      abi: [{ type: 'function', name: 'swap' }],
      value: '1000000',
      network: 'ethereum-mainnet',
      wallet_id: 'w10',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/simulate', expect.objectContaining({
      calldata: '0xabcdef',
      abi: [{ type: 'function', name: 'swap' }],
      value: '1000000',
      network: 'ethereum-mainnet',
      walletId: 'w10',
    }));
  });

  it('passes Solana-specific fields', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSimulateTransaction, apiClient);

    await handler({
      to: 'SolAddr',
      amount: '100',
      type: 'CONTRACT_CALL',
      programId: 'prog123',
      instructionData: 'base64data',
      accounts: [{ pubkey: 'pk1', isSigner: true, isWritable: true }],
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/simulate', expect.objectContaining({
      programId: 'prog123',
      instructionData: 'base64data',
      accounts: [{ pubkey: 'pk1', isSigner: true, isWritable: true }],
    }));
  });

  it('passes APPROVE spender field', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSimulateTransaction, apiClient);

    await handler({
      to: '0xtoken',
      amount: '999',
      type: 'APPROVE',
      spender: '0xspender',
      token: { address: '0xtoken', decimals: 18, symbol: 'TKN' },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/simulate', expect.objectContaining({
      spender: '0xspender',
      token: { address: '0xtoken', decimals: 18, symbol: 'TKN' },
    }));
  });

  it('passes BATCH instructions field', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSimulateTransaction, apiClient);

    await handler({
      to: '0xaddr',
      amount: '0',
      type: 'BATCH',
      instructions: [{ to: '0xa', amount: '100' }, { to: '0xb', amount: '200' }],
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/simulate', expect.objectContaining({
      instructions: [{ to: '0xa', amount: '100' }, { to: '0xb', amount: '200' }],
    }));
  });

  it('passes gas_condition with all fields', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSimulateTransaction, apiClient);

    await handler({
      to: '0xaddr',
      amount: '100',
      gas_condition: { max_gas_price: '30000000000', max_priority_fee: '2000000000', timeout: 300 },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/simulate', expect.objectContaining({
      gasCondition: {
        maxGasPrice: '30000000000',
        maxPriorityFee: '2000000000',
        timeout: 300,
      },
    }));
  });
});

describe('branch coverage: approve_token optional fields', () => {
  it('passes network, wallet_id, and gas_condition', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerApproveToken, apiClient);

    await handler({
      spender: '0xspender',
      token: { address: '0xtoken', decimals: 6, symbol: 'USDC' },
      amount: '1000000',
      network: 'polygon-mainnet',
      wallet_id: 'w11',
      gas_condition: { max_gas_price: '50000000000' },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/send', expect.objectContaining({
      network: 'polygon-mainnet',
      walletId: 'w11',
      gasCondition: { maxGasPrice: '50000000000', maxPriorityFee: undefined, timeout: undefined },
    }));
  });
});

describe('branch coverage: send_batch optional fields', () => {
  it('passes network, wallet_id, and gas_condition', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSendBatch, apiClient);

    await handler({
      instructions: [{ to: '0xa', amount: '1' }, { to: '0xb', amount: '2' }],
      network: 'ethereum-mainnet',
      wallet_id: 'w12',
      gas_condition: { max_priority_fee: '1000000000', timeout: 600 },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/send', expect.objectContaining({
      network: 'ethereum-mainnet',
      walletId: 'w12',
      gasCondition: { maxGasPrice: undefined, maxPriorityFee: '1000000000', timeout: 600 },
    }));
  });
});

describe('branch coverage: send_token wallet_id param', () => {
  it('passes wallet_id as walletId in body', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerSendToken, apiClient);

    await handler({ to: '0xaddr', amount: '100', wallet_id: 'w13' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/transactions/send', expect.objectContaining({
      walletId: 'w13',
    }));
  });
});

describe('branch coverage: get_provider_status smart account with no provider', () => {
  it('returns no-provider message for smart account without provider', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/wallets/w14', {
        ok: true,
        data: { accountType: 'smart', provider: null },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerGetProviderStatus, apiClient);

    const result = await handler({ wallet_id: 'w14' }) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['provider']).toBeNull();
    expect(parsed['accountType']).toBe('smart');
  });

  it('returns provider with paymaster disabled', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/wallets/w15', {
        ok: true,
        data: {
          accountType: 'smart',
          provider: { name: 'pimlico', supportedChains: ['eip155:1'], paymasterEnabled: false },
        },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerGetProviderStatus, apiClient);

    const result = await handler({ wallet_id: 'w15' }) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    const provider = parsed['provider'] as Record<string, unknown>;
    expect(provider['paymasterEnabled']).toBe(false);
    expect((provider['gasSponsorshipStatus'] as string)).toContain('No paymaster');
  });
});

describe('branch coverage: x402_fetch wallet_id param', () => {
  it('passes wallet_id as walletId', async () => {
    const apiClient = createMockApiClient();
    const handler = getToolHandler(registerX402Fetch, apiClient);

    await handler({ url: 'https://example.com', wallet_id: 'w16' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/x402/fetch', expect.objectContaining({
      walletId: 'w16',
    }));
  });
});

describe('branch coverage: polymarket tools optional params', () => {
  it('pm_get_events passes category filter', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_events')!;

    await handler({ category: 'sports' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('category=sports');
  });

  it('pm_get_events without category (no query string)', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_events')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/polymarket/events');
  });

  it('pm_get_balance defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_balance')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/polymarket/balance');
  });

  it('pm_get_pnl defaults to "default" walletId', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_pnl')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/polymarket/pnl');
  });

  it('pm_get_orders with status filter', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_orders')!;

    await handler({ wallet_id: 'w17', status: 'LIVE' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('/v1/wallets/w17/polymarket/orders');
    expect(call).toContain('status=LIVE');
  });

  it('pm_get_orders without status (no query string)', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_orders')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/wallets/default/polymarket/orders');
  });

  it('pm_get_markets with all filters', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_markets')!;

    await handler({ category: 'politics', status: 'active', keyword: 'election', limit: '10' });

    const call = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(call).toContain('category=politics');
    expect(call).toContain('status=active');
    expect(call).toContain('keyword=election');
    expect(call).toContain('limit=10');
  });

  it('pm_get_markets without filters', async () => {
    const apiClient = createMockApiClient();
    const handlers = getNamedToolHandlers(registerPolymarketTools, apiClient);
    const handler = handlers.get('waiaas_pm_get_markets')!;

    await handler({});

    expect(apiClient.get).toHaveBeenCalledWith('/v1/polymarket/markets');
  });
});

describe('branch coverage: resolve_asset token registry branches', () => {
  // Note: resolve_asset tests exist separately but we cover uncovered branches
  it('handles registry with empty tokens array (tokens field present but empty)', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/tokens?network=eip155%3A1', {
        ok: true,
        data: { tokens: [] },
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerResolveAsset, apiClient);

    const result = await handler({ asset_id: 'eip155:1/erc20:0xunknown' }) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['isRegistered']).toBe(false);
  });

  it('handles registry response without tokens field', async () => {
    const responses = new Map<string, ApiResult<unknown>>([
      ['GET:/v1/tokens?network=eip155%3A1', {
        ok: true,
        data: {},  // No tokens field
      }],
    ]);
    const apiClient = createMockApiClient(responses);
    const handler = getToolHandler(registerResolveAsset, apiClient);

    const result = await handler({ asset_id: 'eip155:1/erc20:0xunknown' }) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed['isRegistered']).toBe(false);
  });
});
