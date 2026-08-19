/**
 * Tests for DB v57 migration: composite index on transactions(action_kind, bridge_status).
 *
 * Plan 389-01 Task 2
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV56Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v57 artifacts to simulate a v56 DB
  sqlite.exec('DROP INDEX IF EXISTS idx_transactions_action_kind_bridge_status');
  sqlite.exec('DELETE FROM schema_version WHERE version >= 57');

  return sqlite;
}

function getMaxVersion(sqlite: InstanceType<typeof Database>): number {
  const row = sqlite
    .prepare('SELECT MAX(version) AS max_version FROM schema_version')
    .get() as { max_version: number };
  return row.max_version;
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

describe('DB v57 Migration: composite index idx_transactions_action_kind_bridge_status', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  it('LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('v57 migration creates composite index', () => {
    sqlite = createV56Db();
    expect(getMaxVersion(sqlite)).toBe(56);
    expect(indexExists(sqlite, 'idx_transactions_action_kind_bridge_status')).toBe(false);

    runMigrations(sqlite);

    expect(getMaxVersion(sqlite)).toBe(63);
    expect(indexExists(sqlite, 'idx_transactions_action_kind_bridge_status')).toBe(true);
  });

  it('v57 migration is idempotent (CREATE INDEX IF NOT EXISTS)', () => {
    sqlite = createV56Db();
    runMigrations(sqlite);
    expect(indexExists(sqlite, 'idx_transactions_action_kind_bridge_status')).toBe(true);

    // Running again should not error
    sqlite.exec('DELETE FROM schema_version WHERE version = 57');
    expect(() => runMigrations(sqlite)).not.toThrow();
    expect(indexExists(sqlite, 'idx_transactions_action_kind_bridge_status')).toBe(true);
  });

  it('fresh pushSchema records latest version in schema_version', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(getMaxVersion(sqlite)).toBe(63);
    expect(indexExists(sqlite, 'idx_transactions_action_kind_bridge_status')).toBe(true);
  });
});
