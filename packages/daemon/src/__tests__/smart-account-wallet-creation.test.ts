/**
 * Smart account wallet creation integration tests.
 *
 * Tests POST /v1/wallets with accountType parameter, feature gate,
 * chain validation, bundler URL validation, and response format.
 *
 * Uses createApp() + app.request() integration pattern with in-memory SQLite.
 *
 * @see packages/daemon/src/api/routes/wallets.ts
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import { DaemonConfigSchema } from '../infrastructure/config/loader.js';
import { createApp } from '../api/server.js';
import type { LocalKeyStore } from '../infrastructure/keystore/keystore.js';
import type { SmartAccountService } from '../infrastructure/smart-account/index.js';
import type { SettingsService } from '../infrastructure/settings/settings-service.js';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type * as schema from '../infrastructure/database/schema.js';
import { RpcPool } from '@waiaas/core';
import { AdapterPool } from '../infrastructure/adapter-pool.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'test-master-password-smart-account';
const HOST = '127.0.0.1:3100';
let passwordHash: string;

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const MOCK_EOA_PUBLIC_KEY = '0xEOA1111111111111111111111111111111111111';
/** anvil account #0 private key -- a valid secp256k1 scalar for viem. */
const TEST_PRIVATE_KEY_HEX = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const MOCK_SMART_ACCOUNT_ADDRESS = '0xSMART2222222222222222222222222222222222';

function mockKeyStore(): LocalKeyStore {
  return {
    generateKeyPair: async () => ({
      publicKey: MOCK_EOA_PUBLIC_KEY,
      encryptedPrivateKey: new Uint8Array(64),
    }),
    // A zero-filled key is not a valid secp256k1 scalar; privateKeyToAccount would
    // throw before the smart account path is ever reached. Use anvil's test key.
    decryptPrivateKey: async () => Buffer.from(TEST_PRIVATE_KEY_HEX, 'hex'),
    releaseKey: () => {},
    hasKey: async () => true,
    deleteKey: async () => {},
    lockAll: () => {},
    sodiumAvailable: true,
  } as unknown as LocalKeyStore;
}

function mockSmartAccountService(): SmartAccountService {
  return {
    createSmartAccount: vi.fn().mockResolvedValue({
      address: MOCK_SMART_ACCOUNT_ADDRESS,
      signerKey: MOCK_EOA_PUBLIC_KEY,
      entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      factoryAddress: '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985',
      account: { address: MOCK_SMART_ACCOUNT_ADDRESS },
    }),
    getDefaultEntryPoint: () => '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
  } as unknown as SmartAccountService;
}

function mockSettingsService(overrides: Record<string, string> = {}): SettingsService {
  const settings: Record<string, string> = {
    'smart_account.enabled': 'false',
    'smart_account.bundler_url': '',
    'smart_account.entry_point': '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    ...overrides,
  };

  return {
    get: (key: string) => settings[key] ?? '',
    set: vi.fn(),
    getAll: () => Object.entries(settings).map(([key, value]) => ({ key, value, encrypted: false, category: 'smart_account', updatedAt: new Date() })),
    getByCategory: vi.fn().mockReturnValue([]),
    initialize: vi.fn(),
  } as unknown as SettingsService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function masterAuthHeaders(): Record<string, string> {
  return {
    Host: HOST,
    'X-Master-Password': TEST_PASSWORD,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Smart Account Wallet Creation', () => {
  let sqliteConn: DatabaseType;
  let app: OpenAPIHono;

  beforeAll(async () => {
    passwordHash = await argon2.hash(TEST_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 2,
      parallelism: 1,
    });
  });

  afterEach(() => {
    sqliteConn?.close();
  });

  function createTestApp(opts: {
    settingsOverrides?: Record<string, string>;
    smartAccountService?: SmartAccountService | null;
    adapterPool?: AdapterPool;
  } = {}) {
    const conn = createDatabase(':memory:');
    sqliteConn = conn.sqlite;
    const db: BetterSQLite3Database<typeof schema> = conn.db;
    pushSchema(sqliteConn);

    const config = DaemonConfigSchema.parse({});

    const ss = mockSettingsService(opts.settingsOverrides ?? {});
    const smartAccountSvc = opts.smartAccountService !== null
      ? (opts.smartAccountService ?? mockSmartAccountService())
      : undefined;

    app = createApp({
      db,
      sqlite: sqliteConn,
      keyStore: mockKeyStore(),
      masterPassword: TEST_PASSWORD,
      masterPasswordHash: passwordHash,
      config,
      settingsService: ss,
      smartAccountService: smartAccountSvc,
      adapterPool: opts.adapterPool,
    });

    return { app, sqlite: sqliteConn, db, ss, config };
  }

  // -----------------------------------------------------------------------
  // EOA wallet (backward compatibility)
  // -----------------------------------------------------------------------

  it('POST /wallets without accountType creates EOA wallet (default)', async () => {
    createTestApp();

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Test EOA', chain: 'ethereum', environment: 'testnet' }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.accountType).toBe('eoa');
    expect(body.deployed).toBe(true);
    expect(body.signerKey).toBeNull();
    expect(body.publicKey).toBe(MOCK_EOA_PUBLIC_KEY);
  });

  it('POST /wallets with accountType eoa creates standard EOA wallet', async () => {
    createTestApp();

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Test EOA', chain: 'ethereum', environment: 'testnet', accountType: 'eoa' }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.accountType).toBe('eoa');
    expect(body.deployed).toBe(true);
    expect(body.signerKey).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Feature gate
  // -----------------------------------------------------------------------

  it('POST /wallets with accountType smart when disabled returns 400', async () => {
    createTestApp({
      settingsOverrides: { 'smart_account.enabled': 'false' },
    });

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Smart', chain: 'ethereum', environment: 'testnet', accountType: 'smart', aaProvider: 'pimlico', aaProviderApiKey: 'test-key' }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect((body as any).error?.message || (body as any).message).toContain('not enabled');
  });

  // -----------------------------------------------------------------------
  // Chain validation
  // -----------------------------------------------------------------------

  it('POST /wallets with accountType smart on Solana returns 400', async () => {
    createTestApp({
      settingsOverrides: {
        'smart_account.enabled': 'true',
        'smart_account.bundler_url': 'https://bundler.example.com',
      },
    });

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Smart', chain: 'solana', environment: 'testnet', accountType: 'smart', aaProvider: 'pimlico', aaProviderApiKey: 'test-key' }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect((body as any).error?.message || (body as any).message).toContain('EVM');
  });

  // -----------------------------------------------------------------------
  // Bundler URL validation
  // -----------------------------------------------------------------------

  it('POST /wallets with accountType smart custom provider without bundler_url returns 400', async () => {
    createTestApp({
      settingsOverrides: {
        'smart_account.enabled': 'true',
      },
    });

    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Smart', chain: 'ethereum', environment: 'testnet', accountType: 'smart', aaProvider: 'custom' }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    // Zod superRefine error is wrapped in OpenAPI validation hook with details.issues
    const issues = (body as any).details?.issues ?? [];
    const issueMessages = issues.map((i: any) => i.message).join(' ');
    expect(issueMessages).toContain('bundler');
  });

  // -----------------------------------------------------------------------
  // DB migration v38 backward compatibility
  // -----------------------------------------------------------------------

  it('smart account creation saves factoryAddress in DB', () => {
    // Verify via direct DB insert/read that factoryAddress is persisted in the schema
    const conn = createDatabase(':memory:');
    const rawSqlite = conn.sqlite;
    pushSchema(rawSqlite);

    const ts = Math.floor(Date.now() / 1000);
    const walletId = generateId();
    rawSqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, account_type, signer_key, deployed, entry_point, factory_address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(walletId, 'Smart Wallet', 'ethereum', 'testnet', '0xSMART', 'ACTIVE', 0, 'smart', '0xEOA', 0, '0x0000000071727De22E5E9d8BAf0edAc6f37da032', '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985', ts, ts);

    const row = rawSqlite.prepare('SELECT factory_address FROM wallets WHERE id = ?').get(walletId) as any;
    expect(row).toBeDefined();
    expect(row.factory_address).toBe('0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985');

    rawSqlite.close();
  });

  it('DB migration v38 preserves existing EOA wallets with defaults', () => {
    // Create a fresh DB and push schema (includes v38 columns in DDL)
    const conn = createDatabase(':memory:');
    const rawSqlite = conn.sqlite;
    pushSchema(rawSqlite);

    // Insert a wallet WITHOUT specifying smart account fields (like pre-v38 code would)
    const ts = Math.floor(Date.now() / 1000);
    const walletId = generateId();
    rawSqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(walletId, 'Legacy Wallet', 'ethereum', 'mainnet', '0xLEGACY', 'ACTIVE', 0, ts, ts);

    // Verify defaults
    const row = rawSqlite.prepare('SELECT account_type, signer_key, deployed, entry_point FROM wallets WHERE id = ?').get(walletId) as any;
    expect(row.account_type).toBe('eoa');
    expect(row.signer_key).toBeNull();
    expect(row.deployed).toBe(1); // SQLite boolean: 1 = true
    expect(row.entry_point).toBeNull();

    rawSqlite.close();
  });

  // -----------------------------------------------------------------------
  // GET endpoints include smart account fields
  // -----------------------------------------------------------------------

  it('GET /wallets includes accountType, signerKey, deployed in response', async () => {
    createTestApp();

    // Create a wallet first
    await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Test List', chain: 'ethereum', environment: 'testnet' }),
    });

    // List wallets
    const res = await app.request('/v1/wallets', {
      method: 'GET',
      headers: { Host: HOST, 'X-Master-Password': TEST_PASSWORD },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    const items = (body as any).items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const w = items[0];
    expect(w.accountType).toBe('eoa');
    expect(w.signerKey).toBeNull();
    expect(w.deployed).toBe(true);
  });

  it('GET /wallets/:id includes accountType, signerKey, deployed in response', async () => {
    createTestApp();

    // Create a wallet
    const createRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthHeaders(),
      body: JSON.stringify({ name: 'Test Detail', chain: 'ethereum', environment: 'testnet' }),
    });
    const createBody = await json(createRes);
    const walletId = createBody.id as string;

    // Get detail
    const res = await app.request(`/v1/wallets/${walletId}`, {
      method: 'GET',
      headers: { Host: HOST, 'X-Master-Password': TEST_PASSWORD },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.accountType).toBe('eoa');
    expect(body.signerKey).toBeNull();
    expect(body.deployed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // RPC endpoint fallback (#502, #503)
  //
  // CREATE2 address prediction needs a live eth_call. Before this, the route
  // read a single URL from config, so one dead endpoint failed wallet creation
  // even when the RpcPool held healthy candidates.
  // -----------------------------------------------------------------------

  describe('RPC endpoint fallback', () => {
    const DEAD_URL = 'https://dead-1.invalid';
    const DEAD_URL_2 = 'https://dead-2.invalid';
    const GOOD_URL = 'https://good.example';
    const NETWORK = 'ethereum-sepolia';

    /** Records the RPC URL behind each createSmartAccount call, failing on `failUrls`. */
    function trackingSmartAccountService(failUrls: string[]): {
      service: SmartAccountService;
      usedUrls: string[];
    } {
      const usedUrls: string[] = [];
      const service = {
        createSmartAccount: vi.fn(async (args: { client: { transport: { url?: string } } }) => {
          const url = args.client.transport.url ?? '';
          usedUrls.push(url);
          if (failUrls.includes(url)) throw new Error(`HTTP request failed: ${url}`);
          return {
            address: MOCK_SMART_ACCOUNT_ADDRESS,
            signerKey: MOCK_EOA_PUBLIC_KEY,
            entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
            factoryAddress: '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985',
            account: { address: MOCK_SMART_ACCOUNT_ADDRESS },
          };
        }),
        getDefaultEntryPoint: () => '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
      } as unknown as SmartAccountService;
      return { service, usedUrls };
    }

    function pooledApp(urls: string[], failUrls: string[]) {
      const rpcPool = new RpcPool();
      rpcPool.register(NETWORK, urls);
      const { service, usedUrls } = trackingSmartAccountService(failUrls);
      const ctx = createTestApp({
        settingsOverrides: { 'smart_account.enabled': 'true' },
        smartAccountService: service,
        adapterPool: new AdapterPool(rpcPool),
      });
      return { rpcPool, usedUrls, ...ctx };
    }

    function createSmartWallet(name: string) {
      return app.request('/v1/wallets', {
        method: 'POST',
        headers: masterAuthHeaders(),
        body: JSON.stringify({ name, chain: 'ethereum', environment: 'testnet', accountType: 'smart' }),
      });
    }

    it('falls back to the next pool endpoint when the first one fails', async () => {
      const { rpcPool, usedUrls } = pooledApp([DEAD_URL, GOOD_URL], [DEAD_URL]);

      const res = await createSmartWallet('fallback-ok');

      expect(res.status).toBe(201);
      expect(usedUrls).toEqual([DEAD_URL, GOOD_URL]);

      const status = rpcPool.getStatus(NETWORK);
      expect(status.find((e) => e.url === DEAD_URL)?.failureCount).toBe(1);
      expect(status.find((e) => e.url === GOOD_URL)?.failureCount).toBe(0);
    });

    it('tries every candidate before giving up', async () => {
      const { rpcPool, usedUrls } = pooledApp([DEAD_URL, DEAD_URL_2], [DEAD_URL, DEAD_URL_2]);

      const res = await createSmartWallet('fallback-exhausted');

      expect(res.status).toBeGreaterThanOrEqual(500);
      expect(usedUrls).toEqual([DEAD_URL, DEAD_URL_2]);
      for (const entry of rpcPool.getStatus(NETWORK)) {
        expect(entry.failureCount).toBe(1);
      }
    });

    it('does not leave a wallet row behind when every endpoint fails', async () => {
      const { sqlite } = pooledApp([DEAD_URL, DEAD_URL_2], [DEAD_URL, DEAD_URL_2]);

      await createSmartWallet('fallback-no-orphan');

      const rows = sqlite.prepare('SELECT COUNT(*) AS n FROM wallets').get() as { n: number };
      expect(rows.n).toBe(0);
    });

    it('uses the config URL exactly once when no RpcPool is wired', async () => {
      const { service, usedUrls } = trackingSmartAccountService([]);
      const { config } = createTestApp({
        settingsOverrides: { 'smart_account.enabled': 'true' },
        smartAccountService: service,
      });

      const res = await createSmartWallet('legacy-no-pool');

      expect(res.status).toBe(201);
      expect(usedUrls).toEqual([config.rpc.evm_ethereum_sepolia]);
    });
  });
});
