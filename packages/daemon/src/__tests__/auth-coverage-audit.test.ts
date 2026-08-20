/**
 * Auth middleware coverage audit: edge-case gap tests.
 *
 * Supplements existing tests in session-auth.test.ts (8 tests),
 * master-auth.test.ts (3 tests), and owner-auth.test.ts (6 tests).
 *
 * Coverage gaps addressed:
 * - sessionAuth: DB expires_at past (JWT still valid), repeated token use, unknown session ID
 * - masterAuth: empty string password, very long password
 * - ownerAuth: missing only signature header, empty message header
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createRequire } from 'node:module';
import type { Database as DatabaseType } from 'better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import { JwtSecretManager, type JwtPayload } from '../infrastructure/jwt/index.js';
import { createSessionAuth } from '../api/middleware/session-auth.js';
import { createMasterAuth } from '../api/middleware/master-auth.js';
import { createOwnerAuth } from '../api/middleware/owner-auth.js';
import { errorHandler } from '../api/middleware/error-handler.js';

type SodiumNative = typeof import('sodium-native');

const require = createRequire(import.meta.url);
const sodium = require('sodium-native') as SodiumNative;

// ---------------------------------------------------------------------------
// Base58 encode helper (same as owner-auth.test.ts)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(buf: Buffer): string {
  let zeroes = 0;
  for (let i = 0; i < buf.length && buf[i] === 0; i++) {
    zeroes++;
  }

  const size = Math.ceil((buf.length * 138) / 100) + 1;
  const b58 = new Uint8Array(size);
  let length = 0;

  for (let i = zeroes; i < buf.length; i++) {
    let carry = buf[i]!;
    let j = 0;
    for (let k = size - 1; k >= 0 && (carry !== 0 || j < length); k--, j++) {
      carry += 256 * (b58[k] ?? 0);
      b58[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }

  let str = '1'.repeat(zeroes);
  let leadingZeros = true;
  for (let i = 0; i < size; i++) {
    if (leadingZeros && b58[i] === 0) continue;
    leadingZeros = false;
    str += BASE58_ALPHABET[b58[i]!];
  }

  return str || '1';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function generateTestKeypair() {
  const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
  const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
  sodium.crypto_sign_keypair(publicKey, secretKey);
  return { publicKey, secretKey, address: encodeBase58(publicKey) };
}

function signMessage(message: string, secretKey: Buffer): string {
  const messageBytes = Buffer.from(message, 'utf8');
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
  sodium.crypto_sign_detached(signature, messageBytes, secretKey);
  return signature.toString('base64');
}

// ===========================================================================
// SESSION AUTH EDGE CASES
// ===========================================================================

describe('sessionAuth edge cases (coverage audit)', () => {
  let sqlite: DatabaseType;
  let db: ReturnType<typeof createDatabase>['db'];
  let manager: JwtSecretManager;
  let app: Hono;

  const TEST_WALLET_ID = generateId();
  const TEST_SESSION_ID = generateId();

  function createTestApp(jwtManager: JwtSecretManager, database: ReturnType<typeof createDatabase>['db']) {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.use(
      '/protected/*',
      createSessionAuth({ jwtSecretManager: jwtManager, db: database }),
    );
    testApp.get('/protected/data', (c) => {
      const sessionId = c.get('sessionId' as never) as string | undefined;
      const walletId = c.get('walletId' as never) as string | undefined;
      return c.json({ sessionId, walletId, ok: true });
    });
    return testApp;
  }

  function seedWallet() {
    const ts = nowSeconds();
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(TEST_WALLET_ID, 'Audit Wallet', 'solana', 'mainnet', `pk-audit-${Math.random()}`, 'ACTIVE', 0, ts, ts);
  }

  function seedSession(opts: { expiresAt?: number; revokedAt?: number | null } = {}) {
    const ts = nowSeconds();
    sqlite.prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      TEST_SESSION_ID,
      'test-token-hash-audit',
      opts.expiresAt ?? ts + 86400,
      ts + 86400 * 30,
      ts,
      opts.revokedAt ?? null,
    );
    sqlite.prepare(
      `INSERT INTO session_wallets (session_id, wallet_id, created_at)
       VALUES (?, ?, ?)`,
    ).run(TEST_SESSION_ID, TEST_WALLET_ID, ts);
  }

  async function signTestToken(overrides?: Partial<JwtPayload>) {
    const ts = nowSeconds();
    const payload: JwtPayload = {
      sub: TEST_SESSION_ID,

      iat: ts,
      exp: ts + 3600,
      ...overrides,
    };
    return manager.signToken(payload);
  }

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);
    manager = new JwtSecretManager(db);
    await manager.initialize();
    app = createTestApp(manager, db);
  });

  afterEach(() => {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
  });

  it('allows request when DB expires_at is in the past but JWT is still valid (JWT exp is authoritative)', async () => {
    seedWallet();
    // DB session expires_at in the past, but JWT token exp is in the future
    seedSession({ expiresAt: nowSeconds() - 3600 });
    const token = await signTestToken();

    const res = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // sessionAuth only checks JWT exp and revokedAt, NOT DB expires_at
    // DB expires_at is for session listing/admin purposes only
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
  });

  it('succeeds with the same valid token on multiple sequential requests (no one-time-use)', async () => {
    seedWallet();
    seedSession();
    const token = await signTestToken();

    // First request
    const res1 = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res1.status).toBe(200);

    // Second request with same token
    const res2 = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res2.status).toBe(200);

    // Third request with same token
    const res3 = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res3.status).toBe(200);
  });

  it('returns 404 SESSION_NOT_FOUND for valid JWT structure but unknown session ID', async () => {
    seedWallet();
    // Note: we do NOT seed a session row for this session ID
    const unknownSessionId = generateId();
    const token = await manager.signToken({
      sub: unknownSessionId,

      iat: nowSeconds(),
      exp: nowSeconds() + 3600,
    });

    const res = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.code).toBe('SESSION_NOT_FOUND');
  });
});

// ===========================================================================
// MASTER AUTH EDGE CASES
// ===========================================================================

describe('masterAuth edge cases (coverage audit)', () => {
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 2,
      parallelism: 1,
    });
  });

  function createTestApp(hash: string) {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.use('/protected/*', createMasterAuth({ masterPasswordHash: hash }));
    testApp.get('/protected/data', (c) => c.json({ ok: true }));
    return testApp;
  }

  it('rejects with 401 when X-Master-Password is empty string', async () => {
    const app = createTestApp(passwordHash);

    const res = await app.request('/protected/data', {
      headers: { 'X-Master-Password': '' },
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.code).toBe('INVALID_MASTER_PASSWORD');
  });

  it('rejects with 401 for very long password string (does not crash)', async () => {
    const app = createTestApp(passwordHash);
    const longPassword = 'a'.repeat(10_000);

    const res = await app.request('/protected/data', {
      headers: { 'X-Master-Password': longPassword },
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.code).toBe('INVALID_MASTER_PASSWORD');
  });
});

// ===========================================================================
// OWNER AUTH EDGE CASES
// ===========================================================================

describe('ownerAuth edge cases (coverage audit)', () => {
  let sqlite: DatabaseType;
  let db: ReturnType<typeof createDatabase>['db'];
  let app: Hono;
  let ownerKeypair: ReturnType<typeof generateTestKeypair>;

  const TEST_WALLET_ID = '00000001-0001-7001-8001-000000000002';

  function createTestApp(database: ReturnType<typeof createDatabase>['db']) {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.use('/protected/:id/action', createOwnerAuth({ db: database, action: 'approve' }));
    testApp.post('/protected/:id/action', (c) => {
      const ownerAddress = c.get('ownerAddress' as never) as string | undefined;
      return c.json({ ok: true, ownerAddress });
    });
    return testApp;
  }

  function seedWallet(ownerAddress: string) {
    const ts = nowSeconds();
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, owner_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      TEST_WALLET_ID, 'Owner Audit Wallet', 'solana', 'mainnet',
      'pk-owner-audit-test', 'ACTIVE', 0, ownerAddress, ts, ts,
    );
  }

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);
    ownerKeypair = generateTestKeypair();
    app = createTestApp(db);
  });

  afterEach(() => {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
  });

  it('rejects with 401 INVALID_SIGNATURE when only X-Owner-Signature is missing', async () => {
    seedWallet(ownerKeypair.address);

    const message = 'test-missing-sig';

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        // X-Owner-Signature intentionally omitted
        'X-Owner-Message': message,
        'X-Owner-Address': ownerKeypair.address,
      },
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects with 401 INVALID_SIGNATURE when X-Owner-Message is empty string', async () => {
    seedWallet(ownerKeypair.address);

    // Sign the empty message (the signature will be valid for empty string)
    const sig = signMessage('', ownerKeypair.secretKey);

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        'X-Owner-Signature': sig,
        'X-Owner-Message': '',
        'X-Owner-Address': ownerKeypair.address,
      },
    });

    // Empty message header will be treated as falsy by the middleware
    // (!message === true) -> rejects with INVALID_SIGNATURE
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.code).toBe('INVALID_SIGNATURE');
  });
});
