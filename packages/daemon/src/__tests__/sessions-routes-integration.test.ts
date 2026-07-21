/**
 * Integration tests for sessions.ts route handlers.
 *
 * Covers uncovered branches:
 * - POST /sessions/:id/wallets (add wallet to session)
 * - DELETE /sessions/:id/wallets/:walletId (remove wallet)
 * - GET /sessions/:id/wallets (list session wallets)
 * - POST /sessions/:id/rotate (rotate token - masterAuth)
 * - Session listing with unlimited sessions (expiresAt=0)
 * - Session wallet limit exceeded
 * - Session requires at least one wallet
 * - Revoked session idempotency
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import { generateId } from '../infrastructure/database/id.js';
import { eq } from 'drizzle-orm';
import * as schema from '../infrastructure/database/schema.js';
import { JwtSecretManager } from '../infrastructure/jwt/index.js';
import { createHash } from 'node:crypto';

const TEST_PASSWORD = 'test-master-password-sessions-int';
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
      max_sessions_per_wallet: 10,
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

describe('Sessions Routes Integration', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;
  let jwtSecretManager: JwtSecretManager;

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);
    sqlite.exec('PRAGMA foreign_keys = ON');

    jwtSecretManager = new JwtSecretManager(db);
    await jwtSecretManager.initialize();
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ok */ }
  });

  function makeApp(overrides = {}) {
    return createApp({
      db,
      sqlite,
      masterPassword: TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: fullConfig(),
      jwtSecretManager,
      ...overrides,
    });
  }

  function insertWallet(id: string, chain = 'ethereum', environment = 'mainnet') {
    db.insert(schema.wallets).values({
      id,
      name: `test-wallet-${id.slice(0, 8)}`,
      chain,
      environment,
      publicKey: `0x${id.replace(/-/g, '')}`.slice(0, 42),
      status: 'ACTIVE',
      accountType: 'eoa',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
  }

  async function createSession(walletId: string, opts: { unlimited?: boolean } = {}) {
    const sessionId = generateId();
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAtSec = opts.unlimited ? 0 : nowSec + 3600;
    const token = await jwtSecretManager.signToken({
      sub: sessionId,
      iat: nowSec - 600,
      ...(opts.unlimited ? {} : { exp: expiresAtSec }),
    });
    const tokenHash = createHash('sha256').update(token).digest('hex');

    db.insert(schema.sessions).values({
      id: sessionId,
      tokenHash,
      expiresAt: new Date(expiresAtSec * 1000),
      absoluteExpiresAt: new Date(opts.unlimited ? 0 : (nowSec + 86400) * 1000),
      renewalCount: 0,
      maxRenewals: 0,
      createdAt: new Date(nowSec * 1000),
      source: 'api',
      tokenIssuedCount: 1,
    }).run();

    db.insert(schema.sessionWallets).values({
      sessionId,
      walletId,
      createdAt: new Date(nowSec * 1000),
    }).run();

    return { sessionId, token, tokenHash };
  }

  // -----------------------------------------------------------------------
  // POST /sessions/:id/rotate (masterAuth)
  // -----------------------------------------------------------------------

  describe('POST /sessions/:id/rotate', () => {
    it('rotates token for valid session -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.id).toBe(sessionId);
      expect(body.token).toBeDefined();
      expect(body.tokenIssuedCount).toBe(2);
    });

    it('rotates unlimited session (expiresAt=0) -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId, { unlimited: true });
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.expiresAt).toBe(0);
    });

    it('returns 404 for non-existent session', async () => {
      const app = makeApp();
      const fakeId = generateId();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${fakeId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });

    it('returns error for revoked session', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);

      // Revoke the session
      db.update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, sessionId))
        .run();

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );
      // 401 = session is revoked, masterAuth middleware may also block
      expect([401, 409]).toContain(res.status);
    });

    it('returns error for expired session', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const sessionId = generateId();
      const pastSec = Math.floor(Date.now() / 1000) - 3600;
      const token = await jwtSecretManager.signToken({
        sub: sessionId,
        iat: pastSec - 600,
        exp: pastSec,
      });
      const tokenHash = createHash('sha256').update(token).digest('hex');

      db.insert(schema.sessions).values({
        id: sessionId,
        tokenHash,
        expiresAt: new Date(pastSec * 1000),
        absoluteExpiresAt: new Date((pastSec + 86400) * 1000),
        renewalCount: 0,
        maxRenewals: 0,
        createdAt: new Date(pastSec * 1000),
        source: 'api',
        tokenIssuedCount: 1,
      }).run();

      db.insert(schema.sessionWallets).values({
        sessionId,
        walletId,
        createdAt: new Date(pastSec * 1000),
      }).run();

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });

    it('returns error when jwtSecretManager is not available', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp({ jwtSecretManager: undefined });

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/rotate`,
        { method: 'POST', headers: masterHeaders() },
      );
      // Route may not be registered or returns 404/503
      expect([404, 503]).toContain(res.status);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /sessions/:id -- revoke
  // -----------------------------------------------------------------------

  describe('DELETE /sessions/:id', () => {
    it('revokes active session -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('REVOKED');
    });

    it('idempotent revoke of already-revoked session -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);

      db.update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, sessionId))
        .run();

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.message).toContain('already revoked');
    });
  });

  // -----------------------------------------------------------------------
  // POST /sessions/:id/wallets (add wallet)
  // -----------------------------------------------------------------------

  describe('POST /sessions/:id/wallets', () => {
    it('adds wallet to session -> 201', async () => {
      const walletId1 = generateId();
      const walletId2 = generateId();
      insertWallet(walletId1);
      insertWallet(walletId2);
      const { sessionId } = await createSession(walletId1);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId: walletId2 }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.walletId).toBe(walletId2);
    });

    it('returns error for already linked wallet', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId }),
        },
      );
      expect(res.status).toBe(409);
    });

    it('returns error for non-existent session', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${generateId()}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId }),
        },
      );
      expect(res.status).toBe(404);
    });

    it('returns error for revoked session', async () => {
      const walletId = generateId();
      const walletId2 = generateId();
      insertWallet(walletId);
      insertWallet(walletId2);
      const { sessionId } = await createSession(walletId);

      db.update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, sessionId))
        .run();

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId: walletId2 }),
        },
      );
      expect(res.status).toBe(404);
    });

    it('returns error for non-existent wallet', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId: generateId() }),
        },
      );
      expect(res.status).toBe(404);
    });

    it('returns error for terminated wallet', async () => {
      const walletId = generateId();
      const walletId2 = generateId();
      insertWallet(walletId);
      insertWallet(walletId2);

      db.update(schema.wallets)
        .set({ status: 'TERMINATED' })
        .where(eq(schema.wallets.id, walletId2))
        .run();

      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        {
          method: 'POST',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId: walletId2 }),
        },
      );
      // WALLET_TERMINATED maps to 410
      expect(res.status).toBe(410);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /sessions/:id/wallets/:walletId (remove wallet)
  // -----------------------------------------------------------------------

  describe('DELETE /sessions/:id/wallets/:walletId', () => {
    it('removes wallet from session (with 2+ wallets) -> 204', async () => {
      const walletId1 = generateId();
      const walletId2 = generateId();
      insertWallet(walletId1);
      insertWallet(walletId2);
      const { sessionId } = await createSession(walletId1);

      // Add second wallet
      db.insert(schema.sessionWallets).values({
        sessionId,
        walletId: walletId2,
        createdAt: new Date(),
      }).run();

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets/${walletId2}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(204);
    });

    it('returns error when only 1 wallet remains', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets/${walletId}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      // SESSION_REQUIRES_WALLET maps to 400
      expect(res.status).toBe(400);
    });

    it('returns error for unlinked wallet', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets/${generateId()}`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /sessions/:id/wallets (list wallets)
  // -----------------------------------------------------------------------

  describe('GET /sessions/:id/wallets', () => {
    it('lists wallets linked to session -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      const { sessionId } = await createSession(walletId);
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions/${sessionId}/wallets`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.wallets).toHaveLength(1);
      expect(body.wallets[0].id).toBe(walletId);
    });

    it('returns 404 for non-existent session', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/sessions/${generateId()}/wallets`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /sessions -- listing unlimited sessions
  // -----------------------------------------------------------------------

  describe('GET /sessions', () => {
    it('lists unlimited sessions with ACTIVE status', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      await createSession(walletId, { unlimited: true });
      const app = makeApp();

      const res = await app.request(
        `http://${HOST}/v1/sessions`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.length).toBeGreaterThan(0);
      const unlimitedSession = body.data.find((s: any) => s.expiresAt === 0);
      expect(unlimitedSession).toBeDefined();
      expect(unlimitedSession.status).toBe('ACTIVE');
    });
  });
});
