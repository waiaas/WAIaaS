/**
 * Tests for database migration v63: pending_approvals.owner_message.
 *
 * Verifies:
 * 1. The column is added
 * 2. Rows approved before v63 survive with NULL, not a fabricated value
 * 3. Existing data (signature, timestamps, FK) is preserved
 * 4. Idempotent -- running it twice does not error
 * 5. A post-migration approval can store and read back the signed message
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { migrations } from '../infrastructure/database/migrations/v63.js';

const [v63] = migrations;

function setupPreV63Schema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL
    )
  `);

  // pending_approvals as of v40 (typed_data_json present, owner_message absent)
  db.exec(`
    CREATE TABLE pending_approvals (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      required_by INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      approved_at INTEGER,
      rejected_at INTEGER,
      owner_signature TEXT,
      approval_channel TEXT DEFAULT 'rest_api',
      approval_type TEXT NOT NULL DEFAULT 'SIWE' CHECK (approval_type IN ('SIWE', 'EIP712')),
      typed_data_json TEXT,
      created_at INTEGER NOT NULL
    )
  `);
  db.exec('CREATE INDEX idx_pending_approvals_tx_id ON pending_approvals(tx_id)');
}

function columnNames(db: Database.Database): string[] {
  return (db.pragma('table_info(pending_approvals)') as { name: string }[]).map((c) => c.name);
}

describe('Migration v63: pending_approvals.owner_message', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `waiaas-v63-${Date.now()}-${Math.floor(performance.now() * 1000)}`);
    mkdirSync(tmpDir, { recursive: true });
    db = new Database(join(tmpDir, 'test.db'));
    db.pragma('foreign_keys = ON');
    setupPreV63Schema(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('declares version 63', () => {
    expect(v63?.version).toBe(63);
  });

  it('adds the owner_message column', () => {
    expect(columnNames(db)).not.toContain('owner_message');

    v63!.up(db);

    expect(columnNames(db)).toContain('owner_message');
  });

  it('leaves pre-existing approvals at NULL rather than inventing a message', () => {
    db.prepare('INSERT INTO transactions (id, status) VALUES (?, ?)').run('tx-1', 'EXECUTING');
    db.prepare(
      `INSERT INTO pending_approvals
       (id, tx_id, required_by, expires_at, approved_at, owner_signature, approval_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('ap-1', 'tx-1', 100, 200, 150, 'sig-from-before-v63', 'SIWE', 100);

    v63!.up(db);

    const row = db
      .prepare('SELECT owner_signature, owner_message, approved_at FROM pending_approvals WHERE id = ?')
      .get('ap-1') as { owner_signature: string; owner_message: string | null; approved_at: number };

    // The signature is still there and still unverifiable on its own -- that is the
    // honest state for an approval recorded before the message was kept.
    expect(row.owner_signature).toBe('sig-from-before-v63');
    expect(row.owner_message).toBeNull();
    expect(row.approved_at).toBe(150);
  });

  it('preserves rows and foreign keys across the migration', () => {
    db.prepare('INSERT INTO transactions (id, status) VALUES (?, ?)').run('tx-1', 'PENDING_APPROVAL');
    db.prepare('INSERT INTO transactions (id, status) VALUES (?, ?)').run('tx-2', 'CANCELLED');
    db.prepare(
      `INSERT INTO pending_approvals (id, tx_id, required_by, expires_at, approval_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('ap-1', 'tx-1', 100, 200, 'SIWE', 100);
    db.prepare(
      `INSERT INTO pending_approvals (id, tx_id, required_by, expires_at, rejected_at, approval_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('ap-2', 'tx-2', 100, 200, 180, 'EIP712', 100);

    v63!.up(db);

    const count = db.prepare('SELECT COUNT(*) AS n FROM pending_approvals').get() as { n: number };
    expect(count.n).toBe(2);

    const fkErrors = db.pragma('foreign_key_check') as unknown[];
    expect(fkErrors).toHaveLength(0);
  });

  it('is idempotent', () => {
    v63!.up(db);
    expect(() => v63!.up(db)).not.toThrow();
    expect(columnNames(db).filter((n) => n === 'owner_message')).toHaveLength(1);
  });

  it('stores and reads back a signed message after migration', () => {
    v63!.up(db);

    db.prepare('INSERT INTO transactions (id, status) VALUES (?, ?)').run('tx-1', 'EXECUTING');
    const signed = 'Approve tx-1\n금액: 5 USDC';
    db.prepare(
      `INSERT INTO pending_approvals
       (id, tx_id, required_by, expires_at, approved_at, owner_signature, owner_message, approval_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('ap-1', 'tx-1', 100, 200, 150, 'sig', signed, 'SIWE', 100);

    const row = db
      .prepare('SELECT owner_message FROM pending_approvals WHERE id = ?')
      .get('ap-1') as { owner_message: string };

    // Round-trips non-ASCII and newlines, which is the whole point of keeping it.
    expect(row.owner_message).toBe(signed);
  });
});
