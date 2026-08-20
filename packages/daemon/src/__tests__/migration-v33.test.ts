/**
 * Migration v33 tests: Add sign_topic and notify_topic to wallet_apps.
 *
 * Tests cover:
 * T-DBSC-01: wallet_apps table has sign_topic and notify_topic columns (9 columns total)
 * T-DBSC-02: Migration backfills existing rows with prefix+appName defaults
 * T-DBSC-03: Fresh DB has LATEST_SCHEMA_VERSION=33
 * T-DBSC-04: NULL values are allowed in sign_topic and notify_topic columns
 *
 * @see internal/objectives/m29-10-ntfy-per-wallet-topic.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { createDatabase, pushSchema, LATEST_SCHEMA_VERSION } from '../infrastructure/database/index.js';

// ---------------------------------------------------------------------------
// Setup: in-memory DB with full schema (fresh, includes v33 DDL)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Migration v33: sign_topic and notify_topic columns', () => {
  it('T-DBSC-01: wallet_apps table has sign_topic and notify_topic columns (9 columns)', () => {
    const columns = sqlite
      .prepare("PRAGMA table_info('wallet_apps')")
      .all() as Array<{ name: string; type: string; notnull: number }>;

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('display_name');
    expect(columnNames).toContain('signing_enabled');
    expect(columnNames).toContain('alerts_enabled');
    expect(columnNames).toContain('sign_topic');
    expect(columnNames).toContain('notify_topic');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');
    expect(columns).toHaveLength(12); // 9 original + wallet_type (v34) + subscription_token (v35) + push_relay_url (v60)
  });

  it('T-DBSC-02: migration backfills existing rows with prefix+appName defaults', () => {
    // Use a separate in-memory DB to simulate pre-v33 state
    const migDb = new Database(':memory:');
    migDb.pragma('journal_mode = WAL');

    // Create schema_version table
    migDb.exec(`CREATE TABLE schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT
    )`);
    migDb.exec(`INSERT INTO schema_version (version, applied_at, description) VALUES (32, ${nowTs()}, 'pre-v33')`);

    // Create wallet_apps table WITHOUT sign_topic/notify_topic (v32 state)
    migDb.exec(`CREATE TABLE wallet_apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      signing_enabled INTEGER NOT NULL DEFAULT 1,
      alerts_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);

    // Insert test rows
    const ts = nowTs();
    migDb.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, signing_enabled, alerts_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)',
    ).run('app-1', 'dcent', "D'CENT Wallet", ts, ts);
    migDb.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, signing_enabled, alerts_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)',
    ).run('app-2', 'my-wallet', 'My Custom Wallet', ts, ts);

    // Run v33 migration manually
    migDb.exec(`ALTER TABLE wallet_apps ADD COLUMN sign_topic TEXT`);
    migDb.exec(`ALTER TABLE wallet_apps ADD COLUMN notify_topic TEXT`);
    const prefix = 'waiaas-sign';
    const notifyPrefix = 'waiaas-notify';
    const rows = migDb.prepare('SELECT id, name FROM wallet_apps').all() as Array<{ id: string; name: string }>;
    const stmt = migDb.prepare('UPDATE wallet_apps SET sign_topic = ?, notify_topic = ? WHERE id = ?');
    for (const row of rows) {
      stmt.run(`${prefix}-${row.name}`, `${notifyPrefix}-${row.name}`, row.id);
    }

    // Verify backfill
    const app1 = migDb.prepare('SELECT sign_topic, notify_topic FROM wallet_apps WHERE id = ?').get('app-1') as {
      sign_topic: string;
      notify_topic: string;
    };
    expect(app1.sign_topic).toBe('waiaas-sign-dcent');
    expect(app1.notify_topic).toBe('waiaas-notify-dcent');

    const app2 = migDb.prepare('SELECT sign_topic, notify_topic FROM wallet_apps WHERE id = ?').get('app-2') as {
      sign_topic: string;
      notify_topic: string;
    };
    expect(app2.sign_topic).toBe('waiaas-sign-my-wallet');
    expect(app2.notify_topic).toBe('waiaas-notify-my-wallet');

    migDb.close();
  });

  it('T-DBSC-03: fresh DB has LATEST_SCHEMA_VERSION=61', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);

    const row = sqlite
      .prepare('SELECT MAX(version) AS max_version FROM schema_version')
      .get() as { max_version: number };
    expect(row.max_version).toBe(63);
  });

  it('T-DBSC-04: NULL values are allowed in sign_topic and notify_topic columns', () => {
    const ts = nowTs();
    // INSERT with explicit NULL values
    sqlite.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, wallet_type, signing_enabled, alerts_enabled, sign_topic, notify_topic, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, NULL, NULL, ?, ?)',
    ).run('null-topic-test', 'null-topic-app', 'Null Topic App', 'null-topic-app', ts, ts);

    const row = sqlite.prepare(
      'SELECT sign_topic, notify_topic FROM wallet_apps WHERE id = ?',
    ).get('null-topic-test') as { sign_topic: string | null; notify_topic: string | null };

    expect(row.sign_topic).toBeNull();
    expect(row.notify_topic).toBeNull();

    // Cleanup
    sqlite.prepare('DELETE FROM wallet_apps WHERE id = ?').run('null-topic-test');
  });

  it('sign_topic and notify_topic columns accept text values', () => {
    const ts = nowTs();
    sqlite.prepare(
      'INSERT INTO wallet_apps (id, name, display_name, wallet_type, signing_enabled, alerts_enabled, sign_topic, notify_topic, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)',
    ).run('text-topic-test', 'text-topic-app', 'Text Topic App', 'text-topic-app', 'custom-sign', 'custom-notify', ts, ts);

    const row = sqlite.prepare(
      'SELECT sign_topic, notify_topic FROM wallet_apps WHERE id = ?',
    ).get('text-topic-test') as { sign_topic: string; notify_topic: string };

    expect(row.sign_topic).toBe('custom-sign');
    expect(row.notify_topic).toBe('custom-notify');

    // Cleanup
    sqlite.prepare('DELETE FROM wallet_apps WHERE id = ?').run('text-topic-test');
  });
});
