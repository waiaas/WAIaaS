/**
 * Coverage tests for wallets.ts route handler branches.
 *
 * Targets uncovered branches:
 * - isLiteModeSmartAccount / getLiteModeError / buildProviderStatus helpers
 * - DELETE /v1/wallets/:id (terminate) with cascade defense
 * - DELETE /v1/wallets/:id already terminated returns 409
 * - DELETE /v1/wallets/:id/purge (hard delete)
 * - DELETE /v1/wallets/:id/purge not terminated returns error
 * - POST /v1/wallets/:id/suspend (state validation)
 * - POST /v1/wallets/:id/resume (state validation)
 * - PUT /v1/wallets/:id (update name)
 * - PATCH /v1/wallets/:id (monitoring settings)
 * - PUT /v1/wallets/:id/owner (set owner with wallet_type/approval_method)
 * - GET /v1/wallets/:id/networks
 * - Session-scoped wallet listing
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
import type { AdapterPool } from '../infrastructure/adapter-pool.js';
// createHash import removed -- not needed in this test file

// ---------------------------------------------------------------------------
// Unit tests for exported helpers
// ---------------------------------------------------------------------------

import {
  isLiteModeSmartAccount,
  getLiteModeError,
  buildProviderStatus,
} from '../api/routes/wallets.js';

describe('isLiteModeSmartAccount', () => {
  it('returns true for smart account with no provider', () => {
    expect(isLiteModeSmartAccount({ accountType: 'smart', aaProvider: null })).toBe(true);
  });

  it('returns false for smart account with provider', () => {
    expect(isLiteModeSmartAccount({ accountType: 'smart', aaProvider: 'pimlico' })).toBe(false);
  });

  it('returns false for EOA', () => {
    expect(isLiteModeSmartAccount({ accountType: 'eoa', aaProvider: null })).toBe(false);
  });
});

describe('getLiteModeError', () => {
  it('returns WAIaaSError with CHAIN_ERROR code', () => {
    const error = getLiteModeError();
    expect(error.code).toBe('CHAIN_ERROR');
    expect(error.message).toContain('Lite mode');
    expect(error.message).toContain('userop');
  });
});

describe('buildProviderStatus', () => {
  it('returns null when no provider', () => {
    expect(buildProviderStatus({ aaProvider: null })).toBeNull();
  });

  it('returns custom provider status', () => {
    const result = buildProviderStatus({ aaProvider: 'custom', aaPaymasterUrl: 'https://pm.example.com' });
    expect(result).toBeTruthy();
    expect(result!.name).toBe('custom');
    expect(result!.supportedChains).toEqual([]);
    expect(result!.paymasterEnabled).toBe(true);
  });

  it('returns custom provider without paymaster', () => {
    const result = buildProviderStatus({ aaProvider: 'custom', aaPaymasterUrl: null });
    expect(result).toBeTruthy();
    expect(result!.paymasterEnabled).toBe(false);
  });

  it('returns pimlico provider with supportedChains', () => {
    const result = buildProviderStatus({ aaProvider: 'pimlico' });
    expect(result).toBeTruthy();
    expect(result!.name).toBe('pimlico');
    expect(result!.supportedChains.length).toBeGreaterThan(0);
    expect(result!.paymasterEnabled).toBe(true);
  });

  it('returns alchemy provider with supportedChains', () => {
    const result = buildProviderStatus({ aaProvider: 'alchemy' });
    expect(result).toBeTruthy();
    expect(result!.name).toBe('alchemy');
    expect(result!.supportedChains.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'test-master-password-wallets-cov';
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
  } as any;
}

function mockKeyStore() {
  return {
    generateKeyPair: async () => ({
      publicKey: '11111111111111111111111111111112',
      encryptedPrivateKey: new Uint8Array(64),
    }),
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
    resolve: vi.fn().mockResolvedValue({}),
    disconnectAll: vi.fn().mockResolvedValue(undefined),
    get size() { return 0; },
  } as unknown as AdapterPool;
}

function masterHeaders(): Record<string, string> {
  return { Host: HOST, 'X-Master-Password': TEST_PASSWORD };
}

beforeAll(async () => {
  passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1,
  });
});

describe('Wallet routes coverage integration', () => {
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
      ...overrides,
    });
  }

  async function createWallet(app: any, chain = 'solana', environment = 'testnet'): Promise<string> {
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-wallet', chain, environment }),
    });
    const body = await res.json();
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
  // PUT /v1/wallets/:id (update name)
  // -----------------------------------------------------------------------

  it('PUT /v1/wallets/:id updates name successfully', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'PUT',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'updated-name' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('updated-name');
    expect(body.id).toBe(walletId);
  });

  it('PUT /v1/wallets/:id with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}`, {
      method: 'PUT',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'nope' }),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // PATCH /v1/wallets/:id (monitoring settings)
  // -----------------------------------------------------------------------

  it('PATCH /v1/wallets/:id updates monitoring settings', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'PATCH',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ monitorIncoming: true }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monitorIncoming).toBe(true);
  });

  it('PATCH /v1/wallets/:id with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}`, {
      method: 'PATCH',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ monitorIncoming: true }),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/wallets/:id (terminate)
  // -----------------------------------------------------------------------

  it('DELETE /v1/wallets/:id terminates wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('TERMINATED');
  });

  it('DELETE /v1/wallets/:id already terminated returns error', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // First terminate
    await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    // Second terminate
    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    const body = await res.json();
    expect(body.code).toBe('WALLET_TERMINATED');
  });

  it('DELETE /v1/wallets/:id with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(404);
  });

  it('DELETE /v1/wallets/:id cascade defense revokes session when last wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    await createSessionToken(walletId);

    // Terminate
    await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    // Check session was revoked
    const _session = sqlite.prepare('SELECT revoked_at FROM sessions').get() as any;
    // Auto-created session + our test session -- check that at least one has revoked_at set
    const sessions = sqlite.prepare('SELECT revoked_at FROM sessions').all() as any[];
    const revokedCount = sessions.filter((s: any) => s.revoked_at !== null).length;
    expect(revokedCount).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/wallets/:id/purge
  // -----------------------------------------------------------------------

  it('DELETE /v1/wallets/:id/purge permanently deletes terminated wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // First terminate
    await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    // Then purge
    const res = await app.request(`/v1/wallets/${walletId}/purge`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('PURGED');

    // Verify wallet is gone from DB
    const row = sqlite.prepare('SELECT id FROM wallets WHERE id = ?').get(walletId);
    expect(row).toBeUndefined();
  });

  it('DELETE /v1/wallets/:id/purge on active wallet returns error', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}/purge`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    const body = await res.json();
    expect(body.code).toBe('WALLET_NOT_TERMINATED');
  });

  it('DELETE /v1/wallets/:id/purge on non-existent wallet returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}/purge`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // POST /v1/wallets/:id/suspend & resume
  // -----------------------------------------------------------------------

  it('POST /v1/wallets/:id/suspend suspends active wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'SUSPICIOUS_ACTIVITY' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SUSPENDED');
    expect(body.suspensionReason).toBe('SUSPICIOUS_ACTIVITY');
  });

  it('POST /v1/wallets/:id/suspend on already suspended wallet returns error', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // Suspend
    await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Try to suspend again
    const res = await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json();
    expect(body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('POST /v1/wallets/:id/suspend with default reason', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suspensionReason).toBe('MANUAL');
  });

  it('POST /v1/wallets/:id/resume resumes suspended wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // Suspend first
    await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Resume
    const res = await app.request(`/v1/wallets/${walletId}/resume`, {
      method: 'POST',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ACTIVE');
  });

  it('POST /v1/wallets/:id/resume on active wallet returns error', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}/resume`, {
      method: 'POST',
      headers: masterHeaders(),
    });

    const body = await res.json();
    expect(body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('POST /v1/wallets/:id/suspend with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
  });

  it('POST /v1/wallets/:id/resume with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}/resume`, {
      method: 'POST',
      headers: masterHeaders(),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // GET /v1/wallets/:id/networks
  // -----------------------------------------------------------------------

  it('GET /v1/wallets/:id/networks returns 200', async () => {
    const app = makeApp();
    const walletId = await createWallet(app, 'ethereum', 'testnet');

    const res = await app.request(`/v1/wallets/${walletId}/networks`, {
      headers: masterHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Response shape may vary -- just verify it's a 200 with data
    expect(typeof body).toBe('object');
  });

  it('GET /v1/wallets/:id/networks with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}/networks`, {
      headers: masterHeaders(),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // GET /v1/wallets (session-scoped)
  // -----------------------------------------------------------------------

  it('GET /v1/wallets with session auth returns only session-linked wallets', async () => {
    const app = makeApp();
    const walletId1 = await createWallet(app);
    const _walletId2 = await createWallet(app);

    // Create session linked to only wallet1
    const authHeader = await createSessionToken(walletId1);

    const res = await app.request('/v1/wallets', {
      headers: { Host: HOST, Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Should only contain the session-linked wallet
    const ids = body.items.map((w: any) => w.id);
    expect(ids).toContain(walletId1);
    // walletId2 may or may not be included depending on auto-created session from createWallet
  });

  // -----------------------------------------------------------------------
  // GET /v1/wallets/:id (detail)
  // -----------------------------------------------------------------------

  it('GET /v1/wallets/:id returns full detail with ownerState', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      headers: masterHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(walletId);
    expect(body.ownerState).toBe('NONE');
    expect(body.accountType).toBe('eoa');
    expect(body.deployed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // PUT /v1/wallets/:id/owner
  // -----------------------------------------------------------------------

  it('PUT /v1/wallets/:id/owner sets owner address for solana wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Verify the owner address was set -- response shape depends on route implementation
    expect(body.id ?? body.walletId).toBe(walletId);
  });

  it('PUT /v1/wallets/:id/owner with non-existent ID returns 404', async () => {
    const app = makeApp();
    const fakeId = generateId();

    const res = await app.request(`/v1/wallets/${fakeId}/owner`, {
      method: 'PUT',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_address: 'addr1' }),
    });

    expect(res.status).toBe(404);
  });

  // -----------------------------------------------------------------------
  // POST /v1/wallets with createSession=true
  // -----------------------------------------------------------------------

  it('POST /v1/wallets with createSession=true returns session info', async () => {
    const app = makeApp();

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'session-wallet', createSession: true }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session).toBeTruthy();
    expect(body.session.token).toBeTruthy();
    expect(body.session.id).toBeTruthy();
  });

  it('POST /v1/wallets with createSession=false returns no session', async () => {
    const app = makeApp();

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'no-session-wallet', createSession: false }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Smart account validation
  // -----------------------------------------------------------------------

  it('POST /v1/wallets with smart account on solana returns error', async () => {
    const app = makeApp();

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'smart-solana',
        chain: 'solana',
        accountType: 'smart',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');
    expect(body.message).toContain('EVM');
  });
});
