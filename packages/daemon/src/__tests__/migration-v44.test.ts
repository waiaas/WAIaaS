/**
 * Tests for DB v44 migration: nft_metadata_cache table for NFT metadata caching.
 *
 * Plan 333-02 Task 2: DB v44 migration + Drizzle schema
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV43Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v44+ artifacts to simulate a v43 DB
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DROP TABLE IF EXISTS nft_metadata_cache');
  sqlite.exec('DROP INDEX IF EXISTS idx_nft_cache_unique');
  sqlite.exec('DROP INDEX IF EXISTS idx_nft_cache_expires');
  // Remove factory_address column added by v47
  sqlite.exec('ALTER TABLE wallets DROP COLUMN factory_address');
  sqlite.exec('DELETE FROM schema_version WHERE version >= 44');
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

describe('DB v44 Migration: nft_metadata_cache', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  // Test 1: Fresh DB has LATEST_SCHEMA_VERSION=44
  it('T1: fresh DB has LATEST_SCHEMA_VERSION=44', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(LATEST_SCHEMA_VERSION).toBe(63);
    expect(getMaxVersion(sqlite)).toBe(63);
  });

  // Test 2: nft_metadata_cache table exists with correct columns
  it('T2: nft_metadata_cache has all required columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'nft_metadata_cache')).toBe(true);
    const cols = getTableColumns(sqlite, 'nft_metadata_cache');
    expect(cols).toContain('id');
    expect(cols).toContain('contract_address');
    expect(cols).toContain('token_id');
    expect(cols).toContain('chain');
    expect(cols).toContain('network');
    expect(cols).toContain('metadata_json');
    expect(cols).toContain('cached_at');
    expect(cols).toContain('expires_at');
    expect(cols).toHaveLength(8);
  });

  // Test 3: Unique constraint on (contract_address, token_id, chain, network)
  it('T3: unique constraint on (contract_address, token_id, chain, network)', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    const expires = ts + 86400;

    // First insert succeeds
    sqlite.prepare(
      'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('id1', '0xBC4C', '1', 'ethereum', 'ethereum-mainnet', '{}', ts, expires);

    // Duplicate (same contract_address, token_id, chain, network) should fail
    expect(() => {
      sqlite.prepare(
        'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('id2', '0xBC4C', '1', 'ethereum', 'ethereum-mainnet', '{"name":"dupe"}', ts, expires);
    }).toThrow(/UNIQUE constraint failed/);

    // Different tokenId should succeed
    sqlite.prepare(
      'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('id3', '0xBC4C', '2', 'ethereum', 'ethereum-mainnet', '{}', ts, expires);
  });

  // Test 4: INSERT and SELECT from nft_metadata_cache
  it('T4: can INSERT and SELECT from nft_metadata_cache', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    const expires = ts + 86400;
    const metadata = JSON.stringify({ name: 'BAYC #1234', image: 'ipfs://Qm...' });

    sqlite.prepare(
      'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('nft-001', '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', '1234', 'ethereum', 'ethereum-mainnet', metadata, ts, expires);

    const row = sqlite.prepare('SELECT * FROM nft_metadata_cache WHERE id = ?').get('nft-001') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.contract_address).toBe('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');
    expect(row.token_id).toBe('1234');
    expect(row.chain).toBe('ethereum');
    expect(row.network).toBe('ethereum-mainnet');
    expect(JSON.parse(row.metadata_json as string).name).toBe('BAYC #1234');
    expect(row.cached_at).toBe(ts);
    expect(row.expires_at).toBe(expires);
  });

  // Test 5: v43 -> v44 incremental migration
  it('T5: existing DB at v43 migrates to v44 successfully', () => {
    sqlite = createV43Db();
    expect(tableExists(sqlite, 'nft_metadata_cache')).toBe(false);
    expect(getMaxVersion(sqlite)).toBe(43);

    runMigrations(sqlite);

    expect(tableExists(sqlite, 'nft_metadata_cache')).toBe(true);
    expect(getMaxVersion(sqlite)).toBe(63);

    const cols = getTableColumns(sqlite, 'nft_metadata_cache');
    expect(cols).toContain('id');
    expect(cols).toContain('contract_address');
    expect(cols).toContain('metadata_json');
    expect(cols).toContain('expires_at');
  });

  // Test 6: expires_at enables TTL-based cache eviction
  it('T6: expires_at enables TTL-based cache eviction queries', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    const expired = now - 3600; // 1 hour ago
    const valid = now + 3600; // 1 hour from now

    // Insert expired entry
    sqlite.prepare(
      'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('expired-1', '0xBC4C', '1', 'ethereum', 'ethereum-mainnet', '{}', now - 86400, expired);

    // Insert valid entry
    sqlite.prepare(
      'INSERT INTO nft_metadata_cache (id, contract_address, token_id, chain, network, metadata_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('valid-1', '0xBC4C', '2', 'ethereum', 'ethereum-mainnet', '{}', now, valid);

    // Eviction query: find expired entries
    const expiredRows = sqlite.prepare(
      'SELECT id FROM nft_metadata_cache WHERE expires_at < ?',
    ).all(now) as { id: string }[];
    expect(expiredRows).toHaveLength(1);
    expect(expiredRows[0].id).toBe('expired-1');

    // Index exists for expires_at
    expect(indexExists(sqlite, 'idx_nft_cache_expires')).toBe(true);
  });

  // Test 7: unique index exists
  it('T7: idx_nft_cache_unique index exists', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_nft_cache_unique')).toBe(true);
    expect(indexExists(sqlite, 'idx_nft_cache_expires')).toBe(true);
  });
});
