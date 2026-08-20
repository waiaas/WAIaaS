/**
 * ownerAuth middleware SIWE tests: EIP-4361 + EIP-191 signature verification for EVM owners.
 *
 * Tests cover:
 * 1. passes through when valid SIWE signature matches EVM owner address
 * 2. rejects with 401 when SIWE signature is from different account
 * 3. rejects with 401 when SIWE message is expired
 * 4. rejects with 401 when headers missing (same as Solana test)
 * 5. rejects with 404 when EVM wallet has no owner
 *
 * setOwner address validation integration tests:
 * 6. setOwner accepts EVM wallet with valid EIP-55 address
 * 7. setOwner rejects EVM wallet with all-lowercase address
 * 8. setOwner accepts Solana wallet with valid base58 32-byte address
 * 9. setOwner rejects Solana wallet with 0x ethereum address
 *
 * Uses Hono app.request() testing pattern + in-memory SQLite + viem real crypto.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import argon2 from 'argon2';
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';
import type { Database as DatabaseType } from 'better-sqlite3';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import { createOwnerAuth } from '../api/middleware/owner-auth.js';
import { createApp } from '../api/server.js';
import { DaemonConfigSchema } from '../infrastructure/config/loader.js';
import { errorHandler } from '../api/middleware/error-handler.js';
import type { LocalKeyStore } from '../infrastructure/keystore/keystore.js';

// Hardhat account #0 -- well-known test private key
const testAccount = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
);

// Hardhat account #1 -- different signer
const otherAccount = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
);

// ---------------------------------------------------------------------------
// Constants for setOwner integration tests
// ---------------------------------------------------------------------------

const SET_OWNER_TEST_PASSWORD = 'test-master-password-siwe-setowner';
const HOST = '127.0.0.1:3100';
let passwordHash: string;

const MOCK_PUBLIC_KEY = '11111111111111111111111111111112';

function mockKeyStore(): LocalKeyStore {
  return {
    generateKeyPair: async () => ({
      publicKey: MOCK_PUBLIC_KEY,
      encryptedPrivateKey: new Uint8Array(64),
    }),
    decryptPrivateKey: async () => new Uint8Array(64),
    releaseKey: () => {},
    hasKey: async () => true,
    deleteKey: async () => {},
    lockAll: () => {},
    sodiumAvailable: true,
  } as unknown as LocalKeyStore;
}

function masterAuthJsonHeaders(): Record<string, string> {
  return {
    Host: HOST,
    'X-Master-Password': SET_OWNER_TEST_PASSWORD,
    'Content-Type': 'application/json',
  };
}

beforeAll(async () => {
  passwordHash = await argon2.hash(SET_OWNER_TEST_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
});

// ---------------------------------------------------------------------------
// Test setup (ownerAuth middleware tests)
// ---------------------------------------------------------------------------

let sqlite: DatabaseType;
let db: ReturnType<typeof createDatabase>['db'];
let app: Hono;

const TEST_WALLET_ID = '00000002-0002-7002-8002-000000000002';

/** Type-safe JSON body extraction from Response. */
async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Create a test app with ownerAuth middleware on /protected/:id/action */
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

/** Seed a test wallet with optional owner address, chain, and network */
function seedWallet(opts?: { ownerAddress?: string | null; chain?: string; network?: string }) {
  const ts = nowSeconds();
  const network = opts?.network ?? 'mainnet';
  const environment = ['mainnet', 'ethereum-mainnet', 'polygon-mainnet', 'arbitrum-mainnet', 'optimism-mainnet', 'base-mainnet'].includes(network) ? 'mainnet' : 'testnet';
  sqlite.prepare(
    `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, owner_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    TEST_WALLET_ID,
    'SIWE Test Wallet',
    opts?.chain ?? 'ethereum',
    environment,
    'pk-siwe-test',
    'ACTIVE',
    0,
    opts?.ownerAddress ?? null,
    ts,
    ts,
  );
}

/**
 * Helper: create a valid SIWE message for the given account with optional overrides.
 */
function buildSiweMessage(
  address: `0x${string}`,
  opts?: { expirationTime?: Date; boundId?: string },
): string {
  return createSiweMessage({
    address,
    chainId: 1,
    domain: 'localhost',
    nonce: 'testnonce123',
    uri: 'http://localhost:3000',
    version: '1',
    // ownerAuth requires the signed text to name the id being authorised, so a
    // SIWE message carries it in the statement.
    statement: `approve:${opts?.boundId ?? TEST_WALLET_ID}`,
    expirationTime: opts?.expirationTime ?? new Date(Date.now() + 300_000),
  });
}

/**
 * Base64-encode a SIWE message for transport via HTTP header.
 * SIWE messages are multi-line (EIP-4361) and raw newlines are invalid in HTTP headers.
 * The middleware decodes base64 for ethereum chain before passing to verifySIWE.
 */
function encodeMessageHeader(message: string): string {
  return Buffer.from(message, 'utf8').toString('base64');
}

beforeEach(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  db = conn.db;
  pushSchema(sqlite);

  app = createTestApp(db);
});

afterEach(() => {
  try {
    sqlite.close();
  } catch {
    // already closed
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ownerAuth middleware (SIWE / EVM)', () => {
  it('passes through when valid SIWE signature matches EVM owner address', async () => {
    seedWallet({ ownerAddress: testAccount.address });

    const siweMessage = buildSiweMessage(testAccount.address);
    const signature = await testAccount.signMessage({ message: siweMessage });

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        'X-Owner-Signature': signature,
        'X-Owner-Message': encodeMessageHeader(siweMessage),
        'X-Owner-Address': testAccount.address,
      },
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.ownerAddress).toBe(testAccount.address);
  });

  it('rejects with 401 when SIWE signature is from different account', async () => {
    seedWallet({ ownerAddress: testAccount.address });

    const siweMessage = buildSiweMessage(testAccount.address);
    // Sign with a DIFFERENT account
    const signature = await otherAccount.signMessage({ message: siweMessage });

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        'X-Owner-Signature': signature,
        'X-Owner-Message': encodeMessageHeader(siweMessage),
        'X-Owner-Address': testAccount.address,
      },
    });
    expect(res.status).toBe(401);

    const body = await json(res);
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects with 401 when SIWE message is expired', async () => {
    seedWallet({ ownerAddress: testAccount.address });

    const siweMessage = buildSiweMessage(testAccount.address, {
      expirationTime: new Date(Date.now() - 60_000), // 1 minute in the past
    });
    const signature = await testAccount.signMessage({ message: siweMessage });

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        'X-Owner-Signature': signature,
        'X-Owner-Message': encodeMessageHeader(siweMessage),
        'X-Owner-Address': testAccount.address,
      },
    });
    expect(res.status).toBe(401);

    const body = await json(res);
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects with 401 when headers missing', async () => {
    seedWallet({ ownerAddress: testAccount.address });

    // No headers at all
    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
    });
    expect(res.status).toBe(401);

    const body = await json(res);
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects with 404 when EVM wallet has no owner', async () => {
    seedWallet({ ownerAddress: null });

    const siweMessage = buildSiweMessage(testAccount.address);
    const signature = await testAccount.signMessage({ message: siweMessage });

    const res = await app.request(`/protected/${TEST_WALLET_ID}/action`, {
      method: 'POST',
      headers: {
        'X-Owner-Signature': signature,
        'X-Owner-Message': encodeMessageHeader(siweMessage),
        'X-Owner-Address': testAccount.address,
      },
    });
    expect(res.status).toBe(404);

    const body = await json(res);
    expect(body.code).toBe('OWNER_NOT_CONNECTED');
  });
});

// ---------------------------------------------------------------------------
// setOwner chain-aware address validation integration tests (SIWE-03)
// ---------------------------------------------------------------------------

describe('setOwner address validation (SIWE-03)', () => {
  /** Seed a wallet for setOwner tests (no owner set -- NONE state) */
  function seedSetOwnerAgent(
    sqliteDb: DatabaseType,
    walletId: string,
    chain: string,
    network: string,
  ): void {
    const ts = Math.floor(Date.now() / 1000);
    const environment = ['mainnet', 'ethereum-mainnet', 'polygon-mainnet', 'arbitrum-mainnet', 'optimism-mainnet', 'base-mainnet'].includes(network) ? 'mainnet' : 'testnet';
    sqliteDb
      .prepare(
        `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(walletId, `SetOwner Test ${chain}`, chain, environment, `pk-setowner-${walletId}`, 'ACTIVE', 0, ts, ts);
  }

  it('setOwner accepts EVM wallet with valid EIP-55 address', async () => {
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);
    const walletId = generateId();
    seedSetOwnerAgent(conn.sqlite, walletId, 'ethereum', 'mainnet');

    const fullApp = createApp({
      db: conn.db,
      sqlite: conn.sqlite,
      keyStore: mockKeyStore(),
      masterPassword: SET_OWNER_TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: DaemonConfigSchema.parse({}),
    });

    const res = await fullApp.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ owner_address: testAccount.address }),
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ownerAddress).toBe(testAccount.address);

    conn.sqlite.close();
  });

  it('setOwner rejects EVM wallet with all-lowercase address', async () => {
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);
    const walletId = generateId();
    seedSetOwnerAgent(conn.sqlite, walletId, 'ethereum', 'mainnet');

    const fullApp = createApp({
      db: conn.db,
      sqlite: conn.sqlite,
      keyStore: mockKeyStore(),
      masterPassword: SET_OWNER_TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: DaemonConfigSchema.parse({}),
    });

    const lowercaseAddress = testAccount.address.toLowerCase();
    const res = await fullApp.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ owner_address: lowercaseAddress }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');

    conn.sqlite.close();
  });

  it('setOwner accepts Solana wallet with valid base58 32-byte address', async () => {
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);
    const walletId = generateId();
    seedSetOwnerAgent(conn.sqlite, walletId, 'solana', 'mainnet');

    const fullApp = createApp({
      db: conn.db,
      sqlite: conn.sqlite,
      keyStore: mockKeyStore(),
      masterPassword: SET_OWNER_TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: DaemonConfigSchema.parse({}),
    });

    // Well-known Solana System Program address (32 bytes)
    const solanaAddress = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
    const res = await fullApp.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ owner_address: solanaAddress }),
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ownerAddress).toBe(solanaAddress);

    conn.sqlite.close();
  });

  it('setOwner rejects Solana wallet with 0x ethereum address', async () => {
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);
    const walletId = generateId();
    seedSetOwnerAgent(conn.sqlite, walletId, 'solana', 'mainnet');

    const fullApp = createApp({
      db: conn.db,
      sqlite: conn.sqlite,
      keyStore: mockKeyStore(),
      masterPassword: SET_OWNER_TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config: DaemonConfigSchema.parse({}),
    });

    const res = await fullApp.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ owner_address: testAccount.address }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');

    conn.sqlite.close();
  });
});
