/**
 * Tests for config loader: TOML parsing, env overrides, nested section rejection, Zod validation.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { loadConfig, parseEnvValue, detectNestedSections, DaemonConfigSchema } from '../infrastructure/config/index.js';
import { SETTING_DEFINITIONS } from '../infrastructure/settings/setting-keys.js';
import { configKeyToNetwork } from '../infrastructure/adapter-pool.js';
import { BUILT_IN_RPC_DEFAULTS } from '@waiaas/core';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTempDir(): string {
  const dir = join(tmpdir(), `waiaas-config-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const tempDirs: string[] = [];
const savedEnvVars: Record<string, string | undefined> = {};

function saveTempDir(dir: string): string {
  tempDirs.push(dir);
  return dir;
}

/** Save original env var and optionally set a new value. */
function setEnv(key: string, value?: string): void {
  if (!(key in savedEnvVars)) {
    savedEnvVars[key] = process.env[key];
  }
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Restore env vars before each test
  for (const [key, val] of Object.entries(savedEnvVars)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
  // Clear tracking
  for (const key of Object.keys(savedEnvVars)) {
    delete savedEnvVars[key];
  }
});

afterEach(() => {
  // Restore env vars after each test
  for (const [key, val] of Object.entries(savedEnvVars)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
});

afterAll(() => {
  for (const dir of tempDirs) {
    try {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

// ---------------------------------------------------------------------------
// TOML parsing tests
// ---------------------------------------------------------------------------

describe('TOML parsing', () => {
  it('loads valid config.toml and returns parsed config', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[daemon]
port = 4000
log_level = "debug"

[database]
path = "my.db"
`,
    );

    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(4000);
    expect(config.daemon.log_level).toBe('debug');
    expect(config.database.path).toBe('my.db');
  });

  it('returns all defaults when config.toml is missing', () => {
    const dir = saveTempDir(createTempDir());
    // No config.toml file
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(3100);
    expect(config.daemon.hostname).toBe('127.0.0.1');
    expect(config.daemon.log_level).toBe('info');
  });

  it('returns all defaults when config.toml is empty', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '');
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(3100);
    expect(config.daemon.hostname).toBe('127.0.0.1');
  });

  it('fills other sections with defaults when only [daemon] is specified', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[daemon]
port = 5000
`,
    );
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(5000);
    // Other sections should have defaults
    expect(config.keystore.argon2_memory).toBe(65536);
    expect(config.database.path).toBe('data/waiaas.db');
    expect(config.rpc.solana_devnet).toBe('https://api.devnet.solana.com');
    expect(config.security.max_sessions_per_wallet).toBe(5);
    expect(config.notifications.enabled).toBe(false);
    expect(config.notifications.locale).toBe('en');
    expect(config.notifications.rate_limit_rpm).toBe(20);
    expect(config.walletconnect.project_id).toBe('');
  });

  it('has correct default values for key settings', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(3100);
    expect(config.daemon.hostname).toBe('127.0.0.1');
    expect(config.daemon.log_level).toBe('info');
    expect(config.daemon.shutdown_timeout).toBe(30);
    expect(config.daemon.dev_mode).toBe(false);
    expect(config.security.max_sessions_per_wallet).toBe(5);
    expect(config.database.wal_checkpoint_interval).toBe(300);
    expect(config.database.busy_timeout).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Nested section rejection tests
// ---------------------------------------------------------------------------

describe('nested section rejection', () => {
  it('rejects [rpc.solana] nested section with error mentioning flattened keys', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[rpc.solana]
mainnet = "https://custom.rpc.com"
`,
    );
    expect(() => loadConfig(dir)).toThrow(/flattened keys/);
  });

  it('rejects [security.auto_stop] nested section', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[security.auto_stop]
threshold = 5
`,
    );
    expect(() => loadConfig(dir)).toThrow(/Nested TOML section/);
  });

  it('rejects unknown section [unknown] listing allowed sections', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[unknown]
key = "value"
`,
    );
    expect(() => loadConfig(dir)).toThrow(/Unknown config section.*unknown.*Allowed sections/);
  });
});

// ---------------------------------------------------------------------------
// Environment variable override tests
// ---------------------------------------------------------------------------

describe('environment variable overrides', () => {
  it('WAIAAS_DAEMON_PORT=4000 overrides to number', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_DAEMON_PORT', '4000');
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(4000);
  });

  it('WAIAAS_DAEMON_LOG_LEVEL=debug overrides log level', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_DAEMON_LOG_LEVEL', 'debug');
    const config = loadConfig(dir);
    expect(config.daemon.log_level).toBe('debug');
  });

  it('WAIAAS_RPC_SOLANA_MAINNET overrides RPC URL', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_RPC_SOLANA_MAINNET', 'https://custom.rpc.com');
    const config = loadConfig(dir);
    expect(config.rpc.solana_mainnet).toBe('https://custom.rpc.com');
  });

  it('WAIAAS_SECURITY_MAX_SESSIONS_PER_WALLET=10 overrides as number', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_SECURITY_MAX_SESSIONS_PER_WALLET', '10');
    const config = loadConfig(dir);
    expect(config.security.max_sessions_per_wallet).toBe(10);
  });

  it('WAIAAS_NOTIFICATIONS_ENABLED=true overrides as boolean', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_NOTIFICATIONS_ENABLED', 'true');
    const config = loadConfig(dir);
    expect(config.notifications.enabled).toBe(true);
  });

  it('env override takes priority over toml value', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[daemon]
port = 3100
`,
    );
    setEnv('WAIAAS_DAEMON_PORT', '5000');
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(5000);
  });

  it('special keys (WAIAAS_DATA_DIR, WAIAAS_MASTER_PASSWORD) are NOT applied', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_DATA_DIR', '/some/path');
    setEnv('WAIAAS_MASTER_PASSWORD', 'secret');
    setEnv('WAIAAS_MASTER_PASSWORD_FILE', '/secret/file');
    const config = loadConfig(dir);
    // These should not appear anywhere in config (no 'data' or 'master' section)
    expect(config.daemon.port).toBe(3100); // default, unaffected
  });
});

// ---------------------------------------------------------------------------
// Zod validation tests
// ---------------------------------------------------------------------------

describe('Zod validation', () => {
  it('rejects port below 1024', () => {
    expect(() =>
      DaemonConfigSchema.parse({ daemon: { port: 80 } }),
    ).toThrow();
  });

  it('rejects port above 65535', () => {
    expect(() =>
      DaemonConfigSchema.parse({ daemon: { port: 70000 } }),
    ).toThrow();
  });

  it('rejects invalid hostname', () => {
    expect(() =>
      DaemonConfigSchema.parse({ daemon: { hostname: 'evil.com' } }),
    ).toThrow();
  });

  it('rejects invalid log_level', () => {
    expect(() =>
      DaemonConfigSchema.parse({ daemon: { log_level: 'verbose' } }),
    ).toThrow();
  });

  it('rejects shutdown_timeout below 5', () => {
    expect(() =>
      DaemonConfigSchema.parse({ daemon: { shutdown_timeout: 1 } }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseEnvValue tests
// ---------------------------------------------------------------------------

describe('parseEnvValue', () => {
  it('"true" -> true (boolean)', () => {
    expect(parseEnvValue('true')).toBe(true);
  });

  it('"false" -> false (boolean)', () => {
    expect(parseEnvValue('false')).toBe(false);
  });

  it('"3100" -> 3100 (number)', () => {
    expect(parseEnvValue('3100')).toBe(3100);
  });

  it('\'["a","b"]\' -> ["a","b"] (JSON array)', () => {
    expect(parseEnvValue('["a","b"]')).toEqual(['a', 'b']);
  });

  it('"hello" -> "hello" (string)', () => {
    expect(parseEnvValue('hello')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// detectNestedSections unit tests
// ---------------------------------------------------------------------------

describe('detectNestedSections', () => {
  it('accepts flat sections', () => {
    expect(() =>
      detectNestedSections({
        daemon: { port: 3100 },
        rpc: { solana_mainnet: 'https://...' },
      }),
    ).not.toThrow();
  });

  it('rejects nested objects', () => {
    expect(() =>
      detectNestedSections({
        rpc: { solana: { mainnet: 'https://...' } },
      }),
    ).toThrow(/Nested TOML section.*rpc\.solana/);
  });

  it('allows arrays in section values', () => {
    expect(() =>
      detectNestedSections({
        security: { cors_origins: ['http://localhost:3100'] },
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// EVM RPC config tests
// ---------------------------------------------------------------------------

describe('EVM RPC config', () => {
  it('default config has all 10 EVM RPC URLs', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);

    const evmKeys = [
      'evm_ethereum_mainnet', 'evm_ethereum_sepolia',
      'evm_polygon_mainnet', 'evm_polygon_amoy',
      'evm_arbitrum_mainnet', 'evm_arbitrum_sepolia',
      'evm_optimism_mainnet', 'evm_optimism_sepolia',
      'evm_base_mainnet', 'evm_base_sepolia',
    ] as const;

    for (const key of evmKeys) {
      const value = config.rpc[key];
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(value).toMatch(/^https:\/\//);
    }
  });

  // Issue #502: the Sepolia default drifted away from BUILT_IN_RPC_DEFAULTS because
  // the same value is declared in three places and #210 only updated one of them.
  // A stale default here silently bypasses the RpcPool fallback (see #503).
  it('every RPC default matches the first built-in pool endpoint', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);

    for (const [key, value] of Object.entries(config.rpc)) {
      const network = configKeyToNetwork(key);
      if (!network) continue;
      const builtIn = BUILT_IN_RPC_DEFAULTS[network];
      if (!builtIn) continue;
      expect(value, `config.rpc.${key} must match BUILT_IN_RPC_DEFAULTS['${network}'][0]`)
        .toBe(builtIn[0]);
    }
  });

  it('every Admin Settings RPC default matches the config default', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);

    for (const def of SETTING_DEFINITIONS) {
      if (def.category !== 'rpc') continue;
      const key = def.key.replace('rpc.', '');
      const configValue = (config.rpc as Record<string, string>)[key];
      if (configValue === undefined) continue;
      expect(def.defaultValue, `SETTING_DEFINITIONS['${def.key}'] must match config.rpc.${key}`)
        .toBe(configValue);
    }
  });

  it('env override WAIAAS_RPC_EVM_ETHEREUM_MAINNET works', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_RPC_EVM_ETHEREUM_MAINNET', 'https://custom.rpc.io');
    const config = loadConfig(dir);
    expect(config.rpc.evm_ethereum_mainnet).toBe('https://custom.rpc.io');
  });

  it('old ethereum_mainnet key is not in schema', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect('ethereum_mainnet' in config.rpc).toBe(false);
    expect('ethereum_sepolia' in config.rpc).toBe(false);
  });

  it('DaemonConfigSchema rpc section has 20 keys', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    const rpcKeys = Object.keys(config.rpc);
    // 5 Solana + 12 EVM (incl. hyperevm_mainnet, hyperevm_testnet) + 3 XRPL = 20
    expect(rpcKeys).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// CF-01~12 verification (doc 49)
// ---------------------------------------------------------------------------

describe('config.toml CF-01~12 verification (doc 49)', () => {
  // CF-01: Default values (already covered by 'has correct default values')
  it('CF-01: defaults include max_sessions_per_wallet=5 and nonce_cache_max=1000', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect(config.security.max_sessions_per_wallet).toBe(5);
    expect(config.security.nonce_cache_max).toBe(1000);
    expect(config.security.policy_defaults_delay_seconds).toBe(300);
  });

  // CF-04: Docker hostname 0.0.0.0
  it('CF-04: WAIAAS_DAEMON_HOSTNAME=0.0.0.0 allows Docker binding', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_DAEMON_HOSTNAME', '0.0.0.0');
    const config = loadConfig(dir);
    expect(config.daemon.hostname).toBe('0.0.0.0');
  });

  // CF-05: Nested section env var (policy_defaults_delay_seconds)
  it('CF-05: WAIAAS_SECURITY_POLICY_DEFAULTS_DELAY_SECONDS=600 overrides', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_SECURITY_POLICY_DEFAULTS_DELAY_SECONDS', '600');
    const config = loadConfig(dir);
    expect(config.security.policy_defaults_delay_seconds).toBe(600);
  });

  // CF-06: port = -1 rejected
  it('CF-06: port = -1 rejected (min 1024)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nport = -1\n');
    expect(() => loadConfig(dir)).toThrow();
  });

  // CF-07: shutdown_timeout 999 (above max 300)
  it('CF-07: shutdown_timeout = 999 rejected (max 300)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nshutdown_timeout = 999\n');
    expect(() => loadConfig(dir)).toThrow();
  });

  // CF-08: empty string env var
  it('CF-08: WAIAAS_DAEMON_PORT="" uses default (empty string not a valid port)', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_DAEMON_PORT', '');
    // Empty string is not a number, so parseEnvValue returns '' (string).
    // applyEnvOverrides sets config.daemon.port = '' which Zod rejects.
    // However, applyEnvOverrides checks envValue !== undefined, and '' is not undefined.
    // The actual behavior: '' -> parseEnvValue('') -> '' (string) -> daemon.port = '' -> Zod rejects.
    // But the env key prefix parsing: stripped='daemon_port', section='daemon', field='port'.
    // So config.daemon.port = '' (string). Then DaemonConfigSchema rejects.
    expect(() => loadConfig(dir)).toThrow();
  });

  // CF-09: missing [database] section uses all defaults
  it('CF-09: missing [database] section uses all defaults', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nport = 5000\n');
    const config = loadConfig(dir);
    expect(config.database.path).toBe('data/waiaas.db');
    expect(config.database.wal_checkpoint_interval).toBe(300);
    expect(config.database.busy_timeout).toBe(5000);
    expect(config.database.cache_size).toBe(64000);
  });

  // CF-10: multiple env vars override simultaneously
  it('CF-10: multiple env vars override simultaneously', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nport = 4000\n');
    setEnv('WAIAAS_DAEMON_PORT', '5000');
    setEnv('WAIAAS_DAEMON_LOG_LEVEL', 'debug');
    const config = loadConfig(dir);
    expect(config.daemon.port).toBe(5000); // env wins over toml
    expect(config.daemon.log_level).toBe('debug'); // env override
  });

  // CF-12: Zod defaults applied for present but empty section
  it('CF-12: [security] section present but empty, Zod defaults applied', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[security]\n');
    const config = loadConfig(dir);
    expect(config.security.max_sessions_per_wallet).toBe(5);
    expect(config.security.nonce_cache_max).toBe(1000);
    expect(config.security.policy_defaults_delay_seconds).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// NOTE-08: Docker shutdown timeline (shutdown_timeout) -- 4 cases
// ---------------------------------------------------------------------------

describe('NOTE-08: Docker shutdown timeline (shutdown_timeout)', () => {
  // N08-01: default value 30 (cross-ref CF-01)
  it('N08-01: shutdown_timeout defaults to 30', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect(config.daemon.shutdown_timeout).toBe(30);
  });

  // N08-02: minimum value 5 accepted
  it('N08-02: shutdown_timeout=5 accepted (minimum)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nshutdown_timeout = 5\n');
    const config = loadConfig(dir);
    expect(config.daemon.shutdown_timeout).toBe(5);
  });

  // N08-03: maximum value 300 accepted
  it('N08-03: shutdown_timeout=300 accepted (maximum)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nshutdown_timeout = 300\n');
    const config = loadConfig(dir);
    expect(config.daemon.shutdown_timeout).toBe(300);
  });

  // N08-04: below minimum 4 -> ZodError
  it('N08-04: shutdown_timeout=4 rejected (below min 5)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[daemon]\nshutdown_timeout = 4\n');
    expect(() => loadConfig(dir)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// [incoming] section tests (Phase 227-01)
// ---------------------------------------------------------------------------

describe('[incoming] section', () => {
  it('loads [incoming] section with all 7 defaults when no config.toml', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect(config.incoming.enabled).toBe(false);
    expect(config.incoming.poll_interval).toBe(30);
    expect(config.incoming.retention_days).toBe(90);
    expect(config.incoming.suspicious_dust_usd).toBe(0.01);
    expect(config.incoming.suspicious_amount_multiplier).toBe(10);
    expect(config.incoming.cooldown_minutes).toBe(5);
    expect(config.incoming.wss_url).toBe('');
  });

  it('config.toml [incoming] section accepted and parsed', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[incoming]
enabled = true
poll_interval = 60
`,
    );
    const config = loadConfig(dir);
    expect(config.incoming.enabled).toBe(true);
    expect(config.incoming.poll_interval).toBe(60);
    // Other keys should have defaults
    expect(config.incoming.retention_days).toBe(90);
    expect(config.incoming.suspicious_dust_usd).toBe(0.01);
    expect(config.incoming.suspicious_amount_multiplier).toBe(10);
    expect(config.incoming.cooldown_minutes).toBe(5);
    expect(config.incoming.wss_url).toBe('');
  });

  it('WAIAAS_INCOMING_ENABLED=true overrides incoming.enabled', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_INCOMING_ENABLED', 'true');
    const config = loadConfig(dir);
    expect(config.incoming.enabled).toBe(true);
  });

  it('WAIAAS_INCOMING_POLL_INTERVAL=120 overrides incoming.poll_interval', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_INCOMING_POLL_INTERVAL', '120');
    const config = loadConfig(dir);
    expect(config.incoming.poll_interval).toBe(120);
  });

  it('Zod rejects invalid poll_interval below minimum (5)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[incoming]\npoll_interval = 2\n');
    expect(() => loadConfig(dir)).toThrow();
  });

  // CFG-02 verification: incoming keys registered in setting-keys.ts
  // Superseded by network-setting-keys-completeness.test.ts (#282) for dynamic SSoT verification
  it('CFG-02 verify: SETTING_DEFINITIONS has exactly 26 incoming.* keys', () => {
    const incomingDefs = SETTING_DEFINITIONS.filter((d) => d.key.startsWith('incoming.'));
    expect(incomingDefs).toHaveLength(26);
    const keys = incomingDefs.map((d) => d.key).sort();
    expect(keys).toEqual([
      'incoming.cooldown_minutes',
      'incoming.enabled',
      'incoming.poll_interval',
      'incoming.retention_days',
      'incoming.solana_mode',
      'incoming.suspicious_amount_multiplier',
      'incoming.suspicious_dust_usd',
      'incoming.wss_url',
      'incoming.wss_url.arbitrum-mainnet',
      'incoming.wss_url.arbitrum-sepolia',
      'incoming.wss_url.base-mainnet',
      'incoming.wss_url.base-sepolia',
      'incoming.wss_url.ethereum-mainnet',
      'incoming.wss_url.ethereum-sepolia',
      'incoming.wss_url.hyperevm-mainnet',
      'incoming.wss_url.hyperevm-testnet',
      'incoming.wss_url.optimism-mainnet',
      'incoming.wss_url.optimism-sepolia',
      'incoming.wss_url.polygon-amoy',
      'incoming.wss_url.polygon-mainnet',
      'incoming.wss_url.solana-devnet',
      'incoming.wss_url.solana-mainnet',
      'incoming.wss_url.solana-testnet',
      'incoming.wss_url.xrpl-devnet',
      'incoming.wss_url.xrpl-mainnet',
      'incoming.wss_url.xrpl-testnet',
    ]);
  });

  // CFG-03 verification: HotReloadOrchestrator has incoming key detection
  // INCOMING_KEYS_PREFIX is not exported, so we verify by reading the module source
  it('CFG-03 verify: hot-reload.ts contains INCOMING_KEYS_PREFIX constant', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const hotReloadPath = resolve(
      import.meta.dirname,
      '../infrastructure/settings/hot-reload.ts',
    );
    const source = readFileSync(hotReloadPath, 'utf-8');
    expect(source).toContain('INCOMING_KEYS_PREFIX');
    expect(source).toContain("'incoming.'");
  });
});

// ---------------------------------------------------------------------------
// [actions] section tests (Phase 247-01: Jupiter Swap config)
// ---------------------------------------------------------------------------

describe('[actions] section', () => {
  it('loads [actions] section with all 8 defaults when no config.toml', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    expect(config.actions.jupiter_swap_enabled).toBe(true);
    expect(config.actions.jupiter_swap_api_base_url).toBe('https://api.jup.ag/swap/v1');
    expect(config.actions.jupiter_swap_api_key).toBe('');
    expect(config.actions.jupiter_swap_default_slippage_bps).toBe(50);
    expect(config.actions.jupiter_swap_max_slippage_bps).toBe(500);
    expect(config.actions.jupiter_swap_max_price_impact_pct).toBe(1.0);
    expect(config.actions.jupiter_swap_jito_tip_lamports).toBe(1000);
    expect(config.actions.jupiter_swap_request_timeout_ms).toBe(10000);
  });

  it('config.toml [actions] section accepted and parsed', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      `[actions]
jupiter_swap_enabled = true
jupiter_swap_default_slippage_bps = 75
jupiter_swap_max_price_impact_pct = 2.0
`,
    );
    const config = loadConfig(dir);
    expect(config.actions.jupiter_swap_enabled).toBe(true);
    expect(config.actions.jupiter_swap_default_slippage_bps).toBe(75);
    expect(config.actions.jupiter_swap_max_price_impact_pct).toBe(2.0);
    // Unspecified keys should have defaults
    expect(config.actions.jupiter_swap_max_slippage_bps).toBe(500);
    expect(config.actions.jupiter_swap_jito_tip_lamports).toBe(1000);
  });

  it('WAIAAS_ACTIONS_JUPITER_SWAP_ENABLED=true overrides actions.jupiter_swap_enabled', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_ACTIONS_JUPITER_SWAP_ENABLED', 'true');
    const config = loadConfig(dir);
    expect(config.actions.jupiter_swap_enabled).toBe(true);
  });

  it('WAIAAS_ACTIONS_JUPITER_SWAP_DEFAULT_SLIPPAGE_BPS=100 overrides', () => {
    const dir = saveTempDir(createTempDir());
    setEnv('WAIAAS_ACTIONS_JUPITER_SWAP_DEFAULT_SLIPPAGE_BPS', '100');
    const config = loadConfig(dir);
    expect(config.actions.jupiter_swap_default_slippage_bps).toBe(100);
  });

  it('Zod rejects jupiter_swap_default_slippage_bps below minimum (1)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[actions]\njupiter_swap_default_slippage_bps = 0\n');
    expect(() => loadConfig(dir)).toThrow();
  });

  it('Zod rejects jupiter_swap_request_timeout_ms below minimum (1000)', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[actions]\njupiter_swap_request_timeout_ms = 100\n');
    expect(() => loadConfig(dir)).toThrow();
  });

  it('DaemonConfigSchema actions section has 13 keys', () => {
    const dir = saveTempDir(createTempDir());
    const config = loadConfig(dir);
    const actionsKeys = Object.keys(config.actions);
    expect(actionsKeys).toHaveLength(18); // 8 Jupiter + 5 0x + 5 LiFi
  });
});

// ---------------------------------------------------------------------------
// [backup] section
// ---------------------------------------------------------------------------

describe('[backup] config section', () => {
  it('produces backup defaults: { dir: backups, interval: 0, retention_count: 7 }', () => {
    const config = DaemonConfigSchema.parse({});
    expect(config.backup).toEqual({ dir: 'backups', interval: 0, retention_count: 7 });
  });

  it('parses custom backup values correctly', () => {
    const config = DaemonConfigSchema.parse({
      backup: { dir: 'my-backups', interval: 86400, retention_count: 14 },
    });
    expect(config.backup.dir).toBe('my-backups');
    expect(config.backup.interval).toBe(86400);
    expect(config.backup.retention_count).toBe(14);
  });

  it('rejects backup.interval < 0', () => {
    expect(() =>
      DaemonConfigSchema.parse({ backup: { interval: -1 } }),
    ).toThrow();
  });

  it('rejects backup.interval > 604800', () => {
    expect(() =>
      DaemonConfigSchema.parse({ backup: { interval: 604801 } }),
    ).toThrow();
  });

  it('rejects backup.retention_count < 1', () => {
    expect(() =>
      DaemonConfigSchema.parse({ backup: { retention_count: 0 } }),
    ).toThrow();
  });

  it('rejects backup.retention_count > 100', () => {
    expect(() =>
      DaemonConfigSchema.parse({ backup: { retention_count: 101 } }),
    ).toThrow();
  });

  it('WAIAAS_BACKUP_DIR env var overrides config.toml backup.dir', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[backup]\ndir = "from-toml"\n');
    setEnv('WAIAAS_BACKUP_DIR', '/custom/backups');
    const config = loadConfig(dir);
    expect(config.backup.dir).toBe('/custom/backups');
  });

  it('WAIAAS_BACKUP_INTERVAL env var overrides config.toml backup.interval', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[backup]\ninterval = 3600\n');
    setEnv('WAIAAS_BACKUP_INTERVAL', '7200');
    const config = loadConfig(dir);
    expect(config.backup.interval).toBe(7200);
  });

  it('WAIAAS_BACKUP_RETENTION_COUNT env var overrides config.toml backup.retention_count', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(join(dir, 'config.toml'), '[backup]\nretention_count = 7\n');
    setEnv('WAIAAS_BACKUP_RETENTION_COUNT', '21');
    const config = loadConfig(dir);
    expect(config.backup.retention_count).toBe(21);
  });

  it('[backup] is recognized as a valid known section', () => {
    expect(() =>
      detectNestedSections({ backup: { dir: 'backups' } }),
    ).not.toThrow();
  });

  it('loadConfig with config.toml containing [backup] section parses correctly', () => {
    const dir = saveTempDir(createTempDir());
    writeFileSync(
      join(dir, 'config.toml'),
      '[backup]\ndir = "custom"\ninterval = 3600\nretention_count = 14\n',
    );
    const config = loadConfig(dir);
    expect(config.backup.dir).toBe('custom');
    expect(config.backup.interval).toBe(3600);
    expect(config.backup.retention_count).toBe(14);
  });
});
