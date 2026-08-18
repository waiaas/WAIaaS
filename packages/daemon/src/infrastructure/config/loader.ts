/**
 * Config loader: smol-toml parsing, nested section detection, env override, Zod validation.
 *
 * Pipeline: read config.toml -> parse with smol-toml -> detectNestedSections ->
 *           applyEnvOverrides -> DaemonConfigSchema.parse (Zod defaults + validation).
 *
 * @see docs/24-monorepo-data-directory.md section 3.5
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod Schema: 12 sections, flat keys, with defaults
// ---------------------------------------------------------------------------

export const DaemonConfigSchema = z.object({
  daemon: z
    .object({
      port: z.number().int().min(1024).max(65535).default(3100),
      hostname: z
        .union([z.literal('127.0.0.1'), z.literal('0.0.0.0')])
        .default('127.0.0.1'),
      log_level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
      log_file: z.string().default('logs/daemon.log'),
      log_max_size: z.string().default('50MB'),
      log_max_files: z.number().int().min(1).max(100).default(5),
      pid_file: z.string().default('daemon.pid'),
      shutdown_timeout: z.number().int().min(5).max(300).default(30),
      dev_mode: z.boolean().default(false),
      admin_ui: z.boolean().default(true),
      admin_timeout: z.number().int().min(60).max(7200).default(900),
      update_check: z.boolean().default(true),
      update_check_interval: z.number().int().min(3600).max(604800).default(86400),
    })
    .default({}),
  keystore: z
    .object({
      argon2_memory: z.number().int().min(32768).max(1048576).default(65536),
      argon2_time: z.number().int().min(1).max(20).default(3),
      argon2_parallelism: z.number().int().min(1).max(16).default(4),
      backup_on_rotate: z.boolean().default(true),
    })
    .default({}),
  database: z
    .object({
      path: z.string().default('data/waiaas.db'),
      wal_checkpoint_interval: z.number().int().min(60).max(3600).default(300),
      busy_timeout: z.number().int().min(1000).max(30000).default(5000),
      cache_size: z.number().int().min(2000).max(512000).default(64000),
      mmap_size: z.number().int().min(0).max(1073741824).default(268435456),
    })
    .default({}),
  rpc: z
    .object({
      // Solana (unchanged)
      solana_mainnet: z.string().default('https://api.mainnet-beta.solana.com'),
      solana_devnet: z.string().default('https://api.devnet.solana.com'),
      solana_testnet: z.string().default('https://api.testnet.solana.com'),
      solana_ws_mainnet: z.string().default('wss://api.mainnet-beta.solana.com'),
      solana_ws_devnet: z.string().default('wss://api.devnet.solana.com'),

      // EVM Tier 1 (replaces ethereum_mainnet/ethereum_sepolia)
      evm_ethereum_mainnet: z.string().default('https://eth.drpc.org'),
      evm_ethereum_sepolia: z.string().default('https://1rpc.io/sepolia'),
      evm_polygon_mainnet: z.string().default('https://polygon.drpc.org'),
      evm_polygon_amoy: z.string().default('https://polygon-amoy.drpc.org'),
      evm_arbitrum_mainnet: z.string().default('https://arbitrum.drpc.org'),
      evm_arbitrum_sepolia: z.string().default('https://arbitrum-sepolia.drpc.org'),
      evm_optimism_mainnet: z.string().default('https://optimism.drpc.org'),
      evm_optimism_sepolia: z.string().default('https://optimism-sepolia.drpc.org'),
      evm_base_mainnet: z.string().default('https://base.drpc.org'),
      evm_base_sepolia: z.string().default('https://base-sepolia.drpc.org'),

      // HyperEVM
      evm_hyperevm_mainnet: z.string().default('https://rpc.hyperliquid.xyz/evm'),
      evm_hyperevm_testnet: z.string().default('https://rpc.hyperliquid-testnet.xyz/evm'),

      // XRPL
      xrpl_mainnet: z.string().default('wss://xrplcluster.com'),
      xrpl_testnet: z.string().default('wss://s.altnet.rippletest.net:51233'),
      xrpl_devnet: z.string().default('wss://s.devnet.rippletest.net:51233'),
    })
    .default({}),
  notifications: z
    .object({
      enabled: z.boolean().default(false),
      min_channels: z.number().int().min(1).max(10).default(2),
      health_check_interval: z.number().int().min(60).max(3600).default(300),
      log_retention_days: z.number().int().min(7).max(365).default(30),
      dedup_ttl: z.number().int().min(60).max(3600).default(300),
      telegram_bot_token: z.string().default(''),
      telegram_chat_id: z.string().default(''),
      discord_webhook_url: z.string().default(''),
      slack_webhook_url: z.string().default(''),
      locale: z.enum(['en', 'ko']).default('en'),
      rate_limit_rpm: z.number().int().min(1).max(60).default(20),
    })
    .default({}),
  security: z
    .object({
      jwt_secret: z.string().default(''),
      max_sessions_per_wallet: z.number().int().min(1).max(50).default(5),
      max_pending_tx: z.number().int().min(1).max(100).default(10),
      nonce_storage: z.enum(['memory', 'sqlite']).default('memory'),
      nonce_cache_max: z.number().int().min(100).max(10000).default(1000),
      nonce_cache_ttl: z.number().int().min(60).max(600).default(300),
      rate_limit_global_ip_rpm: z.number().int().min(100).max(10000).default(1000),
      rate_limit_session_rpm: z.number().int().min(10).max(5000).default(300),
      rate_limit_tx_rpm: z.number().int().min(1).max(100).default(10),
      cors_origins: z
        .array(z.string())
        .default(['http://localhost:3100', 'http://127.0.0.1:3100']),
      // AutoStop engine thresholds (AUTO-05 runtime-overridable via Admin Settings)
      autostop_consecutive_failures_threshold: z.number().int().min(1).max(50).default(5),
      autostop_unusual_activity_threshold: z.number().int().min(5).max(200).default(20),
      autostop_unusual_activity_window_sec: z.number().int().min(60).max(3600).default(300),
      autostop_idle_timeout_sec: z.number().int().min(300).max(86400).default(3600),
      autostop_idle_check_interval_sec: z.number().int().min(10).max(600).default(60),
      autostop_enabled: z.boolean().default(true),
      // Balance monitoring thresholds (BMON-05 runtime-overridable via Admin Settings)
      monitoring_check_interval_sec: z.number().int().min(60).max(3600).default(300),
      monitoring_low_balance_threshold_sol: z.number().min(0.001).max(100).default(0.01),
      monitoring_low_balance_threshold_eth: z.number().min(0.0001).max(10).default(0.005),
      monitoring_cooldown_hours: z.number().int().min(1).max(168).default(24),
      monitoring_enabled: z.boolean().default(true),
      policy_defaults_delay_seconds: z.number().int().min(60).max(3600).default(300),
      policy_defaults_approval_timeout: z.number().int().min(300).max(86400).default(3600),
      kill_switch_recovery_cooldown: z.number().int().min(600).max(86400).default(1800),
      kill_switch_max_recovery_attempts: z.number().int().min(1).max(10).default(3),
    })
    .default({}),
  walletconnect: z
    .object({
      project_id: z.string().default(''),
      relay_url: z.string().default('wss://relay.walletconnect.com'),
    })
    .default({}),
  x402: z
    .object({
      enabled: z.boolean().default(true),
      request_timeout: z.number().int().min(5).max(120).default(30),
    })
    .default({}),
  display: z
    .object({
      currency: z.string().default('USD'),
    })
    .default({}),
  telegram: z
    .object({
      enabled: z.boolean().default(false),
      bot_token: z.string().default(''),
      locale: z.enum(['en', 'ko']).default('en'),
    })
    .default({}),
  incoming: z
    .object({
      enabled: z.boolean().default(false),
      poll_interval: z.number().int().min(5).max(3600).default(30),
      retention_days: z.number().int().min(1).max(365).default(90),
      suspicious_dust_usd: z.number().min(0).max(1000).default(0.01),
      suspicious_amount_multiplier: z.number().min(1).max(1000).default(10),
      cooldown_minutes: z.number().int().min(1).max(1440).default(5),
      wss_url: z.string().default(''),
    })
    .default({}),
  backup: z
    .object({
      dir: z.string().default('backups'),
      interval: z.number().int().min(0).max(86400).default(0),
      retention_count: z.number().int().min(1).max(100).default(7),
    })
    .default({}),
  actions: z
    .object({
      jupiter_swap_enabled: z.boolean().default(true),
      jupiter_swap_api_base_url: z.string().default('https://api.jup.ag/swap/v1'),
      jupiter_swap_api_key: z.string().default(''),
      jupiter_swap_default_slippage_bps: z.number().int().min(1).max(10000).default(50),
      jupiter_swap_max_slippage_bps: z.number().int().min(1).max(10000).default(500),
      jupiter_swap_max_price_impact_pct: z.number().min(0.01).max(100).default(1.0),
      jupiter_swap_jito_tip_lamports: z.number().int().min(0).max(10_000_000).default(1000),
      jupiter_swap_request_timeout_ms: z.number().int().min(1000).max(60000).default(10000),
      zerox_swap_enabled: z.boolean().default(true),
      zerox_swap_api_key: z.string().default(''),
      zerox_swap_default_slippage_bps: z.number().int().min(1).max(10000).default(100),
      zerox_swap_max_slippage_bps: z.number().int().min(1).max(10000).default(500),
      zerox_swap_request_timeout_ms: z.number().int().min(1000).max(60000).default(10000),
      lifi_enabled: z.boolean().default(true),
      lifi_api_key: z.string().default(''),
      lifi_api_base_url: z.string().default('https://li.quest/v1'),
      lifi_default_slippage_pct: z.number().min(0.001).max(0.5).default(0.03),
      lifi_max_slippage_pct: z.number().min(0.001).max(0.5).default(0.05),
    })
    .default({}),
});

export type DaemonConfig = z.infer<typeof DaemonConfigSchema>;
export type RpcConfig = DaemonConfig['rpc'];

// ---------------------------------------------------------------------------
// Known TOML sections
// ---------------------------------------------------------------------------

const KNOWN_SECTIONS = [
  'daemon',
  'keystore',
  'database',
  'rpc',
  'notifications',
  'security',
  'walletconnect',
  'x402',
  'display',
  'telegram',
  'incoming',
  'backup',
  'actions',
] as const;

// ---------------------------------------------------------------------------
// detectNestedSections: reject nested TOML sections
// ---------------------------------------------------------------------------

/**
 * Walk top-level keys. If any value is a non-array object whose own values
 * are also non-array objects, that indicates nested TOML sections which
 * violate the flat-key config policy.
 *
 * Also rejects unknown top-level sections not in KNOWN_SECTIONS.
 */
export function detectNestedSections(parsed: Record<string, unknown>): void {
  for (const key of Object.keys(parsed)) {
    // Check unknown section
    if (!(KNOWN_SECTIONS as readonly string[]).includes(key)) {
      throw new Error(
        `Unknown config section '[${key}]'. Allowed sections: ${KNOWN_SECTIONS.join(', ')}`,
      );
    }

    const value = parsed[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Check if any sub-value is itself a nested object (not array)
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (subValue !== null && typeof subValue === 'object' && !Array.isArray(subValue)) {
          throw new Error(
            `Nested TOML section '[${key}.${subKey}]' detected. ` +
              `WAIaaS config requires flattened keys. ` +
              `Use '${key}_${subKey}_<field>' instead of nested sections.`,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// parseEnvValue: coerce string env values to correct types
// ---------------------------------------------------------------------------

/**
 * Parse an environment variable string into the appropriate JS type.
 * - 'true'/'false' -> boolean
 * - Numeric strings -> number
 * - JSON array strings -> parsed array
 * - Otherwise -> string
 */
export function parseEnvValue(value: string): string | number | boolean | string[] {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // JSON array
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // Fall through to string
    }
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }

  return value;
}

// ---------------------------------------------------------------------------
// applyEnvOverrides: WAIAAS_{SECTION}_{KEY} -> config override
// ---------------------------------------------------------------------------

/** Env keys to skip (not mapped to config sections). */
const SKIP_ENV_KEYS = new Set([
  'WAIAAS_DATA_DIR',
  'WAIAAS_MASTER_PASSWORD',
  'WAIAAS_MASTER_PASSWORD_FILE',
]);

/**
 * Apply environment variable overrides. Pattern: WAIAAS_{SECTION}_{KEY}.
 * The first segment after WAIAAS_ is the section; the rest joined with '_' is the field.
 *
 * Special case: WAIAAS_DAEMON_HOSTNAME maps to daemon.hostname.
 */
export function applyEnvOverrides(config: Record<string, unknown>): void {
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (!envKey.startsWith('WAIAAS_') || envValue === undefined) continue;
    if (SKIP_ENV_KEYS.has(envKey)) continue;

    // Strip prefix, lowercase
    const stripped = envKey.slice('WAIAAS_'.length).toLowerCase();
    const parts = stripped.split('_');

    // First part = section, rest = field name
    const section = parts[0];
    if (!section) continue;

    // Check if section is known
    if (!(KNOWN_SECTIONS as readonly string[]).includes(section)) continue;

    const field = parts.slice(1).join('_');
    if (!field) continue;

    // Ensure section object exists
    if (
      config[section] === undefined ||
      config[section] === null ||
      typeof config[section] !== 'object'
    ) {
      config[section] = {};
    }

    (config[section] as Record<string, unknown>)[field] = parseEnvValue(envValue);
  }
}

// ---------------------------------------------------------------------------
// loadConfig: main pipeline
// ---------------------------------------------------------------------------

/**
 * Load daemon config from dataDir/config.toml with env override and Zod validation.
 *
 * Pipeline:
 * 1. Read config.toml (ENOENT -> empty object, all defaults)
 * 2. Parse with smol-toml
 * 3. Detect nested sections (reject)
 * 4. Apply env overrides (WAIAAS_{SECTION}_{KEY})
 * 5. Validate with DaemonConfigSchema.parse() (applies defaults)
 * 6. Return typed config
 */
export function loadConfig(dataDir: string): DaemonConfig {
  let raw: Record<string, unknown> = {};

  const configPath = join(dataDir, 'config.toml');
  try {
    const content = readFileSync(configPath, 'utf-8');
    if (content.trim().length > 0) {
      raw = parse(content) as Record<string, unknown>;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    // ENOENT: no config file, use all defaults
  }

  // Validate structure
  detectNestedSections(raw);

  // Apply env overrides
  applyEnvOverrides(raw);

  // Validate and apply defaults via Zod
  return DaemonConfigSchema.parse(raw);
}
