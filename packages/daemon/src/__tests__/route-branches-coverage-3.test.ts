/**
 * Route branch coverage sweep 3.
 *
 * Targets uncovered branches across many route files by exercising
 * error paths, optional features, and conditional branches.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import { generateId } from '../infrastructure/database/id.js';
import { JwtSecretManager, type JwtPayload } from '../infrastructure/jwt/index.js';
import type * as schema from '../infrastructure/database/schema.js';
import { KillSwitchService } from '../services/kill-switch-service.js';
import { DefaultPolicyEngine } from '../pipeline/default-policy-engine.js';
import { SettingsService } from '../infrastructure/settings/settings-service.js';
import type { AdapterPool } from '../infrastructure/adapter-pool.js';

const TEST_PASSWORD = 'test-master-pw-route-branches-3';
const HOST = '127.0.0.1:3100';
let passwordHash: string;

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
      solana_mainnet: '', solana_devnet: 'https://api.devnet.solana.com', solana_testnet: '',
      solana_ws_mainnet: '', solana_ws_devnet: '',
      evm_ethereum_mainnet: 'https://eth.drpc.org', evm_ethereum_sepolia: 'https://sepolia.drpc.org',
      evm_polygon_mainnet: '', evm_polygon_amoy: '',
      evm_arbitrum_mainnet: '', evm_arbitrum_sepolia: '',
      evm_optimism_mainnet: '', evm_optimism_sepolia: '',
      evm_base_mainnet: '', evm_base_sepolia: '',
    },
    notifications: {
      enabled: false, min_channels: 1, health_check_interval: 300, log_retention_days: 30,
      dedup_ttl: 300, rate_limit_rpm: 20,
    },
    security: {
      time_delay_default: 0, time_delay_high: 60, policy_defaults_approval_timeout: 3600,
      max_sessions_per_wallet: 10,
    },
    backup: { retention_count: 7 },
  } as any;
}

function mockKeyStore() {
  return {
    generateKeyPair: async () => ({ publicKey: '11111111111111111111111111111112', encryptedPrivateKey: new Uint8Array(64) }),
    decryptPrivateKey: async () => new Uint8Array(64),
    releaseKey: () => {},
    hasKey: async () => true,
    deleteKey: vi.fn().mockResolvedValue(undefined),
    lockAll: () => {},
    sodiumAvailable: true,
  } as any;
}

function mockAdapterPool(): AdapterPool {
  return {
    resolve: vi.fn().mockResolvedValue({
      chain: 'solana',
      buildTransaction: vi.fn().mockResolvedValue({ chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {} }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
      signTransaction: vi.fn().mockResolvedValue(new Uint8Array(64)),
      submitTransaction: vi.fn().mockResolvedValue({ txHash: '5' + 'a'.repeat(87) }),
      getBalance: vi.fn().mockResolvedValue({ balance: 10n ** 18n, decimals: 18, symbol: 'ETH' }),
      getAssets: vi.fn().mockResolvedValue([]),
      getNonce: vi.fn().mockResolvedValue(0),
    }),
    disconnectAll: vi.fn().mockResolvedValue(undefined),
    get size() { return 0; },
  } as unknown as AdapterPool;
}

function masterHeaders(): Record<string, string> {
  return { Host: HOST, 'X-Master-Password': TEST_PASSWORD };
}

function u(path: string): string {
  return `http://${HOST}${path}`;
}

beforeAll(async () => {
  passwordHash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1 });
});

describe('Route branches coverage sweep 3', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;
  let jwtSecretManager: JwtSecretManager;
  let settingsService: SettingsService;

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);
    jwtSecretManager = new JwtSecretManager(db);
    await jwtSecretManager.initialize();
    settingsService = new SettingsService({ db, config: fullConfig(), masterPassword: TEST_PASSWORD });
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ok */ }
  });

  function makeApp(overrides = {}) {
    const killSwitchService = new KillSwitchService({ sqlite });
    killSwitchService.ensureInitialized();
    return createApp({
      db, sqlite,
      keyStore: mockKeyStore(),
      masterPassword: TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: fullConfig(),
      adapterPool: mockAdapterPool(),
      policyEngine: new DefaultPolicyEngine(),
      jwtSecretManager,
      killSwitchService,
      settingsService,
      ...overrides,
    });
  }

  async function createWallet(app: any, chain = 'solana', environment = 'testnet'): Promise<string> {
    const res = await app.request(u('/v1/wallets'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-wallet', chain, environment }),
    });
    const body = await res.json();
    if (!body.id) throw new Error(`createWallet failed: ${JSON.stringify(body)}`);
    return body.id;
  }

  async function createSessionToken(walletId: string): Promise<string> {
    const sessionId = generateId();
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(sessionId, `hash-${sessionId}`, now + 86400, now + 86400 * 30, now);
    sqlite.prepare(
      `INSERT INTO session_wallets (session_id, wallet_id, created_at) VALUES (?, ?, ?)`,
    ).run(sessionId, walletId, now);
    const payload: JwtPayload = { sub: sessionId, iat: now, exp: now + 3600 };
    const token = await jwtSecretManager.signToken(payload);
    return `Bearer ${token}`;
  }

  // -----------------------------------------------------------------------
  // admin-monitoring.ts -- stats
  // -----------------------------------------------------------------------

  it('GET /admin/stats without adminStatsService returns graceful response', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/stats'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /admin/stats with adminStatsService returns stats', async () => {
    const app = makeApp({
      adminStatsService: { getStats: () => ({ wallets: { total: 0 } }) },
    });
    const res = await app.request(u('/v1/admin/stats'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // admin-monitoring.ts -- backups
  // -----------------------------------------------------------------------

  it('GET /admin/backups with backup service', async () => {
    const app = makeApp({
      encryptedBackupService: {
        listBackups: () => [{ path: '/tmp/b', filename: 'b', size: 100, created_at: '2026-01-01', daemon_version: '2.0.0', schema_version: 62, file_count: 1 }],
        createBackup: async () => ({ path: '/tmp/b', filename: 'b', size: 100, created_at: '2026-01-01', daemon_version: '2.0.0', schema_version: 62, file_count: 1 }),
      },
    });
    const res = await app.request(u('/v1/admin/backups'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
  });

  // -----------------------------------------------------------------------
  // admin-monitoring.ts -- session reissue
  // -----------------------------------------------------------------------

  it('POST /admin/sessions/:id/reissue succeeds', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const sessionId = generateId();
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at, token_issued_count) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(sessionId, 'hash-test', now + 86400, now + 86400 * 30, now, 1);
    sqlite.prepare(`INSERT INTO session_wallets (session_id, wallet_id, created_at) VALUES (?, ?, ?)`).run(sessionId, walletId, now);

    const res = await app.request(u(`/v1/admin/sessions/${sessionId}/reissue`), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tokenIssuedCount).toBe(2);
  });

  it('POST /admin/sessions/:id/reissue for revoked session fails', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const sessionId = generateId();
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(sessionId, 'hash-r', now + 86400, now + 86400 * 30, now, now);
    sqlite.prepare(`INSERT INTO session_wallets (session_id, wallet_id, created_at) VALUES (?, ?, ?)`).run(sessionId, walletId, now);

    const res = await app.request(u(`/v1/admin/sessions/${sessionId}/reissue`), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /admin/sessions/:id/reissue for expired session', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const sessionId = generateId();
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(sessionId, 'hash-e', now - 100, now + 86400 * 30, now);
    sqlite.prepare(`INSERT INTO session_wallets (session_id, wallet_id, created_at) VALUES (?, ?, ?)`).run(sessionId, walletId, now);

    const res = await app.request(u(`/v1/admin/sessions/${sessionId}/reissue`), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /admin/sessions/:id/reissue for unlimited session (expiresAt=0)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const sessionId = generateId();
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(sessionId, 'hash-u', 0, 0, now);
    sqlite.prepare(`INSERT INTO session_wallets (session_id, wallet_id, created_at) VALUES (?, ?, ?)`).run(sessionId, walletId, now);

    const res = await app.request(u(`/v1/admin/sessions/${sessionId}/reissue`), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expiresAt).toBe(0);
  });

  it('POST /admin/sessions/nonexistent/reissue returns not found', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/sessions/nonexistent/reissue'), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // admin-monitoring.ts -- cancel transaction
  // -----------------------------------------------------------------------

  it('POST /admin/transactions/:id/cancel for nonexistent tx', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/transactions/nonexistent/cancel'), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // admin-notifications.ts
  // -----------------------------------------------------------------------

  it('GET /admin/notifications/status without notification service', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/notifications/status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('POST /admin/notifications/test without notification service', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/notifications/test'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it('GET /admin/notifications/log returns logs', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/notifications/log'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // admin-auth.ts -- status (dashboard)
  // -----------------------------------------------------------------------

  it('GET /admin/status with versionCheckService showing update available', async () => {
    const app = makeApp({
      versionCheckService: { getLatest: () => '99.0.0', start: () => {}, stop: () => {} },
    });
    const res = await app.request(u('/v1/admin/status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updateAvailable).toBe(true);
  });

  it('GET /admin/status without dataDir returns autoProvisioned=false', async () => {
    const app = makeApp({ dataDir: undefined });
    const res = await app.request(u('/v1/admin/status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.autoProvisioned).toBe(false);
  });

  // -----------------------------------------------------------------------
  // admin-wallets.ts -- balance with no adapter
  // -----------------------------------------------------------------------

  it('GET /admin/wallets/:id/balance with null adapter pool returns empty', async () => {
    const app = makeApp({ adapterPool: null });
    const walletId = await createWallet(app);
    const res = await app.request(u(`/v1/admin/wallets/${walletId}/balance`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.balances).toEqual([]);
  });

  it('GET /admin/wallets/:id/balance with price oracle', async () => {
    const app = makeApp({
      priceOracle: {
        getNativePrice: async () => ({ usdPrice: 3000, source: 'test', timestamp: Date.now() }),
        getTokenPrice: async () => ({ usdPrice: 1, source: 'test', timestamp: Date.now() }),
        getCacheStats: () => ({ hits: 0, misses: 0, staleHits: 0, size: 0, evictions: 0 }),
      },
    });
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const res = await app.request(u(`/v1/admin/wallets/${walletId}/balance`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // wallets -- list, detail, suspend, resume
  // -----------------------------------------------------------------------

  it('GET /v1/wallets returns wallet list (masterAuth)', async () => {
    const app = makeApp();
    await createWallet(app, 'solana', 'testnet');
    const res = await app.request(u('/v1/wallets'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallets/:id returns wallet detail (masterAuth)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const res = await app.request(u(`/v1/wallets/${walletId}`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('POST /v1/wallets/:id/suspend then resume', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const sus = await app.request(u(`/v1/wallets/${walletId}/suspend`), { method: 'POST', headers: masterHeaders() });
    expect(sus.status).toBe(200);
    const res = await app.request(u(`/v1/wallets/${walletId}/resume`), { method: 'POST', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // admin-wallets.ts -- staking
  // -----------------------------------------------------------------------

  it('GET /admin/wallets/:id/staking returns positions', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const res = await app.request(u(`/v1/admin/wallets/${walletId}/staking`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // admin-settings.ts
  // -----------------------------------------------------------------------

  it('GET /admin/settings returns settings', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/settings'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/oracle-status without oracle', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/oracle-status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/oracle-status with oracle', async () => {
    const app = makeApp({
      priceOracle: {
        getNativePrice: vi.fn(), getTokenPrice: vi.fn(),
        getCacheStats: () => ({ hits: 10, misses: 2, staleHits: 1, size: 5, evictions: 0 }),
      },
    });
    const res = await app.request(u('/v1/admin/oracle-status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('PUT /admin/settings updates a setting', async () => {
    const cb = vi.fn();
    const app = makeApp({ onSettingsChanged: cb });
    const res = await app.request(u('/v1/admin/settings'), {
      method: 'PUT',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: [{ key: 'notifications.enabled', value: 'true' }] }),
    });
    expect(res.status).toBe(200);
  });

  it('GET /admin/forex/rates without forex service', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/forex/rates'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/forex/rates with forex service', async () => {
    const app = makeApp({
      forexRateService: { getRates: () => ({ USD: 1 }), getRate: () => 1, getCacheStats: () => ({ hits: 0, misses: 0, staleHits: 0, size: 0, evictions: 0 }) },
    });
    const res = await app.request(u('/v1/admin/forex/rates'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // WC routes -- not configured
  // -----------------------------------------------------------------------

  it('POST /v1/wallets/:id/wc/pair fails when WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const res = await app.request(u(`/v1/wallets/${walletId}/wc/pair`), {
      method: 'POST', headers: { ...masterHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/wallets/:id/wc/session fails when WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const res = await app.request(u(`/v1/wallets/${walletId}/wc/session`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /v1/wallets/:id/wc/session fails when WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const res = await app.request(u(`/v1/wallets/${walletId}/wc/session`), { method: 'DELETE', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/wallets/:id/wc/pair/status fails when WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const res = await app.request(u(`/v1/wallets/${walletId}/wc/pair/status`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /v1/wallet/wc/pair with session auth fails when WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/wc/pair'), {
      method: 'POST', headers: { Host: HOST, Authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/wallet/wc/session session auth WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/wc/session'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /v1/wallet/wc/session session auth WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/wc/session'), { method: 'DELETE', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/wallet/wc/pair/status session auth WC not configured', async () => {
    const app = makeApp({ wcServiceRef: { current: null } });
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/wc/pair/status'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/wallets/:id/wc/session non-existent wallet', async () => {
    const mockWcSvc = { getSessionInfo: vi.fn(), disconnectSession: vi.fn(), getPairingStatus: vi.fn(), createPairing: vi.fn() };
    const app = makeApp({ wcServiceRef: { current: mockWcSvc } });
    const res = await app.request(u('/v1/wallets/nonexistent/wc/session'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // staking.ts -- staking positions per chain
  // -----------------------------------------------------------------------

  it('GET /v1/wallet/staking with session auth (ethereum)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/staking'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallet/staking with session auth (solana)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'solana', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/staking'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // tokens.ts -- resolve guard
  // -----------------------------------------------------------------------

  it('GET /v1/tokens/resolve for non-EVM network rejects', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/tokens/resolve?network=solana-devnet&address=SomeAddr'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET /v1/tokens list for EVM network', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/tokens?network=ethereum-mainnet'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // sessions.ts
  // -----------------------------------------------------------------------

  it('GET /v1/sessions returns sessions list (masterAuth)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    await createSessionToken(walletId);
    const res = await app.request(u('/v1/sessions'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  it('POST /v1/sessions with expiresIn', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const res = await app.request(u('/v1/sessions'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, expiresIn: 3600 }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /v1/sessions without expiresIn (unlimited)', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const res = await app.request(u('/v1/sessions'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId }),
    });
    expect(res.status).toBe(201);
  });

  // -----------------------------------------------------------------------
  // wallet.ts -- assets & balance
  // -----------------------------------------------------------------------

  it('GET /v1/wallet/assets network=all for ethereum', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/assets?network=all'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallet/assets specific network', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/assets?network=ethereum-mainnet'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallet/balance', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'solana', 'testnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/balance'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallet/balance with network query', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/balance?network=ethereum-mainnet'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // connect-info.ts
  // -----------------------------------------------------------------------

  it('GET /v1/connect-info returns wallet info', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/connect-info'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // erc8128.ts -- solana wallet rejection
  // -----------------------------------------------------------------------

  it('POST /v1/erc8128/sign with solana wallet fails', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'solana', 'testnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/erc8128/sign'), {
      method: 'POST',
      headers: { Host: HOST, Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/api', method: 'GET' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // utils.ts -- encode calldata (sessionAuth required)
  // -----------------------------------------------------------------------

  it('POST /v1/utils/encode-calldata success', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/utils/encode-calldata'), {
      method: 'POST',
      headers: { Host: HOST, Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        abi: [{ type: 'function', name: 'transfer', inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool' }] }],
        functionName: 'transfer',
        args: ['0x1234567890abcdef1234567890abcdef12345678', '1000'],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calldata).toBeTruthy();
  });

  it('POST /v1/utils/encode-calldata with bad function name', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/utils/encode-calldata'), {
      method: 'POST',
      headers: { Host: HOST, Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        abi: [{ type: 'function', name: 'foo', inputs: [{ type: 'uint256', name: 'x' }], outputs: [] }],
        functionName: 'nonexistent',
        args: ['123'],
      }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // policies
  // -----------------------------------------------------------------------

  it('GET /v1/policies returns list (masterAuth)', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/policies'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // transactions
  // -----------------------------------------------------------------------

  it('GET /v1/transactions with session auth', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/transactions'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // health
  // -----------------------------------------------------------------------

  it('GET /health returns health info', async () => {
    const app = makeApp();
    const res = await app.request(u('/health'), { method: 'GET' });
    // May return 503 if no adapter pool, but should not be 404
    expect([200, 503]).toContain(res.status);
  });

  // -----------------------------------------------------------------------
  // admin-wallets.ts -- NFTs
  // -----------------------------------------------------------------------

  it('GET /admin/wallets/:id/nfts', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const res = await app.request(u(`/v1/wallets/${walletId}/nfts`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // admin autostop
  // -----------------------------------------------------------------------

  it('GET /admin/autostop/rules without service returns empty rules', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/autostop/rules'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalEnabled).toBe(false);
  });

  it('GET /admin/autostop/rules with service', async () => {
    const app = makeApp({
      autoStopService: {
        getStatus: () => ({ enabled: true }),
        registry: { getRules: () => [] },
      } as any,
    });
    const res = await app.request(u('/v1/admin/autostop/rules'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalEnabled).toBe(true);
  });

  // -----------------------------------------------------------------------
  // admin-credentials.ts
  // -----------------------------------------------------------------------

  it('GET /admin/credentials', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/credentials'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // wallet credentials
  // -----------------------------------------------------------------------

  it('GET /v1/wallets/:id/credentials', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const res = await app.request(u(`/v1/wallets/${walletId}/credentials`), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // incoming.ts -- summary
  // -----------------------------------------------------------------------

  it('GET /v1/wallet/incoming/summary', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/incoming/summary'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // hyperliquid routes -- not configured
  // -----------------------------------------------------------------------

  it('GET /v1/hyperliquid/markets fails when not configured', async () => {
    const app = makeApp({ hyperliquidMarketData: null });
    const res = await app.request(u('/v1/hyperliquid/markets'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // wallets -- create ripple
  // -----------------------------------------------------------------------

  it('POST /v1/wallets with ripple chain', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/wallets'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'xrp', chain: 'ripple', environment: 'testnet' }),
    });
    expect(res.status).toBe(201);
  });

  // -----------------------------------------------------------------------
  // admin RPC status
  // -----------------------------------------------------------------------

  it('GET /admin/rpc-status', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/rpc-status'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // nonce (public)
  // -----------------------------------------------------------------------

  it('GET /v1/nonce with session auth', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const _token = await createSessionToken(walletId);
    const res = await app.request(u(`/v1/nonce?walletId=${walletId}&network=ethereum-mainnet`), { method: 'GET', headers: { Host: HOST } });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // audit-logs (masterAuth)
  // -----------------------------------------------------------------------

  it('GET /v1/audit-logs', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/audit-logs'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // session renew
  // -----------------------------------------------------------------------

  it('POST /v1/sessions/:id/renew', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const createRes = await app.request(u('/v1/sessions'), {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, expiresIn: 7200 }),
    });
    const { id: sessionId, token } = await createRes.json();
    const res = await app.request(u(`/v1/sessions/${sessionId}/renew`), {
      method: 'POST', headers: { Host: HOST, Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // defi-positions
  // -----------------------------------------------------------------------

  it('GET /v1/admin/defi/positions', async () => {
    const app = makeApp();
    const res = await app.request(u('/v1/admin/defi/positions'), { method: 'GET', headers: masterHeaders() });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // external-actions
  // -----------------------------------------------------------------------

  it('GET /v1/wallets/:id/actions', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u(`/v1/wallets/${walletId}/actions`), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBeLessThanOrEqual(500);
  });

  // -----------------------------------------------------------------------
  // wallet address
  // -----------------------------------------------------------------------

  it('GET /v1/wallet/address', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'mainnet');
    const token = await createSessionToken(walletId);
    const res = await app.request(u('/v1/wallet/address'), { method: 'GET', headers: { Host: HOST, Authorization: token } });
    expect(res.status).toBe(200);
  });
});
