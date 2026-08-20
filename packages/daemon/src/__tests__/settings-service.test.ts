/**
 * SettingsService unit and integration tests.
 *
 * Tests the full fallback chain (DB > config.toml > default),
 * credential auto-encryption/decryption, importFromConfig() logic,
 * getAll/getAllMasked grouped output, and setMany batch operations.
 *
 * Uses in-memory SQLite with pushSchema for a fresh DB per test.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { createDatabase, pushSchema, settings, runMigrations, MIGRATIONS } from '../infrastructure/database/index.js';
import type * as schema from '../infrastructure/database/schema.js';
import { DaemonConfigSchema } from '../infrastructure/config/loader.js';
import type { DaemonConfig } from '../infrastructure/config/loader.js';
import { SettingsService } from '../infrastructure/settings/settings-service.js';
import { SETTING_DEFINITIONS, getSettingDefinition } from '../infrastructure/settings/setting-keys.js';
import { decryptSettingValue } from '../infrastructure/settings/settings-crypto.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_MASTER_PASSWORD = 'test-master-password';

/** Create a fresh in-memory DB with all tables. */
function createTestDb(): { sqlite: DatabaseType; db: BetterSQLite3Database<typeof schema> } {
  const conn = createDatabase(':memory:');
  pushSchema(conn.sqlite);
  return conn;
}

/** Create a DaemonConfig with defaults + optional overrides. */
function createTestConfig(overrides?: Partial<Record<string, unknown>>): DaemonConfig {
  return DaemonConfigSchema.parse(overrides ?? {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsService', () => {
  let sqlite: DatabaseType;
  let db: BetterSQLite3Database<typeof schema>;
  let config: DaemonConfig;
  let service: SettingsService;

  beforeEach(() => {
    const conn = createTestDb();
    sqlite = conn.sqlite;
    db = conn.db;
    config = createTestConfig();
    service = new SettingsService({
      db,
      config,
      masterPassword: TEST_MASTER_PASSWORD,
    });
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ignore */ }
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns DB value when exists', () => {
      // Directly insert a non-credential value into DB
      db.insert(settings).values({
        key: 'daemon.log_level',
        value: 'debug',
        encrypted: false,
        category: 'daemon',
        updatedAt: new Date(),
      }).run();

      expect(service.get('daemon.log_level')).toBe('debug');
    });

    it('returns config.toml value when DB empty', () => {
      // Default config has log_level = 'info'
      expect(service.get('daemon.log_level')).toBe('info');
    });

    it('returns default when DB empty and config is default', () => {
      // notifications.locale defaults to 'en' in both config and SETTING_DEFINITIONS
      expect(service.get('notifications.locale')).toBe('en');
    });

    it('decrypts credential value from DB', () => {
      // Use set() to store an encrypted credential
      service.set('notifications.telegram_bot_token', 'my-secret-token-123');

      // Verify it comes back decrypted
      const result = service.get('notifications.telegram_bot_token');
      expect(result).toBe('my-secret-token-123');
    });

    it('throws for unknown key', () => {
      expect(() => service.get('nonexistent.key')).toThrow('Unknown setting key');
    });
  });

  // -------------------------------------------------------------------------
  // set()
  // -------------------------------------------------------------------------

  describe('set()', () => {
    it('stores plain value for non-credential', () => {
      service.set('daemon.log_level', 'warn');

      // Read raw DB row to confirm it's stored as plaintext
      const row = db.select().from(settings).where(eq(settings.key, 'daemon.log_level')).get();
      expect(row).toBeDefined();
      expect(row!.value).toBe('warn');
      expect(row!.encrypted).toBe(false);
      expect(row!.category).toBe('daemon');
    });

    it('encrypts credential value', () => {
      service.set('notifications.telegram_bot_token', 'bot123:secret');

      // Read raw DB row - value should be encrypted (not plaintext)
      const row = db.select().from(settings).where(eq(settings.key, 'notifications.telegram_bot_token')).get();
      expect(row).toBeDefined();
      expect(row!.value).not.toBe('bot123:secret');
      expect(row!.encrypted).toBe(true);
      expect(row!.category).toBe('notifications');

      // Decrypt to verify round-trip
      const decrypted = decryptSettingValue(row!.value, TEST_MASTER_PASSWORD);
      expect(decrypted).toBe('bot123:secret');
    });

    it('updates existing value (upsert)', () => {
      service.set('daemon.log_level', 'debug');
      expect(service.get('daemon.log_level')).toBe('debug');

      service.set('daemon.log_level', 'error');
      expect(service.get('daemon.log_level')).toBe('error');

      // Only one row should exist
      const rows = db.select().from(settings).where(eq(settings.key, 'daemon.log_level')).all();
      expect(rows).toHaveLength(1);
    });

    it('throws for unknown key', () => {
      expect(() => service.set('nonexistent.key', 'value')).toThrow('Unknown setting key');
    });
  });

  // -------------------------------------------------------------------------
  // setMany()
  // -------------------------------------------------------------------------

  describe('setMany()', () => {
    it('stores multiple values', () => {
      service.setMany([
        { key: 'daemon.log_level', value: 'trace' },
        { key: 'notifications.locale', value: 'ko' },
        { key: 'security.max_pending_tx', value: '50' },
      ]);

      expect(service.get('daemon.log_level')).toBe('trace');
      expect(service.get('notifications.locale')).toBe('ko');
      expect(service.get('security.max_pending_tx')).toBe('50');
    });
  });

  // -------------------------------------------------------------------------
  // importFromConfig()
  // -------------------------------------------------------------------------

  describe('importFromConfig()', () => {
    it('imports non-default config.toml values into DB', () => {
      // Create config with non-default values
      const customConfig = createTestConfig({
        notifications: { telegram_chat_id: '12345' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      const result = svc.importFromConfig();
      expect(result.imported).toBeGreaterThan(0);

      // Check imported value
      expect(svc.get('notifications.telegram_chat_id')).toBe('12345');
    });

    it('skips keys already in DB', () => {
      // Pre-set a value in DB
      service.set('daemon.log_level', 'trace');

      // Create config with a different value for the same key
      const customConfig = createTestConfig({
        daemon: { log_level: 'error' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      svc.importFromConfig();

      // DB value should be preserved (not overwritten by config)
      expect(svc.get('daemon.log_level')).toBe('trace');
    });

    it('skips keys with default values', () => {
      // Default config -- everything at defaults
      const result = service.importFromConfig();

      // No non-default values to import
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(SETTING_DEFINITIONS.length);
    });

    it('encrypts credential values during import', () => {
      const customConfig = createTestConfig({
        notifications: { telegram_bot_token: 'imported-secret-token' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      svc.importFromConfig();

      // Check raw DB row is encrypted
      const row = db.select().from(settings)
        .where(eq(settings.key, 'notifications.telegram_bot_token')).get();
      expect(row).toBeDefined();
      expect(row!.encrypted).toBe(true);
      expect(row!.value).not.toBe('imported-secret-token');

      // But get() returns decrypted value
      expect(svc.get('notifications.telegram_bot_token')).toBe('imported-secret-token');
    });

    it('returns count of imported and skipped', () => {
      const customConfig = createTestConfig({
        daemon: { log_level: 'debug' },
        notifications: { locale: 'ko', telegram_chat_id: '999' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      const result = svc.importFromConfig();
      // 3 non-default values: log_level=debug, locale=ko, telegram_chat_id=999
      expect(result.imported).toBe(3);
      expect(result.imported + result.skipped).toBe(SETTING_DEFINITIONS.length);
    });
  });

  // -------------------------------------------------------------------------
  // getAll()
  // -------------------------------------------------------------------------

  describe('getAll()', () => {
    it('returns all settings grouped by category', () => {
      const all = service.getAll();

      // All 5 categories present
      expect(Object.keys(all)).toEqual(
        expect.arrayContaining(['notifications', 'rpc', 'security', 'daemon', 'walletconnect']),
      );

      // daemon category has log_level
      expect(all.daemon).toHaveProperty('log_level');
      expect(all.daemon!.log_level).toBe('info');

      // notifications category has multiple keys
      expect(all.notifications).toHaveProperty('enabled');
      expect(all.notifications).toHaveProperty('telegram_bot_token');
      expect(all.notifications).toHaveProperty('locale');
    });

    it('decrypts credential values', () => {
      service.set('notifications.telegram_bot_token', 'decrypted-secret');

      const all = service.getAll();
      expect(all.notifications!.telegram_bot_token).toBe('decrypted-secret');
    });

    it('returns non-encrypted DB row value directly', () => {
      // Set a non-credential value (stored as plaintext, encrypted=false)
      service.set('daemon.log_level', 'trace');

      const all = service.getAll();
      expect(all.daemon!.log_level).toBe('trace');
    });
  });

  // -------------------------------------------------------------------------
  // getAllMasked()
  // -------------------------------------------------------------------------

  describe('getAllMasked()', () => {
    it('masks credential values as boolean', () => {
      service.set('notifications.telegram_bot_token', 'secret-token');

      const masked = service.getAllMasked();

      // Credential with value -> true
      expect(masked.notifications!.telegram_bot_token).toBe(true);

      // Non-credential -> string value
      expect(typeof masked.daemon!.log_level).toBe('string');
    });

    it('masks empty credential as false', () => {
      // Default telegram_bot_token is '' -- no DB entry
      const masked = service.getAllMasked();
      expect(masked.notifications!.telegram_bot_token).toBe(false);
    });

    it('returns non-credential values as strings', () => {
      service.set('daemon.log_level', 'debug');
      const masked = service.getAllMasked();
      expect(masked.daemon!.log_level).toBe('debug');
    });
  });

  // -------------------------------------------------------------------------
  // Fallback chain integration
  // -------------------------------------------------------------------------

  describe('fallback chain', () => {
    it('DB value overrides config.toml value', () => {
      // Config has default log_level = 'info'
      expect(service.get('daemon.log_level')).toBe('info');

      // Set in DB
      service.set('daemon.log_level', 'trace');
      expect(service.get('daemon.log_level')).toBe('trace');
    });

    it('config.toml value overrides default', () => {
      // Create config with non-default value
      const customConfig = createTestConfig({
        daemon: { log_level: 'error' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      // No DB value -> falls back to config.toml
      expect(svc.get('daemon.log_level')).toBe('error');
    });

    it('full chain: set DB -> get DB -> delete from DB -> get config', () => {
      const customConfig = createTestConfig({
        daemon: { log_level: 'warn' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      // 1. Set in DB
      svc.set('daemon.log_level', 'trace');
      expect(svc.get('daemon.log_level')).toBe('trace');

      // 2. Delete from DB (simulate removal)
      db.delete(settings).where(eq(settings.key, 'daemon.log_level')).run();

      // 3. Now falls back to config.toml value
      expect(svc.get('daemon.log_level')).toBe('warn');
    });
  });

  // -------------------------------------------------------------------------
  // setting-keys consistency
  // -------------------------------------------------------------------------

  describe('setting-keys', () => {
    it('all definitions have valid categories', () => {
      const validCategories = new Set(['notifications', 'rpc', 'security', 'daemon', 'walletconnect', 'oracle', 'display', 'autostop', 'monitoring', 'telegram', 'signing_sdk', 'incoming', 'actions', 'policy', 'gas_condition', 'rpc_pool', 'position_tracker', 'smart_account', 'erc8004', 'erc8128', 'rpc_proxy']);
      for (const def of SETTING_DEFINITIONS) {
        expect(validCategories.has(def.category)).toBe(true);
      }
    });

    it('all keys are unique', () => {
      const keys = SETTING_DEFINITIONS.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('getSettingDefinition returns correct definition', () => {
      const def = getSettingDefinition('daemon.log_level');
      expect(def).toBeDefined();
      expect(def!.category).toBe('daemon');
      expect(def!.defaultValue).toBe('info');
      expect(def!.isCredential).toBe(false);
    });

    it('getSettingDefinition returns undefined for unknown key', () => {
      expect(getSettingDefinition('nonexistent.key')).toBeUndefined();
    });

    it('credential keys are marked correctly', () => {
      const credentialDefs = SETTING_DEFINITIONS.filter((d) => d.isCredential);
      expect(credentialDefs.length).toBeGreaterThan(0);

      for (const def of credentialDefs) {
        expect(
          [
            'notifications.telegram_bot_token', 'notifications.discord_webhook_url', 'notifications.slack_webhook_url',
            'oracle.coingecko_api_key', 'telegram.bot_token',
            'actions.jupiter_swap_api_key', 'actions.zerox_swap_api_key', 'actions.lifi_api_key', 'actions.pendle_yield_api_key',
            'actions.alchemy_nft_api_key', 'actions.helius_das_api_key',
            'smart_account.pimlico.api_key', 'smart_account.alchemy.api_key',
          ].includes(def.key),
        ).toBe(true);
      }
    });

    it('has expected number of definitions', () => {
      // 7 notifications (ntfy removed) + 18 rpc (+3 xrpl) + 16 security (+1 cors_origins, +1 owner_message_binding) + 1 daemon + 2 walletconnect + 2 oracle + 1 display + 6 autostop + 5 monitoring + 2 telegram + 8 signing_sdk + 11 incoming (+1 solana_mode +3 xrpl) + 2 incoming hyperevm wss + 85 actions (+2 hyperliquid_request_timeout_ms, cors_origins) + 1 policy + 5 gas_condition + 18 rpc_pool (+3 xrpl) + 1 position_tracker + 3 per-rule autostop + 9 erc8004 + 1 policy.default_deny_erc8128_domains + 6 erc8128 + 4 smart_account (pimlico/alchemy api_key + paymaster_policy_id) + 1 external_actions + 7 rpc_proxy = 222
      expect(SETTING_DEFINITIONS.length).toBe(225);
    });
  });

  // -------------------------------------------------------------------------
  // hasApiKey()
  // -------------------------------------------------------------------------

  describe('hasApiKey()', () => {
    it('returns true when API key exists with non-empty value', () => {
      service.set('actions.jupiter_swap_api_key', 'my-api-key-12345678');
      expect(service.hasApiKey('jupiter_swap')).toBe(true);
    });

    it('returns false when no API key row exists', () => {
      expect(service.hasApiKey('jupiter_swap')).toBe(false);
    });

    it('returns false when encrypted data is corrupted', () => {
      // Insert corrupted encrypted row directly
      db.insert(settings).values({
        key: 'actions.jupiter_swap_api_key',
        value: 'corrupted-not-valid-encrypted-data',
        encrypted: true,
        category: 'actions',
        updatedAt: new Date(),
      }).run();

      expect(service.hasApiKey('jupiter_swap')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getApiKeyMasked()
  // -------------------------------------------------------------------------

  describe('getApiKeyMasked()', () => {
    it('returns masked key for long API key (> 6 chars)', () => {
      service.set('actions.jupiter_swap_api_key', 'sk-abcdefgh');
      const masked = service.getApiKeyMasked('jupiter_swap');
      expect(masked).toBe('sk-a...gh');
    });

    it('returns masked key for medium API key (4-6 chars)', () => {
      service.set('actions.jupiter_swap_api_key', 'abcd');
      const masked = service.getApiKeyMasked('jupiter_swap');
      expect(masked).toBe('ab...');
    });

    it('returns masked key for short API key (< 4 chars)', () => {
      service.set('actions.jupiter_swap_api_key', 'ab');
      const masked = service.getApiKeyMasked('jupiter_swap');
      expect(masked).toBe('****');
    });

    it('returns null when no key exists', () => {
      expect(service.getApiKeyMasked('jupiter_swap')).toBeNull();
    });

    it('returns null when encrypted data is corrupted', () => {
      db.insert(settings).values({
        key: 'actions.jupiter_swap_api_key',
        value: 'corrupted-data',
        encrypted: true,
        category: 'actions',
        updatedAt: new Date(),
      }).run();

      expect(service.getApiKeyMasked('jupiter_swap')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getApiKeyUpdatedAt()
  // -------------------------------------------------------------------------

  describe('getApiKeyUpdatedAt()', () => {
    it('returns Date when API key exists', () => {
      service.set('actions.jupiter_swap_api_key', 'my-key-12345678');
      const updatedAt = service.getApiKeyUpdatedAt('jupiter_swap');
      expect(updatedAt).toBeInstanceOf(Date);
    });

    it('returns null when no key exists', () => {
      expect(service.getApiKeyUpdatedAt('jupiter_swap')).toBeNull();
    });

    it('returns null when encrypted data is corrupted', () => {
      db.insert(settings).values({
        key: 'actions.jupiter_swap_api_key',
        value: 'corrupted-data',
        encrypted: true,
        category: 'actions',
        updatedAt: new Date(),
      }).run();

      expect(service.getApiKeyUpdatedAt('jupiter_swap')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getAllMasked() - encrypted credential paths
  // -------------------------------------------------------------------------

  describe('getAllMasked() - encrypted credentials', () => {
    it('masks encrypted non-empty credential as true', () => {
      service.set('notifications.telegram_bot_token', 'encrypted-secret');
      const masked = service.getAllMasked();
      expect(masked.notifications!.telegram_bot_token).toBe(true);
    });

    it('masks corrupted encrypted credential as false', () => {
      db.insert(settings).values({
        key: 'notifications.telegram_bot_token',
        value: 'corrupted-encrypted-data',
        encrypted: true,
        category: 'notifications',
        updatedAt: new Date(),
      }).run();

      const masked = service.getAllMasked();
      expect(masked.notifications!.telegram_bot_token).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // importFromConfig() - empty string handling
  // -------------------------------------------------------------------------

  describe('importFromConfig() - empty string skip', () => {
    it('skips empty string config values that differ from default', () => {
      // telegram_bot_token defaults to '', config value '' matches default
      // slack_webhook_url defaults to '', config value '' also matches default
      // Use discord_webhook_url which defaults to '' - setting it to '' should be skipped
      const customConfig = createTestConfig({
        notifications: { discord_webhook_url: '' },
      });
      const svc = new SettingsService({
        db,
        config: customConfig,
        masterPassword: TEST_MASTER_PASSWORD,
      });

      const result = svc.importFromConfig();

      // discord_webhook_url empty string should NOT be imported (either matches default or empty string skip)
      const row = db.select().from(settings)
        .where(eq(settings.key, 'notifications.discord_webhook_url')).get();
      expect(row).toBeUndefined();
      expect(result.skipped).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // actions category settings
  // -------------------------------------------------------------------------

  describe('actions category', () => {
    it('actions.jupiter_swap_enabled returns true by default', () => {
      expect(service.get('actions.jupiter_swap_enabled')).toBe('true');
    });

    it('actions.zerox_swap_api_key returns empty string by default', () => {
      expect(service.get('actions.zerox_swap_api_key')).toBe('');
    });

    it('actions.zerox_swap_enabled returns true by default', () => {
      expect(service.get('actions.zerox_swap_enabled')).toBe('true');
    });

    it('actions settings are accessible via getAll()', () => {
      const all = service.getAll();
      expect(all.actions).toBeDefined();
      expect(all.actions!.jupiter_swap_enabled).toBe('true');
      expect(all.actions!.zerox_swap_enabled).toBe('true');
      expect(all.actions!.jupiter_swap_api_base_url).toBe('https://api.jup.ag/swap/v1');
      expect(all.actions!.zerox_swap_default_slippage_bps).toBe('100');
    });

    it('actions category has 86 settings', () => {
      const actionsDefs = SETTING_DEFINITIONS.filter((d) => d.category === 'actions');
      expect(actionsDefs.length).toBe(86);
    });

    it('actions.jupiter_swap_api_key is a credential', () => {
      const def = getSettingDefinition('actions.jupiter_swap_api_key');
      expect(def).toBeDefined();
      expect(def!.isCredential).toBe(true);
    });

    it('actions.zerox_swap_api_key is a credential', () => {
      const def = getSettingDefinition('actions.zerox_swap_api_key');
      expect(def).toBeDefined();
      expect(def!.isCredential).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ERC-8004 Agent Identity settings (v30.8)
  // -------------------------------------------------------------------------

  describe('ERC-8004 settings', () => {
    it('includes 9 ERC-8004 agent identity settings', () => {
      const erc8004Keys = SETTING_DEFINITIONS.filter((d) => d.key.startsWith('actions.erc8004_'));
      expect(erc8004Keys).toHaveLength(9);
    });

    it('erc8004_agent_enabled defaults to true (all providers enabled by default)', () => {
      const def = getSettingDefinition('actions.erc8004_agent_enabled');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('true');
      expect(def!.category).toBe('actions');
      expect(def!.isCredential).toBe(false);
    });

    it('erc8004_identity_registry_address defaults to mainnet address', () => {
      const def = getSettingDefinition('actions.erc8004_identity_registry_address');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
    });

    it('erc8004_reputation_registry_address defaults to mainnet address', () => {
      const def = getSettingDefinition('actions.erc8004_reputation_registry_address');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63');
    });

    it('erc8004_validation_registry_address defaults to empty (not deployed)', () => {
      const def = getSettingDefinition('actions.erc8004_validation_registry_address');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('');
    });

    it('erc8004_reputation_cache_ttl_sec defaults to 300', () => {
      const def = getSettingDefinition('actions.erc8004_reputation_cache_ttl_sec');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('300');
    });

    it('erc8004_reputation_rpc_timeout_ms defaults to 3000', () => {
      const def = getSettingDefinition('actions.erc8004_reputation_rpc_timeout_ms');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('3000');
    });

    it('erc8004_auto_publish_registration defaults to true', () => {
      const def = getSettingDefinition('actions.erc8004_auto_publish_registration');
      expect(def).toBeDefined();
      expect(def!.defaultValue).toBe('true');
    });

    it('getSettingDefinition returns correct definition for erc8004_agent_enabled', () => {
      const def = getSettingDefinition('actions.erc8004_agent_enabled');
      expect(def).toBeDefined();
      expect(def!.key).toBe('actions.erc8004_agent_enabled');
      expect(def!.configPath).toBe('actions.erc8004_agent_enabled');
      expect(def!.category).toBe('actions');
      expect(def!.defaultValue).toBe('true');
      expect(def!.isCredential).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // v42 migration: INSERT OR IGNORE preserves existing settings
  // -------------------------------------------------------------------------

  describe('v42 migration: action provider defaults', () => {
    it('preserves manually-set false values while seeding new keys', () => {
      const { sqlite: testSqlite } = createTestDb();
      const now = Math.floor(Date.now() / 1000);

      // Pre-set kamino_enabled to false (simulating an operator who disabled it)
      testSqlite.prepare(
        "INSERT INTO settings (key, value, encrypted, category, updated_at) VALUES (?, ?, 0, 'actions', ?)",
      ).run('actions.kamino_enabled', 'false', now);

      // Run v42 migration
      const v42Only = MIGRATIONS.filter((m) => m.version === 42);

      // Delete schema_version entries for 42+ so migration runs (MAX must be < 42)
      testSqlite.prepare('DELETE FROM schema_version WHERE version >= 42').run();

      runMigrations(testSqlite, v42Only);

      // kamino_enabled should still be 'false' (INSERT OR IGNORE preserved it)
      const kamino = testSqlite.prepare("SELECT value FROM settings WHERE key = 'actions.kamino_enabled'").get() as { value: string };
      expect(kamino.value).toBe('false');

      // drift_enabled should be 'true' (newly seeded)
      const drift = testSqlite.prepare("SELECT value FROM settings WHERE key = 'actions.drift_enabled'").get() as { value: string };
      expect(drift.value).toBe('true');

      testSqlite.close();
    });
  });
});
