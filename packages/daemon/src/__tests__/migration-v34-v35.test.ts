/**
 * Migration v34/v35 tests:
 * v34: Add wallet_type column to wallet_apps
 * v35: Add subscription_token column to wallet_apps
 *
 * @see internal/objectives/issues/230-wallet-type-separation.md
 * @see internal/objectives/issues/231-subscription-token-routing.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { createDatabase, pushSchema, LATEST_SCHEMA_VERSION } from '../infrastructure/database/index.js';

// ---------------------------------------------------------------------------
// Setup: in-memory DB with full schema (fresh, includes v34/v35 DDL)
// ---------------------------------------------------------------------------

let sqlite: DatabaseType;

beforeAll(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  pushSchema(sqlite);
});

afterAll(() => {
  sqlite?.close();
});

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Migration v34: wallet_type column', () => {
  it('wallet_apps table has wallet_type column', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string; type: string; notnull: number }>;

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('wallet_type');
  });

  it('wallet_type column has NOT NULL DEFAULT empty string', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string; notnull: number; dflt_value: string | null }>;

    const wtCol = columns.find((c) => c.name === 'wallet_type');
    expect(wtCol).toBeTruthy();
    expect(wtCol!.notnull).toBe(1);
    expect(wtCol!.dflt_value).toBe("''");
  });

  it('idx_wallet_apps_wallet_type index exists', () => {
    const indexes = sqlite
      .prepare("PRAGMA index_list('wallet_apps')")
      .all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_wallet_apps_wallet_type');
  });

  it('migration backfills wallet_type = name for existing rows', () => {
    const migDb = new Database(':memory:');
    migDb.pragma('journal_mode = WAL');

    migDb.exec(`CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL, description TEXT)`);
    migDb.exec(`INSERT INTO schema_version (version, applied_at, description) VALUES (33, ${nowTs()}, 'pre-v34')`);

    // Create wallet_apps table at v33 state (no wallet_type)
    migDb.exec(`CREATE TABLE wallet_apps (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      signing_enabled INTEGER NOT NULL DEFAULT 1, alerts_enabled INTEGER NOT NULL DEFAULT 1,
      sign_topic TEXT, notify_topic TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`);

    const ts = nowTs();
    migDb.prepare('INSERT INTO wallet_apps VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?)')
      .run('app-1', 'dcent', "D'CENT", 'waiaas-sign-dcent', 'waiaas-notify-dcent', ts, ts);
    migDb.prepare('INSERT INTO wallet_apps VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?)')
      .run('app-2', 'ledger', 'Ledger', 'waiaas-sign-ledger', 'waiaas-notify-ledger', ts, ts);

    // Run v34 migration
    migDb.exec(`ALTER TABLE wallet_apps ADD COLUMN wallet_type TEXT NOT NULL DEFAULT ''`);
    migDb.exec(`UPDATE wallet_apps SET wallet_type = name WHERE wallet_type = ''`);
    migDb.exec('CREATE INDEX IF NOT EXISTS idx_wallet_apps_wallet_type ON wallet_apps(wallet_type)');

    const app1 = migDb.prepare('SELECT wallet_type FROM wallet_apps WHERE id = ?').get('app-1') as { wallet_type: string };
    expect(app1.wallet_type).toBe('dcent');

    const app2 = migDb.prepare('SELECT wallet_type FROM wallet_apps WHERE id = ?').get('app-2') as { wallet_type: string };
    expect(app2.wallet_type).toBe('ledger');

    migDb.close();
  });
});

describe('Migration v35: subscription_token column', () => {
  it('wallet_apps table has subscription_token column', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string }>;
    expect(columns.map((c) => c.name)).toContain('subscription_token');
  });

  it('subscription_token column allows NULL', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string; notnull: number }>;

    const stCol = columns.find((c) => c.name === 'subscription_token');
    expect(stCol).toBeTruthy();
    expect(stCol!.notnull).toBe(0);
  });

  it('insert with NULL subscription_token succeeds', () => {
    const ts = nowTs();
    sqlite.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, wallet_type, signing_enabled, alerts_enabled, subscription_token, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, NULL, ?, ?)',
    ).run('v35-test-null', 'v35-null-app', 'V35 Null App', 'v35-null-app', ts, ts);

    const row = sqlite.prepare('SELECT subscription_token FROM wallet_apps WHERE id = ?')
      .get('v35-test-null') as { subscription_token: string | null };
    expect(row.subscription_token).toBeNull();

    sqlite.prepare('DELETE FROM wallet_apps WHERE id = ?').run('v35-test-null');
  });

  it('insert with subscription_token text value succeeds', () => {
    const ts = nowTs();
    sqlite.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, wallet_type, signing_enabled, alerts_enabled, subscription_token, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)',
    ).run('v35-test-token', 'v35-token-app', 'V35 Token App', 'v35-token-app', 'abc123', ts, ts);

    const row = sqlite.prepare('SELECT subscription_token FROM wallet_apps WHERE id = ?')
      .get('v35-test-token') as { subscription_token: string };
    expect(row.subscription_token).toBe('abc123');

    sqlite.prepare('DELETE FROM wallet_apps WHERE id = ?').run('v35-test-token');
  });
});

describe('Schema version', () => {
  it('LATEST_SCHEMA_VERSION is 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('fresh DB schema_version max is 60', () => {
    const row = sqlite
      .prepare('SELECT MAX(version) AS max_version FROM schema_version')
      .get() as { max_version: number };
    expect(row.max_version).toBe(63);
  });

  it('wallet_apps table has 12 columns', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string }>;
    expect(columns).toHaveLength(12);
  });
});
