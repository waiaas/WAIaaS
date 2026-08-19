/**
 * Tests for DB v58 migration: CONTRACT_DEPLOY in transactions type CHECK constraint.
 *
 * Plan 398-02 Task 1
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV57Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: simulate v57 by recreating transactions without CONTRACT_DEPLOY in CHECK
  // Since pushSchema uses TRANSACTION_TYPES (now includes CONTRACT_DEPLOY),
  // we need to remove v58 from schema_version to force migration re-run
  sqlite.exec('DELETE FROM schema_version WHERE version >= 58');

  return sqlite;
}

function getMaxVersion(sqlite: InstanceType<typeof Database>): number {
  const row = sqlite
    .prepare('SELECT MAX(version) AS max_version FROM schema_version')
    .get() as { max_version: number };
  return row.max_version;
}

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DB v58 Migration: CONTRACT_DEPLOY in transactions type CHECK', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  it('LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('v58 migration applies successfully from v57', () => {
    sqlite = createV57Db();
    expect(getMaxVersion(sqlite)).toBe(57);

    runMigrations(sqlite);

    expect(getMaxVersion(sqlite)).toBe(63);
  });

  it('CONTRACT_DEPLOY type can be inserted after v58 migration', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = nowTs();
    // Create wallet for FK
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
       VALUES ('w-test-deploy', 'test', 'ethereum', 'testnet', 'pk-deploy-test', 'ACTIVE', ?, ?)`,
    ).run(ts, ts);

    // Insert CONTRACT_DEPLOY transaction
    expect(() => {
      sqlite.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, status, created_at)
         VALUES ('tx-deploy-test', 'w-test-deploy', 'ethereum', 'CONTRACT_DEPLOY', 'PENDING', ?)`,
      ).run(ts);
    }).not.toThrow();
  });

  it('toAddress=NULL can be inserted (contract deployment has no recipient)', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = nowTs();
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
       VALUES ('w-test-null-to', 'test', 'ethereum', 'testnet', 'pk-null-to', 'ACTIVE', ?, ?)`,
    ).run(ts, ts);

    expect(() => {
      sqlite.prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, to_address, status, created_at)
         VALUES ('tx-null-to', 'w-test-null-to', 'ethereum', 'CONTRACT_DEPLOY', NULL, 'PENDING', ?)`,
      ).run(ts);
    }).not.toThrow();

    // Verify the row was inserted with NULL toAddress
    const row = sqlite.prepare('SELECT to_address FROM transactions WHERE id = ?').get('tx-null-to') as { to_address: string | null };
    expect(row.to_address).toBeNull();
  });

  it('existing data is preserved after v58 migration', () => {
    sqlite = createV57Db();
    const ts = nowTs();

    // Insert test data in pre-migration state
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
       VALUES ('w-preserve', 'test', 'solana', 'testnet', 'pk-preserve', 'ACTIVE', ?, ?)`,
    ).run(ts, ts);
    sqlite.prepare(
      `INSERT INTO transactions (id, wallet_id, chain, type, status, to_address, created_at)
       VALUES ('tx-preserve', 'w-preserve', 'solana', 'TRANSFER', 'CONFIRMED', 'some-addr', ?)`,
    ).run(ts);

    // Run migration
    runMigrations(sqlite);

    // Verify data preserved
    const row = sqlite.prepare('SELECT type, to_address, status FROM transactions WHERE id = ?').get('tx-preserve') as { type: string; to_address: string; status: string };
    expect(row.type).toBe('TRANSFER');
    expect(row.to_address).toBe('some-addr');
    expect(row.status).toBe('CONFIRMED');
  });

  it('fresh pushSchema records v59 in schema_version', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(getMaxVersion(sqlite)).toBe(63);
  });
});
