/**
 * Migration chain tests: full-path migration from historical schema versions.
 *
 * Tests cover:
 * T-1: v5 DB -> pushSchema success (MIGR-01 regression)
 * T-2/T-6: Schema equivalence (migrated vs fresh DB)
 * T-3: v1 DB -> pushSchema success (full chain v2-v15)
 * T-4: Fresh DB -> pushSchema success (existing behavior)
 * T-5: Index completeness after migration
 * T-7: v7 network -> environment data transformation
 * T-8: v6 transactions.network backfill
 * T-9: v3 agents -> wallets naming + event transformation
 * T-10: FK integrity preservation
 * T-11: Edge cases (NULL, empty tables, suspended wallets)
 *
 * @see objectives/issues/v1.4.8-031-pushschema-index-before-migration.md
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
// Schema snapshot helpers
// ---------------------------------------------------------------------------

/**
 * Create a v1 schema database (agents table, Solana-only CHECK, agent_id FKs).
 * This is the original schema before any migrations.
 */
function createV1SchemaDatabase(): DatabaseType {
  const conn = createDatabase(':memory:');
  const db = conn.sqlite;

  db.exec('BEGIN');

  // Table 1: agents (Solana-only)
  db.exec(`CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('solana')),
  network TEXT NOT NULL CHECK (network IN ('mainnet', 'devnet', 'testnet')),
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATING' CHECK (status IN ('CREATING', 'ACTIVE', 'SUSPENDED')),
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (owner_verified IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT
)`);

  // Table 2: sessions with agent_id FK
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
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

  // Table 3: transactions with agent_id FK
  db.exec(`CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
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
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'APPROVED', 'REJECTED', 'EXECUTING', 'CONFIRMED', 'FAILED', 'PARTIAL_FAILURE')),
  tier TEXT CHECK (tier IS NULL OR tier IN ('INSTANT', 'STANDARD', 'APPROVAL')),
  queued_at INTEGER,
  executed_at INTEGER,
  created_at INTEGER NOT NULL,
  reserved_amount TEXT,
  error TEXT,
  metadata TEXT
)`);

  // Table 4: policies with agent_id FK
  db.exec(`CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SPENDING_LIMIT', 'WHITELIST', 'TIME_RESTRICTION', 'RATE_LIMIT')),
  rules TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  // Table 5: pending_approvals
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

  // Table 6: audit_log with agent_id
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  agent_id TEXT,
  session_id TEXT,
  tx_id TEXT,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address TEXT
)`);

  // Table 7: key_value_store
  db.exec(`CREATE TABLE IF NOT EXISTS key_value_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

  // Table 8: notification_logs with agent_id
  db.exec(`CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at INTEGER NOT NULL
)`);

  // Table 9: schema_version
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);

  // v1 indexes
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_public_key ON agents(public_key)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_agents_chain_network ON agents(chain, network)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_agents_owner_address ON agents(owner_address)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_agent_status ON transactions(agent_id, status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id)');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_queued_at ON transactions(queued_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_contract_address ON transactions(contract_address)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_policies_agent_enabled ON policies(agent_id, enabled)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pending_approvals_tx_id ON pending_approvals(tx_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires_at ON pending_approvals(expires_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_agent_id ON audit_log(agent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_agent_timestamp ON audit_log(agent_id, timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type ON notification_logs(event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_agent_id ON notification_logs(agent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at)');

  // Record schema version 1 only
  const ts = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(1, ts, 'Initial schema (v1 Solana-only)');

  db.exec('COMMIT');
  return db;
}

/**
 * Create a v5 schema database (wallets table, wallet_id FKs, token_registry, settings).
 * This is the state before the environment model migration (v6-v8).
 */
function createV5SchemaDatabase(): DatabaseType {
  const conn = createDatabase(':memory:');
  const db = conn.sqlite;

  db.exec('BEGIN');

  // wallets table with network column (v5 schema, post-v3 rename)
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

  // sessions with wallet_id FK
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

  // transactions with wallet_id FK (NO network column -- v5 state)
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

  // policies with wallet_id FK (NO network column -- v5 state)
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

  // token_registry (added in v4)
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

  // settings (added in v5)
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
// Helper utilities
// ---------------------------------------------------------------------------

function getTableColumns(db: DatabaseType, table: string): string[] {
  return (db.prepare(`PRAGMA table_info('${table}')`).all() as Array<{ name: string }>)
    .map((c) => c.name)
    .sort();
}

/** Column info with order, type, and notnull — for detecting column position mismatches (issue #480). */
function getTableColumnDetails(db: DatabaseType, table: string): Array<{ cid: number; name: string; type: string; notnull: number }> {
  return (db.prepare(`PRAGMA table_info('${table}')`).all() as Array<{ cid: number; name: string; type: string; notnull: number }>)
    .map(({ cid, name, type, notnull }) => ({ cid, name, type, notnull }));
}

function getTableIndexes(db: DatabaseType, table: string): string[] {
  return (db.prepare(`PRAGMA index_list('${table}')`).all() as Array<{ name: string }>)
    .map((i) => i.name)
    .filter((n) => !n.startsWith('sqlite_'))
    .sort();
}

function getAllIndexNames(db: DatabaseType): string[] {
  const rows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

function getVersions(db: DatabaseType): number[] {
  const rows = db.prepare('SELECT version FROM schema_version ORDER BY version').all() as Array<{ version: number }>;
  return rows.map((r) => r.version);
}

/** All expected indexes in the latest schema. */
const EXPECTED_INDEXES = [
  'idx_audit_log_event_type',
  'idx_audit_log_severity',
  'idx_audit_log_timestamp',
  'idx_audit_log_wallet_id',
  'idx_audit_log_wallet_timestamp',
  'idx_defi_positions_status',
  'idx_defi_positions_unique',
  'idx_defi_positions_wallet_category',
  'idx_defi_positions_wallet_provider',
  'idx_incoming_tx_chain_network',
  'idx_incoming_tx_detected_at',
  'idx_incoming_tx_status',
  'idx_incoming_tx_wallet_detected',
  'idx_notification_logs_created_at',
  'idx_notification_logs_event_type',
  'idx_notification_logs_status',
  'idx_notification_logs_wallet_id',
  'idx_pending_approvals_expires_at',
  'idx_pending_approvals_tx_id',
  'idx_policies_network',
  'idx_policies_type',
  'idx_policies_wallet_enabled',
  'idx_session_wallets_session',
  'idx_session_wallets_wallet',
  'idx_sessions_expires_at',
  'idx_sessions_token_hash',
  'idx_settings_category',
  'idx_token_registry_network',
  'idx_token_registry_network_address',
  'idx_transactions_contract_address',
  'idx_transactions_created_at',
  'idx_transactions_parent_id',
  'idx_transactions_queued_at',
  'idx_transactions_session_id',
  'idx_transactions_tx_hash',
  'idx_transactions_type',
  'idx_transactions_wallet_status',
  'idx_wallets_chain_environment',
  'idx_wallets_owner_address',
  'idx_wallets_public_key',
  'idx_wallets_status',
  'idx_telegram_users_role',
  'idx_wc_sessions_topic',
].sort();

const ALL_TABLES = [
  'wallets', 'sessions', 'session_wallets', 'transactions', 'policies', 'pending_approvals',
  'audit_log', 'key_value_store', 'notification_logs', 'token_registry',
  'settings', 'schema_version', 'telegram_users',
  'wc_sessions', 'wc_store', 'incoming_transactions', 'incoming_tx_cursors',
  'defi_positions', 'wallet_apps',
];

// ---------------------------------------------------------------------------
// T-1 ~ T-5: pushSchema on existing databases
// ---------------------------------------------------------------------------

describe('pushSchema on existing databases', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-1: v5 DB pushSchema succeeds without error', () => {
    db = createV5SchemaDatabase();

    // Insert sample data before pushSchema
    const ts = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-sol-1', 'Sol Wallet', 'solana', 'devnet', 'pk-sol-1', 'ACTIVE', 0, ts, ts);

    // This should NOT throw (currently fails with "no such column: environment")
    expect(() => pushSchema(db)).not.toThrow();

    // Verify schema_version records all versions up to LATEST
    const versions = getVersions(db);
    expect(versions).toContain(LATEST_SCHEMA_VERSION);
  });

  it('T-3: v1 DB (agents) pushSchema succeeds with full migration chain', () => {
    db = createV1SchemaDatabase();

    // Insert sample agent data
    const ts = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-sol-1', 'Agent Sol', 'solana', 'devnet', 'pk-sol-1', 'ACTIVE', 0, ts, ts);

    // pushSchema should run v2->v9 migration chain successfully
    expect(() => pushSchema(db)).not.toThrow();

    // Verify all versions recorded
    const versions = getVersions(db);
    expect(versions).toContain(LATEST_SCHEMA_VERSION);

    // Verify wallets table exists (agents renamed)
    const wallets = db.prepare('SELECT * FROM wallets').all();
    expect(wallets).toHaveLength(1);
  });

  it('T-4: fresh DB pushSchema succeeds (existing behavior)', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;

    expect(() => pushSchema(db)).not.toThrow();

    // All 19 tables should exist (18 + schema_version)
    for (const table of ALL_TABLES) {
      const result = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(table) as { name: string } | undefined;
      expect(result).toBeDefined();
      expect(result!.name).toBe(table);
    }

    // All versions up to LATEST recorded
    const versions = getVersions(db);
    for (let v = 1; v <= LATEST_SCHEMA_VERSION; v++) {
      expect(versions).toContain(v);
    }
  });

  it('T-5: all expected indexes exist after migration', () => {
    // Test with v5 DB (requires migration)
    db = createV5SchemaDatabase();
    pushSchema(db);

    const actualIndexes = getAllIndexNames(db);
    for (const expected of EXPECTED_INDEXES) {
      expect(actualIndexes).toContain(expected);
    }
    expect(actualIndexes.length).toBeGreaterThanOrEqual(EXPECTED_INDEXES.length);
  });
});

// ---------------------------------------------------------------------------
// T-2/T-6: Migration chain schema equivalence
// ---------------------------------------------------------------------------

describe('migration chain schema equivalence', () => {
  let freshDb: DatabaseType;
  let migratedDb: DatabaseType;

  afterEach(() => {
    try { freshDb.close(); } catch { /* already closed */ }
    try { migratedDb.close(); } catch { /* already closed */ }
  });

  it('T-2: v5 migrated DB schema matches fresh DB schema', () => {
    // Fresh DB
    const connA = createDatabase(':memory:');
    freshDb = connA.sqlite;
    pushSchema(freshDb);

    // v5 migrated DB
    migratedDb = createV5SchemaDatabase();
    pushSchema(migratedDb);

    // Compare all 19 tables column names
    for (const table of ALL_TABLES) {
      const freshCols = getTableColumns(freshDb, table);
      const migratedCols = getTableColumns(migratedDb, table);
      expect(migratedCols).toEqual(freshCols);
    }

    // Compare indexes on key tables
    for (const table of ['wallets', 'transactions', 'policies', 'sessions']) {
      const freshIdx = getTableIndexes(freshDb, table);
      const migratedIdx = getTableIndexes(migratedDb, table);
      expect(migratedIdx).toEqual(freshIdx);
    }
  });

  it('T-6: v1 migrated DB schema matches fresh DB schema', () => {
    // Fresh DB
    const connA = createDatabase(':memory:');
    freshDb = connA.sqlite;
    pushSchema(freshDb);

    // v1 migrated DB
    migratedDb = createV1SchemaDatabase();
    pushSchema(migratedDb);

    // Compare all 19 tables column names
    for (const table of ALL_TABLES) {
      const freshCols = getTableColumns(freshDb, table);
      const migratedCols = getTableColumns(migratedDb, table);
      expect(migratedCols).toEqual(freshCols);
    }
  });

  // T-6b: Column order + type + notnull must match between migrated and fresh DB.
  // Catches ALTER TABLE ADD column-order mismatches (issue #480).
  it('T-6b: v1 migrated DB column order matches fresh DB for all tables', () => {
    const connA = createDatabase(':memory:');
    freshDb = connA.sqlite;
    pushSchema(freshDb);

    migratedDb = createV1SchemaDatabase();
    pushSchema(migratedDb);

    const TABLES_WITH_TABLE_RECREATION = [
      'wallets', 'transactions', 'policies', 'incoming_transactions',
      'defi_positions', 'nft_metadata_cache',
    ];

    for (const table of TABLES_WITH_TABLE_RECREATION) {
      const freshDetails = getTableColumnDetails(freshDb, table);
      const migratedDetails = getTableColumnDetails(migratedDb, table);
      expect(migratedDetails, `column order mismatch in ${table}`).toEqual(freshDetails);
    }
  });
});

// ---------------------------------------------------------------------------
// T-7: Data transformation: v7 network to environment
// ---------------------------------------------------------------------------

describe('data transformation: v7 network to environment', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-7a: devnet -> testnet', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-sol-dn', 'Sol Devnet', 'solana', 'devnet', 'pk-sol-dn', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    // After full migration chain (v7 sets environment, v27 drops default_network)
    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-sol-dn') as { environment: string };
    expect(wallet.environment).toBe('testnet');
  });

  it('T-7b: ethereum-sepolia -> testnet', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-eth-sep', 'Eth Sepolia', 'ethereum', 'ethereum-sepolia', 'pk-eth-sep', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-eth-sep') as { environment: string };
    expect(wallet.environment).toBe('testnet');
  });

  it('T-7c: ethereum-mainnet -> mainnet', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-eth-mn', 'Eth Mainnet', 'ethereum', 'ethereum-mainnet', 'pk-eth-mn', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-eth-mn') as { environment: string };
    expect(wallet.environment).toBe('mainnet');
  });

  it('T-7d: polygon-amoy -> testnet', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-poly-am', 'Polygon Amoy', 'ethereum', 'polygon-amoy', 'pk-poly-am', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-poly-am') as { environment: string };
    expect(wallet.environment).toBe('testnet');
  });

  it('T-7e: base-mainnet -> mainnet', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-base-mn', 'Base Mainnet', 'ethereum', 'base-mainnet', 'pk-base-mn', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-base-mn') as { environment: string };
    expect(wallet.environment).toBe('mainnet');
  });

  it('T-7f: environment preserved after full migration chain', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-arb-sep', 'Arb Sepolia', 'ethereum', 'arbitrum-sepolia', 'pk-arb-sep', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    // After v27, default_network column is dropped; verify environment is correct
    const wallet = db.prepare('SELECT environment FROM wallets WHERE id = ?').get('w-arb-sep') as { environment: string };
    expect(wallet.environment).toBe('testnet');
  });
});

// ---------------------------------------------------------------------------
// T-8: Data transformation: v6 transactions.network backfill
// ---------------------------------------------------------------------------

describe('data transformation: v6 transactions.network backfill', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-8a: Solana transaction backfill', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-sol-bf', 'Sol Backfill', 'solana', 'devnet', 'pk-sol-bf', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-sol-bf', 'w-sol-bf', 'solana', 'TRANSFER', 'PENDING', ts);

    pushSchema(db);

    const tx = db.prepare('SELECT network FROM transactions WHERE id = ?').get('tx-sol-bf') as { network: string };
    expect(tx.network).toBe('solana-devnet');
  });

  it('T-8b: EVM transaction backfill', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-evm-bf', 'EVM Backfill', 'ethereum', 'ethereum-sepolia', 'pk-evm-bf', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-evm-bf', 'w-evm-bf', 'ethereum', 'TRANSFER', 'PENDING', ts);

    pushSchema(db);

    const tx = db.prepare('SELECT network FROM transactions WHERE id = ?').get('tx-evm-bf') as { network: string };
    expect(tx.network).toBe('ethereum-sepolia');
  });

  it('T-8c: multiple transactions backfill (1 wallet + 5 transactions)', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-multi', 'Multi TX', 'solana', 'mainnet', 'pk-multi', 'ACTIVE', 0, ts, ts);

    for (let i = 1; i <= 5; i++) {
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(`tx-multi-${i}`, 'w-multi', 'solana', 'TRANSFER', 'PENDING', ts);
    }

    pushSchema(db);

    for (let i = 1; i <= 5; i++) {
      const tx = db.prepare('SELECT network FROM transactions WHERE id = ?').get(`tx-multi-${i}`) as { network: string };
      expect(tx.network).toBe('solana-mainnet');
    }
  });
});

// ---------------------------------------------------------------------------
// T-9: Data transformation: v3 agents to wallets
// ---------------------------------------------------------------------------

describe('data transformation: v3 agents to wallets', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-9a: AGENT_CREATED -> WALLET_CREATED event transformation', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-evt-1', 'Agent Evt', 'solana', 'devnet', 'pk-evt-1', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO audit_log (timestamp, event_type, actor, agent_id, details)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(ts, 'AGENT_CREATED', 'system', 'a-evt-1', '{}');

    pushSchema(db);

    // AGENT_CREATED should be converted to WALLET_CREATED
    const log = db.prepare("SELECT event_type FROM audit_log WHERE wallet_id = 'a-evt-1'").get() as { event_type: string };
    expect(log.event_type).toBe('WALLET_CREATED');
  });

  it('T-9b: agent_id -> wallet_id FK preserved', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-fk-1', 'Agent FK', 'solana', 'devnet', 'pk-fk-1', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO sessions (id, agent_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-fk-1', 'a-fk-1', 'hash-fk-1', ts + 3600, ts + 86400, ts);

    pushSchema(db);

    // session wallet_id is now in session_wallets junction table (v19 migration)
    const sw = db.prepare('SELECT wallet_id FROM session_wallets WHERE session_id = ?').get('sess-fk-1') as { wallet_id: string };
    expect(sw.wallet_id).toBe('a-fk-1');
  });

  it('T-9c: AGENT_SUSPENDED -> WALLET_SUSPENDED notification_logs transformation', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO notification_logs (id, event_type, agent_id, channel, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('notif-susp-1', 'AGENT_SUSPENDED', 'a-susp', 'telegram', 'sent', ts);

    pushSchema(db);

    // AGENT_SUSPENDED should be converted to WALLET_SUSPENDED
    const notif = db.prepare('SELECT event_type FROM notification_logs WHERE id = ?').get('notif-susp-1') as { event_type: string };
    expect(notif.event_type).toBe('WALLET_SUSPENDED');
  });
});

// ---------------------------------------------------------------------------
// T-10: FK integrity preservation
// ---------------------------------------------------------------------------

describe('FK integrity preservation', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-10a: v5 migration preserves PRAGMA foreign_key_check', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + session + transaction + policy FK chain
    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-fk-v5', 'FK V5', 'solana', 'devnet', 'pk-fk-v5', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-fk-v5', 'w-fk-v5', 'hash-fk-v5', ts + 3600, ts + 86400, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, session_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-fk-v5', 'w-fk-v5', 'sess-fk-v5', 'solana', 'TRANSFER', 'PENDING', ts);

    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('pol-fk-v5', 'w-fk-v5', 'SPENDING_LIMIT', '{}', ts, ts);

    pushSchema(db);

    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toEqual([]);
  });

  it('T-10b: v1 migration preserves PRAGMA foreign_key_check', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert agent + session + transaction FK chain
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-fk-v1', 'FK V1', 'solana', 'devnet', 'pk-fk-v1', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO sessions (id, agent_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-fk-v1', 'a-fk-v1', 'hash-fk-v1', ts + 3600, ts + 86400, ts);

    db.prepare(
      `INSERT INTO transactions (id, agent_id, session_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-fk-v1', 'a-fk-v1', 'sess-fk-v1', 'solana', 'TRANSFER', 'PENDING', ts);

    pushSchema(db);

    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T-11: Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  it('T-11a: NULL owner_address preserved after migration', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-null-owner', 'No Owner', 'solana', 'devnet', 'pk-null', 'ACTIVE', 0, ts, ts);

    pushSchema(db);

    const wallet = db.prepare('SELECT owner_address FROM wallets WHERE id = ?').get('w-null-owner') as { owner_address: string | null };
    expect(wallet.owner_address).toBeNull();
  });

  it('T-11b: empty tables migration (no error)', () => {
    db = createV5SchemaDatabase();

    // No data inserted -- just empty tables
    expect(() => pushSchema(db)).not.toThrow();

    // All versions should be recorded
    const versions = getVersions(db);
    expect(versions).toContain(LATEST_SCHEMA_VERSION);
  });

  it('T-12: v9 DB -> v10 migration adds message column to notification_logs', () => {
    // Create a v5 DB (which migrates to v9 via pushSchema)
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert notification log record (pre-v10, no message column)
    db.prepare(
      `INSERT INTO notification_logs (id, event_type, wallet_id, channel, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('notif-pre-v10', 'TX_CONFIRMED', 'w-1', 'telegram', 'sent', ts);

    pushSchema(db);

    // Verify message column exists
    const columns = getTableColumns(db, 'notification_logs');
    expect(columns).toContain('message');

    // Verify existing record has message = NULL
    const row = db.prepare('SELECT message FROM notification_logs WHERE id = ?').get('notif-pre-v10') as { message: string | null };
    expect(row.message).toBeNull();

    // Verify LATEST_SCHEMA_VERSION is 61
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('T-13: existing notification_logs data preserved after v10 migration', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert multiple notification log records with different statuses
    db.prepare(
      `INSERT INTO notification_logs (id, event_type, wallet_id, channel, status, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('notif-sent-1', 'TX_CONFIRMED', 'w-1', 'telegram', 'sent', null, ts);

    db.prepare(
      `INSERT INTO notification_logs (id, event_type, wallet_id, channel, status, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('notif-fail-1', 'TX_FAILED', 'w-2', 'discord', 'failed', 'timeout', ts);

    pushSchema(db);

    // Verify records are preserved with original data
    const sent = db.prepare('SELECT * FROM notification_logs WHERE id = ?').get('notif-sent-1') as {
      event_type: string; wallet_id: string; channel: string; status: string; error: string | null; message: string | null;
    };
    expect(sent.event_type).toBe('TX_CONFIRMED');
    expect(sent.wallet_id).toBe('w-1');
    expect(sent.channel).toBe('telegram');
    expect(sent.status).toBe('sent');
    expect(sent.error).toBeNull();
    expect(sent.message).toBeNull();

    const failed = db.prepare('SELECT * FROM notification_logs WHERE id = ?').get('notif-fail-1') as {
      event_type: string; wallet_id: string; channel: string; status: string; error: string | null; message: string | null;
    };
    expect(failed.event_type).toBe('TX_FAILED');
    expect(failed.wallet_id).toBe('w-2');
    expect(failed.channel).toBe('discord');
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('timeout');
    expect(failed.message).toBeNull();
  });

  it('T-11c: suspended wallet data preserved', () => {
    db = createV5SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);
    const suspendedAt = ts - 3600;
    const reason = 'Security incident detected';

    db.prepare(
      `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_address, owner_verified, created_at, updated_at, suspended_at, suspension_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-susp', 'Suspended', 'solana', 'devnet', 'pk-susp', 'SUSPENDED', 'owner123', 1, ts, ts, suspendedAt, reason);

    pushSchema(db);

    const wallet = db.prepare('SELECT status, owner_address, owner_verified, suspended_at, suspension_reason FROM wallets WHERE id = ?').get('w-susp') as {
      status: string;
      owner_address: string;
      owner_verified: number;
      suspended_at: number;
      suspension_reason: string;
    };
    expect(wallet.status).toBe('SUSPENDED');
    expect(wallet.owner_address).toBe('owner123');
    expect(wallet.owner_verified).toBe(1);
    expect(wallet.suspended_at).toBe(suspendedAt);
    expect(wallet.suspension_reason).toBe(reason);
  });
});

// ---------------------------------------------------------------------------
// T-14: v12 migration: X402_PAYMENT + X402_ALLOWED_DOMAINS CHECK constraints
// ---------------------------------------------------------------------------

describe('v12 migration: x402 CHECK constraints', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  /**
   * Create a v11 state DB: v5 + pushSchema (which applies v6-v11).
   * We need to test v11 -> v12 migration specifically.
   */
  function createV11Database(): DatabaseType {
    // Start from v5 and let pushSchema apply v6-v11 migrations.
    // But wait -- pushSchema now records v12 too (LATEST_SCHEMA_VERSION=12).
    // So we create a v5 DB, apply v6-v11 manually, and stop before v12.
    const v5Db = createV5SchemaDatabase();

    // Get v6-v11 migrations
    const v6to11 = MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 11);
    runMigrations(v5Db, v6to11);

    return v5Db;
  }

  it('T-14a: v11 -> v12 migration preserves existing transactions data', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v12-tx', 'V12 TX Test', 'solana', 'testnet', 'devnet', 'pk-v12-tx', 'ACTIVE', 0, ts, ts);

    // Insert session
    db.prepare(
      `INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-v12', 'w-v12-tx', 'hash-v12', ts + 3600, ts + 86400, ts);

    // Insert existing transactions with various types
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, session_id, chain, type, amount, to_address, status, created_at, network)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-transfer', 'w-v12-tx', 'sess-v12', 'solana', 'TRANSFER', '1000000', 'addr1', 'CONFIRMED', ts, 'devnet');

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-token', 'w-v12-tx', 'solana', 'TOKEN_TRANSFER', 'PENDING', ts, 'devnet');

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // Verify all data preserved
    const transfer = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx-transfer') as {
      wallet_id: string; session_id: string; type: string; amount: string; to_address: string; status: string; network: string;
    };
    expect(transfer.wallet_id).toBe('w-v12-tx');
    expect(transfer.session_id).toBe('sess-v12');
    expect(transfer.type).toBe('TRANSFER');
    expect(transfer.amount).toBe('1000000');
    expect(transfer.to_address).toBe('addr1');
    expect(transfer.status).toBe('CONFIRMED');
    expect(transfer.network).toBe('devnet'); // still old format, v29 not yet applied

    const token = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx-token') as {
      type: string; status: string; network: string;
    };
    expect(token.type).toBe('TOKEN_TRANSFER');
    expect(token.status).toBe('PENDING');
    expect(token.network).toBe('devnet'); // still old format, v29 not yet applied
  });

  it('T-14b: v11 -> v12 migration preserves existing policies data', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v12-pol', 'V12 Policy Test', 'ethereum', 'testnet', 'ethereum-sepolia', 'pk-v12-pol', 'ACTIVE', 0, ts, ts);

    // Insert existing policies
    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, network, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pol-spend', 'w-v12-pol', 'SPENDING_LIMIT', '{"max":"1000"}', 10, 1, 'ethereum-sepolia', ts, ts);

    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, network, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pol-wl', 'w-v12-pol', 'WHITELIST', '{"addrs":["0x1"]}', 5, 1, null, ts, ts);

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // Verify policies preserved
    const spend = db.prepare('SELECT * FROM policies WHERE id = ?').get('pol-spend') as {
      wallet_id: string; type: string; rules: string; priority: number; enabled: number; network: string;
    };
    expect(spend.wallet_id).toBe('w-v12-pol');
    expect(spend.type).toBe('SPENDING_LIMIT');
    expect(spend.rules).toBe('{"max":"1000"}');
    expect(spend.priority).toBe(10);
    expect(spend.enabled).toBe(1);
    expect(spend.network).toBe('ethereum-sepolia');

    const wl = db.prepare('SELECT * FROM policies WHERE id = ?').get('pol-wl') as {
      type: string; network: string | null;
    };
    expect(wl.type).toBe('WHITELIST');
    expect(wl.network).toBeNull();
  });

  it('T-14c: v12 CHECK allows X402_PAYMENT transaction type', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-x402', 'X402 Test', 'ethereum', 'mainnet', 'ethereum-mainnet', 'pk-x402', 'ACTIVE', 0, ts, ts);

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // X402_PAYMENT should be accepted
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run('tx-x402', 'w-x402', 'ethereum', 'X402_PAYMENT', 'PENDING', ts, 'ethereum-mainnet');
    }).not.toThrow();

    const tx = db.prepare('SELECT type FROM transactions WHERE id = ?').get('tx-x402') as { type: string };
    expect(tx.type).toBe('X402_PAYMENT');
  });

  it('T-14d: v12 CHECK allows X402_ALLOWED_DOMAINS policy type', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-x402-pol', 'X402 Policy Test', 'ethereum', 'mainnet', 'ethereum-mainnet', 'pk-x402-pol', 'ACTIVE', 0, ts, ts);

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // X402_ALLOWED_DOMAINS should be accepted
    expect(() => {
      db.prepare(
        `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('pol-x402', 'w-x402-pol', 'X402_ALLOWED_DOMAINS', '{"domains":["example.com"]}', ts, ts);
    }).not.toThrow();

    const pol = db.prepare('SELECT type FROM policies WHERE id = ?').get('pol-x402') as { type: string };
    expect(pol.type).toBe('X402_ALLOWED_DOMAINS');
  });

  it('T-14e: v12 CHECK rejects invalid transaction type', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-invalid', 'Invalid Test', 'solana', 'testnet', 'devnet', 'pk-invalid', 'ACTIVE', 0, ts, ts);

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // INVALID_TYPE should be rejected by CHECK constraint
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('tx-invalid', 'w-invalid', 'solana', 'INVALID_TYPE', 'PENDING', ts);
    }).toThrow(/CHECK/i);
  });

  it('T-14f: v12 FK integrity check passes', () => {
    db = createV11Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + session + transaction + policy FK chain
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-fk-v12', 'FK V12', 'solana', 'testnet', 'devnet', 'pk-fk-v12', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('sess-fk-v12', 'w-fk-v12', 'hash-fk-v12', ts + 3600, ts + 86400, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, session_id, chain, type, status, created_at, network)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-fk-v12', 'w-fk-v12', 'sess-fk-v12', 'solana', 'TRANSFER', 'PENDING', ts, 'devnet');

    db.prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('pol-fk-v12', 'w-fk-v12', 'SPENDING_LIMIT', '{}', ts, ts);

    // Run v12 migration
    const v12 = MIGRATIONS.filter((m) => m.version === 12);
    runMigrations(db, v12);

    // FK check should pass
    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toEqual([]);
  });

  it('T-14g: v1 -> v12 full chain migration succeeds', () => {
    // The existing T-3 test already covers v1->LATEST via pushSchema.
    // Here we verify the final version explicitly.
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert agent data for full chain test
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-chain-12', 'Chain V12', 'solana', 'devnet', 'pk-chain-12', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO transactions (id, agent_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-chain-12', 'a-chain-12', 'solana', 'TRANSFER', 'PENDING', ts);

    db.prepare(
      `INSERT INTO policies (id, agent_id, type, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('pol-chain-12', 'a-chain-12', 'SPENDING_LIMIT', '{}', ts, ts);

    // Run full pushSchema (v2 -> v12 chain)
    pushSchema(db);

    // Verify final version is 19
    const versions = getVersions(db);
    expect(versions).toContain(19);
    expect(Math.max(...versions)).toBe(63);

    // Verify data survived the entire chain (v27 drops default_network)
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get('a-chain-12') as { environment: string };
    expect(wallet.environment).toBe('testnet');

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx-chain-12') as { wallet_id: string; network: string };
    expect(tx.wallet_id).toBe('a-chain-12');
    expect(tx.network).toBe('solana-devnet');

    const pol = db.prepare('SELECT * FROM policies WHERE id = ?').get('pol-chain-12') as { wallet_id: string; type: string };
    expect(pol.wallet_id).toBe('a-chain-12');
    expect(pol.type).toBe('SPENDING_LIMIT');

    // Verify X402_PAYMENT can be inserted after full chain migration
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run('tx-x402-chain', 'a-chain-12', 'solana', 'X402_PAYMENT', 'PENDING', ts, 'solana-devnet');
    }).not.toThrow();

    // Verify X402_ALLOWED_DOMAINS can be inserted
    expect(() => {
      db.prepare(
        `INSERT INTO policies (id, wallet_id, type, rules, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('pol-x402-chain', 'a-chain-12', 'X402_ALLOWED_DOMAINS', '{"domains":["example.com"]}', ts, ts);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T-15: v13 migration: amount_usd + reserved_amount_usd columns
// ---------------------------------------------------------------------------

describe('v13 migration: amount_usd and reserved_amount_usd columns', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  /**
   * Create a v12 state DB: v5 + apply v6-v12 migrations manually.
   */
  function createV12Database(): DatabaseType {
    const v5Db = createV5SchemaDatabase();
    const v6to12 = MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 12);
    runMigrations(v5Db, v6to12);
    return v5Db;
  }

  it('T-15a: v12 -> v13 migration adds amount_usd and reserved_amount_usd columns', () => {
    db = createV12Database();

    // Run v13 migration
    const v13 = MIGRATIONS.filter((m) => m.version === 13);
    runMigrations(db, v13);

    // Verify columns exist
    const columns = getTableColumns(db, 'transactions');
    expect(columns).toContain('amount_usd');
    expect(columns).toContain('reserved_amount_usd');
  });

  it('T-15b: v12 -> v13 migration preserves existing transaction data', () => {
    db = createV12Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v13-tx', 'V13 TX Test', 'solana', 'testnet', 'devnet', 'pk-v13-tx', 'ACTIVE', 0, ts, ts);

    // Insert transaction
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, amount, status, created_at, network, reserved_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-v13-1', 'w-v13-tx', 'solana', 'TRANSFER', '1000000', 'PENDING', ts, 'devnet', '1000000');

    // Run v13 migration
    const v13 = MIGRATIONS.filter((m) => m.version === 13);
    runMigrations(db, v13);

    // Verify existing data preserved, new columns are NULL
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get('tx-v13-1') as {
      wallet_id: string; type: string; amount: string; status: string; network: string;
      reserved_amount: string; amount_usd: number | null; reserved_amount_usd: number | null;
    };
    expect(tx.wallet_id).toBe('w-v13-tx');
    expect(tx.type).toBe('TRANSFER');
    expect(tx.amount).toBe('1000000');
    expect(tx.status).toBe('PENDING');
    expect(tx.network).toBe('devnet'); // still old format, v29 not yet applied
    expect(tx.reserved_amount).toBe('1000000');
    expect(tx.amount_usd).toBeNull();
    expect(tx.reserved_amount_usd).toBeNull();
  });

  it('T-15c: amount_usd/reserved_amount_usd accept REAL values', () => {
    db = createV12Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v13-real', 'V13 REAL Test', 'ethereum', 'testnet', 'ethereum-sepolia', 'pk-v13-real', 'ACTIVE', 0, ts, ts);

    // Run v13 migration
    const v13 = MIGRATIONS.filter((m) => m.version === 13);
    runMigrations(db, v13);

    // Insert transaction with REAL USD values
    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network, amount_usd, reserved_amount_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-v13-real', 'w-v13-real', 'ethereum', 'TRANSFER', 'PENDING', ts, 'ethereum-sepolia', 42.57, 42.57);

    // Read back and verify
    const tx = db.prepare('SELECT amount_usd, reserved_amount_usd FROM transactions WHERE id = ?').get('tx-v13-real') as {
      amount_usd: number; reserved_amount_usd: number;
    };
    expect(tx.amount_usd).toBeCloseTo(42.57, 2);
    expect(tx.reserved_amount_usd).toBeCloseTo(42.57, 2);
  });

  it('T-15d: fresh DB has amount_usd and reserved_amount_usd columns', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    // Verify columns exist in fresh DB
    const columns = getTableColumns(db, 'transactions');
    expect(columns).toContain('amount_usd');
    expect(columns).toContain('reserved_amount_usd');
  });

  it('T-15e: v12 -> v13 migrated schema matches fresh DB schema', () => {
    // Fresh DB
    const connA = createDatabase(':memory:');
    const freshDb = connA.sqlite;
    pushSchema(freshDb);

    // v12 migrated DB — run full remaining chain (v13+) so schema reaches latest
    db = createV12Database();
    const v13plus = MIGRATIONS.filter((m) => m.version >= 13);
    runMigrations(db, v13plus);

    // Compare transactions columns
    const freshCols = getTableColumns(freshDb, 'transactions');
    const migratedCols = getTableColumns(db, 'transactions');
    expect(migratedCols).toEqual(freshCols);

    freshDb.close();
  });

  it('T-15f: v1 -> v13 full chain migration succeeds', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert agent data
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-chain-13', 'Chain V13', 'solana', 'devnet', 'pk-chain-13', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO transactions (id, agent_id, chain, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('tx-chain-13', 'a-chain-13', 'solana', 'TRANSFER', 'PENDING', ts);

    // Run full pushSchema (v2 -> v13 chain)
    pushSchema(db);

    // Verify final version is 19
    const versions = getVersions(db);
    expect(versions).toContain(19);
    expect(Math.max(...versions)).toBe(63);

    // Verify amount_usd columns exist and are NULL for migrated data
    const tx = db.prepare('SELECT amount_usd, reserved_amount_usd FROM transactions WHERE id = ?').get('tx-chain-13') as {
      amount_usd: number | null; reserved_amount_usd: number | null;
    };
    expect(tx.amount_usd).toBeNull();
    expect(tx.reserved_amount_usd).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-16: v16 migration: wc_sessions, wc_store tables + approval_channel
// ---------------------------------------------------------------------------

describe('v16 migration: WC infra tables + approval_channel', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  /**
   * Create a v15 state DB: v5 + apply v6-v15 migrations manually.
   */
  function createV15Database(): DatabaseType {
    const v5Db = createV5SchemaDatabase();
    const v6to15 = MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 15);
    runMigrations(v5Db, v6to15);
    return v5Db;
  }

  it('T-16a: v15 -> v16 migration creates wc_sessions and wc_store tables', () => {
    db = createV15Database();

    // Run v16 migration
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // Verify wc_sessions table exists
    const wcSessions = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_sessions'",
    ).get() as { name: string } | undefined;
    expect(wcSessions).toBeDefined();
    expect(wcSessions!.name).toBe('wc_sessions');

    // Verify wc_store table exists
    const wcStore = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_store'",
    ).get() as { name: string } | undefined;
    expect(wcStore).toBeDefined();
    expect(wcStore!.name).toBe('wc_store');
  });

  it('T-16b: v15 -> v16 migration adds approval_channel to pending_approvals', () => {
    db = createV15Database();

    // Run v16 migration
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // Verify approval_channel column exists
    const columns = getTableColumns(db, 'pending_approvals');
    expect(columns).toContain('approval_channel');
  });

  it('T-16c: wc_sessions INSERT/SELECT works after v16 migration', () => {
    db = createV15Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet (needed for FK)
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-wc-16', 'WC V16', 'ethereum', 'testnet', 'ethereum-sepolia', 'pk-wc-16', 'ACTIVE', 0, ts, ts);

    // Run v16 migration
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // INSERT into wc_sessions
    db.prepare(
      `INSERT INTO wc_sessions (wallet_id, topic, chain_id, owner_address, expiry, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('w-wc-16', 'topic-v16-test', 'eip155:11155111', '0xOwnerV16', ts + 86400, ts);

    // SELECT and verify
    const row = db.prepare('SELECT * FROM wc_sessions WHERE wallet_id = ?').get('w-wc-16') as {
      wallet_id: string; topic: string; chain_id: string; owner_address: string; expiry: number;
    };
    expect(row.wallet_id).toBe('w-wc-16');
    expect(row.topic).toBe('topic-v16-test');
    expect(row.chain_id).toBe('eip155:11155111');
    expect(row.owner_address).toBe('0xOwnerV16');
    expect(row.expiry).toBe(ts + 86400);
  });

  it('T-16d: wc_store INSERT/SELECT works after v16 migration', () => {
    db = createV15Database();

    // Run v16 migration
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // INSERT into wc_store
    db.prepare(
      `INSERT INTO wc_store (key, value) VALUES (?, ?)`,
    ).run('wc:test:key', '{"data":"hello"}');

    // SELECT and verify
    const row = db.prepare('SELECT * FROM wc_store WHERE key = ?').get('wc:test:key') as {
      key: string; value: string;
    };
    expect(row.key).toBe('wc:test:key');
    expect(row.value).toBe('{"data":"hello"}');
  });

  it('T-16e: approval_channel defaults to rest_api for existing pending_approvals', () => {
    db = createV15Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + transaction + pending_approval before v16 migration
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-pa-16', 'PA V16', 'solana', 'testnet', 'devnet', 'pk-pa-16', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('tx-pa-16', 'w-pa-16', 'solana', 'TRANSFER', 'PENDING', ts, 'devnet');

    db.prepare(
      `INSERT INTO pending_approvals (id, tx_id, required_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('pa-v16', 'tx-pa-16', ts + 300, ts + 3600, ts);

    // Run v16 migration
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // Verify approval_channel defaults to 'rest_api'
    const row = db.prepare('SELECT approval_channel FROM pending_approvals WHERE id = ?').get('pa-v16') as {
      approval_channel: string;
    };
    expect(row.approval_channel).toBe('rest_api');
  });

  it('T-16f: fresh DB has wc_sessions, wc_store tables and approval_channel', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    // Verify wc_sessions table exists
    const wcSessions = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_sessions'",
    ).get() as { name: string } | undefined;
    expect(wcSessions).toBeDefined();

    // Verify wc_store table exists
    const wcStore = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_store'",
    ).get() as { name: string } | undefined;
    expect(wcStore).toBeDefined();

    // Verify approval_channel column exists
    const columns = getTableColumns(db, 'pending_approvals');
    expect(columns).toContain('approval_channel');
  });

  it('T-16g: v16 migrated schema matches fresh DB schema for new tables', () => {
    // Fresh DB
    const connA = createDatabase(':memory:');
    const freshDb = connA.sqlite;
    pushSchema(freshDb);

    // v15 migrated DB
    db = createV15Database();
    const v16 = MIGRATIONS.filter((m) => m.version === 16);
    runMigrations(db, v16);

    // Compare wc_sessions columns
    const freshWcSessionsCols = getTableColumns(freshDb, 'wc_sessions');
    const migratedWcSessionsCols = getTableColumns(db, 'wc_sessions');
    expect(migratedWcSessionsCols).toEqual(freshWcSessionsCols);

    // Compare wc_store columns
    const freshWcStoreCols = getTableColumns(freshDb, 'wc_store');
    const migratedWcStoreCols = getTableColumns(db, 'wc_store');
    expect(migratedWcStoreCols).toEqual(freshWcStoreCols);

    // Compare pending_approvals columns (v16 adds approval_channel; v39 adds approval_type later)
    // Migrated DB only has up to v16 columns, so check that v16 columns are a subset of fresh
    const migratedPaCols = getTableColumns(db, 'pending_approvals');
    expect(migratedPaCols).toContain('approval_channel');
    // Fresh DB has additional columns from later migrations (e.g. approval_type from v39)
    const freshPaCols = getTableColumns(freshDb, 'pending_approvals');
    for (const col of migratedPaCols) {
      expect(freshPaCols).toContain(col);
    }

    freshDb.close();
  });

  it('T-16h: v1 -> v16 full chain includes wc_sessions + wc_store + approval_channel', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert agent data for full chain test
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-chain-16', 'Chain V16', 'solana', 'devnet', 'pk-chain-16', 'ACTIVE', 0, ts, ts);

    // Run full pushSchema (v2 -> v16 chain)
    pushSchema(db);

    // Verify final version is 19
    const versions = getVersions(db);
    expect(versions).toContain(19);
    expect(Math.max(...versions)).toBe(63);

    // Verify wc_sessions and wc_store tables exist
    const wcSessions = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_sessions'",
    ).get() as { name: string } | undefined;
    expect(wcSessions).toBeDefined();

    const wcStore = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='wc_store'",
    ).get() as { name: string } | undefined;
    expect(wcStore).toBeDefined();

    // Verify approval_channel column exists
    const columns = getTableColumns(db, 'pending_approvals');
    expect(columns).toContain('approval_channel');

    // Verify wc_sessions INSERT works (need wallet for FK)
    db.prepare(
      `INSERT INTO wc_sessions (wallet_id, topic, chain_id, owner_address, expiry, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('a-chain-16', 'topic-chain-16', 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', 'ownerChain16', ts + 86400, ts);

    const wcRow = db.prepare('SELECT topic FROM wc_sessions WHERE wallet_id = ?').get('a-chain-16') as { topic: string };
    expect(wcRow.topic).toBe('topic-chain-16');

    // Verify wc_store INSERT works
    db.prepare('INSERT INTO wc_store (key, value) VALUES (?, ?)').run('test-key', '"test-value"');
    const storeRow = db.prepare('SELECT value FROM wc_store WHERE key = ?').get('test-key') as { value: string };
    expect(storeRow.value).toBe('"test-value"');
  });
});

// ---------------------------------------------------------------------------
// T-17: v24 migration: wallet_type column for preset auto-setup
// ---------------------------------------------------------------------------

describe('v24 migration: wallet_type column for preset auto-setup', () => {
  let db: DatabaseType;

  afterEach(() => {
    try { db.close(); } catch { /* already closed */ }
  });

  /**
   * Create a v23 state DB: v5 + apply v6-v23 migrations manually.
   */
  function createV23Database(): DatabaseType {
    const v5Db = createV5SchemaDatabase();
    const v6to23 = MIGRATIONS.filter((m) => m.version >= 6 && m.version <= 23);
    runMigrations(v5Db, v6to23);
    return v5Db;
  }

  it('T-17a (T-v24-1): v23 -> v24 migration adds wallet_type column with NULL default', () => {
    db = createV23Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet before migration
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v24-pre', 'Pre V24', 'solana', 'testnet', 'devnet', 'pk-v24-pre', 'ACTIVE', 0, ts, ts);

    // Run v24 migration
    const v24 = MIGRATIONS.filter((m) => m.version === 24);
    runMigrations(db, v24);

    // Verify wallet_type column exists
    const columns = getTableColumns(db, 'wallets');
    expect(columns).toContain('wallet_type');

    // Verify existing wallet has wallet_type = NULL
    const wallet = db.prepare('SELECT wallet_type FROM wallets WHERE id = ?').get('w-v24-pre') as { wallet_type: string | null };
    expect(wallet.wallet_type).toBeNull();
  });

  it('T-17b (T-v24-2): fresh DB LATEST_SCHEMA_VERSION is 39', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    expect(LATEST_SCHEMA_VERSION).toBe(63);

    const versions = getVersions(db);
    expect(versions).toContain(24);
  });

  it('T-17c (T-v24-3): v24 migration preserves existing wallet data with wallet_type NULL (backward compat)', () => {
    db = createV23Database();
    const ts = Math.floor(Date.now() / 1000);

    // Insert multiple wallets before migration
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at, owner_approval_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v24-compat1', 'Compat 1', 'solana', 'testnet', 'devnet', 'pk-v24-c1', 'ACTIVE', 0, ts, ts, 'walletconnect');

    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, default_network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-v24-compat2', 'Compat 2', 'ethereum', 'mainnet', 'ethereum-mainnet', 'pk-v24-c2', 'ACTIVE', 0, ts, ts);

    // Run v24 migration
    const v24 = MIGRATIONS.filter((m) => m.version === 24);
    runMigrations(db, v24);

    // Verify all existing wallets have wallet_type = NULL
    const w1 = db.prepare('SELECT wallet_type, owner_approval_method FROM wallets WHERE id = ?').get('w-v24-compat1') as {
      wallet_type: string | null; owner_approval_method: string | null;
    };
    expect(w1.wallet_type).toBeNull();
    expect(w1.owner_approval_method).toBe('walletconnect');

    const w2 = db.prepare('SELECT wallet_type FROM wallets WHERE id = ?').get('w-v24-compat2') as { wallet_type: string | null };
    expect(w2.wallet_type).toBeNull();
  });

  it('T-17d (T-v24-4): fresh DB wallets table includes wallet_type column', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    const columns = getTableColumns(db, 'wallets');
    expect(columns).toContain('wallet_type');
    // v27 drops default_network
    expect(columns).not.toContain('default_network');

    // Verify wallet_type can be inserted and read back
    const ts = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, wallet_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-fresh-v24', 'Fresh V24', 'solana', 'testnet', 'pk-fresh-v24', 'ACTIVE', 0, ts, ts, 'dcent');

    const wallet = db.prepare('SELECT wallet_type FROM wallets WHERE id = ?').get('w-fresh-v24') as { wallet_type: string };
    expect(wallet.wallet_type).toBe('dcent');
  });

  it('T-17e: v24 migrated DB schema matches fresh DB wallets columns', () => {
    // Fresh DB
    const connA = createDatabase(':memory:');
    const freshDb = connA.sqlite;
    pushSchema(freshDb);

    // v23 migrated DB -> apply v24+ for full equivalence
    db = createV23Database();
    const v24plus = MIGRATIONS.filter((m) => m.version >= 24);
    runMigrations(db, v24plus);

    // Compare wallets columns
    const freshCols = getTableColumns(freshDb, 'wallets');
    const migratedCols = getTableColumns(db, 'wallets');
    expect(migratedCols).toEqual(freshCols);

    freshDb.close();
  });

  it('T-17f: v1 -> v24 full chain migration includes wallet_type', () => {
    db = createV1SchemaDatabase();
    const ts = Math.floor(Date.now() / 1000);

    // Insert agent data for full chain test
    db.prepare(
      `INSERT INTO agents (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('a-chain-24', 'Chain V24', 'solana', 'devnet', 'pk-chain-24', 'ACTIVE', 0, ts, ts);

    // Run full pushSchema (v2 -> v24 chain)
    pushSchema(db);

    // Verify final version is 24
    const versions = getVersions(db);
    expect(versions).toContain(24);
    expect(Math.max(...versions)).toBe(63);

    // Verify wallets table has wallet_type column
    const columns = getTableColumns(db, 'wallets');
    expect(columns).toContain('wallet_type');

    // Verify existing data has wallet_type = NULL
    const wallet = db.prepare('SELECT wallet_type FROM wallets WHERE id = ?').get('a-chain-24') as { wallet_type: string | null };
    expect(wallet.wallet_type).toBeNull();

    // Verify wallet_type can be set
    db.prepare('UPDATE wallets SET wallet_type = ? WHERE id = ?').run('dcent', 'a-chain-24');
    const updated = db.prepare('SELECT wallet_type FROM wallets WHERE id = ?').get('a-chain-24') as { wallet_type: string };
    expect(updated.wallet_type).toBe('dcent');
  });

  // ─────────────────────────────────────────────────────────────────────
  // v48: Purge mock defi_positions data from Kamino/Drift (#269)
  // ─────────────────────────────────────────────────────────────────────

  it('T-v48: v48 migration purges kamino/drift_perp mock defi_positions', () => {
    // Create a fresh DB, insert mock data, then downgrade version to test migration
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    const ts = Math.floor(Date.now() / 1000);
    const walletId = 'w-v48-test';
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(walletId, 'V48 Wallet', 'solana', 'mainnet', 'pk-v48', 'ACTIVE', 0, ts, ts);

    db.prepare(
      `INSERT INTO defi_positions (id, wallet_id, category, provider, chain, amount, status, opened_at, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pos-k1', walletId, 'LENDING', 'kamino', 'solana', '10000000000', 'ACTIVE', ts, ts, ts, ts);
    db.prepare(
      `INSERT INTO defi_positions (id, wallet_id, category, provider, chain, amount, status, opened_at, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pos-d1', walletId, 'PERP', 'drift_perp', 'solana', '100', 'ACTIVE', ts, ts, ts, ts);
    db.prepare(
      `INSERT INTO defi_positions (id, wallet_id, category, provider, chain, amount, status, opened_at, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pos-l1', walletId, 'STAKING', 'lido_staking', 'ethereum', '5000', 'ACTIVE', ts, ts, ts, ts);

    // Downgrade version to v47 to trigger v48 migration
    db.exec('DELETE FROM schema_version WHERE version >= 48');
    expect(Math.max(...getVersions(db))).toBe(47);

    const v48Only = MIGRATIONS.filter((m) => m.version === 48);
    runMigrations(db, v48Only);
    expect(Math.max(...getVersions(db))).toBe(48);

    // Kamino and drift_perp should be deleted
    const kaminoCount = (db.prepare("SELECT COUNT(*) as c FROM defi_positions WHERE provider = 'kamino'").get() as { c: number }).c;
    const driftCount = (db.prepare("SELECT COUNT(*) as c FROM defi_positions WHERE provider = 'drift_perp'").get() as { c: number }).c;
    expect(kaminoCount).toBe(0);
    expect(driftCount).toBe(0);

    // Lido should be preserved
    const lidoCount = (db.prepare("SELECT COUNT(*) as c FROM defi_positions WHERE provider = 'lido_staking'").get() as { c: number }).c;
    expect(lidoCount).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // v49: Convert bugged smart account wallets to EOA (#272)
  // ─────────────────────────────────────────────────────────────────────

  it('T-v49: v49 migration converts bugged smart wallets (signer_key=NULL) to EOA', () => {
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    // Downgrade to v48 by removing v49
    db.exec('DELETE FROM schema_version WHERE version >= 49');

    const ts = Math.floor(Date.now() / 1000);

    // Insert bugged smart wallet (created while smartAccountService was missing)
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, account_type, signer_key, deployed, entry_point)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-bugged-aa', 'Bugged AA', 'ethereum', 'testnet', '0xEOA_ADDRESS', 'ACTIVE', 0, ts, ts, 'smart', null, 1, null);

    // Insert correct smart wallet (has signer_key)
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, account_type, signer_key, deployed, entry_point)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-correct-aa', 'Correct AA', 'ethereum', 'testnet', '0xAA_ADDRESS', 'ACTIVE', 0, ts, ts, 'smart', '0xSIGNER', 0, '0x0000000071727De22E5E9d8BAf0edAc6f37da032');

    // Insert normal EOA wallet (should not be affected)
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, account_type, signer_key, deployed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-eoa', 'Normal EOA', 'ethereum', 'testnet', '0xEOA2', 'ACTIVE', 0, ts, ts, 'eoa', null, 1);

    expect(Math.max(...getVersions(db))).toBe(48);

    // Run v49 migration
    const v49Only = MIGRATIONS.filter((m) => m.version === 49);
    runMigrations(db, v49Only);

    expect(Math.max(...getVersions(db))).toBe(49);

    // Bugged smart wallet should be converted to EOA
    const bugged = db.prepare('SELECT account_type, signer_key, deployed, entry_point FROM wallets WHERE id = ?').get('w-bugged-aa') as {
      account_type: string; signer_key: string | null; deployed: number; entry_point: string | null;
    };
    expect(bugged.account_type).toBe('eoa');
    expect(bugged.deployed).toBe(1);
    expect(bugged.entry_point).toBeNull();

    // Correct smart wallet should remain unchanged
    const correct = db.prepare('SELECT account_type, signer_key, deployed, entry_point FROM wallets WHERE id = ?').get('w-correct-aa') as {
      account_type: string; signer_key: string | null; deployed: number; entry_point: string | null;
    };
    expect(correct.account_type).toBe('smart');
    expect(correct.signer_key).toBe('0xSIGNER');
    expect(correct.deployed).toBe(0);
    expect(correct.entry_point).toBe('0x0000000071727De22E5E9d8BAf0edAc6f37da032');

    // EOA wallet should remain unchanged
    const eoa = db.prepare('SELECT account_type, signer_key FROM wallets WHERE id = ?').get('w-eoa') as {
      account_type: string; signer_key: string | null;
    };
    expect(eoa.account_type).toBe('eoa');
    expect(eoa.signer_key).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────
  // v62: defi_positions column order mismatch (issue #480)
  // environment was added via ALTER TABLE ADD (last column in source)
  // but v62 new table defines it at position 6. SELECT * breaks.
  // ─────────────────────────────────────────────────────────────────────

  it('T-v62: v62 migration preserves defi_positions with ALTER TABLE ADD column order', () => {
    // Full chain migration to v61 — this produces the real column order
    // where environment sits at the end (added via ALTER TABLE ADD in v30)
    const conn = createDatabase(':memory:');
    db = conn.sqlite;
    pushSchema(db);

    // Downgrade to v61
    db.exec('DELETE FROM schema_version WHERE version >= 62');
    expect(Math.max(...getVersions(db))).toBe(61);

    const ts = Math.floor(Date.now() / 1000);
    const walletId = 'w-v62-test';
    db.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(walletId, 'V62 Wallet', 'solana', 'mainnet', 'pk-v62', 'ACTIVE', 0, ts, ts);

    // Insert defi_positions seed data
    db.prepare(
      `INSERT INTO defi_positions (id, wallet_id, category, provider, chain, environment, network, asset_id, amount, amount_usd, metadata, status, opened_at, closed_at, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pos-v62-1', walletId, 'LENDING', 'aave_v3', 'ethereum', 'mainnet', 'ethereum-mainnet', 'caip19:eip155:1/erc20:0xA0b8', '1000000', 1500.5, '{"apy":0.05}', 'ACTIVE', ts - 86400, null, ts, ts, ts);

    db.prepare(
      `INSERT INTO defi_positions (id, wallet_id, category, provider, chain, environment, network, asset_id, amount, amount_usd, metadata, status, opened_at, closed_at, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('pos-v62-2', walletId, 'STAKING', 'lido_staking', 'ethereum', 'testnet', 'ethereum-sepolia', null, '500', null, null, 'ACTIVE', ts - 3600, null, ts, ts, ts);

    // Run v62 migration
    const v62Only = MIGRATIONS.filter((m) => m.version === 62);
    db.pragma('foreign_keys = OFF');
    runMigrations(db, v62Only);

    expect(Math.max(...getVersions(db))).toBe(62);

    // Verify data integrity — values must be in correct columns
    const pos1 = db.prepare('SELECT * FROM defi_positions WHERE id = ?').get('pos-v62-1') as Record<string, unknown>;
    expect(pos1.wallet_id).toBe(walletId);
    expect(pos1.category).toBe('LENDING');
    expect(pos1.provider).toBe('aave_v3');
    expect(pos1.chain).toBe('ethereum');
    expect(pos1.environment).toBe('mainnet');
    expect(pos1.network).toBe('ethereum-mainnet');
    expect(pos1.asset_id).toBe('caip19:eip155:1/erc20:0xA0b8');
    expect(pos1.amount).toBe('1000000');
    expect(pos1.amount_usd).toBeCloseTo(1500.5);
    expect(pos1.metadata).toBe('{"apy":0.05}');
    expect(pos1.status).toBe('ACTIVE');
    expect(pos1.opened_at).toBe(ts - 86400);
    expect(pos1.closed_at).toBeNull();
    expect(pos1.last_synced_at).toBe(ts);

    const pos2 = db.prepare('SELECT * FROM defi_positions WHERE id = ?').get('pos-v62-2') as Record<string, unknown>;
    expect(pos2.environment).toBe('testnet');
    expect(pos2.network).toBe('ethereum-sepolia');
    expect(pos2.asset_id).toBeNull();
    expect(pos2.amount_usd).toBeNull();
    expect(pos2.metadata).toBeNull();
    expect(pos2.opened_at).toBe(ts - 3600);
  });
});
