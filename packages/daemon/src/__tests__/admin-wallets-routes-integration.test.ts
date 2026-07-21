/**
 * Integration tests for admin-wallets.ts route handlers.
 *
 * Covers uncovered branches:
 * - GET /admin/wallets/:id/transactions
 * - GET /admin/wallets/:id/balance (no adapter pool, error cases)
 * - GET /admin/wallets/:id/staking
 * - GET /admin/telegram-users
 * - PUT /admin/telegram-users/:chatId
 * - DELETE /admin/telegram-users/:chatId
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { KillSwitchService } from '../services/kill-switch-service.js';

const TEST_PASSWORD = 'test-master-password-admin-wallets-int';
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

describe('Admin Wallet Routes Integration', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);
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
      ...overrides,
    });
  }

  function insertWallet(id: string, chain = 'ethereum', environment = 'mainnet') {
    db.insert(schema.wallets).values({
      id,
      name: `wallet-${id.slice(0, 8)}`,
      chain,
      environment,
      publicKey: `0x${id.replace(/-/g, '')}`.slice(0, 42),
      status: 'ACTIVE',
      accountType: 'eoa',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
  }

  function insertTransaction(walletId: string, opts: Partial<Record<string, any>> = {}) {
    const txId = generateId();
    db.insert(schema.transactions).values({
      id: txId,
      walletId,
      type: opts.type ?? 'TRANSFER',
      status: opts.status ?? 'CONFIRMED',
      toAddress: opts.toAddress ?? '0x1234567890abcdef1234567890abcdef12345678',
      amount: opts.amount ?? '1000000000000000000',
      chain: opts.chain ?? 'ethereum',
      network: opts.network ?? 'ethereum-mainnet',
      txHash: opts.txHash ?? `0x${txId.replace(/-/g, '')}${'ab'.repeat(16)}`.slice(0, 66),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
    return txId;
  }

  // -----------------------------------------------------------------------
  // GET /admin/wallets/:id/transactions
  // -----------------------------------------------------------------------

  describe('GET /admin/wallets/:id/transactions', () => {
    it('returns transactions for wallet -> 200', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      insertTransaction(walletId);
      insertTransaction(walletId, { status: 'FAILED' });

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/transactions`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('returns 404 for non-existent wallet', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${generateId()}/transactions`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });

    it('supports pagination', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      for (let i = 0; i < 5; i++) {
        insertTransaction(walletId);
      }

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/transactions?limit=2&offset=0`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(5);
    });

    it('returns formattedAmount and contract fields', async () => {
      const walletId = generateId();
      insertWallet(walletId);
      insertTransaction(walletId, { type: 'CONTRACT_CALL' });

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/transactions`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items[0]).toHaveProperty('formattedAmount');
      expect(body.items[0]).toHaveProperty('contractName');
      expect(body.items[0]).toHaveProperty('contractNameSource');
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/wallets/:id/balance
  // -----------------------------------------------------------------------

  describe('GET /admin/wallets/:id/balance', () => {
    it('returns empty balances when no adapter pool', async () => {
      const walletId = generateId();
      insertWallet(walletId);

      const app = makeApp({ adapterPool: null });
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/balance`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.balances).toEqual([]);
    });

    it('returns 404 for non-existent wallet', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${generateId()}/balance`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/wallets/:id/staking
  // -----------------------------------------------------------------------

  describe('GET /admin/wallets/:id/staking', () => {
    it('returns empty positions for ethereum wallet without staking data', async () => {
      const walletId = generateId();
      insertWallet(walletId, 'ethereum', 'mainnet');

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/staking`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.walletId).toBe(walletId);
      expect(body.positions).toEqual([]);
    });

    it('returns empty positions for solana wallet without staking data', async () => {
      const walletId = generateId();
      insertWallet(walletId, 'solana', 'mainnet');

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${walletId}/staking`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.positions).toEqual([]);
    });

    it('returns 404 for non-existent wallet', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/wallets/${generateId()}/staking`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /admin/telegram-users
  // -----------------------------------------------------------------------

  describe('GET /admin/telegram-users', () => {
    it('returns empty list when no users', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.users).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('returns telegram users when present', async () => {
      // Insert a telegram user directly
      sqlite.prepare(
        `INSERT INTO telegram_users (chat_id, username, role, registered_at) VALUES (?, ?, ?, ?)`,
      ).run(12345, 'testuser', 'ADMIN', Math.floor(Date.now() / 1000));

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users`,
        { method: 'GET', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.users).toHaveLength(1);
      expect(body.users[0].chat_id).toBe(12345);
      expect(body.users[0].username).toBe('testuser');
      expect(body.total).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // PUT /admin/telegram-users/:chatId
  // -----------------------------------------------------------------------

  describe('PUT /admin/telegram-users/:chatId', () => {
    it('updates user role -> 200', async () => {
      sqlite.prepare(
        `INSERT INTO telegram_users (chat_id, username, role, registered_at) VALUES (?, ?, ?, ?)`,
      ).run(12345, 'testuser', 'PENDING', Math.floor(Date.now() / 1000));

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users/12345`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ADMIN' }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.role).toBe('ADMIN');
    });

    it('returns 404 for non-existent user', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users/99999`,
        {
          method: 'PUT',
          headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ADMIN' }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /admin/telegram-users/:chatId
  // -----------------------------------------------------------------------

  describe('DELETE /admin/telegram-users/:chatId', () => {
    it('deletes user -> 200', async () => {
      sqlite.prepare(
        `INSERT INTO telegram_users (chat_id, username, role, registered_at) VALUES (?, ?, ?, ?)`,
      ).run(12345, 'testuser', 'ADMIN', Math.floor(Date.now() / 1000));

      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users/12345`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
    });

    it('returns 404 for non-existent user', async () => {
      const app = makeApp();
      const res = await app.request(
        `http://${HOST}/v1/admin/telegram-users/99999`,
        { method: 'DELETE', headers: masterHeaders() },
      );
      expect(res.status).toBe(404);
    });
  });
});
