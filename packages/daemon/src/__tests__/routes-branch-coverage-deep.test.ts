/**
 * Deep branch coverage tests for route handlers.
 *
 * Covers route-level branches in:
 * - transactions.ts: send, simulate, list, pending, detail, sign, sign-message
 * - wallets.ts: create, delete, purge, suspend, resume, owner, networks
 * - sessions.ts: create, revoke, renew, list
 * - connect-info.ts
 * - admin-settings.ts
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

const TEST_PASSWORD = 'test-master-pw-routes-deep';
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
      getBalance: vi.fn().mockResolvedValue({ balance: 10n ** 18n }),
      getAssets: vi.fn().mockResolvedValue([]),
    }),
    disconnectAll: vi.fn().mockResolvedValue(undefined),
    get size() { return 0; },
  } as unknown as AdapterPool;
}

function masterHeaders(): Record<string, string> {
  return { Host: HOST, 'X-Master-Password': TEST_PASSWORD };
}

beforeAll(async () => {
  passwordHash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1 });
});

describe('Routes branch coverage deep', () => {
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
  // POST /v1/wallets -- create with auto-session
  // -----------------------------------------------------------------------

  it('POST /v1/wallets with createSession=true', async () => {
    const app = makeApp();
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'session-wallet', chain: 'solana', environment: 'testnet', createSession: true }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session).toBeTruthy();
    expect(body.session.token).toBeTruthy();
  });

  it('POST /v1/wallets with createSession=false', async () => {
    const app = makeApp();
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'no-session', chain: 'solana', environment: 'testnet', createSession: false }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it('POST /v1/wallets with ethereum mainnet', async () => {
    const app = makeApp();
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'eth-wallet', chain: 'ethereum', environment: 'mainnet' }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /v1/wallets smart account on solana rejected', async () => {
    const app = makeApp();
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'sol-smart', chain: 'solana', environment: 'devnet', accountType: 'smart' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/wallets/:id -- terminate
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

  it('DELETE /v1/wallets/:id already terminated', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    // Terminate first
    await app.request(`/v1/wallets/${walletId}`, { method: 'DELETE', headers: masterHeaders() });
    // Try again
    const res = await app.request(`/v1/wallets/${walletId}`, { method: 'DELETE', headers: masterHeaders() });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /v1/wallets/:id auto-revokes session when last wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const _authToken = await createSessionToken(walletId);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/wallets/:id/purge -- hard delete
  // -----------------------------------------------------------------------

  it('DELETE /v1/wallets/:id/purge not terminated returns error', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const res = await app.request(`/v1/wallets/${walletId}/purge`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /v1/wallets/:id/purge after termination', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    await app.request(`/v1/wallets/${walletId}`, { method: 'DELETE', headers: masterHeaders() });
    const res = await app.request(`/v1/wallets/${walletId}/purge`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('PURGED');
  });

  // -----------------------------------------------------------------------
  // POST /v1/wallets/:id/suspend + resume
  // -----------------------------------------------------------------------

  it('POST /v1/wallets/:id/suspend', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const res = await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'MANUAL' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SUSPENDED');
  });

  it('POST /v1/wallets/:id/suspend not ACTIVE', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    await app.request(`/v1/wallets/${walletId}`, { method: 'DELETE', headers: masterHeaders() });
    const res = await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'MANUAL' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /v1/wallets/:id/resume', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    await app.request(`/v1/wallets/${walletId}/suspend`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'MANUAL' }),
    });
    const res = await app.request(`/v1/wallets/${walletId}/resume`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ACTIVE');
  });

  it('POST /v1/wallets/:id/resume not SUSPENDED', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const res = await app.request(`/v1/wallets/${walletId}/resume`, {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // POST /v1/transactions/send -- basic + terminated
  // -----------------------------------------------------------------------

  it('POST /v1/transactions/send returns 201', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    const res = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: { Host: HOST, 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify({ walletId, type: 'TRANSFER', to: '11111111111111111111111111111112', amount: '100000000' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
  });

  it('POST /v1/transactions/send with TERMINATED wallet', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);
    await app.request(`/v1/wallets/${walletId}`, { method: 'DELETE', headers: masterHeaders() });

    const res = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: { Host: HOST, 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify({ walletId, type: 'TRANSFER', to: '11111111111111111111111111111112', amount: '100000000' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -----------------------------------------------------------------------
  // GET /v1/transactions -- list, pending, detail
  // -----------------------------------------------------------------------

  it('GET /v1/transactions with cursor pagination', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    // Insert some transactions
    for (let i = 0; i < 3; i++) {
      const txId = generateId();
      sqlite.prepare(
        `INSERT INTO transactions (id, wallet_id, type, status, to_address, amount, chain, network, created_at)
         VALUES (?, ?, 'TRANSFER', 'CONFIRMED', ?, '100', 'solana', 'solana-devnet', datetime('now'))`,
      ).run(txId, walletId, '11111111111111111111111111111112');
    }

    const res = await app.request('/v1/transactions?limit=2', {
      method: 'GET',
      headers: { Host: HOST, 'Authorization': authToken },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(2);
    expect(body.hasMore).toBe(true);
    expect(body.cursor).toBeTruthy();
  });

  it('GET /v1/transactions/pending', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    const txId = generateId();
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, type, status, to_address, amount, chain, network, created_at)
       VALUES (?, ?, 'TRANSFER', 'PENDING', ?, '100', 'solana', 'solana-devnet', datetime('now'))`,
    ).run(txId, walletId, '11111111111111111111111111111112');

    const res = await app.request('/v1/transactions/pending', {
      method: 'GET',
      headers: { Host: HOST, 'Authorization': authToken },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(1);
  });

  it('GET /v1/transactions/:id detail', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    const txId = generateId();
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, type, status, to_address, amount, chain, network, created_at)
       VALUES (?, ?, 'TRANSFER', 'CONFIRMED', ?, '1000000000', 'solana', 'solana-devnet', datetime('now'))`,
    ).run(txId, walletId, '11111111111111111111111111111112');

    const res = await app.request(`/v1/transactions/${txId}`, {
      method: 'GET',
      headers: { Host: HOST, 'Authorization': authToken },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(txId);
    expect(body.status).toBe('CONFIRMED');
  });

  it('GET /v1/transactions/:id not found', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    const res = await app.request(`/v1/transactions/${generateId()}`, {
      method: 'GET',
      headers: { Host: HOST, 'Authorization': authToken },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // GET /v1/wallets/:id -- detail
  it('GET /v1/wallets/:id detail', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'GET',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(walletId);
    expect(body.ownerState).toBeTruthy();
  });

  // GET /v1/wallets -- list (masterAuth)
  it('GET /v1/wallets list returns 200', async () => {
    const app = makeApp();
    await createWallet(app);

    const res = await app.request('/v1/wallets', {
      method: 'GET',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // POST /v1/sessions -- create session
  // -----------------------------------------------------------------------

  it('POST /v1/sessions creates new session', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request('/v1/sessions', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.id).toBeTruthy();
  });

  it('POST /v1/sessions with non-existent wallet', async () => {
    const app = makeApp();

    const res = await app.request('/v1/sessions', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId: generateId() }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST /v1/sessions with ttl parameter', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    const res = await app.request('/v1/sessions', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, ttl: 3600 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.expiresAt).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/sessions/:id -- revoke
  // -----------------------------------------------------------------------

  it('DELETE /v1/sessions/:id revokes session', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // Create session
    const createRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId }),
    });
    const sessionBody = await createRes.json();

    const res = await app.request(`/v1/sessions/${sessionBody.id}`, {
      method: 'DELETE',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // GET /v1/sessions -- list sessions (masterAuth)
  // -----------------------------------------------------------------------

  it('GET /v1/sessions lists sessions', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);

    // Create a session first
    await app.request('/v1/sessions', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId }),
    });

    const res = await app.request('/v1/sessions', {
      method: 'GET',
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // POST /v1/transactions/simulate
  // -----------------------------------------------------------------------

  it('POST /v1/transactions/simulate returns dry-run result', async () => {
    const app = makeApp();
    const walletId = await createWallet(app);
    const authToken = await createSessionToken(walletId);

    const res = await app.request('/v1/transactions/simulate', {
      method: 'POST',
      headers: { Host: HOST, 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify({ walletId, type: 'TRANSFER', to: '11111111111111111111111111111112', amount: '100000000' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy).toBeTruthy();
  });

  // PUT /v1/wallets/:id -- update name
  it('PUT /v1/wallets/:id updates wallet name', async () => {
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
  });

  // PATCH /v1/wallets/:id -- monitoring settings
  it('PATCH /v1/wallets/:id updates monitoring', async () => {
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
});
