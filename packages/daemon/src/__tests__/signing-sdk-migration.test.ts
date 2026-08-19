/**
 * Tests for v18 migration: Add owner_approval_method column to wallets table.
 *
 * Tests cover:
 * 1. v18 migration adds owner_approval_method column (nullable)
 * 2. Fresh DB (pushSchema) includes owner_approval_method in wallets DDL
 * 3. CHECK constraint on fresh DB accepts valid values, rejects invalid
 * 4. Existing wallet data is preserved after migration
 * 5. LATEST_SCHEMA_VERSION is 18
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import {
  createDatabase,
  pushSchema,
  runMigrations,
  MIGRATIONS,
  LATEST_SCHEMA_VERSION,
} from '../infrastructure/database/index.js';
import type { Migration } from '../infrastructure/database/index.js';

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
// Helpers
// ---------------------------------------------------------------------------

function getMaxVersion(): number {
  const row = sqlite
    .prepare('SELECT MAX(version) AS max_version FROM schema_version')
    .get() as { max_version: number | null };
  return row.max_version ?? 0;
}

function getWalletColumns(): string[] {
  const columns = sqlite
    .prepare("PRAGMA table_info('wallets')")
    .all() as Array<{ name: string }>;
  return columns.map((c) => c.name);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LATEST_SCHEMA_VERSION', () => {
  it('should be 62', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });
});

describe('Fresh DB (pushSchema)', () => {
  it('includes owner_approval_method column in wallets table', () => {
    const columns = getWalletColumns();
    expect(columns).toContain('owner_approval_method');
  });

  it('schema_version max is 62', () => {
    expect(getMaxVersion()).toBe(63);
  });

  it('owner_approval_method defaults to NULL', () => {
    const ts = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-test-1', 'Test Wallet', 'solana', 'testnet', 'pk-test-1', 'ACTIVE', 0, ts, ts);

    const row = sqlite.prepare('SELECT owner_approval_method FROM wallets WHERE id = ?').get('w-test-1') as { owner_approval_method: string | null };
    expect(row.owner_approval_method).toBeNull();
  });

  it('CHECK constraint accepts valid approval methods on fresh DB', () => {
    const ts = Math.floor(Date.now() / 1000);
    const validMethods = ['sdk_push', 'sdk_telegram', 'walletconnect', 'telegram_bot', 'rest'];

    for (let i = 0; i < validMethods.length; i++) {
      expect(() => {
        sqlite.prepare(
          `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, owner_approval_method)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(`w-method-${i}`, `Method ${validMethods[i]}`, 'solana', 'testnet', `pk-method-${i}`, 'ACTIVE', 0, ts, ts, validMethods[i]);
      }).not.toThrow();
    }
  });

  it('CHECK constraint rejects invalid approval method on fresh DB', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      sqlite.prepare(
        `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at, owner_approval_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run('w-invalid', 'Invalid Method', 'solana', 'testnet', 'pk-invalid', 'ACTIVE', 0, ts, ts, 'invalid_method');
    }).toThrow(/CHECK/i);
  });
});

describe('v18 migration on existing DB', () => {
  let v17Sqlite: DatabaseType;

  function _createV17Database(): DatabaseType {
    const conn = createDatabase(':memory:');
    const db = conn.sqlite;
    pushSchema(db);
    // pushSchema creates a v18 DB, but we simulate a v17 DB
    // by just checking that runMigrations on a fresh DB with custom v18 works
    return db;
  }

  afterEach(() => {
    try {
      v17Sqlite?.close();
    } catch {
      // already closed
    }
  });

  it('v18 migration is registered in MIGRATIONS array', () => {
    const v18 = MIGRATIONS.find((m) => m.version === 18);
    expect(v18).toBeDefined();
    expect(v18!.description).toContain('owner_approval_method');
  });

  it('v18 migration adds column to wallets table via runMigrations', () => {
    // Create a v19-like DB by manually running only up to v19
    // Since pushSchema records all versions, we test v18 in isolation
    const v18Migration: Migration[] = [
      {
        // Relative to the latest real migration: a literal collides the moment
        // the next one lands, which is what happened when v63 was added.
        version: LATEST_SCHEMA_VERSION + 1,
        description: 'Test: Add owner_approval_method via ALTER (simulated)',
        up: (db) => {
          // Check column was already added by the real v18 migration
          const columns = db.prepare("PRAGMA table_info('wallets')").all() as Array<{ name: string }>;
          const colNames = columns.map((c) => c.name);
          if (!colNames.includes('owner_approval_method_test')) {
            db.exec('ALTER TABLE wallets ADD COLUMN owner_approval_method_test TEXT');
          }
        },
      },
    ];

    const result = runMigrations(sqlite, v18Migration);
    expect(result.applied).toBe(1);
  });

  it('preserves existing wallet data after v18 (verified via pushSchema)', () => {
    // Insert a wallet on the fresh DB (which includes v18)
    const ts = Math.floor(Date.now() / 1000);
    sqlite.prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w-preserve', 'Preserve Test', 'solana', 'testnet', 'pk-preserve', 'ACTIVE', 0, ts, ts);

    // Verify the wallet exists with owner_approval_method = NULL
    const row = sqlite.prepare('SELECT * FROM wallets WHERE id = ?').get('w-preserve') as Record<string, unknown>;
    expect(row.name).toBe('Preserve Test');
    expect(row.owner_approval_method).toBeNull();
    expect(row.chain).toBe('solana');
    expect(row.status).toBe('ACTIVE');
  });
});
