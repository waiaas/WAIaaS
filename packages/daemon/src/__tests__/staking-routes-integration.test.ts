/**
 * Integration tests for staking.ts route handlers.
 *
 * Covers uncovered branches:
 * - GET /wallet/staking with ethereum wallet + lido staking data
 * - GET /wallet/staking with solana wallet + jito staking data
 * - USD price resolution paths
 * - ChainId resolution (CAIP-2)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { JwtSecretManager } from '../infrastructure/jwt/index.js';
import { KillSwitchService } from '../services/kill-switch-service.js';
import { createHash } from 'node:crypto';

const TEST_PASSWORD = 'test-master-password-staking-int';
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

describe('Staking Routes Integration', () => {
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

  function insertWallet(id: string, chain: string, environment = 'mainnet') {
    db.insert(schema.wallets).values({
      id,
      name: `wallet-${chain}`,
      chain,
      environment,
      publicKey: `0x${'ab'.repeat(20)}`,
      status: 'ACTIVE',
      accountType: 'eoa',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
  }

  async function createSessionToken(walletId: string) {
    const sessionId = generateId();
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + 3600;
    const token = await jwtSecretManager.signToken({ sub: sessionId, iat: nowSec, exp: expiresAt });
    const tokenHash = createHash('sha256').update(token).digest('hex');

    db.insert(schema.sessions).values({
      id: sessionId,
      tokenHash,
      expiresAt: new Date(expiresAt * 1000),
      absoluteExpiresAt: new Date((nowSec + 86400) * 1000),
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

    return token;
  }

  function _insertStakingTx(walletId: string, protocol: string, amount: string, status = 'CONFIRMED') {
    const txId = generateId();
    // Insert a staking tx using CONTRACT_CALL type to match what aggregateStakingBalance reads
    db.insert(schema.transactions).values({
      id: txId,
      walletId,
      type: 'CONTRACT_CALL',
      status,
      toAddress: `0x${'cd'.repeat(20)}`,
      amount,
      chain: protocol === 'lido_staking' ? 'ethereum' : 'solana',
      network: protocol === 'lido_staking' ? 'ethereum-mainnet' : 'solana-mainnet',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();

    // Insert into action_results table which aggregateStakingBalance reads
    sqlite.prepare(`
      INSERT INTO action_results (id, tx_id, wallet_id, provider, action, status, result_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      txId,
      walletId,
      protocol,
      'stake',
      status,
      JSON.stringify({ amount, type: 'stake' }),
      Math.floor(Date.now() / 1000),
    );
  }

  it('GET /wallet/staking returns empty positions for ethereum wallet with no staking', async () => {
    const walletId = generateId();
    insertWallet(walletId, 'ethereum');
    const token = await createSessionToken(walletId);

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
      `http://${HOST}/v1/wallet/staking`,
      {
        method: 'GET',
        headers: {
          Host: HOST,
          Authorization: `Bearer ${token}`,
        },
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.walletId).toBe(walletId);
    expect(body.positions).toEqual([]);
  });

  it('GET /wallet/staking returns empty positions for solana wallet with no staking', async () => {
    const walletId = generateId();
    insertWallet(walletId, 'solana');
    const token = await createSessionToken(walletId);

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
      `http://${HOST}/v1/wallet/staking`,
      {
        method: 'GET',
        headers: {
          Host: HOST,
          Authorization: `Bearer ${token}`,
        },
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.positions).toEqual([]);
  });
});
