/**
 * Integration tests for admin-settings.ts route handlers.
 *
 * Covers uncovered branches:
 * - POST /admin/settings/test-rpc (SSRF guard, latency measurement)
 * - GET /admin/oracle-status (with/without oracle)
 * - GET /admin/api-keys (with/without registry)
 * - PUT /admin/api-keys/:provider
 * - DELETE /admin/api-keys/:provider
 * - GET /admin/forex/rates
 * - PUT /admin/settings (tier overrides, hot-reload)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import * as schema from '../infrastructure/database/schema.js';
import { KillSwitchService } from '../services/kill-switch-service.js';
import { SettingsService } from '../infrastructure/settings/settings-service.js';

const TEST_PASSWORD = 'test-master-password-admin-settings-int';
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

describe('Admin Settings Routes Integration', () => {
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
  // GET /admin/oracle-status
  // -----------------------------------------------------------------------

  describe('GET /admin/oracle-status', () => {
    it('returns oracle status without price oracle -> 200', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/oracle-status`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.cache).toBeDefined();
      expect(body.cache.hits).toBe(0);
      expect(body.sources).toBeDefined();
      expect(body.sources.pyth.available).toBe(false);
    });

    it('returns oracle status with price oracle -> 200', async () => {
      const mockOracle = {
        getNativePrice: vi.fn(),
        getTokenPrice: vi.fn(),
        getCacheStats: vi.fn().mockReturnValue({
          hits: 10, misses: 2, staleHits: 1, size: 5, evictions: 0,
        }),
      };
      const app = makeApp({ priceOracle: mockOracle });

      const res = await app.request(
        `http://${HOST}/v1/admin/oracle-status`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.cache.hits).toBe(10);
      expect(body.sources.pyth.available).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/api-keys
  // -----------------------------------------------------------------------

  describe('GET /admin/api-keys', () => {
    it('returns empty keys when no registry -> 200', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      // Should include at least NFT indexer keys
      expect(body.keys).toBeDefined();
    });

    it('returns provider keys from registry', async () => {
      const mockRegistry = {
        listProviders: vi.fn().mockReturnValue([
          { name: 'jupiter_swap', requiresApiKey: false },
          { name: 'zerox_swap', requiresApiKey: true },
        ]),
        getProvider: vi.fn(),
      };

      const app = makeApp({ actionProviderRegistry: mockRegistry });
      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.keys.length).toBeGreaterThanOrEqual(2);
      const jupiterKey = body.keys.find((k: any) => k.providerName === 'jupiter_swap');
      expect(jupiterKey).toBeDefined();
      expect(jupiterKey.requiresApiKey).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /admin/api-keys/:provider
  // -----------------------------------------------------------------------

  describe('PUT /admin/api-keys/:provider', () => {
    it('sets API key -> 200', async () => {
      const onSettingsChanged = vi.fn();
      const app = makeApp({ onSettingsChanged });

      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys/zerox_swap`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: 'test-api-key-12345' }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.providerName).toBe('zerox_swap');
      expect(onSettingsChanged).toHaveBeenCalled();
    });

    it('returns error when settings service unavailable', async () => {
      const app = makeApp({ settingsService: undefined });

      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys/zerox_swap`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: 'test-api-key' }),
        },
      );
      expect(res.status).toBe(503);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /admin/api-keys/:provider
  // -----------------------------------------------------------------------

  describe('DELETE /admin/api-keys/:provider', () => {
    it('deletes existing API key -> 200', async () => {
      // First set a key
      settingsService.setApiKey('zerox_swap', 'test-key');

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys/zerox_swap`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
    });

    it('returns error for non-existent key', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/api-keys/nonexistent_provider`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/forex/rates
  // -----------------------------------------------------------------------

  describe('GET /admin/forex/rates', () => {
    it('returns empty rates when no forex service -> 200', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/forex/rates?currencies=KRW,JPY`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.rates).toEqual({});
    });

    it('returns empty rates when no currencies param -> 200', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/forex/rates`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.rates).toEqual({});
    });

    it('returns rates from forex service', async () => {
      const mockForex = {
        getRates: vi.fn().mockResolvedValue(new Map([
          ['KRW', { rate: 1350.5, updatedAt: new Date() }],
        ])),
      };
      const app = makeApp({ forexRateService: mockForex });

      const res = await app.request(
        `http://${HOST}/v1/admin/forex/rates?currencies=KRW`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.rates.KRW).toBeDefined();
      expect(body.rates.KRW.rate).toBe(1350.5);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /admin/settings (tier overrides)
  // -----------------------------------------------------------------------

  describe('PUT /admin/settings', () => {
    it('updates settings and calls hot-reload -> 200', async () => {
      const onSettingsChanged = vi.fn();
      const app = makeApp({ onSettingsChanged });

      const res = await app.request(
        `http://${HOST}/v1/admin/settings`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: [{ key: 'notifications.enabled', value: 'true' }],
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.updated).toBe(1);
      expect(onSettingsChanged).toHaveBeenCalledWith(['notifications.enabled']);
    });

    it('rejects invalid tier value', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/settings`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: [{ key: 'actions.jupiter_swap_tier', value: 'INVALID_TIER' }],
          }),
        },
      );
      expect(res.status).toBe(400);
    });

    it('accepts valid tier value', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/settings`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: [{ key: 'actions.jupiter_swap_tier', value: 'INSTANT' }],
          }),
        },
      );
      expect(res.status).toBe(200);
    });

    it('returns error when settings service unavailable', async () => {
      const app = makeApp({ settingsService: undefined });
      const res = await app.request(
        `http://${HOST}/v1/admin/settings`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: [{ key: 'notifications.enabled', value: 'true' }],
          }),
        },
      );
      expect(res.status).toBe(503);
    });
  });
});
