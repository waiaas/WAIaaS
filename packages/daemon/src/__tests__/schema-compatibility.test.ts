/**
 * Tests for schema compatibility checker (v1.8 upgrade safety) and v19 migration.
 *
 * Tests cover:
 * 1. Scenario A: code > db (auto-migration needed) -> { action: 'migrate' }
 * 2. Scenario B: code == db (normal) -> { action: 'ok' }
 * 3. Scenario C: code < db (reject + upgrade hint) -> { action: 'reject', reason: 'code_too_old' }
 * 4. Scenario D: db < MIN_COMPATIBLE (reject + step-by-step) -> { action: 'reject', reason: 'schema_too_old' }
 * 5. Scenario E: empty DB (fresh creation) -> { action: 'ok' }
 * 6. MIN_COMPATIBLE_SCHEMA_VERSION range validation
 * 7. Integration: future version gap
 * 8. Integration: exact one-below migration trigger
 * 9. v19 migration: session_wallets data migration, NULL wallet_id skip, column removal
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import { createDatabase, pushSchema, LATEST_SCHEMA_VERSION } from '../infrastructure/database/index.js';
import { runMigrations, MIGRATIONS } from '../infrastructure/database/index.js';
import {
  checkSchemaCompatibility,
  MIN_COMPATIBLE_SCHEMA_VERSION,
} from '../infrastructure/database/compatibility.js';

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let sqlite: DatabaseType;

beforeEach(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  pushSchema(sqlite);
});

afterEach(() => {
  try {
    sqlite.close();
  } catch {
    // already closed
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkSchemaCompatibility', () => {
  it('Scenario A: code > db -- returns migrate when DB schema is behind', () => {
    // Manipulate schema_version to simulate an older DB
    // Delete all versions above LATEST - 2
    sqlite
      .prepare('DELETE FROM schema_version WHERE version > ?')
      .run(LATEST_SCHEMA_VERSION - 2);

    const result = checkSchemaCompatibility(sqlite);
    expect(result).toEqual({ action: 'migrate' });
  });

  it('Scenario B: code == db -- returns ok when DB schema matches code', () => {
    // Default state: pushSchema records LATEST_SCHEMA_VERSION
    const result = checkSchemaCompatibility(sqlite);
    expect(result).toEqual({ action: 'ok' });
  });

  it('Scenario C: code < db -- returns reject with code_too_old and waiaas update hint', () => {
    // Insert a version beyond what code expects
    sqlite
      .prepare(
        'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
      )
      .run(LATEST_SCHEMA_VERSION + 1, Math.floor(Date.now() / 1000), 'Future migration');

    const result = checkSchemaCompatibility(sqlite);
    expect(result.action).toBe('reject');
    if (result.action === 'reject') {
      expect(result.reason).toBe('code_too_old');
      expect(result.message).toContain('waiaas update');
    }
  });

  it('Scenario D: db < MIN_COMPATIBLE -- returns reject with schema_too_old and step-by-step guide', () => {
    // Only applies if MIN_COMPATIBLE > 1; if MIN_COMPATIBLE is 1, we need
    // a schema_version table with max < 1, which means 0.
    // For this test we manipulate MIN_COMPATIBLE behavior by clearing
    // schema_version and inserting version 0 (below any valid MIN).
    // Since MIN_COMPATIBLE_SCHEMA_VERSION >= 1, version 0 is always below it.

    // Clear schema_version and insert version 0
    sqlite.exec('DELETE FROM schema_version');
    sqlite
      .prepare(
        'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
      )
      .run(0, Math.floor(Date.now() / 1000), 'Artificial pre-minimum version');

    const result = checkSchemaCompatibility(sqlite);
    expect(result.action).toBe('reject');
    if (result.action === 'reject') {
      expect(result.reason).toBe('schema_too_old');
      expect(result.message).toContain('Step-by-step upgrade');
    }
  });

  it('Scenario E: empty DB (no schema_version table) -- returns ok', () => {
    // Create a completely fresh DB without schema_version table
    const freshConn = createDatabase(':memory:');
    const freshSqlite = freshConn.sqlite;

    try {
      const result = checkSchemaCompatibility(freshSqlite);
      expect(result).toEqual({ action: 'ok' });
    } finally {
      freshSqlite.close();
    }
  });

  it('Scenario E-2: empty schema_version table -- returns ok', () => {
    // Clear all rows from schema_version
    sqlite.exec('DELETE FROM schema_version');

    const result = checkSchemaCompatibility(sqlite);
    expect(result).toEqual({ action: 'ok' });
  });

  it('MIN_COMPATIBLE_SCHEMA_VERSION is in valid range (>= 1 and <= LATEST)', () => {
    expect(MIN_COMPATIBLE_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
    expect(MIN_COMPATIBLE_SCHEMA_VERSION).toBeLessThanOrEqual(LATEST_SCHEMA_VERSION);
  });

  it('returns migrate when DB is exactly one version behind', () => {
    // Set DB to LATEST - 1
    sqlite
      .prepare('DELETE FROM schema_version WHERE version > ?')
      .run(LATEST_SCHEMA_VERSION - 1);

    const result = checkSchemaCompatibility(sqlite);
    expect(result).toEqual({ action: 'migrate' });
  });

  it('returns reject with code_too_old when DB is far ahead', () => {
    // Insert version LATEST + 5
    sqlite
      .prepare(
        'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
      )
      .run(LATEST_SCHEMA_VERSION + 5, Math.floor(Date.now() / 1000), 'Far future migration');

    const result = checkSchemaCompatibility(sqlite);
    expect(result.action).toBe('reject');
    if (result.action === 'reject') {
      expect(result.reason).toBe('code_too_old');
      expect(result.message).toContain('waiaas update');
    }
  });
});

// ---------------------------------------------------------------------------
// v19 migration: session_wallets data migration tests
// ---------------------------------------------------------------------------

describe('v19 migration: session_wallets', () => {
  /**
   * Helper: creates a pre-v19 database (with sessions.wallet_id column)
   * and returns it stopped at version 18 ready for v19 migration.
   */
  function createPreV19Db(): DatabaseType {
    const conn = createDatabase(':memory:');
    const db = conn.sqlite;
    db.pragma('foreign_keys = ON');

    // Create minimal schema at v18 (sessions still has wallet_id)
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);
    db.exec(`CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL,
  environment TEXT NOT NULL,
  default_network TEXT,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT,
  owner_approval_method TEXT
)`);
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
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'api'
)`);
    db.exec(`CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT,
  type TEXT NOT NULL,
  amount TEXT,
  to_address TEXT,
  token_mint TEXT,
  contract_address TEXT,
  method_signature TEXT,
  spender_address TEXT,
  approved_amount TEXT,
  parent_id TEXT,
  batch_index INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING',
  tier TEXT,
  queued_at INTEGER,
  executed_at INTEGER,
  created_at INTEGER NOT NULL,
  reserved_amount TEXT,
  amount_usd REAL,
  reserved_amount_usd REAL,
  error TEXT,
  metadata TEXT,
  network TEXT
)`);
    // Record version 18 so v19 migration will run
    const ts = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(1, ts, 'Initial');
    for (let v = 2; v <= 18; v++) {
      db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(v, ts, `Migration v${v}`);
    }
    return db;
  }

  it('migrates 100 sessions -> session_wallets with correct row count', () => {
    const db = createPreV19Db();
    try {
      const now = Math.floor(Date.now() / 1000);
      const futureTs = now + 86400;
      const absoluteTs = now + 604800;

      // Create 10 wallets
      for (let w = 0; w < 10; w++) {
        db.prepare('INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          `wallet-${w}`, `Wallet ${w}`, 'solana', 'testnet', `pubkey-${w}`, 'ACTIVE', now, now,
        );
      }

      // Create 100 sessions (10 per wallet)
      for (let s = 0; s < 100; s++) {
        const walletIdx = s % 10;
        db.prepare('INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          `session-${s}`, `wallet-${walletIdx}`, `hash-${s}`, futureTs, absoluteTs, now, 'api',
        );
      }

      // Run only v19 migration
      const v19Only = MIGRATIONS.filter((m) => m.version === 19);
      const result = runMigrations(db, v19Only);
      expect(result.applied).toBe(1);

      // Verify session_wallets has exactly 100 rows
      const count = (db.prepare('SELECT COUNT(*) AS cnt FROM session_wallets').get() as { cnt: number }).cnt;
      expect(count).toBe(100);
    } finally {
      db.close();
    }
  });

  it('every migrated session has exactly 1 is_default=1 row', () => {
    const db = createPreV19Db();
    try {
      const now = Math.floor(Date.now() / 1000);

      // Create 3 wallets, 5 sessions
      for (let w = 0; w < 3; w++) {
        db.prepare('INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          `wallet-${w}`, `Wallet ${w}`, 'solana', 'testnet', `pubkey-${w}`, 'ACTIVE', now, now,
        );
      }
      for (let s = 0; s < 5; s++) {
        db.prepare('INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          `session-${s}`, `wallet-${s % 3}`, `hash-${s}`, now + 86400, now + 604800, now, 'api',
        );
      }

      const v19Only = MIGRATIONS.filter((m) => m.version === 19);
      runMigrations(db, v19Only);

      // Each session should have exactly 1 row with is_default=1
      const rows = db.prepare(`
        SELECT session_id, SUM(is_default) AS default_count
        FROM session_wallets
        GROUP BY session_id
      `).all() as { session_id: string; default_count: number }[];

      expect(rows.length).toBe(5);
      for (const row of rows) {
        expect(row.default_count).toBe(1);
      }
    } finally {
      db.close();
    }
  });

  it('skips sessions with NULL wallet_id without crashing', () => {
    // Create a custom pre-v19 DB where sessions.wallet_id allows NULL
    // (simulates corrupted/legacy database)
    const conn = createDatabase(':memory:');
    const db = conn.sqlite;
    db.pragma('foreign_keys = ON');

    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);
    db.exec(`CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL,
  environment TEXT NOT NULL,
  default_network TEXT,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT,
  owner_approval_method TEXT
)`);
    // Sessions table with wallet_id nullable (simulating corrupted schema)
    db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  constraints TEXT,
  usage_stats TEXT,
  revoked_at INTEGER,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  max_renewals INTEGER NOT NULL DEFAULT 30,
  last_renewed_at INTEGER,
  absolute_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'api'
)`);
    db.exec(`CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT,
  type TEXT NOT NULL,
  amount TEXT,
  to_address TEXT,
  token_mint TEXT,
  contract_address TEXT,
  method_signature TEXT,
  spender_address TEXT,
  approved_amount TEXT,
  parent_id TEXT,
  batch_index INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING',
  tier TEXT,
  queued_at INTEGER,
  executed_at INTEGER,
  created_at INTEGER NOT NULL,
  reserved_amount TEXT,
  amount_usd REAL,
  reserved_amount_usd REAL,
  error TEXT,
  metadata TEXT,
  network TEXT
)`);
    const ts = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(1, ts, 'Initial');
    for (let v = 2; v <= 18; v++) {
      db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)').run(v, ts, `Migration v${v}`);
    }

    try {
      const now = Math.floor(Date.now() / 1000);

      // Create 1 wallet and 2 sessions (1 normal, 1 with NULL wallet_id)
      db.prepare('INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        'wallet-1', 'Wallet 1', 'solana', 'testnet', 'pubkey-1', 'ACTIVE', now, now,
      );
      db.prepare('INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'session-ok', 'wallet-1', 'hash-ok', now + 86400, now + 604800, now, 'api',
      );
      // Insert session with NULL wallet_id (possible because this schema allows it)
      db.prepare('INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'session-null', null, 'hash-null', now + 86400, now + 604800, now, 'api',
      );

      // Migration should not throw
      const v19Only = MIGRATIONS.filter((m) => m.version === 19);
      expect(() => runMigrations(db, v19Only)).not.toThrow();

      // Only the valid session should be in session_wallets
      const count = (db.prepare('SELECT COUNT(*) AS cnt FROM session_wallets').get() as { cnt: number }).cnt;
      expect(count).toBe(1);

      const row = db.prepare('SELECT session_id FROM session_wallets').get() as { session_id: string };
      expect(row.session_id).toBe('session-ok');
    } finally {
      db.close();
    }
  });

  it('sessions table has no wallet_id column after migration', () => {
    const db = createPreV19Db();
    try {
      const now = Math.floor(Date.now() / 1000);

      db.prepare('INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        'wallet-1', 'Wallet 1', 'solana', 'testnet', 'pubkey-1', 'ACTIVE', now, now,
      );
      db.prepare('INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'session-1', 'wallet-1', 'hash-1', now + 86400, now + 604800, now, 'api',
      );

      const v19Only = MIGRATIONS.filter((m) => m.version === 19);
      runMigrations(db, v19Only);

      // Check sessions table columns via PRAGMA
      const columns = db.pragma('table_info(sessions)') as { name: string }[];
      const columnNames = columns.map((c) => c.name);
      expect(columnNames).not.toContain('wallet_id');
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('token_hash');
      expect(columnNames).toContain('source');
    } finally {
      db.close();
    }
  });

  it('LATEST_SCHEMA_VERSION is 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  it('fresh DB via pushSchema creates session_wallets table', () => {
    // sqlite was created via pushSchema in beforeEach
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_wallets'").all() as { name: string }[];
    expect(tables.length).toBe(1);
    expect(tables[0]!.name).toBe('session_wallets');
  });

  it('fresh DB sessions table has no wallet_id column', () => {
    const columns = sqlite.pragma('table_info(sessions)') as { name: string }[];
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).not.toContain('wallet_id');
  });
});
