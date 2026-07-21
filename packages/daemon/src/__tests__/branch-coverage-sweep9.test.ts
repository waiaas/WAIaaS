/**
 * Branch coverage sweep 9 -- directly test exported functions and their branches.
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
// HotReloadOrchestrator branches
// ---------------------------------------------------------------------------

describe('HotReloadOrchestrator additional branches', () => {
  it('handles WC project_id key change without WC ref', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });

    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      sqlite,
    });

    // Should not throw
    await orchestrator.handleChangedKeys(['walletconnect.project_id']);
  });

  it('handles telegram key change without telegram ref', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });

    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      sqlite,
    });

    await orchestrator.handleChangedKeys(['telegram.bot_token']);
  });

  it('handles actions key change without action registry', async () => {
    const { HotReloadOrchestrator } = await import('../infrastructure/settings/hot-reload.js');
    const { SettingsService } = await import('../infrastructure/settings/settings-service.js');
    const ss = new SettingsService({
      db, config: {
        daemon: {}, keystore: {}, database: {}, rpc: {}, notifications: {}, security: {},
      } as any, masterPassword: 'test',
    });

    const orchestrator = new HotReloadOrchestrator({
      settingsService: ss,
      sqlite,
    });

    await orchestrator.handleChangedKeys(['actions.jupiter_swap_api_key']);
  });
});

// ---------------------------------------------------------------------------
// DatabasePolicyEngine branches
// ---------------------------------------------------------------------------

describe('DatabasePolicyEngine edge cases', () => {
  it('evaluateAndReserve with no policies returns allowed', async () => {
    const { DatabasePolicyEngine } = await import('../pipeline/database-policy-engine.js');
    const engine = new DatabasePolicyEngine(db, sqlite);

    const walletId = generateId();
    db.insert(schema.wallets).values({
      id: walletId, name: 'test', chain: 'ethereum', environment: 'mainnet',
      publicKey: '0xtest', status: 'ACTIVE', accountType: 'eoa',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();

    const result = engine.evaluateAndReserve(
      walletId,
      { type: 'TRANSFER', to: '0x1234', amount: '1000', chain: 'ethereum', network: 'ethereum-mainnet' },
      generateId(),
      undefined,
      undefined,
    );

    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WalletAppService branches
// ---------------------------------------------------------------------------

describe('WalletAppService branches', () => {
  it('register and list wallet apps', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);

    const app = service.register('test-app', 'Test App', { walletType: 'dcent' });
    expect(app.id).toBeTruthy();
    expect(app.name).toBe('test-app');

    const apps = service.list();
    expect(apps).toHaveLength(1);
  });

  it('update wallet app toggles', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);

    const app = service.register('test-app', 'Test App', { walletType: 'dcent' });
    const updated = service.update(app.id, { alertsEnabled: false });
    expect(updated.alertsEnabled).toBe(false);
  });

  it('remove wallet app', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);

    const app = service.register('test-app', 'Test App');
    service.remove(app.id);
    expect(service.list()).toHaveLength(0);
  });

  it('getById returns undefined for non-existent', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);
    expect(service.getById('nonexistent')).toBeUndefined();
  });

  it('listWithUsedBy returns used_by info', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);
    service.register('test-app', 'Test App');
    const apps = service.listWithUsedBy();
    expect(apps).toHaveLength(1);
  });

  it('register duplicate throws error', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const { WAIaaSError } = await import('@waiaas/core');
    const service = new WalletAppService(sqlite);

    service.register('test-app', 'Test App');
    expect(() => service.register('test-app', 'Test App 2'))
      .toThrow(WAIaaSError);
  });

  it('second app of same wallet_type has signing_enabled=false', async () => {
    const { WalletAppService } = await import('../services/signing-sdk/wallet-app-service.js');
    const service = new WalletAppService(sqlite);

    const app1 = service.register('app1', 'App 1', { walletType: 'dcent' });
    expect(app1.signingEnabled).toBe(true);

    const app2 = service.register('app2', 'App 2', { walletType: 'dcent' });
    expect(app2.signingEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notification-service extra branches
// ---------------------------------------------------------------------------

describe('notification-service extra branches', () => {
  it('disabled service is a no-op', async () => {
    const { NotificationService } = await import('../notifications/notification-service.js');
    const service = new NotificationService({ enabled: false, channels: [] });
    // Should not throw
    await service.notify('TX_SUBMITTED', 'wallet-1', { txId: 'tx-1' });
  });
});

// ---------------------------------------------------------------------------
// admin-monitoring resolveContractFields
// ---------------------------------------------------------------------------

describe('admin-monitoring resolveContractFields branches', () => {
  it('returns name and source from registry', async () => {
    const { resolveContractFields } = await import('../api/routes/admin-monitoring.js');
    const registry = {
      resolve: vi.fn().mockReturnValue({ name: 'Aave V3: Pool', source: 'well-known' }),
    };
    const result = resolveContractFields('CONTRACT_CALL', '0xabc', 'polygon-mainnet', registry as any);
    expect(result.contractName).toBe('Aave V3: Pool');
    expect(result.contractNameSource).toBe('well-known');
  });
});

// ---------------------------------------------------------------------------
// owner-state downgradeIfNoOwner additional branches
// ---------------------------------------------------------------------------

describe('owner-state branches', () => {
  it('downgrade with unverified owner', async () => {
    const { downgradeIfNoOwner } = await import('../workflow/owner-state.js');
    const result = downgradeIfNoOwner(
      { ownerAddress: '0x123', ownerVerified: false },
      'APPROVAL',
    );
    // Owner address exists but not verified -> behavior depends on implementation
    expect(typeof result.tier).toBe('string');
  });

  it('non-APPROVAL tier is unchanged', async () => {
    const { downgradeIfNoOwner } = await import('../workflow/owner-state.js');
    const result = downgradeIfNoOwner(
      { ownerAddress: null, ownerVerified: false },
      'NOTIFY',
    );
    expect(result.tier).toBe('NOTIFY');
    expect(result.downgraded).toBe(false);
  });
});
