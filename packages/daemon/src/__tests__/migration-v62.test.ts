/**
 * Tests for database migration v62: Add ripple chain type + XRPL networks to CHECK constraints.
 *
 * Verifies:
 * 1. chain='ripple' INSERT succeeds after migration (wallets, incoming_transactions, defi_positions, nft_metadata_cache)
 * 2. network='xrpl-mainnet' INSERT succeeds after migration (transactions, policies, defi_positions, nft_metadata_cache)
 * 3. Existing chain='solana'/'ethereum' data survives migration intact
 * 4. chain='invalid' still rejected after migration
 * 5. Idempotent (running migration twice doesn't error)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { migrations } from '../infrastructure/database/migrations/v62.js';
import type { Migration } from '../infrastructure/database/migrate.js';

function createTestDb(tmpDir: string): Database.Database {
  const dbPath = join(tmpDir, `test-v62-${Date.now()}.db`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Setup a pre-v62 schema (v61) with chain CHECK = ('solana', 'ethereum')
 * and network CHECK = 15 old networks (no xrpl-*).
 */
function setupPreV62Schema(db: Database.Database): void {
  // Old CHECK constraints (before ripple)
  const OLD_CHAIN_LIST = "'solana', 'ethereum'";
  const OLD_NETWORK_LIST = "'solana-mainnet', 'solana-devnet', 'solana-testnet', 'ethereum-mainnet', 'ethereum-sepolia', 'polygon-mainnet', 'polygon-amoy', 'arbitrum-mainnet', 'arbitrum-sepolia', 'optimism-mainnet', 'optimism-sepolia', 'base-mainnet', 'base-sepolia', 'hyperevm-mainnet', 'hyperevm-testnet'";

  db.exec(`
    CREATE TABLE wallets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      chain TEXT NOT NULL CHECK (chain IN (${OLD_CHAIN_LIST})),
      environment TEXT NOT NULL CHECK (environment IN ('testnet', 'mainnet')),
      public_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATING',
      owner_address TEXT,
      owner_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      suspended_at INTEGER,
      suspension_reason TEXT,
      monitor_incoming INTEGER NOT NULL DEFAULT 0,
      owner_approval_method TEXT,
      wallet_type TEXT,
      account_type TEXT NOT NULL DEFAULT 'eoa',
      signer_key TEXT,
      deployed INTEGER NOT NULL DEFAULT 1,
      entry_point TEXT,
      aa_provider TEXT,
      aa_provider_api_key_encrypted TEXT,
      aa_bundler_url TEXT,
      aa_paymaster_url TEXT,
      aa_paymaster_policy_id TEXT,
      factory_address TEXT
    )
  `);
  db.exec('CREATE UNIQUE INDEX idx_wallets_public_key ON wallets(public_key)');
  db.exec('CREATE INDEX idx_wallets_status ON wallets(status)');
  db.exec('CREATE INDEX idx_wallets_chain_environment ON wallets(chain, environment)');
  db.exec('CREATE INDEX idx_wallets_owner_address ON wallets(owner_address)');

  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      constraints TEXT,
      usage_stats TEXT,
      revoked_at INTEGER,
      renewal_count INTEGER NOT NULL DEFAULT 0,
      max_renewals INTEGER NOT NULL DEFAULT 0,
      last_renewed_at INTEGER,
      absolute_expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'api',
      token_issued_count INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.exec(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
      session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
      chain TEXT NOT NULL,
      tx_hash TEXT,
      type TEXT NOT NULL DEFAULT 'TRANSFER',
      amount TEXT,
      to_address TEXT,
      token_mint TEXT,
      contract_address TEXT,
      method_signature TEXT,
      spender_address TEXT,
      approved_amount TEXT,
      parent_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
      batch_index INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING',
      tier TEXT,
      queued_at INTEGER,
      executed_at INTEGER,
      created_at INTEGER NOT NULL,
      reserved_amount TEXT,
      amount_usd REAL,
      reserved_amount_usd REAL,
      error TEXT,
      metadata TEXT,
      network TEXT CHECK (network IS NULL OR network IN (${OLD_NETWORK_LIST})),
      bridge_status TEXT,
      bridge_metadata TEXT,
      action_kind TEXT NOT NULL DEFAULT 'contractCall',
      venue TEXT,
      operation TEXT,
      external_id TEXT
    )
  `);
  db.exec('CREATE INDEX idx_transactions_wallet_status ON transactions(wallet_id, status)');
  db.exec('CREATE UNIQUE INDEX idx_transactions_tx_hash ON transactions(tx_hash)');

  db.exec(`
    CREATE TABLE policies (
      id TEXT PRIMARY KEY,
      wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'SPENDING_LIMIT',
      rules TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      network TEXT CHECK (network IS NULL OR network IN (${OLD_NETWORK_LIST})),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE incoming_transactions (
      id TEXT PRIMARY KEY,
      tx_hash TEXT NOT NULL,
      wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      from_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      token_address TEXT,
      chain TEXT NOT NULL CHECK (chain IN (${OLD_CHAIN_LIST})),
      network TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DETECTED',
      block_number INTEGER,
      detected_at INTEGER NOT NULL,
      confirmed_at INTEGER,
      is_suspicious INTEGER NOT NULL DEFAULT 0,
      UNIQUE(tx_hash, wallet_id)
    )
  `);

  db.exec(`
    CREATE TABLE defi_positions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      provider TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN (${OLD_CHAIN_LIST})),
      environment TEXT NOT NULL DEFAULT 'mainnet',
      network TEXT CHECK(network IS NULL OR network IN (${OLD_NETWORK_LIST})),
      asset_id TEXT,
      amount TEXT NOT NULL,
      amount_usd REAL,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      last_synced_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE nft_metadata_cache (
      id TEXT PRIMARY KEY,
      contract_address TEXT NOT NULL,
      token_id TEXT NOT NULL,
      chain TEXT NOT NULL CHECK (chain IN (${OLD_CHAIN_LIST})),
      network TEXT NOT NULL CHECK (network IN (${OLD_NETWORK_LIST})),
      metadata_json TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // Schema version table
  db.exec(`
    CREATE TABLE schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT NOT NULL
    )
  `);
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(61, Math.floor(Date.now() / 1000), 'pre-v62 test setup');
}

function getV62Migration(): Migration {
  const v62 = migrations.find((m) => m.version === 62);
  if (!v62) throw new Error('v62 migration not found');
  return v62;
}

let tmpDir: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = join(tmpdir(), `migration-v62-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
  db = createTestDb(tmpDir);
  setupPreV62Schema(db);
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true });
});

describe('migration v62', () => {
  it('allows chain=ripple INSERT into wallets after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    // Before migration: chain='ripple' should fail
    expect(() => {
      db.prepare(
        'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('w-pre', 'pre-wallet', 'ripple', 'mainnet', 'rPubKey1', now, now);
    }).toThrow();

    // Run migration
    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    // After migration: chain='ripple' should succeed
    expect(() => {
      db.prepare(
        'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('w-ripple', 'XRP Wallet', 'ripple', 'mainnet', 'rPubKey2', now, now);
    }).not.toThrow();

    const wallet = db.prepare('SELECT chain FROM wallets WHERE id = ?').get('w-ripple') as { chain: string };
    expect(wallet.chain).toBe('ripple');
  });

  it('allows network=xrpl-mainnet INSERT into transactions after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    // Create wallet first
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    // Run migration
    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    // After migration: network='xrpl-mainnet' should succeed
    expect(() => {
      db.prepare(
        'INSERT INTO transactions (id, wallet_id, chain, type, status, network, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('tx-1', 'w-sol', 'ripple', 'TRANSFER', 'PENDING', 'xrpl-mainnet', now);
    }).not.toThrow();
  });

  it('allows network=xrpl-testnet INSERT into policies after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    expect(() => {
      db.prepare(
        'INSERT INTO policies (id, wallet_id, type, rules, network, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('p-1', 'w-sol', 'SPENDING_LIMIT', '{}', 'xrpl-testnet', now, now);
    }).not.toThrow();
  });

  it('preserves existing solana/ethereum wallet data', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-evm', 'EVM Wallet', 'ethereum', 'testnet', 'evmPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    const wallets = db.prepare('SELECT id, chain, environment FROM wallets ORDER BY id').all() as Array<{ id: string; chain: string; environment: string }>;
    expect(wallets).toHaveLength(2);
    expect(wallets[0]).toEqual({ id: 'w-evm', chain: 'ethereum', environment: 'testnet' });
    expect(wallets[1]).toEqual({ id: 'w-sol', chain: 'solana', environment: 'mainnet' });
  });

  it('still rejects chain=invalid after migration', () => {
    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    const now = Math.floor(Date.now() / 1000);
    expect(() => {
      db.prepare(
        'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('w-bad', 'Bad Wallet', 'invalid', 'mainnet', 'badPubKey', now, now);
    }).toThrow(/CHECK/);
  });

  it('still rejects invalid network after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    expect(() => {
      db.prepare(
        'INSERT INTO transactions (id, wallet_id, chain, type, status, network, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('tx-bad', 'w-sol', 'solana', 'TRANSFER', 'PENDING', 'invalid-network', now);
    }).toThrow(/CHECK/);
  });

  it('allows chain=ripple in incoming_transactions after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    expect(() => {
      db.prepare(
        'INSERT INTO incoming_transactions (id, tx_hash, wallet_id, from_address, amount, chain, network, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('itx-1', 'hash1', 'w-sol', 'rSender1', '1000000', 'ripple', 'xrpl-mainnet', now);
    }).not.toThrow();
  });

  it('allows chain=ripple + network=xrpl-devnet in defi_positions after migration', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    expect(() => {
      db.prepare(
        'INSERT INTO defi_positions (id, wallet_id, category, provider, chain, network, amount, status, opened_at, last_synced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('dp-1', 'w-sol', 'LENDING', 'test', 'ripple', 'xrpl-devnet', '100', 'ACTIVE', now, now, now, now);
    }).not.toThrow();
  });

  it('allows chain=ripple + network=xrpl-mainnet in nft_metadata_cache after migration', () => {
    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    const now = Math.floor(Date.now() / 1000);
    expect(() => {
      db.prepare(
        'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('nft-1', '0xabc', '1', 'ripple', 'xrpl-mainnet', '{}', now, now + 86400);
    }).not.toThrow();
  });

  it('is idempotent: running migration twice does not error', () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('w-sol', 'SOL Wallet', 'solana', 'mainnet', 'solPubKey', now, now);

    db.pragma('foreign_keys = OFF');
    const v62 = getV62Migration();
    v62.up(db);

    // Second run should not throw
    // Need to recreate pre-state for second run (tables are already v62)
    // The migration is table recreation, so running it again should work
    expect(() => {
      db.pragma('foreign_keys = OFF');
      v62.up(db);
    }).not.toThrow();

    // Verify data survived
    const wallet = db.prepare('SELECT chain FROM wallets WHERE id = ?').get('w-sol') as { chain: string };
    expect(wallet.chain).toBe('solana');
  });

  it('LATEST_SCHEMA_VERSION is 62', async () => {
    const { LATEST_SCHEMA_VERSION } = await import('../infrastructure/database/schema-ddl.js');
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });
});
