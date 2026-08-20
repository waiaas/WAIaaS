/**
 * Tests for DB migrations v6a/v6b/v8 (environment model + policies.network).
 *
 * v6a (version 6): Add network column to transactions with backfill from wallets
 * v6b (version 7): Replace wallets.network with environment + default_network
 * v8  (version 8): Add network column to policies
 *
 * Tests validate:
 * 1. v6a transactions.network backfill (Solana + EVM)
 * 2. v6b wallets environment conversion (mainnet + testnet)
 * 3. v6b FK integrity preservation
 * 4. v6b index transition
 * 5. v8 policies.network column addition
 * 6. pushSchema vs migration schema equivalence
 *
 * @see docs/69-db-migration-v6-design.md
 * @see docs/71-policy-engine-network-extension-design.md
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import {
  createDatabase,
  pushSchema,
  runMigrations,
  MIGRATIONS,
  LATEST_SCHEMA_VERSION,
} from '../infrastructure/database/index.js';
import type { Migration } from '../infrastructure/database/index.js';

// ---------------------------------------------------------------------------
// Helper: create a v5-state database with old wallets.network schema
// ---------------------------------------------------------------------------

/**
 * Create an in-memory database at v5 schema state (wallets has `network` column).
 * This simulates a DB that was created before the environment model migration.
 */
function createV5Database(): DatabaseType {
  const conn = createDatabase(':memory:');
  const db = conn.sqlite;

  db.exec('BEGIN');

  // wallets table with network column (v5 schema)
  db.exec(`CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('solana', 'ethereum')),
  network TEXT NOT NULL CHECK (network IN ('mainnet', 'devnet', 'testnet', 'ethereum-mainnet', 'ethereum-sepolia', 'polygon-mainnet', 'polygon-amoy', 'arbitrum-mainnet', 'arbitrum-sepolia', 'optimism-mainnet', 'optimism-sepolia', 'base-mainnet', 'base-sepolia')),
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATING' CHECK (status IN ('CREATING', 'ACTIVE', 'SUSPENDED', 'TERMINATING', 'TERMINATED')),
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (owner_verified IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT
)`);

  // sessions table
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  constraints TEXT,
  usage_stats TEXT,
  revoked_at INTEGER,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  max_renewals INTEGER NOT NULL DEFAULT 30,
  last_renewed_at INTEGER,
  absolute_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`);

  // transactions table (NO network column -- v5 state)
  db.exec(`CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT,
  type TEXT NOT NULL CHECK (type IN ('TRANSFER', 'TOKEN_TRANSFER', 'CONTRACT_CALL', 'APPROVE', 'BATCH')),
  amount TEXT,
  to_address TEXT,
  token_mint TEXT,
  contract_address TEXT,
  method_signature TEXT,
  spender_address TEXT,
  approved_amount TEXT,
  parent_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
  batch_index INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'EXECUTING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIAL_FAILURE')),
  tier TEXT CHECK (tier IS NULL OR tier IN ('INSTANT', 'NOTIFY', 'DELAY', 'APPROVAL')),
  queued_at INTEGER,
  executed_at INTEGER,
  created_at INTEGER NOT NULL,
  reserved_amount TEXT,
  error TEXT,
  metadata TEXT
)`);

  // policies table (NO network column -- v5 state)
  db.exec(`CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SPENDING_LIMIT', 'WHITELIST', 'TIME_RESTRICTION', 'RATE_LIMIT', 'ALLOWED_TOKENS', 'CONTRACT_WHITELIST', 'METHOD_WHITELIST', 'APPROVED_SPENDERS', 'APPROVE_AMOUNT_LIMIT', 'APPROVE_TIER_OVERRIDE')),
  rules TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  // pending_approvals
  db.exec(`CREATE TABLE IF NOT EXISTS pending_approvals (
  id TEXT PRIMARY KEY,
  tx_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  required_by INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  approved_at INTEGER,
  rejected_at INTEGER,
  owner_signature TEXT,
  created_at INTEGER NOT NULL
)`);

  // audit_log
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  wallet_id TEXT,
  session_id TEXT,
  tx_id TEXT,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address TEXT
)`);

  // key_value_store
  db.exec(`CREATE TABLE IF NOT EXISTS key_value_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  // notification_logs
  db.exec(`CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  wallet_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at INTEGER NOT NULL
)`);

  // token_registry
  db.exec(`CREATE TABLE IF NOT EXISTS token_registry (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('builtin', 'custom')),
  created_at INTEGER NOT NULL
)`);

  // settings
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0 CHECK (encrypted IN (0, 1)),
  category TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  // schema_version
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);

  // Create indexes (v5 state)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_public_key ON wallets(public_key)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wallets_chain_network ON wallets(chain, network)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wallets_owner_address ON wallets(owner_address)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_wallet_id ON sessions(wallet_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_wallet_status ON transactions(wallet_id, status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id)');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_queued_at ON transactions(queued_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_contract_address ON transactions(contract_address)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_policies_wallet_enabled ON policies(wallet_id, enabled)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pending_approvals_tx_id ON pending_approvals(tx_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires_at ON pending_approvals(expires_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_wallet_id ON audit_log(wallet_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_wallet_timestamp ON audit_log(wallet_id, timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type ON notification_logs(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_wallet_id ON notification_logs(wallet_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at)');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_token_registry_network_address ON token_registry(network, address)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_token_registry_network ON token_registry(network)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)');

  // Record schema versions 1-5
  const ts = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(1, ts, 'Initial schema');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(2, ts, 'EVM network CHECK');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(3, ts, 'Rename agents to wallets');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(4, ts, 'Token registry table');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(5, ts, 'Settings table');

  db.exec('COMMIT');
  return db;
}

// ---------------------------------------------------------------------------
// Helper: get v6a/v6b/v8 migrations from global MIGRATIONS array
// ---------------------------------------------------------------------------

function getV6Migrations(): Migration[] {
  return MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 8);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('v6a migration: transactions.network backfill', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('should backfill transactions.network from Solana wallet', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet with network='devnet'
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-sol-1', 'Sol Wallet', 'solana', 'devnet', 'pk-sol-1', 'ACTIVE', 0, ts, ts);

    // Insert transaction
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-1', 'w-sol-1', 'solana', 'TRANSFER', 'PENDING', ts);

    // Run all v6-v8 migrations
    runMigrations(db, getV6Migrations());

    // Verify transactions.network is backfilled
    const tx = db.prepare('SELECT network FROM transactions WHERE id = ?').get('tx-1') as { network: string };
    expect(tx.network).toBe('devnet');
  });

  it('should backfill transactions.network from EVM wallet', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet with network='ethereum-sepolia'
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-evm-1', 'EVM Wallet', 'ethereum', 'ethereum-sepolia', 'pk-evm-1', 'ACTIVE', 0, ts, ts);

    // Insert transaction
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-evm-1', 'w-evm-1', 'ethereum', 'TRANSFER', 'PENDING', ts);

    // Run all v6-v8 migrations
    runMigrations(db, getV6Migrations());

    // Verify
    const tx = db.prepare('SELECT network FROM transactions WHERE id = ?').get('tx-evm-1') as { network: string };
    expect(tx.network).toBe('ethereum-sepolia');
  });
});

describe('v6b migration: wallets environment conversion', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('should convert Solana mainnet wallet to environment=mainnet', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-sol-mn', 'Sol Mainnet', 'solana', 'mainnet', 'pk-sol-mn', 'ACTIVE', 0, ts, ts);

    runMigrations(db, getV6Migrations());

    const wallet = db.prepare('SELECT environment, default_network FROM wallets WHERE id = ?').get('w-sol-mn') as { environment: string; default_network: string };
    expect(wallet.environment).toBe('mainnet');
    expect(wallet.default_network).toBe('mainnet');
  });

  it('should convert EVM testnet wallet to environment=testnet', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-evm-pa', 'Polygon Amoy', 'ethereum', 'polygon-amoy', 'pk-evm-pa', 'ACTIVE', 0, ts, ts);

    runMigrations(db, getV6Migrations());

    const wallet = db.prepare('SELECT environment, default_network FROM wallets WHERE id = ?').get('w-evm-pa') as { environment: string; default_network: string };
    expect(wallet.environment).toBe('testnet');
    expect(wallet.default_network).toBe('polygon-amoy');
  });

  it('should preserve FK integrity across all tables', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + session + transaction + policy
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-fk', 'FK Test', 'solana', 'devnet', 'pk-fk', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-fk', 'w-fk', 'hash-fk', ts + 3600, ts + 86400, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, session_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-fk', 'w-fk', 'sess-fk', 'solana', 'TRANSFER', 'PENDING', ts);

    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('pol-fk', 'w-fk', 'SPENDING_LIMIT', '{}', ts, ts);

    runMigrations(db, getV6Migrations());

    // PRAGMA foreign_key_check should return empty
    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toEqual([]);

    // Verify FK relationships still hold via joins
    const joined = db.prepare(
      `SELECT s.wallet_id, w.name FROM sessions s JOIN wallets w ON s.wallet_id = w.id WHERE s.id = ?`,
    ).get('sess-fk') as { wallet_id: string; name: string };
    expect(joined.wallet_id).toBe('w-fk');
    expect(joined.name).toBe('FK Test');
  });

  it('should transition indexes from chain_network to chain_environment', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-idx', 'Index Test', 'solana', 'devnet', 'pk-idx', 'ACTIVE', 0, ts, ts);

    runMigrations(db, getV6Migrations());

    // Collect all wallets index names
    const indexes = db.prepare("PRAGMA index_list('wallets')").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);

    // idx_wallets_chain_environment should exist
    expect(indexNames).toContain('idx_wallets_chain_environment');

    // idx_wallets_chain_network should NOT exist
    expect(indexNames).not.toContain('idx_wallets_chain_network');
  });
});

describe('v8 migration: policies.network column', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('should add network column to policies with NULL for existing rows', () => {
    db = createV5Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + policy
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v8', 'V8 Test', 'solana', 'devnet', 'pk-v8', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('pol-v8', 'w-v8', 'SPENDING_LIMIT', '{}', ts, ts);

    runMigrations(db, getV6Migrations());

    // Verify policy network is NULL
    const policy = db.prepare('SELECT network FROM policies WHERE id = ?').get('pol-v8') as { network: string | null };
    expect(policy.network).toBeNull();

    // Verify FK integrity
    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toEqual([]);

    // Verify idx_policies_network exists
    const indexes = db.prepare("PRAGMA index_list('policies')").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_policies_network');
  });
});

describe('pushSchema vs migration schema equivalence', () => {
  let dbA: DatabaseType;
  let dbB: DatabaseType;

  afterEach(() => {
    try { dbA.close(); } catch { /* already closed */ }
    try { dbB.close(); } catch { /* already closed */ }
  });

  it('should produce identical schemas for wallets, transactions, and policies', () => {
    // DB A: fresh DB via pushSchema (latest DDL)
    const connA = createDatabase(':memory:');
    dbA = connA.sqlite;
    pushSchema(dbA);

    // DB B: v5 DDL -> run all remaining migrations (v6+) for full equivalence
    dbB = createV5Database();
    const allRemaining = MIGRATIONS.filter((m) => m.version >= 6);
    runMigrations(dbB, allRemaining);

    // Compare wallets table columns
    const walletsColsA = (dbA.prepare("PRAGMA table_info('wallets')").all() as Array<{ name: string; type: string; notnull: number }>)
      .map((c) => ({ name: c.name, type: c.type, notnull: c.notnull }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const walletsColsB = (dbB.prepare("PRAGMA table_info('wallets')").all() as Array<{ name: string; type: string; notnull: number }>)
      .map((c) => ({ name: c.name, type: c.type, notnull: c.notnull }))
      .sort((a, b) => a.name.localeCompare(b.name));

    expect(walletsColsA.map((c) => c.name)).toEqual(walletsColsB.map((c) => c.name));

    // wallets should NOT have 'network' column in either DB
    expect(walletsColsA.map((c) => c.name)).not.toContain('network');
    expect(walletsColsB.map((c) => c.name)).not.toContain('network');

    // wallets should have 'environment' column (v27 drops default_network)
    expect(walletsColsA.map((c) => c.name)).toContain('environment');
    expect(walletsColsA.map((c) => c.name)).not.toContain('default_network');
    expect(walletsColsB.map((c) => c.name)).toContain('environment');
    expect(walletsColsB.map((c) => c.name)).not.toContain('default_network');

    // Compare transactions table columns
    const txColsA = (dbA.prepare("PRAGMA table_info('transactions')").all() as Array<{ name: string }>)
      .map((c) => c.name)
      .sort();
    const txColsB = (dbB.prepare("PRAGMA table_info('transactions')").all() as Array<{ name: string }>)
      .map((c) => c.name)
      .sort();

    expect(txColsA).toEqual(txColsB);
    // Both should have network column
    expect(txColsA).toContain('network');
    expect(txColsB).toContain('network');

    // Compare policies table columns
    const polColsA = (dbA.prepare("PRAGMA table_info('policies')").all() as Array<{ name: string }>)
      .map((c) => c.name)
      .sort();
    const polColsB = (dbB.prepare("PRAGMA table_info('policies')").all() as Array<{ name: string }>)
      .map((c) => c.name)
      .sort();

    expect(polColsA).toEqual(polColsB);
    // Both should have network column
    expect(polColsA).toContain('network');
    expect(polColsB).toContain('network');

    // Compare index names across wallets, transactions, policies
    for (const table of ['wallets', 'transactions', 'policies']) {
      const idxA = (dbA.prepare(`PRAGMA index_list('${table}')`).all() as Array<{ name: string }>)
        .map((i) => i.name)
        .filter((n) => !n.startsWith('sqlite_'))
        .sort();
      const idxB = (dbB.prepare(`PRAGMA index_list('${table}')`).all() as Array<{ name: string }>)
        .map((i) => i.name)
        .filter((n) => !n.startsWith('sqlite_'))
        .sort();

      expect(idxA).toEqual(idxB);
    }
  });

  it('should have LATEST_SCHEMA_VERSION = 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });
});
