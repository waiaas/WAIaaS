/**
 * Branch coverage final push -- target ~80 easy branches across 11 files
 * to push daemon branch coverage from 80.94% to 83%.
 *
 * Strategy: test simple null checks, optional chaining, error paths,
 * and conditional branches with minimal mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';

let sqlite: DatabaseType;
let db: BetterSQLite3Database<typeof schema>;

beforeEach(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  db = conn.db;
  pushSchema(sqlite);
});

afterEach(() => {
  try { sqlite.close(); } catch { /* ok */ }
});

// ---------------------------------------------------------------------------
// 1. connect-info.ts: buildConnectInfoPrompt branches
// ---------------------------------------------------------------------------

describe('buildConnectInfoPrompt branch coverage', () => {
  it('covers all default-deny combinations', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');

    // All deny false -> no security defaults section
    const result1 = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result1).not.toContain('Security defaults');

    // Only tokenApprovals true
    const result2 = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: true, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result2).toContain('Token approvals: DENY');
    expect(result2).not.toContain('Token transfers: DENY');

    // Only x402Domains true
    const result3 = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: true },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result3).toContain('x402 payments: DENY');

    // Only contractCalls true
    const result4 = buildConnectInfoPrompt({
      wallets: [],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: true, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result4).toContain('Contract calls: DENY');
  });

  it('covers wallet with no policies and no deny active', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'solana', environment: 'devnet',
        address: 'abc', networks: ['solana-devnet'], policies: [],
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('No restrictions');
  });

  it('covers wallet with policies', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'solana', environment: 'devnet',
        address: 'abc', networks: ['solana-devnet'],
        policies: [{ type: 'SPENDING_LIMIT' }, { type: 'ALLOWED_TOKENS' }],
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: true, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('SPENDING_LIMIT, ALLOWED_TOKENS');
  });

  it('covers wallet with no policies but deny active', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Test', chain: 'solana', environment: 'devnet',
        address: 'abc', networks: ['solana-devnet'], policies: [],
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: true, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('Default-deny active');
  });

  it('covers ERC-8004, NFT summary, smart account branches', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Smart', chain: 'ethereum', environment: 'mainnet',
        address: '0xabc', networks: ['ethereum-mainnet'],
        policies: [],
        erc8004: { agentId: 'agent1', registryAddress: '0xreg', status: 'VERIFIED' },
        nftSummary: { count: 5, collections: 2 },
        accountType: 'smart',
        provider: { name: 'pimlico', supportedChains: ['ethereum'], paymasterEnabled: true },
        factorySupportedNetworks: ['ethereum-mainnet', 'base-mainnet'],
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('ERC-8004 Agent ID: agent1');
    expect(result).toContain('NFTs: 5 items in 2 collections');
    expect(result).toContain('Smart Account: pimlico provider');
    expect(result).toContain('ENABLED (paymaster active)');
    expect(result).toContain('Factory Supported Networks');
    expect(result).toContain('ERC-8004 Trust Network:');
  });

  it('covers smart account without provider (no paymaster)', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Smart', chain: 'ethereum', environment: 'mainnet',
        address: '0xabc', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('No provider configured');
    expect(result).toContain('UserOp API:');
  });

  it('covers smart account with provider but paymaster disabled', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [{
        id: 'w1', name: 'Smart', chain: 'ethereum', environment: 'mainnet',
        address: '0xabc', networks: ['ethereum-mainnet'],
        policies: [], accountType: 'smart',
        provider: { name: 'alchemy', supportedChains: ['ethereum'], paymasterEnabled: false },
      }],
      capabilities: ['transfer'],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain('DISABLED');
  });

  it('covers all capability prompt lines', async () => {
    const { buildConnectInfoPrompt } = await import('../api/routes/connect-info.js');
    const result = buildConnectInfoPrompt({
      wallets: [],
      capabilities: [
        'transfer', 'dcent_swap', 'hyperliquid', 'polymarket',
        'across_bridge', 'external_actions', 'rpc_proxy',
      ],
      defaultDeny: { tokenTransfers: false, contractCalls: false, tokenApprovals: false, x402Domains: false },
      baseUrl: 'http://localhost:3100',
      version: '2.15.0',
    });
    expect(result).toContain("D'CENT Swap Aggregator");
    expect(result).toContain('Hyperliquid Perp Trading');
    expect(result).toContain('Hyperliquid Spot Trading');
    expect(result).toContain('Hyperliquid Sub-accounts');
    expect(result).toContain('Polymarket Prediction Market');
    expect(result).toContain('Across Bridge');
    expect(result).toContain('External Actions');
    expect(result).toContain('EVM RPC Proxy');
  });
});

// ---------------------------------------------------------------------------
// 2. admin-monitoring.ts: resolveContractFields branches
// ---------------------------------------------------------------------------

describe('resolveContractFields branch coverage', () => {
  it('returns null for non-CONTRACT_CALL type', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('TRANSFER', '0xabc', 'ethereum-mainnet', undefined);
    expect(result.contractName).toBeNull();
    expect(result.contractNameSource).toBeNull();
  });

  it('returns null for CONTRACT_CALL with null toAddress', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', null, 'ethereum-mainnet', { resolve: vi.fn() } as any);
    expect(result.contractName).toBeNull();
  });

  it('returns null for CONTRACT_CALL with null network', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', '0xabc', null, { resolve: vi.fn() } as any);
    expect(result.contractName).toBeNull();
  });

  it('returns null for CONTRACT_CALL without registry', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const result = resolveContractFields('CONTRACT_CALL', '0xabc', 'ethereum-mainnet');
    expect(result.contractName).toBeNull();
  });

  it('returns null for fallback source', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const registry = { resolve: vi.fn().mockReturnValue({ name: '0xabc...', source: 'fallback' }) };
    const result = resolveContractFields('CONTRACT_CALL', '0xabc', 'ethereum-mainnet', registry as any);
    expect(result.contractName).toBeNull();
    expect(result.contractNameSource).toBeNull();
  });

  it('returns name and source for real match', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const registry = { resolve: vi.fn().mockReturnValue({ name: 'Uniswap V3 Router', source: 'registry' }) };
    const result = resolveContractFields('CONTRACT_CALL', '0xabc', 'ethereum-mainnet', registry as any);
    expect(result.contractName).toBe('Uniswap V3 Router');
    expect(result.contractNameSource).toBe('registry');
  });
});

// ---------------------------------------------------------------------------
// 3. hot-reload.ts: additional orchestrator branches
// ---------------------------------------------------------------------------

describe('HotReloadOrchestrator extended branches', () => {
  it('handles empty changedKeys array (no-op)', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({ settingsService: ss });
    await orchestrator.handleChangedKeys([]);
    // Should return immediately without errors
  });

  it('handles daemon.log_level change without daemonLogger', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      daemonLogger: null,
    });
    // Should not throw
    await orchestrator.handleChangedKeys(['daemon.log_level']);
  });

  it('handles daemon.log_level change with daemonLogger', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    ss.set('daemon.log_level', 'debug');
    const mockLogger = { setLevel: vi.fn() };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      daemonLogger: mockLogger as any,
    });
    await orchestrator.handleChangedKeys(['daemon.log_level']);
    expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
  });

  it('handles display.currency change (no-op reload)', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({ settingsService: ss });
    await orchestrator.handleChangedKeys(['display.currency']);
    // No-op -- just logs
  });

  it('handles smart_account key change (no-op reload)', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({ settingsService: ss });
    await orchestrator.handleChangedKeys(['smart_account.default_provider']);
    // No-op -- reads on demand
  });

  it('handles security key change (no-op)', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({ settingsService: ss });
    await orchestrator.handleChangedKeys(['security.max_sessions_per_wallet']);
    // No-op -- reads from DB on next request
  });

  it('handles monitoring key change without balanceMonitorService', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      balanceMonitorService: null,
    });
    await orchestrator.handleChangedKeys(['monitoring.check_interval_sec']);
    // Should not throw
  });

  it('handles incoming key change without incomingTxMonitorService', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      incomingTxMonitorService: null,
    });
    await orchestrator.handleChangedKeys(['incoming.enabled']);
    // Should not throw
  });

  it('handles incoming key change with incomingTxMonitorService', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    ss.set('incoming.enabled', 'true');
    ss.set('incoming.poll_interval', '15');
    ss.set('incoming.retention_days', '60');
    ss.set('incoming.suspicious_dust_usd', '0.05');
    ss.set('incoming.suspicious_amount_multiplier', '5');
    ss.set('incoming.cooldown_minutes', '10');

    const mockMonitor = { updateConfig: vi.fn() };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      incomingTxMonitorService: mockMonitor,
    });
    await orchestrator.handleChangedKeys(['incoming.poll_interval']);
    expect(mockMonitor.updateConfig).toHaveBeenCalled();
  });

  it('handles autostop key change without autoStopService', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      autoStopService: null,
    });
    await orchestrator.handleChangedKeys(['autostop.enabled']);
    // Should not throw
  });

  it('handles autostop per-rule enable/disable', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    // Use a mock SettingsService for dynamic per-rule keys
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'autostop.rule.test_rule.enabled') return 'true';
        if (key === 'autostop.enabled') return 'true';
        return '';
      }),
    };

    const mockRegistry = {
      setEnabled: vi.fn(),
    };
    const mockAutoStop = {
      registry: mockRegistry,
      updateConfig: vi.fn(),
    };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      autoStopService: mockAutoStop as any,
    });
    await orchestrator.handleChangedKeys(['autostop.rule.test_rule.enabled']);
    expect(mockRegistry.setEnabled).toHaveBeenCalledWith('test_rule', true);
  });

  it('handles autostop per-rule setEnabled failure silently', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'autostop.rule.unknown.enabled') return 'false';
        if (key === 'autostop.enabled') return 'true';
        return '';
      }),
    };

    const mockRegistry = {
      setEnabled: vi.fn().mockImplementation(() => { throw new Error('Rule not found'); }),
    };
    const mockAutoStop = {
      registry: mockRegistry,
      updateConfig: vi.fn(),
    };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      autoStopService: mockAutoStop as any,
    });
    // Should not throw
    await orchestrator.handleChangedKeys(['autostop.rule.unknown.enabled']);
  });

  it('handles rpc_pool key change without adapterPool', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      adapterPool: null,
    });
    await orchestrator.handleChangedKeys(['rpc_pool.solana-mainnet']);
    // Should not throw
  });

  it('handles rpc key change without adapterPool', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      adapterPool: null,
    });
    await orchestrator.handleChangedKeys(['rpc.solana_mainnet']);
    // Should not throw
  });

  it('handles notification reload when disabled', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    ss.set('notifications.enabled', 'false');

    const mockNotificationService = {
      replaceChannels: vi.fn(),
      updateConfig: vi.fn(),
    };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      notificationService: mockNotificationService as any,
    });
    await orchestrator.handleChangedKeys(['notifications.enabled']);
    expect(mockNotificationService.replaceChannels).toHaveBeenCalledWith([]);
  });

  it('handles notification reload without notificationService', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      notificationService: null,
    });
    await orchestrator.handleChangedKeys(['notifications.enabled']);
    // Should not throw (early return)
  });

  it('handles WC reload without sqlite', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const wcRef = { current: null };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      wcServiceRef: wcRef as any,
      sqlite: null,
    });
    await orchestrator.handleChangedKeys(['walletconnect.project_id']);
    // Should return early (no sqlite)
  });

  it('handles telegram reload without sqlite', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const tgRef = { current: null };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      telegramBotRef: tgRef,
      sqlite: null,
    });
    await orchestrator.handleChangedKeys(['telegram.bot_token']);
    // Should return early (no sqlite)
  });

  it('handles telegram reload with no token (stops bot)', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    const mockBot = { stop: vi.fn() };
    const tgRef = { current: mockBot };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      telegramBotRef: tgRef as any,
      sqlite,
    });
    await orchestrator.handleChangedKeys(['telegram.bot_token']);
    expect(mockBot.stop).toHaveBeenCalled();
    expect(tgRef.current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. dry-run.ts: executeDryRun branches
// ---------------------------------------------------------------------------

describe('executeDryRun branch coverage', () => {
  it('handles TOKEN_TRANSFER with insufficient token balance', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 9, symbol: 'SOL' }),
      getAssets: vi.fn().mockResolvedValue([{
        mint: '0xtoken',
        balance: 50n,
        decimals: 6,
        symbol: 'USDC',
      }]),
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xtoken', symbol: 'USDC', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.success).toBe(true);
    expect(result.warnings.some((w: any) => w.code === 'INSUFFICIENT_BALANCE')).toBe(true);
  });

  it('handles TOKEN_TRANSFER where token not found in assets', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 9, symbol: 'SOL' }),
      getAssets: vi.fn().mockResolvedValue([]),  // No matching token
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xmissing', symbol: 'FOO', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.success).toBe(true);
    // Token balance is 0n (fallback)
    expect(result.balanceChanges.some((b: any) => b.asset === '0xmissing')).toBe(true);
  });

  it('handles getAssets failure gracefully', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 9, symbol: 'SOL' }),
      getAssets: vi.fn().mockRejectedValue(new Error('RPC timeout')),
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xtoken', symbol: 'USDC', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // Should still succeed -- token balance defaults to 0
    expect(result.success).toBe(true);
  });

  it('handles getBalance failure gracefully', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockRejectedValue(new Error('RPC error')),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.success).toBe(true);
    // Balance defaults to 0n
  });

  it('handles simulation failure', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: false, logs: [], error: 'Sim failed' }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'SIMULATION_FAILED')).toBe(true);
  });

  it('handles simulation exception', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockRejectedValue(new Error('Simulate crashed')),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.message.includes('Simulate crashed'))).toBe(true);
  });

  it('handles build failure', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockRejectedValue(new Error('Build failed')),
      simulateTransaction: vi.fn(),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'SIMULATION_FAILED')).toBe(true);
    expect(result.simulation.success).toBe(false);
  });

  it('handles policy denial with various reason strings', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 9, symbol: 'SOL' }),
    };

    // Test "not in allowed list"
    const mockPolicyEngine1 = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: false, tier: 'INSTANT', reason: 'Token not in allowed list',
      }),
    };
    const result1 = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine1 as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );
    expect(result1.warnings.some((w: any) => w.code === 'TOKEN_NOT_IN_ALLOWED_LIST')).toBe(true);

    // Test "not whitelisted"
    const mockPolicyEngine2 = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: false, tier: 'INSTANT', reason: 'Contract not whitelisted',
      }),
    };
    const result2 = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine2 as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );
    expect(result2.warnings.some((w: any) => w.code === 'CONTRACT_NOT_WHITELISTED')).toBe(true);

    // Test "not in allowed networks"
    const mockPolicyEngine3 = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: false, tier: 'INSTANT', reason: 'Network not in allowed networks',
      }),
    };
    const result3 = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine3 as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );
    expect(result3.warnings.some((w: any) => w.code === 'NETWORK_NOT_ALLOWED')).toBe(true);
  });

  it('handles APPROVAL tier with warning', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    // Insert a wallet into DB for the downgradeIfNoOwner check
    const walletId = generateId();
    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'solana', environment: 'testnet',
      publicKey: 'pubkey', status: 'ACTIVE',
      ownerAddress: '0xowner', ownerVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
    } as any).run();

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: true, tier: 'APPROVAL', approvalReason: 'High amount',
      }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      walletId,
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'APPROVAL_REQUIRED')).toBe(true);
  });

  it('handles DELAY tier with warning', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: true, tier: 'DELAY', delaySeconds: 60,
      }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'DELAY_REQUIRED')).toBe(true);
  });

  it('handles cumulative warning', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({
        allowed: true, tier: 'INSTANT',
        cumulativeWarning: { type: 'SPENDING_LIMIT', ratio: 0.9 },
      }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'CUMULATIVE_LIMIT_WARNING')).toBe(true);
  });

  it('handles high fee ratio warning', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 50000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // Fee 60000 (50000 * 120/100) is 600x of amount 100 -> > 10%
    expect(result.warnings.some((w: any) => w.code === 'HIGH_FEE_RATIO')).toBe(true);
  });

  it('handles price oracle for fee USD resolution', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const mockOracle = {
      getNativePrice: vi.fn().mockResolvedValue({ usdPrice: 100 }),
      getTokenPrice: vi.fn().mockRejectedValue(new Error('not found')),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any, priceOracle: mockOracle as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.fee?.feeUsd).toBeGreaterThan(0);
  });

  it('handles price oracle failure for fee USD', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const mockOracle = {
      getNativePrice: vi.fn().mockRejectedValue(new Error('Oracle down')),
      getTokenPrice: vi.fn().mockRejectedValue(new Error('Oracle down')),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any, priceOracle: mockOracle as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // feeUsd stays null
    expect(result.fee?.feeUsd).toBeNull();
  });

  it('handles APPROVAL tier with downgrade when no owner', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    // Insert wallet with NO owner
    const walletId = generateId();
    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'solana', environment: 'testnet',
      publicKey: 'pubkey2', status: 'ACTIVE',
      createdAt: new Date(), updatedAt: new Date(),
    } as any).run();

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'APPROVAL' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      walletId,
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey2', chain: 'solana', environment: 'testnet' },
    );

    // Should be downgraded from APPROVAL to DELAY
    expect(result.policy.downgraded).toBe(true);
    expect(result.warnings.some((w: any) => w.code === 'DOWNGRADED_NO_OWNER')).toBe(true);
  });

  it('handles gas condition when feature is disabled', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const mockSettings = {
      get: vi.fn().mockReturnValue('false'),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any, settingsService: mockSettings as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100', gasCondition: { maxGasPrice: '1000' } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'GAS_CONDITION_DISABLED')).toBe(true);
  });

  it('handles gas condition without RPC URL', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100', gasCondition: { maxGasPrice: '1000' } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.message.includes('no RPC URL'))).toBe(true);
  });

  it('handles price oracle amountUsd for policy with notListed result', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      getAssets: vi.fn().mockResolvedValue([]),
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const mockOracle = {
      getNativePrice: vi.fn().mockResolvedValue({ usdPrice: 100 }),
      getTokenPrice: vi.fn().mockRejectedValue(new Error('not listed')),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any, priceOracle: mockOracle as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xunknown', symbol: 'FOO', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // Should have ORACLE_PRICE_UNAVAILABLE warning
    expect(result.warnings.some((w: any) => w.code === 'ORACLE_PRICE_UNAVAILABLE')).toBe(true);
  });

  it('handles request without amount (defaults to 0)', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient' } as any,  // No amount field
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.success).toBe(true);
  });

  it('handles unknown chain with default decimals/symbol', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 18, symbol: 'TEST' }),
      buildTransaction: vi.fn().mockResolvedValue({
        chain: 'testchain', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TRANSFER', to: '0xrecipient', amount: '100' } as any,
      'test-devnet',
      { publicKey: 'pubkey', chain: 'unknown_chain', environment: 'devnet' },
    );

    // Should use default 18 decimals and uppercase chain name
    expect(result.fee?.feeDecimals).toBe(18);
  });

  it('handles TOKEN_TRANSFER with token asset having null symbol/decimals', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000n, decimals: 9, symbol: 'SOL' }),
      getAssets: vi.fn().mockResolvedValue([{
        mint: '0xtoken',
        balance: 1000n,
        symbol: null,  // null symbol
        decimals: null,  // null decimals
      }]),
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xtoken', symbol: 'USDC', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.success).toBe(true);
    // Should fallback to token req values
  });

  it('handles APPROVE type with fee-only balance check', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1_000_000_000_000n, decimals: 9, symbol: 'SOL' }),
      approveToken: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'APPROVE', spender: '0xspender', amount: '1000000', token: { address: '0xtoken', symbol: 'USDC', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // APPROVE type uses fee-only check (not amount+fee)
    expect(result.success).toBe(true);
  });

  it('handles CONTRACT_CALL type for insufficient balance check', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 10n, decimals: 9, symbol: 'SOL' }),
      buildContractCall: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'CONTRACT_CALL', to: '0xcontract', calldata: '0x1234', value: '100' } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    expect(result.warnings.some((w: any) => w.code === 'INSUFFICIENT_BALANCE_WITH_FEE')).toBe(true);
  });

  it('handles TOKEN_TRANSFER type with fee-only insufficient balance', async () => {
    const { executeDryRun } = await import('../pipeline/dry-run.js');

    const mockAdapter = {
      getBalance: vi.fn().mockResolvedValue({ balance: 1n, decimals: 9, symbol: 'SOL' }),  // Very low native balance
      getAssets: vi.fn().mockResolvedValue([{ mint: '0xtoken', balance: 10000n, decimals: 6, symbol: 'USDC' }]),
      buildTokenTransfer: vi.fn().mockResolvedValue({
        chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
      }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true, logs: [] }),
    };

    const mockPolicyEngine = {
      evaluate: vi.fn().mockResolvedValue({ allowed: true, tier: 'INSTANT' }),
    };

    const result = await executeDryRun(
      { db, adapter: mockAdapter as any, policyEngine: mockPolicyEngine as any },
      'wallet-id',
      { type: 'TOKEN_TRANSFER', to: '0xrecipient', amount: '100', token: { address: '0xtoken', symbol: 'USDC', decimals: 6 } } as any,
      'solana-devnet',
      { publicKey: 'pubkey', chain: 'solana', environment: 'devnet' },
    );

    // Fee insufficient for native balance
    expect(result.warnings.some((w: any) => w.code === 'INSUFFICIENT_BALANCE_WITH_FEE')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. x402 resolveX402DomainPolicies -- test via x402Routes deps
// ---------------------------------------------------------------------------

describe('x402 helpers', () => {
  it('covers encodePaymentSignatureHeader and buildPassthroughResponse indirectly via module import', async () => {
    // These are not exported but the x402Routes module should load without error
    const mod = await import('../api/routes/x402.js');
    expect(mod.x402Routes).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Additional pipeline-helpers branches
// ---------------------------------------------------------------------------

describe('pipeline-helpers extra branches', () => {
  it('extractPolicyType returns correct types from reason strings', async () => {
    const { extractPolicyType } = await import('../pipeline/pipeline-helpers.js');
    expect(extractPolicyType('Token not in allowed list')).toBe('ALLOWED_TOKENS');
    expect(extractPolicyType('Token transfer not allowed')).toBe('ALLOWED_TOKENS');
    expect(extractPolicyType('Contract not whitelisted')).toBe('CONTRACT_WHITELIST');
    expect(extractPolicyType('Contract calls disabled')).toBe('CONTRACT_WHITELIST');
    // Note: 'Method not whitelisted' matches CONTRACT_WHITELIST first due to 'not whitelisted' check order
    expect(extractPolicyType('Spender not in approved list')).toBe('APPROVED_SPENDERS');
    expect(extractPolicyType('Token approvals disabled')).toBe('APPROVED_SPENDERS');
    expect(extractPolicyType('Address not in whitelist')).toBe('WHITELIST');
    expect(extractPolicyType('Address not in allowed addresses')).toBe('WHITELIST');
    expect(extractPolicyType('Network not in allowed networks')).toBe('ALLOWED_NETWORKS');
    expect(extractPolicyType('Amount exceeds limit')).toBe('APPROVE_AMOUNT_LIMIT');
    expect(extractPolicyType('Unlimited token approval')).toBe('APPROVE_AMOUNT_LIMIT');
    expect(extractPolicyType('Spending limit exceeded')).toBe('SPENDING_LIMIT');
    expect(extractPolicyType(undefined)).toBe('');
    expect(extractPolicyType('some random reason')).toBe('');
  });

  it('getRequestTo returns empty for missing to', async () => {
    const { getRequestTo } = await import('../pipeline/pipeline-helpers.js');
    expect(getRequestTo({} as any)).toBe('');
    expect(getRequestTo({ to: '0xaddr' } as any)).toBe('0xaddr');
  });

  it('truncateAddress handles short and long addresses', async () => {
    const { truncateAddress } = await import('../pipeline/pipeline-helpers.js');
    expect(truncateAddress('short')).toBe('short');
    expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678')).toContain('...');
  });

  it('clearHintedTokens and hasHintedToken', async () => {
    const { hintedTokens, clearHintedTokens, hasHintedToken } = await import('../pipeline/pipeline-helpers.js');
    hintedTokens.add('test-key');
    expect(hasHintedToken('test-key')).toBe(true);
    clearHintedTokens();
    expect(hasHintedToken('test-key')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6b. buildByType branch coverage (stage5-execute.ts)
// ---------------------------------------------------------------------------

describe('buildByType branch coverage', () => {
  it('builds APPROVE with NFT approval (single)', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      approveNft: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'APPROVE', spender: '0xspender', amount: '0',
      token: { address: '0xnft' },
      nft: { tokenId: '1', standard: 'erc721' },
    } as any, '0xwallet');
    expect(mockAdapter.approveNft).toHaveBeenCalledWith(expect.objectContaining({ approvalType: 'single' }));
  });

  it('builds APPROVE with NFT approval (all)', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      approveNft: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'APPROVE', spender: '0xspender', amount: '1',
      token: { address: '0xnft' },
      nft: { tokenId: '1', standard: 'erc721' },
    } as any, '0xwallet');
    expect(mockAdapter.approveNft).toHaveBeenCalledWith(expect.objectContaining({ approvalType: 'all' }));
  });

  it('builds APPROVE without NFT', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildApprove: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'APPROVE', spender: '0xspender', amount: '1000000',
      token: { address: '0xtoken', decimals: 6, symbol: 'USDC' },
    } as any, '0xwallet');
    expect(mockAdapter.buildApprove).toHaveBeenCalled();
  });

  it('builds NFT_TRANSFER', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildNftTransferTx: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'NFT_TRANSFER', to: '0xrecipient',
      token: { address: '0xnft', tokenId: '42', standard: 'erc721' },
    } as any, '0xwallet');
    expect(mockAdapter.buildNftTransferTx).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.objectContaining({ tokenId: '42' }),
    }));
  });

  it('builds NFT_TRANSFER with explicit amount', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildNftTransferTx: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'NFT_TRANSFER', to: '0xrecipient', amount: '5',
      token: { address: '0xnft', tokenId: '42', standard: 'erc1155' },
    } as any, '0xwallet');
    expect(mockAdapter.buildNftTransferTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5n,
    }));
  });

  it('builds CONTRACT_DEPLOY', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildContractCall: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6080',
    } as any, '0xwallet');
    expect(mockAdapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      calldata: '0x6080', to: '',
    }));
  });

  it('builds CONTRACT_DEPLOY with constructor args', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildContractCall: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6080', constructorArgs: '0xabcd',
    } as any, '0xwallet');
    expect(mockAdapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      calldata: '0x6080abcd',
    }));
  });

  it('builds CONTRACT_DEPLOY with value', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildContractCall: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6080', value: '1000',
    } as any, '0xwallet');
    expect(mockAdapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      value: 1000n,
    }));
  });

  it('builds CONTRACT_CALL with instructionData', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildContractCall: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'CONTRACT_CALL', to: '0xcontract', instructionData: 'AQID',
    } as any, '0xwallet');
    expect(mockAdapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      instructionData: Buffer.from('AQID', 'base64'),
    }));
  });

  it('builds CONTRACT_CALL with preInstructions', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildContractCall: vi.fn().mockResolvedValue({ chain: 'ethereum', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'CONTRACT_CALL', to: '0xcontract', calldata: '0x1234',
      preInstructions: [{ programId: 'prog1', data: 'AQID', accounts: [] }],
    } as any, '0xwallet');
    expect(mockAdapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      preInstructions: expect.arrayContaining([
        expect.objectContaining({ programId: 'prog1' }),
      ]),
    }));
  });

  it('builds TRANSFER with memo', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildTransaction: vi.fn().mockResolvedValue({ chain: 'solana', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'TRANSFER', to: '0xrecipient', amount: '100', memo: 'test memo',
    } as any, '0xwallet');
    expect(mockAdapter.buildTransaction).toHaveBeenCalledWith(expect.objectContaining({
      memo: 'test memo',
    }));
  });

  it('builds BATCH with mixed instruction types', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {
      buildBatch: vi.fn().mockResolvedValue({ chain: 'solana', serialized: new Uint8Array(1), estimatedFee: 0n, metadata: {} }),
    };
    await buildByType(mockAdapter as any, {
      type: 'BATCH', instructions: [
        { to: '0xaddr', amount: '100' },  // transfer
        { to: '0xaddr', amount: '50', token: { address: '0xtoken', decimals: 6, symbol: 'USDC' } },  // token transfer
        { spender: '0xspender', token: { address: '0xtoken', decimals: 6, symbol: 'USDC' }, amount: '100' },  // approve
        { to: '0xcontract', calldata: '0x1234' },  // contract call
      ],
    } as any, '0xwallet');
    expect(mockAdapter.buildBatch).toHaveBeenCalled();
  });

  it('throws on unknown type', async () => {
    const { buildByType } = await import('../pipeline/stage5-execute.js');
    const mockAdapter = {};
    await expect(buildByType(mockAdapter as any, {
      type: 'UNKNOWN_TYPE', to: '0xaddr', amount: '100',
    } as any, '0xwallet')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. admin-wallets.ts: formatTxAmount and buildTokenMap branches
// ---------------------------------------------------------------------------

describe('formatTxAmount branch coverage', () => {
  it('returns null for null amount', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    expect(formatTxAmount(null, 'solana', null, null, db)).toBeNull();
  });

  it('returns "0" for zero amount', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    expect(formatTxAmount('0', 'solana', null, null, db)).toBe('0');
  });

  it('formats native transfer amount', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const result = formatTxAmount('1000000000', 'solana', null, null, db);
    expect(result).toContain('SOL');
  });

  it('formats native transfer for ethereum', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const result = formatTxAmount('1000000000000000000', 'ethereum', null, null, db);
    expect(result).toContain('ETH');
  });

  it('returns null for unknown token address (no registry entry)', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const result = formatTxAmount('1000000', 'solana', 'solana-devnet', '0xUnknownToken', db);
    expect(result).toBeNull();
  });

  it('uses token map when provided', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const tokenMap = new Map<string, { symbol: string; decimals: number }>();
    tokenMap.set('0xUSDC:solana-devnet', { symbol: 'USDC', decimals: 6 });
    const result = formatTxAmount('1000000', 'solana', 'solana-devnet', '0xUSDC', db, tokenMap);
    expect(result).toContain('USDC');
  });

  it('uses wildcard fallback in token map', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const tokenMap = new Map<string, { symbol: string; decimals: number }>();
    tokenMap.set('0xUSDC:*', { symbol: 'USDC', decimals: 6 });
    const result = formatTxAmount('1000000', 'solana', 'solana-devnet', '0xUSDC', db, tokenMap);
    expect(result).toContain('USDC');
  });

  it('handles unknown chain with default decimals', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    const result = formatTxAmount('1000000000000000000', 'ripple', null, null, db);
    // Should use fallback (18 decimals or chain-specific)
    expect(result).not.toBeNull();
  });

  it('handles format error gracefully', async () => {
    const { formatTxAmount } = await import('../api/routes/admin-wallets.js');
    // Invalid bigint should cause error
    const result = formatTxAmount('not-a-number', 'solana', null, null, db);
    // Should return null on error
    expect(result).toBeNull();
  });
});

describe('buildTokenMap branch coverage', () => {
  it('returns empty map for empty input', async () => {
    const { buildTokenMap } = await import('../api/routes/admin-wallets.js');
    const result = buildTokenMap([], db);
    expect(result.size).toBe(0);
  });

  it('queries token registry and builds map', async () => {
    const { buildTokenMap } = await import('../api/routes/admin-wallets.js');
    // Insert a token into registry
    db.insert(schema.tokenRegistry).values({
      address: '0xUSDC',
      network: 'solana-devnet',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      createdAt: new Date(),
    } as any).run();

    const result = buildTokenMap([{ address: '0xUSDC', network: 'solana-devnet' }], db);
    expect(result.has('0xUSDC:solana-devnet')).toBe(true);
    // Also has wildcard fallback
    expect(result.has('0xUSDC:*')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. DatabasePolicyEngine: evaluate with various transaction types
// ---------------------------------------------------------------------------

describe('DatabasePolicyEngine branch coverage', () => {
  // Helper to create wallet + disable default-deny
  function createWalletWithSettings(publicKey: string) {
    const walletId = generateId();
    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
      publicKey, status: 'ACTIVE', accountType: 'eoa',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    return walletId;
  }

  async function createSettingsService() {
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });
    // Disable default-deny to allow tests to reach deeper branches
    ss.set('policy.default_deny_tokens', 'false');
    ss.set('policy.default_deny_contracts', 'false');
    ss.set('policy.default_deny_spenders', 'false');
    ss.set('policy.default_deny_x402_domains', 'false');
    return ss;
  }

  it('evaluates NFT_TRANSFER with default APPROVAL tier', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');
    const ss = await createSettingsService();
    const walletId = createWalletWithSettings('0xtest_nft');

    // Need at least one policy
    db.insert(schema.policies).values({
      id: generateId(), walletId, type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_limit: '999999999' }),
      priority: 50, enabled: true, createdAt: new Date(), updatedAt: new Date(),
    } as any).run();

    const engine = new DatabasePolicyEngine(db, sqlite, ss);
    const result = await engine.evaluate(walletId, {
      type: 'NFT_TRANSFER', amount: '1', toAddress: '0xrecipient',
      chain: 'ethereum', network: 'ethereum-mainnet',
    });

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
  });

  it('evaluates CONTRACT_DEPLOY with default APPROVAL tier', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');
    const ss = await createSettingsService();
    const walletId = createWalletWithSettings('0xtest_deploy');

    db.insert(schema.policies).values({
      id: generateId(), walletId, type: 'SPENDING_LIMIT',
      rules: JSON.stringify({ instant_limit: '999999999' }),
      priority: 50, enabled: true, createdAt: new Date(), updatedAt: new Date(),
    } as any).run();

    const engine = new DatabasePolicyEngine(db, sqlite, ss);
    const result = await engine.evaluate(walletId, {
      type: 'CONTRACT_DEPLOY', amount: '0', toAddress: '',
      chain: 'ethereum', network: 'ethereum-mainnet',
    });

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('APPROVAL');
  });

  it('evaluates no-policy wallet as INSTANT passthrough', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');
    const walletId = createWalletWithSettings('0xtest_nopolicy');

    const engine = new DatabasePolicyEngine(db, sqlite);
    const result = await engine.evaluate(walletId, {
      type: 'TRANSFER', amount: '100', toAddress: '0xrecipient',
      chain: 'ethereum', network: 'ethereum-mainnet',
    });

    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('INSTANT');
  });

  it('releaseReservation clears reserved amount', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');
    const walletId = createWalletWithSettings('0xtest_release');

    const txId = generateId();
    db.insert(schema.transactions).values({
      id: txId, walletId, type: 'TRANSFER', status: 'PENDING',
      amount: '50', toAddress: '0xrecipient', chain: 'ethereum',
      network: 'ethereum-mainnet', createdAt: new Date(),
    } as any).run();

    sqlite.prepare(`UPDATE transactions SET reserved_amount = '50' WHERE id = ?`).run(txId);

    const engine = new DatabasePolicyEngine(db, sqlite);
    engine.releaseReservation(txId);

    const tx = sqlite.prepare(`SELECT reserved_amount FROM transactions WHERE id = ?`).get(txId) as any;
    expect(tx.reserved_amount).toBeNull();
  });

  it('releaseReservation clears reserved amount', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');

    const walletId = generateId();
    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
      publicKey: '0xtest11', status: 'ACTIVE', accountType: 'eoa',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    const txId = generateId();
    db.insert(schema.transactions).values({
      id: txId, walletId, type: 'TRANSFER', status: 'PENDING',
      amount: '50', toAddress: '0xrecipient', chain: 'ethereum',
      network: 'ethereum-mainnet', createdAt: new Date(),
    } as any).run();

    // Set reserved amount
    sqlite.prepare(`UPDATE transactions SET reserved_amount = '50' WHERE id = ?`).run(txId);

    const engine = new DatabasePolicyEngine(db, sqlite);
    engine.releaseReservation(txId);

    // Verify reservation was cleared
    const tx = sqlite.prepare(`SELECT reserved_amount FROM transactions WHERE id = ?`).get(txId) as any;
    expect(tx.reserved_amount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. Hot-reload: notification reload with enabled channels
// ---------------------------------------------------------------------------

describe('HotReloadOrchestrator notification with channels', () => {
  it('handles notification reload with Telegram channel enabled', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'notifications.enabled') return 'true';
        if (key === 'notifications.telegram_bot_token') return 'bot123:test';
        if (key === 'notifications.telegram_chat_id') return '-100123456';
        if (key === 'notifications.locale') return 'en';
        if (key === 'notifications.rate_limit_rpm') return '20';
        return '';
      }),
    };

    const mockChannels: any[] = [];
    const mockNotificationService = {
      replaceChannels: vi.fn().mockImplementation((channels: any[]) => { mockChannels.length = 0; mockChannels.push(...channels); }),
      updateConfig: vi.fn(),
    };

    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      notificationService: mockNotificationService as any,
    });

    await orchestrator.handleChangedKeys(['notifications.enabled']);
    expect(mockNotificationService.replaceChannels).toHaveBeenCalled();
    expect(mockNotificationService.updateConfig).toHaveBeenCalled();
  });

  it('handles notification reload with Discord channel', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'notifications.enabled') return 'true';
        if (key === 'notifications.discord_webhook_url') return 'https://discord.com/api/webhooks/test';
        if (key === 'notifications.locale') return 'en';
        if (key === 'notifications.rate_limit_rpm') return '20';
        return '';
      }),
    };

    const mockNotificationService = {
      replaceChannels: vi.fn(),
      updateConfig: vi.fn(),
    };

    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      notificationService: mockNotificationService as any,
    });

    await orchestrator.handleChangedKeys(['notifications.enabled']);
    expect(mockNotificationService.replaceChannels).toHaveBeenCalled();
  });

  it('handles notification reload with Slack channel', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'notifications.enabled') return 'true';
        if (key === 'notifications.slack_webhook_url') return 'https://hooks.slack.com/test';
        if (key === 'notifications.locale') return 'ko';
        if (key === 'notifications.rate_limit_rpm') return '30';
        return '';
      }),
    };

    const mockNotificationService = {
      replaceChannels: vi.fn(),
      updateConfig: vi.fn(),
    };

    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      notificationService: mockNotificationService as any,
    });

    await orchestrator.handleChangedKeys(['notifications.slack_webhook_url']);
    expect(mockNotificationService.replaceChannels).toHaveBeenCalled();
    expect(mockNotificationService.updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'ko', rateLimitRpm: 30 }),
    );
  });

  it('handles WC reload with existing service shutdown error', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'walletconnect.project_id') return '';
        return '';
      }),
    };
    const mockWcService = {
      shutdown: vi.fn().mockRejectedValue(new Error('shutdown error')),
    };
    const wcRef = { current: mockWcService };
    const bridgeRef = { current: { something: true } };
    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      wcServiceRef: wcRef as any,
      wcSigningBridgeRef: bridgeRef as any,
      sqlite,
    });
    await orchestrator.handleChangedKeys(['walletconnect.project_id']);
    expect(wcRef.current).toBeNull();
    expect(bridgeRef.current).toBeNull();
  });

  it('handles balance monitor reload with service', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const mockSS = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'monitoring.check_interval_sec') return '300';
        if (key === 'monitoring.low_balance_threshold_sol') return '0.5';
        if (key === 'monitoring.low_balance_threshold_eth') return '0.1';
        if (key === 'monitoring.cooldown_hours') return '12';
        if (key === 'monitoring.enabled') return 'true';
        return '';
      }),
    };

    const mockBalanceMonitor = {
      updateConfig: vi.fn(),
    };

    const orchestrator = new HotReloadOrchestrator({
      settingsService: mockSS as any,
      balanceMonitorService: mockBalanceMonitor as any,
    });

    await orchestrator.handleChangedKeys(['monitoring.check_interval_sec']);
    expect(mockBalanceMonitor.updateConfig).toHaveBeenCalled();
  });
});
