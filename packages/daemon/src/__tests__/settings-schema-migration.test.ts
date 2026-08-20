/**
 * Tests for settings table v5 migration and settings-crypto module.
 *
 * Tests cover:
 * 1. v5 migration creates settings table on existing v4 DB
 * 2. Fresh DB (pushSchema) includes settings table and schema_version 5
 * 3. Existing DB data is preserved after v5 migration
 * 4. settings-crypto: encrypt -> decrypt round-trip
 * 5. settings-crypto: wrong password fails decryption
 * 6. settings-crypto: empty string encryption
 * 7. CREDENTIAL_KEYS contains expected keys
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
import {
  encryptSettingValue,
  decryptSettingValue,
  deriveSettingsKey,
  CREDENTIAL_KEYS,
} from '../infrastructure/settings/settings-crypto.js';

// ---------------------------------------------------------------------------
// Helper: create a v4-state DB (before settings table)
// ---------------------------------------------------------------------------

function createV4Database(): DatabaseType {
  const conn = createDatabase(':memory:');
  const db = conn.sqlite;

  db.exec('BEGIN');

  // Minimal v4 schema: wallets + sessions + schema_version + token_registry
  // (just enough to test v5 migration without full schema)
  db.exec(`CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL,
  network TEXT NOT NULL,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATING',
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT
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
  created_at INTEGER NOT NULL
)`);

  db.exec(`CREATE TABLE IF NOT EXISTS token_registry (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'custom',
  created_at INTEGER NOT NULL
)`);

  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`);

  // Record versions 1-4 as applied
  const ts = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(1, ts, 'Initial schema');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(2, ts, 'Expand agents network CHECK');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(3, ts, 'Rename agents to wallets');
  db.prepare('INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)')
    .run(4, ts, 'Create token_registry table');

  db.exec('COMMIT');
  return db;
}

// ---------------------------------------------------------------------------
// v5 migration tests
// ---------------------------------------------------------------------------

describe('v5 migration: settings table', () => {
  let v4Sqlite: DatabaseType;

  function getV5Migration(): Migration {
    const v5 = MIGRATIONS.find((m) => m.version === 5);
    if (!v5) throw new Error('v5 migration not found in MIGRATIONS array');
    return v5;
  }

  beforeEach(() => {
    v4Sqlite = createV4Database();
  });

  afterEach(() => {
    try {
      v4Sqlite.close();
    } catch {
      /* already closed */
    }
  });

  it('should create settings table on existing v4 DB', () => {
    // Verify settings table does NOT exist before migration
    const tablesBefore = v4Sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .all();
    expect(tablesBefore).toHaveLength(0);

    // Run v5 migration
    const v5 = getV5Migration();
    const result = runMigrations(v4Sqlite, [v5]);
    expect(result).toEqual({ applied: 1, skipped: 0 });

    // Verify settings table exists
    const tablesAfter = v4Sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .all();
    expect(tablesAfter).toHaveLength(1);

    // Verify columns
    const columns = v4Sqlite.prepare("PRAGMA table_info('settings')").all() as Array<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>;
    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain('key');
    expect(colNames).toContain('value');
    expect(colNames).toContain('encrypted');
    expect(colNames).toContain('category');
    expect(colNames).toContain('updated_at');

    // key is PK
    const keyCol = columns.find((c) => c.name === 'key');
    expect(keyCol!.pk).toBe(1);

    // encrypted has NOT NULL
    const encCol = columns.find((c) => c.name === 'encrypted');
    expect(encCol!.notnull).toBe(1);
  });

  it('should create idx_settings_category index', () => {
    const v5 = getV5Migration();
    runMigrations(v4Sqlite, [v5]);

    const indexes = v4Sqlite.prepare("PRAGMA index_list('settings')").all() as Array<{
      name: string;
    }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_settings_category');
  });

  it('should record schema_version 5', () => {
    const v5 = getV5Migration();
    runMigrations(v4Sqlite, [v5]);

    const row = v4Sqlite
      .prepare('SELECT version, description FROM schema_version WHERE version = 5')
      .get() as { version: number; description: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.version).toBe(5);
    expect(row!.description).toContain('settings');
  });

  it('should preserve existing wallets and sessions data after v5 migration', () => {
    const ts = Math.floor(Date.now() / 1000);

    // Insert wallet + session
    v4Sqlite
      .prepare(
        `INSERT INTO wallets (id, name, chain, network, public_key, status, owner_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('w-1', 'Test Wallet', 'solana', 'mainnet', 'pk-1', 'ACTIVE', 0, ts, ts);

    v4Sqlite
      .prepare(
        `INSERT INTO sessions (id, wallet_id, token_hash, expires_at, absolute_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('s-1', 'w-1', 'hash-1', ts + 3600, ts + 86400, ts);

    // Run v5 migration
    const v5 = getV5Migration();
    runMigrations(v4Sqlite, [v5]);

    // Verify wallet data preserved
    const wallet = v4Sqlite.prepare('SELECT * FROM wallets WHERE id = ?').get('w-1') as Record<
      string,
      unknown
    >;
    expect(wallet).toBeDefined();
    expect(wallet.name).toBe('Test Wallet');
    expect(wallet.chain).toBe('solana');

    // Verify session data preserved
    const session = v4Sqlite.prepare('SELECT * FROM sessions WHERE id = ?').get('s-1') as Record<
      string,
      unknown
    >;
    expect(session).toBeDefined();
    expect(session.wallet_id).toBe('w-1');
  });

  it('should allow INSERT into settings table after migration', () => {
    const v5 = getV5Migration();
    runMigrations(v4Sqlite, [v5]);

    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      v4Sqlite
        .prepare(
          `INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('notifications.telegram_bot_token', 'encrypted-value', 1, 'notifications', ts);
    }).not.toThrow();

    const row = v4Sqlite
      .prepare('SELECT * FROM settings WHERE key = ?')
      .get('notifications.telegram_bot_token') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.value).toBe('encrypted-value');
    expect(row.encrypted).toBe(1);
    expect(row.category).toBe('notifications');
  });

  it('should enforce encrypted CHECK constraint (0 or 1 only)', () => {
    const v5 = getV5Migration();
    runMigrations(v4Sqlite, [v5]);

    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      v4Sqlite
        .prepare(
          `INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('bad-key', 'val', 2, 'notifications', ts);
    }).toThrow(/CHECK/i);
  });
});

// ---------------------------------------------------------------------------
// Fresh DB (pushSchema) tests
// ---------------------------------------------------------------------------

describe('Fresh DB: settings table via pushSchema', () => {
  let freshSqlite: DatabaseType;

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    freshSqlite = conn.sqlite;
    pushSchema(freshSqlite);
  });

  afterEach(() => {
    try {
      freshSqlite.close();
    } catch {
      /* already closed */
    }
  });

  it('should include settings table in fresh DB', () => {
    const tables = freshSqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it('should record schema_version in fresh DB', () => {
    const row = freshSqlite
      .prepare('SELECT MAX(version) AS max_version FROM schema_version')
      .get() as { max_version: number };
    expect(row.max_version).toBe(63);
  });

  it('LATEST_SCHEMA_VERSION should be 60', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(63);
  });
});

// ---------------------------------------------------------------------------
// settings-crypto tests
// ---------------------------------------------------------------------------

describe('settings-crypto: AES-256-GCM encrypt/decrypt', () => {
  const masterPassword = 'test-master-password-2026';

  it('should encrypt and decrypt a value (round-trip)', () => {
    const plaintext = 'bot:1234567890:ABCDEFghijklmnop';
    const encrypted = encryptSettingValue(plaintext, masterPassword);

    // encrypted should be base64
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);

    // decrypt should return original plaintext
    const decrypted = decryptSettingValue(encrypted, masterPassword);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail decryption with wrong password', () => {
    const plaintext = 'secret-webhook-url';
    const encrypted = encryptSettingValue(plaintext, masterPassword);

    expect(() => {
      decryptSettingValue(encrypted, 'wrong-password');
    }).toThrow();
  });

  it('should encrypt and decrypt empty string', () => {
    const encrypted = encryptSettingValue('', masterPassword);
    const decrypted = decryptSettingValue(encrypted, masterPassword);
    expect(decrypted).toBe('');
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same-value';
    const enc1 = encryptSettingValue(plaintext, masterPassword);
    const enc2 = encryptSettingValue(plaintext, masterPassword);

    // Different ciphertexts due to random IV
    expect(enc1).not.toBe(enc2);

    // Both should decrypt to the same value
    expect(decryptSettingValue(enc1, masterPassword)).toBe(plaintext);
    expect(decryptSettingValue(enc2, masterPassword)).toBe(plaintext);
  });

  it('should derive deterministic key from same password', () => {
    const key1 = deriveSettingsKey(masterPassword);
    const key2 = deriveSettingsKey(masterPassword);
    expect(key1.equals(key2)).toBe(true);
    expect(key1.length).toBe(32);
  });

  it('should derive different keys from different passwords', () => {
    const key1 = deriveSettingsKey('password-a');
    const key2 = deriveSettingsKey('password-b');
    expect(key1.equals(key2)).toBe(false);
  });

  it('should handle unicode plaintext', () => {
    const plaintext = 'webhook://example.com/path?emoji=\u{1F600}&text=\uD55C\uAE00';
    const encrypted = encryptSettingValue(plaintext, masterPassword);
    const decrypted = decryptSettingValue(encrypted, masterPassword);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle long plaintext (>256 bytes)', () => {
    const plaintext = 'A'.repeat(1024);
    const encrypted = encryptSettingValue(plaintext, masterPassword);
    const decrypted = decryptSettingValue(encrypted, masterPassword);
    expect(decrypted).toBe(plaintext);
  });
});

// ---------------------------------------------------------------------------
// CREDENTIAL_KEYS tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// v41 migration tests: per-wallet AA provider columns
// ---------------------------------------------------------------------------

describe('v41 migration: per-wallet AA provider columns', () => {
  let freshSqlite: DatabaseType;

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    freshSqlite = conn.sqlite;
    pushSchema(freshSqlite);
  });

  afterEach(() => {
    try {
      freshSqlite.close();
    } catch {
      /* already closed */
    }
  });

  it('fresh DB should have aa_provider columns in wallets', () => {
    const columns = freshSqlite.prepare("PRAGMA table_info('wallets')").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;
    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain('aa_provider');
    expect(colNames).toContain('aa_provider_api_key_encrypted');
    expect(colNames).toContain('aa_bundler_url');
    expect(colNames).toContain('aa_paymaster_url');
  });

  it('aa_provider columns should be nullable', () => {
    const columns = freshSqlite.prepare("PRAGMA table_info('wallets')").all() as Array<{
      name: string;
      notnull: number;
    }>;
    const aaProviderCol = columns.find((c) => c.name === 'aa_provider');
    expect(aaProviderCol!.notnull).toBe(0);
  });

  it('should accept valid aa_provider values', () => {
    const ts = Math.floor(Date.now() / 1000);
    for (const provider of ['pimlico', 'alchemy', 'custom']) {
      expect(() => {
        freshSqlite
          .prepare(
            `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, account_type, deployed, created_at, updated_at, aa_provider)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(`w-${provider}`, `Test ${provider}`, 'ethereum', 'testnet', `pk-${provider}`, 'ACTIVE', 0, 'smart', 1, ts, ts, provider);
      }).not.toThrow();
    }
  });

  it('should reject invalid aa_provider value via CHECK constraint', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      freshSqlite
        .prepare(
          `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, account_type, deployed, created_at, updated_at, aa_provider)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run('w-bad', 'Bad Provider', 'ethereum', 'testnet', 'pk-bad', 'ACTIVE', 0, 'smart', 1, ts, ts, 'gelato');
    }).toThrow(/CHECK/i);
  });

  it('should allow NULL aa_provider', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() => {
      freshSqlite
        .prepare(
          `INSERT INTO wallets (id, name, chain, environment, public_key, status, owner_verified, account_type, deployed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run('w-eoa', 'EOA Wallet', 'ethereum', 'testnet', 'pk-eoa', 'ACTIVE', 0, 'eoa', 1, ts, ts);
    }).not.toThrow();

    const wallet = freshSqlite.prepare('SELECT aa_provider FROM wallets WHERE id = ?').get('w-eoa') as Record<string, unknown>;
    expect(wallet.aa_provider).toBeNull();
  });
});

describe('CREDENTIAL_KEYS', () => {
  it('should contain telegram_bot_token', () => {
    expect(CREDENTIAL_KEYS.has('notifications.telegram_bot_token')).toBe(true);
  });

  it('should contain discord_webhook_url', () => {
    expect(CREDENTIAL_KEYS.has('notifications.discord_webhook_url')).toBe(true);
  });

  it('should contain jwt_secret', () => {
    expect(CREDENTIAL_KEYS.has('security.jwt_secret')).toBe(true);
  });

  it('should NOT contain non-credential keys', () => {
    expect(CREDENTIAL_KEYS.has('notifications.enabled')).toBe(false);
    expect(CREDENTIAL_KEYS.has('daemon.port')).toBe(false);
  });
});
