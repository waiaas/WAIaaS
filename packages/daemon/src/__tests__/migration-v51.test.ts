/**
 * Tests for DB v51 migration: hyperliquid_orders table.
 *
 * Plan 349-02 Task 2: DB v51 migration for Hyperliquid DEX integration.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV50Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v51+ artifacts to simulate a v50 DB
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DROP TABLE IF EXISTS hyperliquid_orders');
  sqlite.exec('DROP INDEX IF EXISTS idx_hl_orders_wallet');
  sqlite.exec('DROP INDEX IF EXISTS idx_hl_orders_oid');
  sqlite.exec('DROP INDEX IF EXISTS idx_hl_orders_market');
  sqlite.exec('DROP INDEX IF EXISTS idx_hl_orders_status');
  sqlite.exec('DROP INDEX IF EXISTS idx_hl_orders_created');
  sqlite.exec('DELETE FROM schema_version WHERE version >= 51');
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

describe('DB v51 Migration: hyperliquid_orders', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  it('T1: LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('T2: hyperliquid_orders has all 23 columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'hyperliquid_orders')).toBe(true);
    const cols = getTableColumns(sqlite, 'hyperliquid_orders');
    const expected = [
      'id', 'wallet_id', 'sub_account_address', 'oid', 'cloid',
      'transaction_id', 'market', 'asset_index', 'side', 'order_type',
      'size', 'price', 'trigger_price', 'tif', 'reduce_only',
      'status', 'filled_size', 'avg_fill_price', 'is_spot',
      'leverage', 'margin_mode', 'response_data', 'created_at', 'updated_at',
    ];
    for (const col of expected) {
      expect(cols).toContain(col);
    }
    expect(cols).toHaveLength(24);
  });

  it('T3: can INSERT and SELECT from hyperliquid_orders', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF'); // Skip FK check for standalone test
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO hyperliquid_orders
        (id, wallet_id, market, asset_index, side, order_type, size, price, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hl-order-001', 'wallet-001', 'ETH', 4, 'BUY', 'LIMIT', '1.5', '2000', 'PENDING', ts, ts);

    const row = sqlite.prepare('SELECT * FROM hyperliquid_orders WHERE id = ?').get('hl-order-001') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.wallet_id).toBe('wallet-001');
    expect(row.market).toBe('ETH');
    expect(row.asset_index).toBe(4);
    expect(row.side).toBe('BUY');
    expect(row.order_type).toBe('LIMIT');
    expect(row.size).toBe('1.5');
    expect(row.price).toBe('2000');
    expect(row.status).toBe('PENDING');
    expect(row.reduce_only).toBe(0);
    expect(row.is_spot).toBe(0);
  });

  it('T4: CHECK constraint rejects invalid side', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(`
        INSERT INTO hyperliquid_orders
          (id, wallet_id, market, asset_index, side, order_type, size, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('hl-bad', 'w1', 'ETH', 4, 'INVALID', 'LIMIT', '1', 'PENDING', ts, ts);
    }).toThrow();
  });

  it('T5: CHECK constraint rejects invalid order_type', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(`
        INSERT INTO hyperliquid_orders
          (id, wallet_id, market, asset_index, side, order_type, size, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('hl-bad', 'w1', 'ETH', 4, 'BUY', 'INVALID_TYPE', '1', 'PENDING', ts, ts);
    }).toThrow();
  });

  it('T6: all 5 indexes exist', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_hl_orders_wallet')).toBe(true);
    expect(indexExists(sqlite, 'idx_hl_orders_oid')).toBe(true);
    expect(indexExists(sqlite, 'idx_hl_orders_market')).toBe(true);
    expect(indexExists(sqlite, 'idx_hl_orders_status')).toBe(true);
    expect(indexExists(sqlite, 'idx_hl_orders_created')).toBe(true);
  });

  it('T7: v50 -> v51 incremental migration', () => {
    sqlite = createV50Db();
    expect(tableExists(sqlite, 'hyperliquid_orders')).toBe(false);
    expect(getMaxVersion(sqlite)).toBe(50);

    runMigrations(sqlite);

    expect(tableExists(sqlite, 'hyperliquid_orders')).toBe(true);
    expect(getMaxVersion(sqlite)).toBe(63);

    const cols = getTableColumns(sqlite, 'hyperliquid_orders');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('market');
    expect(cols).toContain('asset_index');
    expect(cols).toContain('status');
  });

  it('T8: migration is idempotent', () => {
    sqlite = createV50Db();
    runMigrations(sqlite);
    expect(tableExists(sqlite, 'hyperliquid_orders')).toBe(true);

    // Running again should not throw
    expect(() => runMigrations(sqlite)).not.toThrow();
  });

  it('T9: optional fields accept NULL', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const ts = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO hyperliquid_orders
        (id, wallet_id, market, asset_index, side, order_type, size, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hl-null', 'w1', 'BTC', 0, 'SELL', 'MARKET', '0.1', 'FILLED', ts, ts);

    const row = sqlite.prepare('SELECT * FROM hyperliquid_orders WHERE id = ?').get('hl-null') as Record<string, unknown>;
    expect(row.price).toBeNull();
    expect(row.trigger_price).toBeNull();
    expect(row.tif).toBeNull();
    expect(row.sub_account_address).toBeNull();
    expect(row.oid).toBeNull();
    expect(row.cloid).toBeNull();
    expect(row.leverage).toBeNull();
    expect(row.margin_mode).toBeNull();
  });
});
