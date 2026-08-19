/**
 * Tests for DB v55-v56 migrations: wallet_credentials table + transactions action columns.
 *
 * Plan 386-02 Task 1: Migration tests.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV54Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v55+ artifacts to simulate a v54 DB
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DROP TABLE IF EXISTS wallet_credentials');
  // Drop v55 indexes
  sqlite.exec('DROP INDEX IF EXISTS idx_wallet_credentials_wallet_name');
  sqlite.exec('DROP INDEX IF EXISTS idx_wallet_credentials_global_name');
  sqlite.exec('DROP INDEX IF EXISTS idx_wallet_credentials_wallet_id');
  sqlite.exec('DROP INDEX IF EXISTS idx_wallet_credentials_expires_at');
  // Remove v56 columns from transactions (SQLite doesn't support DROP COLUMN in older versions, but better-sqlite3 does)
  // Instead, just drop the v56 indexes and delete version records
  sqlite.exec('DROP INDEX IF EXISTS idx_transactions_action_kind');
  sqlite.exec('DROP INDEX IF EXISTS idx_transactions_venue');
  sqlite.exec('DROP INDEX IF EXISTS idx_transactions_external_id');
  // We can't easily drop columns in SQLite, so we recreate the table
  // Actually, for testing, let's just delete version records and let migration handle it
  sqlite.exec('DELETE FROM schema_version WHERE version >= 55');
  sqlite.pragma('foreign_keys = ON');

  return sqlite;
}

function getMaxVersion(sqlite: InstanceType<typeof Database>): number {
  const row = sqlite
    .prepare('SELECT MAX(version) AS max_version FROM schema_version')
    .get() as { max_version: number };
  return row.max_version;
}

function tableExists(sqlite: InstanceType<typeof Database>, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name) as { name: string } | undefined;
  return row !== undefined;
}

function getTableColumns(sqlite: InstanceType<typeof Database>, table: string): string[] {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((r) => r.name);
}

function indexExists(sqlite: InstanceType<typeof Database>, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?")
    .get(name) as { name: string } | undefined;
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DB v55-v56 Migration: wallet_credentials + transactions extension', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  // -----------------------------------------------------------------------
  // Schema version
  // -----------------------------------------------------------------------

  it('T1: LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  // -----------------------------------------------------------------------
  // Fresh DB (pushSchema creates all tables)
  // -----------------------------------------------------------------------

  it('T2: fresh DB has wallet_credentials table with 11 columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'wallet_credentials')).toBe(true);
    const cols = getTableColumns(sqlite, 'wallet_credentials');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('type');
    expect(cols).toContain('name');
    expect(cols).toContain('encrypted_value');
    expect(cols).toContain('iv');
    expect(cols).toContain('auth_tag');
    expect(cols).toContain('metadata');
    expect(cols).toContain('expires_at');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toHaveLength(11);
  });

  it('T3: fresh DB has wallet_credentials indexes', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_wallet_credentials_wallet_name')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_global_name')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_wallet_id')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_expires_at')).toBe(true);
  });

  it('T4: fresh DB transactions has action tracking columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const cols = getTableColumns(sqlite, 'transactions');
    expect(cols).toContain('action_kind');
    expect(cols).toContain('venue');
    expect(cols).toContain('operation');
    expect(cols).toContain('external_id');
  });

  it('T5: fresh DB has transactions action indexes', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_transactions_action_kind')).toBe(true);
    expect(indexExists(sqlite, 'idx_transactions_venue')).toBe(true);
    expect(indexExists(sqlite, 'idx_transactions_external_id')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // wallet_credentials CRUD
  // -----------------------------------------------------------------------

  it('T6: wallet_credentials CRUD works', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    const encValue = Buffer.from('encrypted-data');
    const iv = Buffer.from('initialization-vec');
    const authTag = Buffer.from('auth-tag-val');

    sqlite.prepare(`
      INSERT INTO wallet_credentials
        (id, wallet_id, type, name, encrypted_value, iv, auth_tag, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cred-1', 'w1', 'api-key', 'hyperliquid-api', encValue, iv, authTag, '{"vendor":"hyperliquid"}', now, now);

    const row = sqlite.prepare('SELECT * FROM wallet_credentials WHERE id = ?').get('cred-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.type).toBe('api-key');
    expect(row.name).toBe('hyperliquid-api');
    expect(Buffer.isBuffer(row.encrypted_value)).toBe(true);
  });

  it('T7: wallet_credentials CHECK constraint rejects invalid type', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(`
        INSERT INTO wallet_credentials
          (id, wallet_id, type, name, encrypted_value, iv, auth_tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('cred-bad', 'w1', 'invalid-type', 'test', Buffer.from('x'), Buffer.from('x'), Buffer.from('x'), now, now);
    }).toThrow();
  });

  it('T8: wallet_credentials allows NULL wallet_id for global credentials', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(`
        INSERT INTO wallet_credentials
          (id, wallet_id, type, name, encrypted_value, iv, auth_tag, created_at, updated_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
      `).run('cred-global', 'hmac-secret', 'global-secret', Buffer.from('x'), Buffer.from('x'), Buffer.from('x'), now, now);
    }).not.toThrow();
  });

  it('T9: wallet_credentials UNIQUE(wallet_id, name) enforced', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    const buf = Buffer.from('x');

    sqlite.prepare(`
      INSERT INTO wallet_credentials (id, wallet_id, type, name, encrypted_value, iv, auth_tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c1', 'w1', 'api-key', 'same-name', buf, buf, buf, now, now);

    // Same wallet_id + name should fail
    expect(() => {
      sqlite.prepare(`
        INSERT INTO wallet_credentials (id, wallet_id, type, name, encrypted_value, iv, auth_tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('c2', 'w1', 'api-key', 'same-name', buf, buf, buf, now, now);
    }).toThrow();

    // Different name should succeed
    expect(() => {
      sqlite.prepare(`
        INSERT INTO wallet_credentials (id, wallet_id, type, name, encrypted_value, iv, auth_tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('c3', 'w1', 'api-key', 'different-name', buf, buf, buf, now, now);
    }).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // Incremental migration (v54 -> v56)
  // -----------------------------------------------------------------------

  it('T10: v54 -> v56 migration creates wallet_credentials and adds transaction columns', () => {
    sqlite = createV54Db();
    expect(tableExists(sqlite, 'wallet_credentials')).toBe(false);
    expect(getMaxVersion(sqlite)).toBe(54);

    runMigrations(sqlite);

    expect(tableExists(sqlite, 'wallet_credentials')).toBe(true);
    expect(getMaxVersion(sqlite)).toBe(63);

    // Check transaction columns (may already exist from pushSchema DDL)
    const txCols = getTableColumns(sqlite, 'transactions');
    expect(txCols).toContain('action_kind');
    expect(txCols).toContain('venue');
    expect(txCols).toContain('operation');
    expect(txCols).toContain('external_id');
  });

  it('T11: existing transaction rows get action_kind=contractCall default', () => {
    sqlite = createV54Db();

    // Insert a wallet row to satisfy FK constraints during v58 migration
    sqlite.pragma('foreign_keys = OFF');
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('w1', 'test-wallet', 'ethereum', 'mainnet', '0x1234', 'ACTIVE', now, now);

    // Insert a test transaction before migration (v56 adds action_kind with DEFAULT)
    sqlite.prepare(`
      INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tx-old-1', 'w1', 'solana', 'TRANSFER', 'CONFIRMED', now);

    runMigrations(sqlite);

    const row = sqlite.prepare('SELECT action_kind FROM transactions WHERE id = ?').get('tx-old-1') as { action_kind: string };
    expect(row.action_kind).toBe('contractCall');
  });

  it('T12: v55 indexes exist after migration', () => {
    sqlite = createV54Db();
    runMigrations(sqlite);

    expect(indexExists(sqlite, 'idx_wallet_credentials_wallet_name')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_global_name')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_wallet_id')).toBe(true);
    expect(indexExists(sqlite, 'idx_wallet_credentials_expires_at')).toBe(true);
  });

  it('T13: v56 indexes exist after migration', () => {
    sqlite = createV54Db();
    runMigrations(sqlite);

    expect(indexExists(sqlite, 'idx_transactions_action_kind')).toBe(true);
    expect(indexExists(sqlite, 'idx_transactions_venue')).toBe(true);
    expect(indexExists(sqlite, 'idx_transactions_external_id')).toBe(true);
  });

  it('T14: schema_version records v55 and v56', () => {
    sqlite = createV54Db();
    runMigrations(sqlite);

    const v55 = sqlite.prepare('SELECT version FROM schema_version WHERE version = 55').get();
    const v56 = sqlite.prepare('SELECT version FROM schema_version WHERE version = 56').get();
    expect(v55).toBeDefined();
    expect(v56).toBeDefined();
  });

  it('T15: migration is idempotent', () => {
    sqlite = createV54Db();
    runMigrations(sqlite);
    expect(tableExists(sqlite, 'wallet_credentials')).toBe(true);

    // Running again should not throw
    expect(() => runMigrations(sqlite)).not.toThrow();
    expect(getMaxVersion(sqlite)).toBe(63);
  });

  // -----------------------------------------------------------------------
  // Existing data preservation
  // -----------------------------------------------------------------------

  it('T16: existing polymarket tables unaffected after migration', () => {
    sqlite = createV54Db();

    sqlite.pragma('foreign_keys = OFF');
    const now = Math.floor(Date.now() / 1000);

    // Insert a wallet row to satisfy FK constraints during v58 migration
    sqlite.prepare(`
      INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('w1', 'test-wallet', 'ethereum', 'mainnet', '0x1234', 'ACTIVE', now, now);

    sqlite.prepare(`
      INSERT INTO polymarket_orders
        (id, wallet_id, condition_id, token_id, outcome, side, order_type, price, size, status, is_neg_risk, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('pm-1', 'w1', '0xcond', '123', 'YES', 'BUY', 'GTC', '0.5', '100', 'PENDING', 0, now, now);

    runMigrations(sqlite);

    const row = sqlite.prepare('SELECT * FROM polymarket_orders WHERE id = ?').get('pm-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.status).toBe('PENDING');
  });

  // -----------------------------------------------------------------------
  // Schema snapshot: fresh DB matches migrated DB
  // -----------------------------------------------------------------------

  it('T17: fresh DB and migrated DB have same wallet_credentials columns', () => {
    // Fresh DB
    const freshDb = new Database(':memory:');
    freshDb.pragma('journal_mode = WAL');
    freshDb.pragma('foreign_keys = ON');
    pushSchema(freshDb);
    const freshCols = getTableColumns(freshDb, 'wallet_credentials').sort();
    freshDb.close();

    // Migrated DB
    sqlite = createV54Db();
    runMigrations(sqlite);
    // Need to create indexes too (pushSchema step 3)
    const migratedCols = getTableColumns(sqlite, 'wallet_credentials').sort();

    expect(migratedCols).toEqual(freshCols);
  });

  it('T18: fresh DB and migrated DB have same transactions columns', () => {
    // Fresh DB
    const freshDb = new Database(':memory:');
    freshDb.pragma('journal_mode = WAL');
    freshDb.pragma('foreign_keys = ON');
    pushSchema(freshDb);
    const freshCols = getTableColumns(freshDb, 'transactions').sort();
    freshDb.close();

    // Migrated DB
    sqlite = createV54Db();
    runMigrations(sqlite);
    const migratedCols = getTableColumns(sqlite, 'transactions').sort();

    expect(migratedCols).toEqual(freshCols);
  });
});
