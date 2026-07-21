/**
 * Integration tests for wallet-apps.ts route handlers.
 *
 * Covers uncovered branches:
 * - POST /admin/wallet-apps (create)
 * - PUT /admin/wallet-apps/:id (update)
 * - DELETE /admin/wallet-apps/:id (remove)
 * - POST /admin/wallet-apps/:id/test-notification
 * - POST /admin/wallet-apps/:id/test-sign-request
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { KillSwitchService } from '../services/kill-switch-service.js';
import { SettingsService } from '../infrastructure/settings/settings-service.js';

const TEST_PASSWORD = 'test-master-password-wallet-apps-int';
const HOST = '127.0.0.1:3100';
let passwordHash: string;

function masterHeaders(): Record<string, string> {
  return {
    Host: HOST,
    'X-Master-Password': TEST_PASSWORD,
  };
}

function fullConfig() {
  return {
    daemon: {
      port: 3100, hostname: '127.0.0.1', log_level: 'info', log_file: 'logs/daemon.log',
      log_max_size: '50MB', log_max_files: 5, pid_file: 'daemon.pid', shutdown_timeout: 30,
      dev_mode: false, admin_ui: false, admin_timeout: 900,
    },
    keystore: { argon2_memory: 65536, argon2_time: 3, argon2_parallelism: 4, backup_on_rotate: true },
    database: { path: ':memory:', wal_checkpoint_interval: 300, busy_timeout: 5000, cache_size: 64000, mmap_size: 268435456 },
    rpc: {
      solana_mainnet: '', solana_devnet: '', solana_testnet: '',
      solana_ws_mainnet: '', solana_ws_devnet: '',
      evm_ethereum_mainnet: '', evm_ethereum_sepolia: '', evm_polygon_mainnet: '', evm_polygon_amoy: '',
      evm_arbitrum_mainnet: '', evm_arbitrum_sepolia: '', evm_optimism_mainnet: '', evm_optimism_sepolia: '',
      evm_base_mainnet: '', evm_base_sepolia: '',
    },
    notifications: {
      enabled: false, min_channels: 1, health_check_interval: 300, log_retention_days: 30,
      dedup_ttl: 300, rate_limit_rpm: 20,
    },
    security: {
      time_delay_default: 0, time_delay_high: 60, policy_defaults_approval_timeout: 3600,
    },
  } as any;
}

beforeAll(async () => {
  passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
});

describe('Wallet Apps Routes Integration', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;
  let settingsService: SettingsService;

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);

    settingsService = new SettingsService({ db, config: fullConfig() as any, masterPassword: TEST_PASSWORD });
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ok */ }
  });

  function makeApp(overrides = {}) {
    const killSwitchService = new KillSwitchService({ sqlite });
    killSwitchService.ensureInitialized();
    return createApp({
      db,
      sqlite,
      masterPasswordHash: passwordHash,
      config: fullConfig(),
      killSwitchService,
      settingsService,
      ...overrides,
    });
  }

  // -----------------------------------------------------------------------
  // GET /admin/wallet-apps
  // -----------------------------------------------------------------------

  describe('GET /admin/wallet-apps', () => {
    it('returns empty list initially', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.apps).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // POST /admin/wallet-apps (create)
  // -----------------------------------------------------------------------

  describe('POST /admin/wallet-apps', () => {
    it('creates a wallet app -> 201', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'dcent',
            display_name: "D'CENT Wallet",
            wallet_type: 'dcent',
          }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.app.name).toBe('dcent');
      expect(body.app.wallet_type).toBe('dcent');
      // signing_enabled default depends on implementation
      expect(typeof body.app.signing_enabled).toBe('boolean');
    });
  });

  // -----------------------------------------------------------------------
  // PUT /admin/wallet-apps/:id (update)
  // -----------------------------------------------------------------------

  describe('PUT /admin/wallet-apps/:id', () => {
    it('updates wallet app toggles -> 200', async () => {
      const app = makeApp();

      // Create first
      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'dcent',
            display_name: "D'CENT Wallet",
            wallet_type: 'dcent',
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      // Update
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signing_enabled: true,
            alerts_enabled: true,
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.app.signing_enabled).toBe(true);
      expect(body.app.alerts_enabled).toBe(true);
    });

    it('returns 404 for non-existent app', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${generateId()}`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ signing_enabled: true }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /admin/wallet-apps/:id
  // -----------------------------------------------------------------------

  describe('DELETE /admin/wallet-apps/:id', () => {
    it('removes wallet app -> 200', async () => {
      const app = makeApp();

      // Create first
      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'dcent',
            display_name: "D'CENT Wallet",
            wallet_type: 'dcent',
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      // Delete
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent app', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${generateId()}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // POST /admin/wallet-apps/:id/test-notification
  // -----------------------------------------------------------------------

  describe('POST /admin/wallet-apps/:id/test-notification', () => {
    it('returns error when SDK disabled', async () => {
      settingsService.set('signing_sdk.enabled', 'false');
      const app = makeApp();

      // Create app first
      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-app', display_name: 'Test App', wallet_type: 'dcent',
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}/test-notification`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('disabled');
    });

    it('returns error when notifications disabled', async () => {
      settingsService.set('signing_sdk.enabled', 'true');
      settingsService.set('signing_sdk.notifications_enabled', 'false');
      const app = makeApp();

      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-app', display_name: 'Test App', wallet_type: 'dcent',
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}/test-notification`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('notifications');
    });

    it('returns error when no device registered', async () => {
      settingsService.set('signing_sdk.enabled', 'true');
      settingsService.set('signing_sdk.notifications_enabled', 'true');
      const app = makeApp();

      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-app3', display_name: 'Test App', wallet_type: 'dcent',
            alerts_enabled: true,
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}/test-notification`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('device');
    });

    it('returns 404 for non-existent app', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${generateId()}/test-notification`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // POST /admin/wallet-apps/:id/test-sign-request
  // -----------------------------------------------------------------------

  describe('POST /admin/wallet-apps/:id/test-sign-request', () => {
    it('returns error when SDK disabled', async () => {
      settingsService.set('signing_sdk.enabled', 'false');
      const app = makeApp();

      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-app', display_name: 'Test App', wallet_type: 'dcent',
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}/test-sign-request`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('disabled');
    });

    it('returns error when no device registered for sign', async () => {
      settingsService.set('signing_sdk.enabled', 'true');
      const app = makeApp();

      const createRes = await app.request(
        `http://${HOST}/v1/admin/wallet-apps`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-app3', display_name: 'Test App', wallet_type: 'dcent',
            signing_enabled: true,
          }),
        },
      );
      const createBody = await createRes.json() as any;
      const appId = createBody.app.id;

      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${appId}/test-sign-request`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error).toContain('device');
    });

    it('returns 404 for non-existent app', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallet-apps/${generateId()}/test-sign-request`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });
});
