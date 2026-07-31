/**
 * `waiaas init` -- Initialize the WAIaaS data directory.
 *
 * Creates:
 *   - Data directory (0o700)
 *   - Subdirectories: keystore/, data/, logs/, backups/
 *   - Default config.toml (if not exists)
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CONFIG = `# WAIaaS Daemon Configuration
# See documentation for all available options

[daemon]
port = 3100
hostname = "127.0.0.1"

[database]
path = "data/waiaas.db"

# [security]
# policy_defaults_delay = 0
# policy_defaults_approval_timeout = 3600

# [rpc]
# solana_devnet = "https://api.devnet.solana.com"
# ethereum_sepolia = "https://rpc.sepolia.org"

# [notifications]
# enabled = false
# telegram_bot_token = ""
# telegram_chat_id = ""

# Full reference: https://github.com/waiaas/WAIaaS#configuration
`;

export async function initCommand(dataDir: string, opts?: { autoProvision?: boolean }): Promise<void> {
  const configPath = join(dataDir, 'config.toml');

  // Check if already initialized
  if (existsSync(dataDir) && existsSync(configPath)) {
    console.log(`Already initialized: ${dataDir}`);
    return;
  }

  try {
    // Create data directory
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });

    // Create subdirectories
    const subdirs = ['keystore', 'data', 'logs', 'backups'];
    for (const sub of subdirs) {
      const subPath = join(dataDir, sub);
      if (!existsSync(subPath)) {
        mkdirSync(subPath, { recursive: true, mode: 0o700 });
      }
    }

    // Write default config.toml (skip if already exists)
    if (!existsSync(configPath)) {
      writeFileSync(configPath, DEFAULT_CONFIG, { mode: 0o644 });
    }

    console.log(`Initialized WAIaaS data directory: ${dataDir}`);
    console.log(`  config.toml`);
    for (const sub of subdirs) {
      console.log(`  ${sub}/`);
    }

    // Auto-provision: generate recovery key for headless / CI environments
    if (opts?.autoProvision) {
      const { randomBytes } = await import('node:crypto');
      const password = randomBytes(32).toString('hex');
      const recoveryPath = join(dataDir, 'recovery.key');
      writeFileSync(recoveryPath, password, { mode: 0o600 });
      console.log('');
      console.log('Auto-provision mode enabled.');
      console.log(`Recovery key saved to: ${recoveryPath}`);
      console.log('IMPORTANT: Change the master password after initial setup.');
    } else {
      console.log('');
      console.log('Set your master password before starting:');
      console.log('  export WAIAAS_MASTER_PASSWORD="your-secure-password"');
      console.log('Or use a password file:');
      console.log('  echo "your-secure-password" > ~/.waiaas/master-password.txt');
      console.log('  export WAIAAS_MASTER_PASSWORD_FILE=~/.waiaas/master-password.txt');
    }

    console.log('');
    console.log('Next: waiaas start');
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error(`Permission denied: Cannot create ${dataDir}`);
      console.error(`Try: sudo mkdir -p ${dataDir} && sudo chown $(whoami) ${dataDir}`);
      process.exit(1);
    }
    throw error;
  }
}
