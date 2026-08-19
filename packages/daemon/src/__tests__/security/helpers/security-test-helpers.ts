/**
 * Security test helpers: shared utilities for SEC-01/SEC-02 attack scenario tests.
 *
 * Provides:
 * - createSecurityTestApp(): Hono app with errorHandler + sessionAuth + ownerAuth + kill-switch-guard
 * - seedSecurityTestData(): wallets, sessions, policies, key_value_store seeding
 * - signTestToken(): JWT token generation with wai_sess_ prefix
 * - createOwnerHeaders(): Ed25519-signed owner auth headers
 * - createInMemoryDb(): in-memory SQLite + pushSchema + key_value_store init
 *
 * @see docs/43-layer1-session-auth-attacks.md
 * @see docs/44-layer2-policy-bypass-attacks.md
 */

import { Hono } from 'hono';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema, generateId } from '../../../infrastructure/database/index.js';
import type { DatabaseConnection } from '../../../infrastructure/database/index.js';
import { JwtSecretManager, type JwtPayload } from '../../../infrastructure/jwt/index.js';
import { createSessionAuth } from '../../../api/middleware/session-auth.js';
import { createOwnerAuth } from '../../../api/middleware/owner-auth.js';
import { createKillSwitchGuard } from '../../../api/middleware/kill-switch-guard.js';
import { errorHandler } from '../../../api/middleware/error-handler.js';
import type * as schema from '../../../infrastructure/database/schema.js';
import { sessionWallets } from '../../../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { createRequire } from 'node:module';

type SodiumNative = typeof import('sodium-native');
const require = createRequire(import.meta.url);

function loadSodium(): SodiumNative {
  return require('sodium-native') as SodiumNative;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityTestContext {
  conn: DatabaseConnection;
  sqlite: DatabaseType;
  db: BetterSQLite3Database<typeof schema>;
  jwtManager: JwtSecretManager;
}

export interface SeedOptions {
  walletId?: string;
  sessionId?: string;
  walletName?: string;
  chain?: string;
  environment?: string;
  revokedAt?: number | null;
  expiresAt?: number;
  constraints?: string | null;
  usageStats?: string | null;
  ownerAddress?: string | null;
  ownerVerified?: boolean;
}

export interface OwnerKeyPair {
  publicKey: Buffer;
  secretKey: Buffer;
  address: string;
}

// ---------------------------------------------------------------------------
// createInMemoryDb
// ---------------------------------------------------------------------------

/**
 * Create an in-memory SQLite database with schema pushed and key_value_store initialized.
 */
export function createInMemoryDb(): DatabaseConnection {
  const conn = createDatabase(':memory:');
  pushSchema(conn.sqlite);
  return conn;
}

// ---------------------------------------------------------------------------
// createSecurityTestApp
// ---------------------------------------------------------------------------

/**
 * Create a Hono test app with security middleware chain:
 *   errorHandler -> killSwitchGuard -> sessionAuth (on /v1/*) -> ownerAuth (on /v1/owner/*)
 *
 * Includes:
 * - GET /health (public, no auth)
 * - GET /doc (public, no auth)
 * - GET /v1/nonce (public, no auth)
 * - GET /v1/wallet/balance (sessionAuth required)
 * - POST /v1/transactions (sessionAuth required)
 * - POST /v1/owner/:id/approve (sessionAuth + ownerAuth required)
 */
export function createSecurityTestApp(opts: {
  jwtManager: JwtSecretManager;
  db: BetterSQLite3Database<typeof schema>;
  getKillSwitchState?: () => string;
}) {
  const app = new Hono();
  app.onError(errorHandler);

  // Kill switch guard (before auth)
  app.use('*', createKillSwitchGuard(opts.getKillSwitchState));

  // Public routes (no auth)
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/doc', (c) => c.json({ openapi: '3.0.0' }));
  app.get('/v1/nonce', (c) => c.json({ nonce: 'test-nonce', expiresAt: Math.floor(Date.now() / 1000) + 300 }));

  // Session auth protected routes
  const sessionMiddleware = createSessionAuth({ jwtSecretManager: opts.jwtManager, db: opts.db });

  app.use('/v1/wallet/*', sessionMiddleware);
  app.use('/v1/transactions/*', sessionMiddleware);
  app.use('/v1/owner/:id/*', sessionMiddleware);

  // Owner auth protected routes (after sessionAuth)
  // Use :id param pattern so ownerAuth can extract walletId from route
  const ownerMiddleware = createOwnerAuth({ db: opts.db, action: 'approve' });
  app.use('/v1/owner/:id/*', ownerMiddleware);

  // Helper: resolve default wallet from session_wallets (earliest created_at)
  function resolveDefaultWallet(sessionId: string): string | undefined {
    const links = opts.db
      .select()
      .from(sessionWallets)
      .where(eq(sessionWallets.sessionId, sessionId))
      .all()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return links[0]?.walletId;
  }

  // Protected route handlers
  app.get('/v1/wallet/balance', (c) => {
    const sessionId = c.get('sessionId' as never) as string;
    const walletId = resolveDefaultWallet(sessionId);
    return c.json({ balance: '1000000000', sessionId, walletId });
  });

  app.post('/v1/transactions', (c) => {
    const sessionId = c.get('sessionId' as never) as string;
    const walletId = resolveDefaultWallet(sessionId);
    return c.json({ id: 'tx-test', walletId, status: 'PENDING' });
  });

  app.post('/v1/owner/:id/approve', (c) => {
    const ownerAddress = c.get('ownerAddress' as never) as string;
    return c.json({ approved: true, ownerAddress });
  });

  return app;
}

// ---------------------------------------------------------------------------
// seedSecurityTestData
// ---------------------------------------------------------------------------

/**
 * Seed test data for security tests.
 * Returns the walletId and sessionId used.
 */
export function seedSecurityTestData(
  sqlite: DatabaseType,
  opts: SeedOptions = {},
): { walletId: string; sessionId: string } {
  const walletId = opts.walletId ?? generateId();
  const sessionId = opts.sessionId ?? generateId();
  const ts = Math.floor(Date.now() / 1000);

  sqlite
    .prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, owner_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      walletId,
      opts.walletName ?? 'Security Test Wallet',
      opts.chain ?? 'solana',
      opts.environment ?? 'mainnet',
      `pk-sec-${walletId}`,
      'ACTIVE',
      opts.ownerVerified ? 1 : 0,
      opts.ownerAddress ?? null,
      ts,
      ts,
    );

  sqlite
    .prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, constraints, usage_stats, absolute_expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sessionId,
      `hash-${sessionId.slice(0, 8)}`,
      opts.expiresAt ?? ts + 86400,
      opts.constraints ?? null,
      opts.usageStats ?? null,
      ts + 86400 * 30,
      ts,
      opts.revokedAt ?? null,
    );
  sqlite
    .prepare(
      `INSERT INTO session_wallets (session_id, wallet_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(sessionId, walletId, ts);

  return { walletId, sessionId };
}

// ---------------------------------------------------------------------------
// signTestToken
// ---------------------------------------------------------------------------

/**
 * Sign a test JWT token with wai_sess_ prefix.
 */
export async function signTestToken(
  jwtManager: JwtSecretManager,
  sessionId: string,
  _walletId: string,
  overrides?: Partial<JwtPayload>,
): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: sessionId,
    iat: ts,
    exp: ts + 3600,
    ...overrides,
  };
  return jwtManager.signToken(payload);
}

// ---------------------------------------------------------------------------
// createOwnerKeyPair
// ---------------------------------------------------------------------------

/**
 * Generate an Ed25519 keypair for ownerAuth testing using sodium-native.
 */
export function createOwnerKeyPair(seed?: Buffer): OwnerKeyPair {
  const sodium = loadSodium();

  const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
  const secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);

  if (seed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sodium as any).crypto_sign_seed_keypair(publicKey, secretKey, seed);
  } else {
    sodium.crypto_sign_keypair(publicKey, secretKey);
  }

  // Encode public key as base58 for Solana address
  const address = encodeBase58(publicKey);
  return { publicKey, secretKey, address };
}

// ---------------------------------------------------------------------------
// createOwnerHeaders
// ---------------------------------------------------------------------------

/**
 * Create X-Owner-Signature, X-Owner-Message, X-Owner-Address headers for ownerAuth.
 */
export function createOwnerHeaders(
  keyPair: OwnerKeyPair,
  message: string,
): Record<string, string> {
  const sodium = loadSodium();

  const messageBytes = Buffer.from(message, 'utf8');
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
  sodium.crypto_sign_detached(signature, messageBytes, keyPair.secretKey);

  return {
    'X-Owner-Signature': signature.toString('base64'),
    'X-Owner-Message': message,
    'X-Owner-Address': keyPair.address,
  };
}

// ---------------------------------------------------------------------------
// insertPolicy helper
// ---------------------------------------------------------------------------

/**
 * Insert a policy row for security testing.
 */
export function insertPolicy(
  sqlite: DatabaseType,
  opts: {
    walletId?: string | null;
    type: string;
    rules: string;
    priority?: number;
    enabled?: boolean;
  },
): string {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  sqlite
    .prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      opts.walletId ?? null,
      opts.type,
      opts.rules,
      opts.priority ?? 0,
      opts.enabled !== false ? 1 : 0,
      now,
      now,
    );
  return id;
}

// ---------------------------------------------------------------------------
// insertTransaction helper
// ---------------------------------------------------------------------------

/**
 * Insert a transaction row for TOCTOU testing.
 */
export function insertTransaction(
  sqlite: DatabaseType,
  opts: {
    walletId: string;
    status?: string;
    amount?: string;
    reservedAmount?: string | null;
  },
): string {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  sqlite
    .prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, reserved_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      opts.walletId,
      'solana',
      'TRANSFER',
      opts.amount ?? '0',
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      opts.status ?? 'PENDING',
      opts.reservedAmount ?? null,
      now,
    );
  return id;
}

// ---------------------------------------------------------------------------
// Base58 encoding (for Solana addresses)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to Base58 string.
 */
export function encodeBase58(bytes: Buffer): string {
  let value = BigInt('0x' + bytes.toString('hex'));
  const result: string[] = [];

  while (value > 0n) {
    const remainder = Number(value % 58n);
    value = value / 58n;
    result.unshift(BASE58_ALPHABET[remainder]!);
  }

  // Leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      result.unshift('1');
    } else {
      break;
    }
  }

  return result.join('') || '1';
}
