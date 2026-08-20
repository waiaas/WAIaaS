/**
 * Tests for insertAuditLog helper and DB migration v36.
 *
 * Tests 11-16 from 310-01-PLAN.md behavior section:
 * - insertAuditLog inserts rows with all/minimal fields
 * - Best-effort pattern (no throw on sqlite error)
 * - Correct timestamp (epoch seconds)
 * - Migration v36 creates idx_audit_log_tx_id index
 * - Migration v36 is idempotent
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import { createDatabase, pushSchema, LATEST_SCHEMA_VERSION } from '../infrastructure/database/index.js';
import { insertAuditLog } from '../infrastructure/database/audit-helper.js';

// ---------------------------------------------------------------------------
// Setup: in-memory DB with full schema
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
// Tests
// ---------------------------------------------------------------------------

describe('insertAuditLog helper', () => {
  // ---------- Test 11: Insert with all fields ----------
  it('inserts a row with all fields into audit_log table', () => {
    insertAuditLog(sqlite, {
      eventType: 'TX_SUBMITTED',
      actor: 'session:abc',
      walletId: '01936d3c-7f8a-7b00-9e4d-aaaaaa000001',
      sessionId: '01936d3c-7f8a-7b00-9e4d-aaaaaa000002',
      txId: '01936d3c-7f8a-7b00-9e4d-aaaaaa000003',
      details: { txHash: '0xabc', chain: 'evm' },
      severity: 'info',
      ipAddress: '127.0.0.1',
    });

    const row = sqlite
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1')
      .get() as Record<string, unknown>;

    expect(row).toBeTruthy();
    expect(row.event_type).toBe('TX_SUBMITTED');
    expect(row.actor).toBe('session:abc');
    expect(row.wallet_id).toBe('01936d3c-7f8a-7b00-9e4d-aaaaaa000001');
    expect(row.session_id).toBe('01936d3c-7f8a-7b00-9e4d-aaaaaa000002');
    expect(row.tx_id).toBe('01936d3c-7f8a-7b00-9e4d-aaaaaa000003');
    expect(JSON.parse(row.details as string)).toEqual({ txHash: '0xabc', chain: 'evm' });
    expect(row.severity).toBe('info');
    expect(row.ip_address).toBe('127.0.0.1');
  });

  // ---------- Test 12: Insert with minimal fields ----------
  it('inserts with minimal fields (only required: eventType, actor, details, severity)', () => {
    insertAuditLog(sqlite, {
      eventType: 'MASTER_AUTH_FAILED',
      actor: 'unknown',
      details: { reason: 'Invalid password' },
      severity: 'critical',
    });

    const row = sqlite
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1')
      .get() as Record<string, unknown>;

    expect(row).toBeTruthy();
    expect(row.event_type).toBe('MASTER_AUTH_FAILED');
    expect(row.actor).toBe('unknown');
    expect(row.wallet_id).toBeNull();
    expect(row.session_id).toBeNull();
    expect(row.tx_id).toBeNull();
    expect(row.ip_address).toBeNull();
    expect(row.severity).toBe('critical');
  });

  // ---------- Test 13: Best-effort pattern (no throw) ----------
  it('does not throw when sqlite throws (best-effort pattern)', () => {
    // Create a mock-like object that throws on prepare()
    const brokenSqlite = {
      prepare: () => {
        throw new Error('DB is closed');
      },
    } as unknown as DatabaseType;

    // Should not throw
    expect(() => {
      insertAuditLog(brokenSqlite, {
        eventType: 'WALLET_CREATED',
        actor: 'master',
        details: { test: true },
        severity: 'info',
      });
    }).not.toThrow();
  });

  // ---------- Test 14: Correct timestamp (epoch seconds) ----------
  it('sets correct timestamp (epoch seconds)', () => {
    const beforeSec = Math.floor(Date.now() / 1000);

    insertAuditLog(sqlite, {
      eventType: 'SESSION_CREATED',
      actor: 'master',
      details: { sessionId: 'test' },
      severity: 'info',
    });

    const afterSec = Math.floor(Date.now() / 1000);

    const row = sqlite
      .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1')
      .get() as Record<string, unknown>;

    expect(row).toBeTruthy();
    const timestamp = row.timestamp as number;
    expect(timestamp).toBeGreaterThanOrEqual(beforeSec);
    expect(timestamp).toBeLessThanOrEqual(afterSec);
  });
});

describe('DB migration v36', () => {
  // ---------- Test 15: idx_audit_log_tx_id index exists ----------
  it('creates idx_audit_log_tx_id index', () => {
    const indexes = sqlite
      .prepare("PRAGMA index_list('audit_log')")
      .all() as Array<{ name: string }>;

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_audit_log_tx_id');
  });

  // ---------- Test 16: LATEST_SCHEMA_VERSION is 59 ----------
  it('LATEST_SCHEMA_VERSION is 59', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });

  // ---------- Test 16b: Migration is idempotent ----------
  it('is idempotent (CREATE INDEX IF NOT EXISTS)', () => {
    // Running the migration SQL again should not error
    expect(() => {
      sqlite.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_tx_id ON audit_log(tx_id)');
    }).not.toThrow();
  });
});
