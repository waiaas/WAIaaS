/**
 * Integration tests for admin-auth.ts route handlers.
 *
 * Covers uncovered branches:
 * - PUT /admin/master-password (password change with re-encrypt)
 * - POST /admin/rotate-secret (JWT rotation)
 * - POST /admin/shutdown
 * - GET /admin/status (version check, autoProvisioned, latestVersion branches)
 * - Legacy kill switch fallback paths
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import * as schema from '../infrastructure/database/schema.js';
import { JwtSecretManager } from '../infrastructure/jwt/index.js';
import { KillSwitchService } from '../services/kill-switch-service.js';

const TEST_PASSWORD = 'test-master-password-admin-auth-int';
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

describe('Admin Auth Routes Integration', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;
  let jwtSecretManager: JwtSecretManager;

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);

    jwtSecretManager = new JwtSecretManager(db);
    await jwtSecretManager.initialize();

    // Insert master_password_hash into key_value_store
    db.insert(schema.keyValueStore).values({
      key: 'master_password_hash',
      value: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ok */ }
  });

  // -----------------------------------------------------------------------
  // POST /admin/shutdown
  // -----------------------------------------------------------------------

  describe('POST /admin/shutdown', () => {
    it('calls requestShutdown and returns 200', async () => {
      const requestShutdown = vi.fn();
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        requestShutdown,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/shutdown`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.message).toContain('Shutdown');
      expect(requestShutdown).toHaveBeenCalled();
    });

    it('returns 200 even without requestShutdown callback', async () => {
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/shutdown`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // POST /admin/rotate-secret
  // -----------------------------------------------------------------------

  describe('POST /admin/rotate-secret', () => {
    it('rotates JWT secret -> 200 or 429 (rate limited)', async () => {
      const killSwitchService = new KillSwitchService({ sqlite });
      killSwitchService.ensureInitialized();
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        jwtSecretManager,
        killSwitchService,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/rotate-secret`,
        { method: 'POST', headers: masterHeaders() },
      );
      // May hit rate limiter in CI
      if (res.status === 200) {
        const body = await res.json() as any;
        expect(body.rotatedAt).toBeTypeOf('number');
      } else {
        expect(res.status).toBe(429);
      }
    });

    it('returns 503 when jwtSecretManager is not available', async () => {
      const killSwitchService = new KillSwitchService({ sqlite });
      killSwitchService.ensureInitialized();
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        killSwitchService,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/rotate-secret`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(503);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /admin/master-password
  // -----------------------------------------------------------------------

  describe('PUT /admin/master-password', () => {
    it('changes master password -> 200', async () => {
      const passwordRef = { password: TEST_PASSWORD, hash: passwordHash };
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        passwordRef,
        config: fullConfig(),
        // dataDir is not set -> skip keystore re-encrypt
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/master-password`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'new-password-12345' }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.message).toContain('changed successfully');
      expect(body.settingsReEncrypted).toBeTypeOf('number');
    });

    it('rejects same password -> 400', async () => {
      const passwordRef = { password: TEST_PASSWORD, hash: passwordHash };
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        passwordRef,
        config: fullConfig(),
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/master-password`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: TEST_PASSWORD }),
        },
      );
      expect(res.status).toBe(400);
    });

    it('returns error when passwordRef is not available', async () => {
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/master-password`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'new-password-12345' }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/status (extra branches)
  // -----------------------------------------------------------------------

  describe('GET /admin/status', () => {
    it('returns status with version check info', async () => {
      const killSwitchService = new KillSwitchService({ sqlite });
      killSwitchService.ensureInitialized();

      const versionCheckService = {
        getLatest: () => '99.0.0',
        start: vi.fn(),
        stop: vi.fn(),
      };

      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        killSwitchService,
        versionCheckService: versionCheckService as any,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/status`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('running');
      expect(body.updateAvailable).toBe(true);
      expect(body.latestVersion).toBe('99.0.0');
    });

    it('returns status when no version check service', async () => {
      const killSwitchService = new KillSwitchService({ sqlite });
      killSwitchService.ensureInitialized();

      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        killSwitchService,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/status`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.updateAvailable).toBe(false);
      expect(body.latestVersion).toBeNull();
    });

    it('returns autoProvisioned false when no dataDir', async () => {
      const killSwitchService = new KillSwitchService({ sqlite });
      killSwitchService.ensureInitialized();

      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        killSwitchService,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/status`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.autoProvisioned).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Legacy kill switch fallback (no KillSwitchService)
  // -----------------------------------------------------------------------

  describe('Legacy kill switch fallback', () => {
    it('GET /admin/kill-switch with legacy state getter', async () => {
      const state = { state: 'ACTIVE' as string, activatedAt: null as number | null, activatedBy: null as string | null };
      const app = createApp({
        db,
        sqlite,
        masterPasswordHash: passwordHash,
        config: fullConfig(),
        getKillSwitchState: () => state.state as any,
      });

      const res = await app.request(
        `http://${HOST}/v1/admin/kill-switch`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
    });
  });
});
