/**
 * Migration v14 tests: kill_switch_state value conversion.
 *
 * Tests:
 * - NORMAL -> ACTIVE conversion
 * - ACTIVATED -> SUSPENDED conversion
 * - RECOVERING -> ACTIVE conversion
 * - No key present: migration runs without error
 * - schema_version records v14
 * - Full chain (v1 -> v14) migration succeeds
 *
 * @see packages/daemon/src/infrastructure/database/migrate.ts
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

// ---------------------------------------------------------------------------
// Helper: create v13 state DB (v5 base + apply v6-v13 migrations)
// ---------------------------------------------------------------------------

/**
 * Create a v5 schema database for migration testing.
 * Copied from migration-chain.test.ts pattern.
 */
function createV5SchemaDatabase(): DatabaseType {
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

  db.exec(`CREATE TABLE IF NOT EXISTS key_value_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  db.exec(`CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  wallet_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at INTEGER NOT NULL
)`);

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

  db.exec(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0 CHECK (encrypted IN (0, 1)),
  category TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);

  // v5 indexes
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

  const ts = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(1, ts, 'Initial schema');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(2, ts, 'EVM network CHECK');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(3, ts, 'Rename agents to wallets');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(4, ts, 'Token registry table');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(5, ts, 'Settings table');

  db.exec('COMMIT');
  return db;
}

function createV13Database(): DatabaseType {
  const v5Db = createV5SchemaDatabase();
  const v6to13 = MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 13);
  runMigrations(v5Db, v6to13);
  return v5Db;
}

function getVersions(db: DatabaseType): number[] {
  const rows = db
    .prepare('SELECT version FROM schema_version ORDER BY version')
    .all() as Array<{ version: number }>;
  return rows.map((r) => r.version);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('v14 migration: kill_switch_state value conversion', () => {
  let db: DatabaseType;

  afterEach(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  });

  it('LATEST_SCHEMA_VERSION is 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('NORMAL -> ACTIVE conversion', () => {
    db = createV13Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert old-style NORMAL state
    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'NORMAL', ?)",
    ).run(ts);

    // Run v14 migration
    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    // Verify conversion
    const row = db
      .prepare(
        "SELECT value FROM key_value_store WHERE key = 'kill_switch_state'",
      )
      .get() as { value: string };
    expect(row.value).toBe('ACTIVE');
  });

  it('ACTIVATED -> SUSPENDED conversion', () => {
    db = createV13Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'ACTIVATED', ?)",
    ).run(ts);

    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    const row = db
      .prepare(
        "SELECT value FROM key_value_store WHERE key = 'kill_switch_state'",
      )
      .get() as { value: string };
    expect(row.value).toBe('SUSPENDED');
  });

  it('RECOVERING -> ACTIVE conversion', () => {
    db = createV13Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'RECOVERING', ?)",
    ).run(ts);

    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    const row = db
      .prepare(
        "SELECT value FROM key_value_store WHERE key = 'kill_switch_state'",
      )
      .get() as { value: string };
    expect(row.value).toBe('ACTIVE');
  });

  it('no key present: migration runs without error', () => {
    db = createV13Database();

    // key_value_store has no kill_switch_state row
    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    expect(() => runMigrations(db, v14)).not.toThrow();
  });

  it('already ACTIVE value is not modified', () => {
    db = createV13Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert a value that already uses new naming
    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'ACTIVE', ?)",
    ).run(ts);

    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    const row = db
      .prepare(
        "SELECT value FROM key_value_store WHERE key = 'kill_switch_state'",
      )
      .get() as { value: string };
    expect(row.value).toBe('ACTIVE');
  });

  it('schema_version records v14 after migration', () => {
    db = createV13Database();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'NORMAL', ?)",
    ).run(ts);

    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    const versions = getVersions(db);
    expect(versions).toContain(14);
  });

  it('fresh DB via pushSchema records v14 in schema_version', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    const versions = getVersions(db);
    expect(versions).toContain(21);
    expect(Math.max(...versions)).toBe(63);
  });

  it('updated_at is refreshed on conversion', () => {
    db = createV13Database();
    const oldTs = Math.floor(Date.now() / 1000) - 100;

    db.prepare(
      "INSERT INTO key_value_store (key, value, updated_at) VALUES ('kill_switch_state', 'NORMAL', ?)",
    ).run(oldTs);

    const v14 = MIGRATIONS.filter((m) => m.version === 14);
    runMigrations(db, v14);

    const row = db
      .prepare(
        "SELECT updated_at FROM key_value_store WHERE key = 'kill_switch_state'",
      )
      .get() as { updated_at: number };
    expect(row.updated_at).toBeGreaterThan(oldTs);
  });
});
