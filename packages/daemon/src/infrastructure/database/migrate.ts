/**
 * Schema push + incremental migration runner for daemon SQLite database.
 *
 * Creates all tables with indexes, foreign keys, and CHECK constraints
 * using CREATE TABLE IF NOT EXISTS statements. After initial schema creation,
 * runs incremental migrations via runMigrations() for ALTER TABLE changes.
 *
 * v1.4+: DB schema changes MUST use ALTER TABLE incremental migrations (MIG-01~06).
 * DB deletion and recreation is prohibited.
 *
 * DDL statements and migration definitions are split into submodules:
 * - schema-ddl.ts: getCreateTableStatements(), getCreateIndexStatements(), LATEST_SCHEMA_VERSION
 * - migrations/v2-v10.ts through migrations/v51-v59.ts: individual migration definitions
 *
 * @see docs/25-sqlite-schema.md
 * @see docs/65-migration-strategy.md
 */

import type { Database } from 'better-sqlite3';
import {
  getCreateTableStatements,
  getCreateIndexStatements,
} from './schema-ddl.js';
import { migrations as v2to10 } from './migrations/v2-v10.js';
import { migrations as v11to20 } from './migrations/v11-v20.js';
import { migrations as v21to30 } from './migrations/v21-v30.js';
import { migrations as v31to40 } from './migrations/v31-v40.js';
import { migrations as v41to50 } from './migrations/v41-v50.js';
import { migrations as v51to59 } from './migrations/v51-v59.js';
import { migrations as v61 } from './migrations/v61.js';
import { migrations as v62 } from './migrations/v62.js';
import { migrations as v63 } from './migrations/v63.js';

// Re-export LATEST_SCHEMA_VERSION from schema-ddl
export { LATEST_SCHEMA_VERSION } from './schema-ddl.js';

// ---------------------------------------------------------------------------
// Migration type definition
// ---------------------------------------------------------------------------

/** A single incremental migration (ALTER TABLE, CREATE INDEX, etc.). */
export interface Migration {
  /** Monotonically increasing version number (must be > 1, since version 1 = initial schema). */
  version: number;
  /** Human-readable description for schema_version table. */
  description: string;
  /**
   * If true, runMigrations will NOT wrap up() in BEGIN/COMMIT.
   * The up() function manages its own PRAGMA foreign_keys=OFF + BEGIN/COMMIT.
   * Use for table recreation (12-step) migrations that require foreign_keys disabled.
   */
  managesOwnTransaction?: boolean;
  /** DDL statements to execute. Runs inside a transaction (unless managesOwnTransaction). */
  up: (sqlite: Database) => void;
}

// ---------------------------------------------------------------------------
// Global migration registry (assembled from submodules)
// ---------------------------------------------------------------------------

/**
 * Complete migration registry. Built by spreading all 7 version-range arrays.
 * Each migration's version must be unique and greater than 1.
 */
export const MIGRATIONS: Migration[] = [
  ...v2to10,
  ...v11to20,
  ...v21to30,
  ...v31to40,
  ...v41to50,
  ...v51to59,
  ...v61,
  ...v62,
  ...v63,
];

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

/**
 * Run incremental migrations against the database.
 *
 * - Reads the current max version from schema_version table
 * - Executes each migration with version > current in ascending order
 * - Each migration runs in its own transaction (BEGIN/COMMIT)
 * - On failure: ROLLBACK the failed migration, throw error, skip remaining
 *
 * @param sqlite - Raw better-sqlite3 database instance.
 * @param migrations - Migration list to apply. Defaults to global MIGRATIONS array.
 * @returns Count of applied and skipped migrations.
 */
export function runMigrations(
  sqlite: Database,
  migrations: Migration[] = MIGRATIONS,
): { applied: number; skipped: number } {
  // Get current schema version (pushSchema always inserts version 1)
  const row = sqlite
    .prepare('SELECT MAX(version) AS max_version FROM schema_version')
    .get() as { max_version: number | null } | undefined;
  const currentVersion = row?.max_version ?? 1;

  // Sort migrations by version ascending to guarantee order
  const sorted = [...migrations].sort((a, b) => a.version - b.version);

  let applied = 0;
  let skipped = 0;

  for (const migration of sorted) {
    if (migration.version <= currentVersion) {
      skipped++;
      continue;
    }

    if (migration.managesOwnTransaction) {
      // Migration manages its own PRAGMA + transaction (e.g. 12-step table recreation)
      // Disable foreign keys so the migration can DROP/RENAME tables
      sqlite.pragma('foreign_keys = OFF');
      try {
        migration.up(sqlite);

        // Record successful migration (up() must have committed its own transaction)
        sqlite
          .prepare(
            'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          )
          .run(
            migration.version,
            Math.floor(Date.now() / 1000),
            migration.description,
          );

        applied++;
      } catch (err) {
        // Ensure foreign_keys is restored even on failure
        try {
          sqlite.pragma('foreign_keys = ON');
        } catch {
          /* best effort */
        }
        throw new Error(
          `Migration v${migration.version} (${migration.description}) failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      // Re-enable foreign keys after successful migration
      sqlite.pragma('foreign_keys = ON');
    } else {
      // Standard migration: wrap in BEGIN/COMMIT
      sqlite.exec('BEGIN');
      try {
        migration.up(sqlite);

        // Record successful migration
        sqlite
          .prepare(
            'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          )
          .run(
            migration.version,
            Math.floor(Date.now() / 1000),
            migration.description,
          );

        sqlite.exec('COMMIT');
        applied++;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw new Error(
          `Migration v${migration.version} (${migration.description}) failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return { applied, skipped };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Push the full schema to the database (CREATE TABLE IF NOT EXISTS + indexes).
 * Then run any pending incremental migrations.
 * Safe to call on every daemon startup -- idempotent.
 *
 * @param sqlite - Raw better-sqlite3 database instance (PRAGMAs must already be applied).
 */
export function pushSchema(sqlite: Database): void {
  const tables = getCreateTableStatements();
  const indexes = getCreateIndexStatements();

  // Step 1: Create tables + record schema version (NO indexes yet)
  // Indexes reference latest-schema columns (e.g. wallets.environment) that may
  // not exist in pre-migration databases. Creating indexes before migrations
  // causes "no such column" errors on existing DBs. (MIGR-01 fix)
  //
  // Pre-v3 databases have an `agents` table that gets renamed to `wallets` by
  // v3 migration. We must skip creating `wallets` if `agents` still exists,
  // otherwise v3 migration fails with "table already exists". (MIGR-01b fix)
  const hasAgentsTable =
    (
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
        .get() as { name: string } | undefined
    ) !== undefined;

  // Pre-v19 databases have sessions.wallet_id (or agent_id) which gets migrated to
  // session_wallets by v19 migration. Skip creating session_wallets DDL so v19 migration
  // can handle it. Detect existing DB by checking if schema_version has v1 recorded
  // (existing DB) AND v19 not yet applied. (MIGR-01c fix)
  const hasSchemaVersionTable =
    (
      sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
        .get() as { name: string } | undefined
    ) !== undefined;
  const isExistingDbPreV19 =
    hasSchemaVersionTable &&
    (
      sqlite
        .prepare('SELECT version FROM schema_version WHERE version = 1')
        .get() as { version: number } | undefined
    ) !== undefined &&
    (
      sqlite
        .prepare('SELECT version FROM schema_version WHERE version = 19')
        .get() as { version: number } | undefined
    ) === undefined;

  sqlite.exec('BEGIN');
  try {
    for (const stmt of tables) {
      // Skip wallets table creation if agents table exists (v3 migration will handle rename)
      if (hasAgentsTable && stmt.includes('CREATE TABLE IF NOT EXISTS wallets')) {
        continue;
      }
      // Skip session_wallets creation if this is a pre-v19 existing DB (v19 migration will handle)
      if (isExistingDbPreV19 && stmt.includes('CREATE TABLE IF NOT EXISTS session_wallets')) {
        continue;
      }
      sqlite.exec(stmt);
    }

    // Record schema version 1 if not already recorded (for existing DBs that only had v1)
    const existing = sqlite
      .prepare('SELECT version FROM schema_version WHERE version = 1')
      .get() as { version: number } | undefined;
    if (!existing) {
      // Fresh DB: record all versions up to LATEST_SCHEMA_VERSION so migrations are skipped.
      // The DDL above already represents the latest schema state.
      const ts = Math.floor(Date.now() / 1000);
      sqlite
        .prepare(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
        )
        .run(1, ts, 'Initial schema (18 tables)');

      // Record all migration versions as already applied (DDL is up-to-date)
      for (const migration of MIGRATIONS) {
        sqlite
          .prepare(
            'INSERT OR IGNORE INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          )
          .run(migration.version, ts, `${migration.description} (via pushSchema)`);
      }
    }

    sqlite.exec('COMMIT');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    throw err;
  }

  // Step 2: Run incremental migrations (adds/transforms columns in existing DBs)
  // Fresh DBs have all versions recorded above, so migrations are skipped.
  runMigrations(sqlite);

  // Step 3: Create indexes AFTER migrations complete
  // All columns are now guaranteed to exist (e.g. wallets.environment from v7).
  sqlite.exec('BEGIN');
  try {
    for (const stmt of indexes) {
      sqlite.exec(stmt);
    }
    sqlite.exec('COMMIT');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    throw err;
  }
}
