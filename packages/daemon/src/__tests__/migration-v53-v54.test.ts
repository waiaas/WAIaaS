/**
 * Tests for DB v53-v54 migrations: polymarket_orders, polymarket_positions, polymarket_api_keys.
 *
 * Plan 371-02 Task 1: Migration tests.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LATEST_SCHEMA_VERSION, pushSchema, runMigrations } from '../infrastructure/database/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createV52Db(): InstanceType<typeof Database> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  pushSchema(sqlite);

  // Downgrade: remove v53+ artifacts to simulate a v52 DB
  sqlite.pragma('foreign_keys = OFF');
  sqlite.exec('DROP TABLE IF EXISTS polymarket_api_keys');
  sqlite.exec('DROP TABLE IF EXISTS polymarket_positions');
  sqlite.exec('DROP TABLE IF EXISTS polymarket_orders');
  // Drop indexes
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_orders_wallet');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_orders_order_id');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_orders_condition');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_orders_status');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_orders_created');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_positions_wallet');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_positions_condition');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_positions_resolved');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_positions_unique');
  sqlite.exec('DROP INDEX IF EXISTS idx_pm_api_keys_wallet');
  sqlite.exec('DELETE FROM schema_version WHERE version >= 53');
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

describe('DB v53-v54 Migration: Polymarket tables', () => {
  let sqlite: InstanceType<typeof Database>;

  afterEach(() => {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignore */ }
    }
  });

  // -----------------------------------------------------------------------
  // Schema version
  // -----------------------------------------------------------------------

  it('T1: LATEST_SCHEMA_VERSION is 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  // -----------------------------------------------------------------------
  // Fresh DB (pushSchema creates all tables)
  // -----------------------------------------------------------------------

  it('T2: fresh DB has polymarket_orders with 26 columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'polymarket_orders')).toBe(true);
    const cols = getTableColumns(sqlite, 'polymarket_orders');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('transaction_id');
    expect(cols).toContain('condition_id');
    expect(cols).toContain('token_id');
    expect(cols).toContain('market_slug');
    expect(cols).toContain('outcome');
    expect(cols).toContain('order_id');
    expect(cols).toContain('side');
    expect(cols).toContain('order_type');
    expect(cols).toContain('price');
    expect(cols).toContain('size');
    expect(cols).toContain('status');
    expect(cols).toContain('filled_size');
    expect(cols).toContain('avg_fill_price');
    expect(cols).toContain('salt');
    expect(cols).toContain('maker_amount');
    expect(cols).toContain('taker_amount');
    expect(cols).toContain('signature_type');
    expect(cols).toContain('fee_rate_bps');
    expect(cols).toContain('expiration');
    expect(cols).toContain('nonce');
    expect(cols).toContain('is_neg_risk');
    expect(cols).toContain('response_data');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toHaveLength(26);
  });

  it('T3: fresh DB has polymarket_positions with 14 columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'polymarket_positions')).toBe(true);
    const cols = getTableColumns(sqlite, 'polymarket_positions');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('condition_id');
    expect(cols).toContain('token_id');
    expect(cols).toContain('market_slug');
    expect(cols).toContain('outcome');
    expect(cols).toContain('size');
    expect(cols).toContain('avg_price');
    expect(cols).toContain('realized_pnl');
    expect(cols).toContain('market_resolved');
    expect(cols).toContain('winning_outcome');
    expect(cols).toContain('is_neg_risk');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toHaveLength(14);
  });

  it('T4: fresh DB has polymarket_api_keys with 8 columns', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(tableExists(sqlite, 'polymarket_api_keys')).toBe(true);
    const cols = getTableColumns(sqlite, 'polymarket_api_keys');
    expect(cols).toContain('id');
    expect(cols).toContain('wallet_id');
    expect(cols).toContain('api_key');
    expect(cols).toContain('api_secret_encrypted');
    expect(cols).toContain('api_passphrase_encrypted');
    expect(cols).toContain('signature_type');
    expect(cols).toContain('proxy_address');
    expect(cols).toContain('created_at');
    expect(cols).toHaveLength(8);
  });

  // -----------------------------------------------------------------------
  // CRUD tests
  // -----------------------------------------------------------------------

  it('T5: polymarket_orders CRUD works', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO polymarket_orders
        (id, wallet_id, condition_id, token_id, outcome, side, order_type, price, size, status, is_neg_risk, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('pm-ord-1', 'w1', '0xcond1', '12345', 'YES', 'BUY', 'GTC', '0.65', '100', 'PENDING', 0, now, now);

    const row = sqlite.prepare('SELECT * FROM polymarket_orders WHERE id = ?').get('pm-ord-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.condition_id).toBe('0xcond1');
    expect(row.side).toBe('BUY');
    expect(row.status).toBe('PENDING');

    // Update status
    sqlite.prepare('UPDATE polymarket_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run('LIVE', now + 1, 'pm-ord-1');
    const updated = sqlite.prepare('SELECT status FROM polymarket_orders WHERE id = ?').get('pm-ord-1') as { status: string };
    expect(updated.status).toBe('LIVE');
  });

  it('T6: polymarket_orders CHECK constraints reject invalid values', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);

    // Invalid side
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_orders
          (id, wallet_id, condition_id, token_id, outcome, side, order_type, price, size, status, is_neg_risk, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('bad-1', 'w1', '0x', '1', 'YES', 'INVALID', 'GTC', '0.5', '10', 'PENDING', 0, now, now);
    }).toThrow();

    // Invalid status
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_orders
          (id, wallet_id, condition_id, token_id, outcome, side, order_type, price, size, status, is_neg_risk, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('bad-2', 'w1', '0x', '1', 'YES', 'BUY', 'GTC', '0.5', '10', 'BOGUS', 0, now, now);
    }).toThrow();

    // Invalid order_type
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_orders
          (id, wallet_id, condition_id, token_id, outcome, side, order_type, price, size, status, is_neg_risk, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('bad-3', 'w1', '0x', '1', 'YES', 'BUY', 'MARKET', '0.5', '10', 'PENDING', 0, now, now);
    }).toThrow();
  });

  it('T7: polymarket_positions UNIQUE(wallet_id, token_id) constraint', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO polymarket_positions
        (id, wallet_id, condition_id, token_id, outcome, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('pos-1', 'w1', '0xcond', '12345', 'YES', now, now);

    // Duplicate wallet_id + token_id should fail
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_positions
          (id, wallet_id, condition_id, token_id, outcome, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('pos-2', 'w1', '0xcond', '12345', 'YES', now, now);
    }).toThrow();

    // Different token_id should succeed
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_positions
          (id, wallet_id, condition_id, token_id, outcome, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('pos-3', 'w1', '0xcond', '12346', 'NO', now, now);
    }).not.toThrow();
  });

  it('T8: polymarket_positions outcome CHECK constraint', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_positions
          (id, wallet_id, condition_id, token_id, outcome, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('pos-bad', 'w1', '0x', '1', 'MAYBE', now, now);
    }).toThrow();
  });

  it('T9: polymarket_api_keys UNIQUE(wallet_id) constraint', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = OFF');
    pushSchema(sqlite);

    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO polymarket_api_keys
        (id, wallet_id, api_key, api_secret_encrypted, api_passphrase_encrypted, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('key-1', 'w1', 'ak-1', 'enc-secret', 'enc-pp', now);

    // Same wallet_id should fail
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_api_keys
          (id, wallet_id, api_key, api_secret_encrypted, api_passphrase_encrypted, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('key-2', 'w1', 'ak-2', 'enc-secret-2', 'enc-pp-2', now);
    }).toThrow();

    // Different wallet_id should succeed
    expect(() => {
      sqlite.prepare(`
        INSERT INTO polymarket_api_keys
          (id, wallet_id, api_key, api_secret_encrypted, api_passphrase_encrypted, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('key-3', 'w2', 'ak-3', 'enc-secret-3', 'enc-pp-3', now);
    }).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // Indexes
  // -----------------------------------------------------------------------

  it('T10: polymarket_orders has 5 indexes', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_pm_orders_wallet')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_orders_order_id')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_orders_condition')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_orders_status')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_orders_created')).toBe(true);
  });

  it('T11: polymarket_positions has 3 indexes + unique', () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    pushSchema(sqlite);

    expect(indexExists(sqlite, 'idx_pm_positions_wallet')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_positions_condition')).toBe(true);
    expect(indexExists(sqlite, 'idx_pm_positions_resolved')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Incremental migration (v52 -> v54)
  // -----------------------------------------------------------------------

  it('T12: v52 -> v54 incremental migration creates all 3 tables', () => {
    sqlite = createV52Db();
    expect(tableExists(sqlite, 'polymarket_orders')).toBe(false);
    expect(tableExists(sqlite, 'polymarket_positions')).toBe(false);
    expect(tableExists(sqlite, 'polymarket_api_keys')).toBe(false);
    expect(getMaxVersion(sqlite)).toBe(52);

    runMigrations(sqlite);

    expect(tableExists(sqlite, 'polymarket_orders')).toBe(true);
    expect(tableExists(sqlite, 'polymarket_positions')).toBe(true);
    expect(tableExists(sqlite, 'polymarket_api_keys')).toBe(true);
    expect(getMaxVersion(sqlite)).toBe(63);
  });

  it('T13: schema_version records v53 and v54', () => {
    sqlite = createV52Db();
    runMigrations(sqlite);

    const v53 = sqlite
      .prepare('SELECT version FROM schema_version WHERE version = 53')
      .get() as { version: number } | undefined;
    const v54 = sqlite
      .prepare('SELECT version FROM schema_version WHERE version = 54')
      .get() as { version: number } | undefined;

    expect(v53).toBeDefined();
    expect(v54).toBeDefined();
  });

  it('T14: migration is idempotent', () => {
    sqlite = createV52Db();
    runMigrations(sqlite);
    expect(tableExists(sqlite, 'polymarket_orders')).toBe(true);

    // Running again should not throw
    expect(() => runMigrations(sqlite)).not.toThrow();
    expect(getMaxVersion(sqlite)).toBe(63);
  });

  // -----------------------------------------------------------------------
  // Existing data preservation
  // -----------------------------------------------------------------------

  it('T15: existing hyperliquid_orders data unaffected after migration', () => {
    sqlite = createV52Db();

    // Insert a wallet row to satisfy FK constraints during v58 migration
    sqlite.pragma('foreign_keys = OFF');
    const now = Math.floor(Date.now() / 1000);
    sqlite.prepare(`
      INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('w1', 'test-wallet', 'ethereum', 'mainnet', '0x1234', 'ACTIVE', now, now);

    // Insert test data into existing table
    sqlite.prepare(`
      INSERT INTO hyperliquid_orders (id, wallet_id, oid, market, asset_index, side, order_type, size, price, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hl-1', 'w1', 123, 'ETH', 1, 'BUY', 'MARKET', '1.0', '2000', 'FILLED', 1700000000, 1700000000);

    runMigrations(sqlite);

    // Existing data should still be there
    const row = sqlite.prepare('SELECT * FROM hyperliquid_orders WHERE id = ?').get('hl-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.market).toBe('ETH');
    expect(row.status).toBe('FILLED');
  });
});
