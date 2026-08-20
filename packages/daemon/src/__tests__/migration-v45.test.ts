/**
 * Tests for DB v45 migration: userop_builds table for UserOp Build/Sign API.
 *
 * Plan 338-02 Task 2: DB v45 migration + Drizzle schema
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV44Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v45+ artifacts to simulate a v44 DB
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DROP TABLE IF EXISTS userop_builds');
  sqlite.exec('DROP INDEX IF EXISTS idx_userop_builds_wallet_id');
  sqlite.exec('DROP INDEX IF EXISTS idx_userop_builds_expires');
  // v47 adds factory_address column to wallets -- drop it to allow re-migration
  sqlite.exec('ALTER TABLE wallets DROP COLUMN factory_address');
  sqlite.exec('DELETE FROM schema_version WHERE version >= 45');
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

describe('DB v45 Migration: userop_builds', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  // Test 1: LATEST_SCHEMA_VERSION === 45
  it('T1: LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  // Test 2: userop_builds table exists with 9 columns
  it('T2: userop_builds has all required columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'userop_builds')).toBe(true);
    const cols = getTableColumns(sqlite, 'userop_builds');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('call_data');
    expect(cols).toContain('sender');
    expect(cols).toContain('nonce');
    expect(cols).toContain('entry_point');
    expect(cols).toContain('created_at');
    expect(cols).toContain('expires_at');
    expect(cols).toContain('used');
    expect(cols).toContain('network');
    expect(cols).toHaveLength(10);
  });

  // Test 3: INSERT and SELECT from userop_builds
  it('T3: can INSERT and SELECT from userop_builds', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    const expires = ts + 600; // 10 minutes

    sqlite.prepare(
      'INSERT INTO userop_builds (id, wallet_id, call_data, sender, nonce, entry_point, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      'build-001',
      'wallet-001',
      '0xabcdef',
      '0x1234567890abcdef1234567890abcdef12345678',
      '0x01',
      '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      ts,
      expires,
      0,
    );

    const row = sqlite.prepare('SELECT * FROM userop_builds WHERE id = ?').get('build-001') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.wallet_id).toBe('wallet-001');
    expect(row.call_data).toBe('0xabcdef');
    expect(row.sender).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(row.nonce).toBe('0x01');
    expect(row.entry_point).toBe('0x0000000071727De22E5E9d8BAf0edAc6f37da032');
    expect(row.created_at).toBe(ts);
    expect(row.expires_at).toBe(expires);
    expect(row.used).toBe(0);
  });

  // Test 4: wallet_id is TEXT (not FK to wallets for simplicity)
  it('T4: wallet_id column exists and accepts text values', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    // Insert without a corresponding wallets row (TEXT, not FK)
    expect(() => {
      sqlite.prepare(
        'INSERT INTO userop_builds (id, wallet_id, call_data, sender, nonce, entry_point, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('build-fk', 'nonexistent-wallet', '0x', '0x' + '00'.repeat(20), '0x00', '0x' + '00'.repeat(20), ts, ts + 600, 0);
    }).not.toThrow();
  });

  // Test 5: v44 -> v45 incremental migration
  it('T5: existing DB at v44 migrates to v45 successfully', () => {
    sqlite = createV44Db();
    expect(tableExists(sqlite, 'userop_builds')).toBe(false);
    expect(getMaxVersion(sqlite)).toBe(44);

    runMigrations(sqlite);

    expect(tableExists(sqlite, 'userop_builds')).toBe(true);
    expect(getMaxVersion(sqlite)).toBe(63);

    const cols = getTableColumns(sqlite, 'userop_builds');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('call_data');
    expect(cols).toContain('expires_at');
    expect(cols).toContain('used');
  });

  // Test 6: idx_userop_builds_wallet_id index exists
  it('T6: idx_userop_builds_wallet_id index exists', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_userop_builds_wallet_id')).toBe(true);
  });

  // Test 7: idx_userop_builds_expires index exists
  it('T7: idx_userop_builds_expires index exists', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_userop_builds_expires')).toBe(true);
  });

  // Test 8: used column default value is 0
  it('T8: used column defaults to 0', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);

    // Insert without specifying 'used' -- should default to 0
    sqlite.prepare(
      'INSERT INTO userop_builds (id, wallet_id, call_data, sender, nonce, entry_point, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('build-default', 'w1', '0x', '0x' + '00'.repeat(20), '0x00', '0x' + '00'.repeat(20), ts, ts + 600);

    const row = sqlite.prepare('SELECT used FROM userop_builds WHERE id = ?').get('build-default') as { used: number };
    expect(row.used).toBe(0);
  });
});
