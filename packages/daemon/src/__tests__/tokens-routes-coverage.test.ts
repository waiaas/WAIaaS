/**
 * Coverage tests for tokens.ts route handler branches.
 *
 * Targets uncovered branches:
 * - GET /tokens?network= with invalid network
 * - POST /tokens with duplicate token (UNIQUE constraint)
 * - POST /tokens with invalid network
 * - DELETE /tokens with invalid network
 * - GET /tokens/resolve with non-EVM network
 * - GET /tokens/resolve with missing RPC URL
 * - validateTokenRegistryNetwork helper
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import argon2 from 'argon2';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { createApp } from '../api/server.js';
import * as schema from '../infrastructure/database/schema.js';
import { KillSwitchService } from '../services/kill-switch-service.js';

const TEST_PASSWORD = 'test-master-password-tokens-cov';
const HOST = '127.0.0.1:3100';
let passwordHash: string;

function masterHeaders(): Record<string, string> {
  return { Host: HOST, 'X-Master-Password': TEST_PASSWORD };
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
    type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1,
  });
});

describe('Token Registry Routes Coverage', () => {
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

  function makeApp() {
    const killSwitchService = new KillSwitchService({ sqlite });
    killSwitchService.ensureInitialized();
    return createApp({
      db, sqlite,
      masterPasswordHash: passwordHash,
      config: fullConfig(),
      killSwitchService,
    });
  }

  // -----------------------------------------------------------------------
  // GET /v1/tokens?network=
  // -----------------------------------------------------------------------

  it('GET /v1/tokens with valid EVM network returns token list', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens?network=ethereum-mainnet', {
      headers: masterHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.network).toBe('ethereum-mainnet');
    expect(Array.isArray(body.tokens)).toBe(true);
  });

  it('GET /v1/tokens with invalid network returns 400', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens?network=invalid-network', {
      headers: masterHeaders(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');
  });

  // -----------------------------------------------------------------------
  // POST /v1/tokens
  // -----------------------------------------------------------------------

  it('POST /v1/tokens adds custom token', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'ethereum-mainnet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.symbol).toBe('TEST');
  });

  it('POST /v1/tokens with duplicate returns 400 (UNIQUE constraint)', async () => {
    const app = makeApp();

    // Add once
    await app.request('/v1/tokens', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'ethereum-mainnet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        symbol: 'DUP', name: 'Dup', decimals: 18,
      }),
    });

    // Add again -- should fail with UNIQUE constraint
    const res = await app.request('/v1/tokens', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'ethereum-mainnet',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        symbol: 'DUP', name: 'Dup', decimals: 18,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');
  });

  it('POST /v1/tokens with invalid network returns 400', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'invalid-net',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        symbol: 'T', name: 'T', decimals: 18,
      }),
    });
    expect(res.status).toBe(400);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/tokens
  // -----------------------------------------------------------------------

  it('DELETE /v1/tokens removes custom token', async () => {
    const app = makeApp();

    // Add first
    await app.request('/v1/tokens', {
      method: 'POST',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'ethereum-mainnet',
        address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        symbol: 'RM', name: 'Remove', decimals: 18,
      }),
    });

    const res = await app.request('/v1/tokens', {
      method: 'DELETE',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: 'ethereum-mainnet',
        address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toBe(true);
  });

  it('DELETE /v1/tokens with invalid network returns 400', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens', {
      method: 'DELETE',
      headers: { ...masterHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: 'bad-network', address: '0x1234' }),
    });
    expect(res.status).toBe(400);
  });

  // -----------------------------------------------------------------------
  // GET /v1/tokens/resolve
  // -----------------------------------------------------------------------

  it('GET /v1/tokens/resolve with non-EVM network returns 400', async () => {
    const app = makeApp();
    const res = await app.request('/v1/tokens/resolve?network=solana-mainnet&address=0x1234', {
      headers: masterHeaders(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');
  });

  it('GET /v1/tokens/resolve with no RPC URL returns 400', async () => {
    // Config has empty RPC URLs
    const app = makeApp();
    const res = await app.request('/v1/tokens/resolve?network=ethereum-mainnet&address=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', {
      headers: masterHeaders(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('ACTION_VALIDATION_FAILED');
  });
});
