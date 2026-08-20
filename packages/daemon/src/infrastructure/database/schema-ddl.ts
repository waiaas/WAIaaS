/**
 * DDL statements for all tables and indexes (latest schema: v59).
 *
 * Extracted from migrate.ts to separate DDL creation from migration logic.
 * Contains getCreateTableStatements(), getCreateIndexStatements(),
 * LATEST_SCHEMA_VERSION, and shared utility constants used by migration files.
 */

import {
  WALLET_STATUSES,
  CHAIN_TYPES,
  NETWORK_TYPES,
  ENVIRONMENT_TYPES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  POLICY_TYPES,
  POLICY_TIERS,
  NOTIFICATION_LOG_STATUSES,
  INCOMING_TX_STATUSES,
  POSITION_CATEGORIES,
  POSITION_STATUSES,
  ACCOUNT_TYPES,
} from '@waiaas/core';

// ---------------------------------------------------------------------------
// Utility: build CHECK IN clause from SSoT arrays
// ---------------------------------------------------------------------------

export const inList = (values: readonly string[]) => values.map((v) => `'${v}'`).join(', ');

/**
 * NETWORK_TYPES_WITH_LEGACY includes both old ('mainnet', 'devnet', 'testnet') and new
 * ('solana-mainnet', 'solana-devnet', 'solana-testnet') Solana network names.
 * Used in pre-v29 migrations so CHECK constraints accept data in either format
 * during the migration chain. Migration v29 converts old -> new, and post-v29
 * tables use NETWORK_TYPES (new names only).
 */
const LEGACY_SOLANA_NETWORKS = ['mainnet', 'devnet', 'testnet'] as const;
export const NETWORK_TYPES_WITH_LEGACY = [...new Set([...NETWORK_TYPES, ...LEGACY_SOLANA_NETWORKS])] as const;

/**
 * Map legacy bare Solana network names to their prefixed form.
 * Used by pre-v29 migrations (e.g., v22 asset_id backfill) that need to look up
 * NETWORK_TO_CAIP2 with potentially old-format data.
 */
export const LEGACY_NETWORK_NORMALIZE: Record<string, string> = {
  mainnet: 'solana-mainnet',
  devnet: 'solana-devnet',
  testnet: 'solana-testnet',
};

/**
 * The latest schema version that getCreateTableStatements() represents.
 * pushSchema() records this version for fresh databases so migrations are skipped.
 * Increment this whenever DDL statements are updated to match a new migration.
 */
export const LATEST_SCHEMA_VERSION = 63;

export function getCreateTableStatements(): string[] {
  return [
    // Table 1: wallets (renamed from agents in v3, environment model in v6b, v29.3: default_network removed)
    `CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN (${inList(CHAIN_TYPES)})),
  environment TEXT NOT NULL CHECK (environment IN (${inList(ENVIRONMENT_TYPES)})),
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATING' CHECK (status IN (${inList(WALLET_STATUSES)})),
  owner_address TEXT,
  owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (owner_verified IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER,
  suspension_reason TEXT,
  monitor_incoming INTEGER NOT NULL DEFAULT 0,
  owner_approval_method TEXT CHECK (owner_approval_method IS NULL OR owner_approval_method IN ('sdk_push', 'sdk_telegram', 'walletconnect', 'telegram_bot', 'rest')),
  wallet_type TEXT,
  account_type TEXT NOT NULL DEFAULT 'eoa' CHECK (account_type IN (${inList(ACCOUNT_TYPES)})),
  signer_key TEXT,
  deployed INTEGER NOT NULL DEFAULT 1,
  entry_point TEXT,
  aa_provider TEXT CHECK (aa_provider IS NULL OR aa_provider IN ('pimlico', 'alchemy', 'custom')),
  aa_provider_api_key_encrypted TEXT,
  aa_bundler_url TEXT,
  aa_paymaster_url TEXT,
  aa_paymaster_policy_id TEXT,
  factory_address TEXT
)`,

    // Table 2: sessions (v26.4: wallet_id removed, v26.5: token_issued_count added)
    `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  constraints TEXT,
  usage_stats TEXT,
  revoked_at INTEGER,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  max_renewals INTEGER NOT NULL DEFAULT 0,
  last_renewed_at INTEGER,
  absolute_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  token_issued_count INTEGER NOT NULL DEFAULT 1
)`,

    // Table 2b: session_wallets (v26.4: session-wallet junction for 1:N model, v29.3: is_default removed)
    `CREATE TABLE IF NOT EXISTS session_wallets (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, wallet_id)
)`,

    // Table 3: transactions (bridge_status + bridge_metadata added in v23)
    `CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT,
  type TEXT NOT NULL CHECK (type IN (${inList(TRANSACTION_TYPES)})),
  amount TEXT,
  to_address TEXT,
  token_mint TEXT,
  contract_address TEXT,
  method_signature TEXT,
  spender_address TEXT,
  approved_amount TEXT,
  parent_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
  batch_index INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (${inList(TRANSACTION_STATUSES)})),
  tier TEXT CHECK (tier IS NULL OR tier IN (${inList(POLICY_TIERS)})),
  queued_at INTEGER,
  executed_at INTEGER,
  created_at INTEGER NOT NULL,
  reserved_amount TEXT,
  amount_usd REAL,
  reserved_amount_usd REAL,
  error TEXT,
  metadata TEXT,
  network TEXT CHECK (network IS NULL OR network IN (${inList(NETWORK_TYPES)})),
  bridge_status TEXT CHECK (bridge_status IS NULL OR bridge_status IN ('PENDING', 'COMPLETED', 'FAILED', 'BRIDGE_MONITORING', 'TIMEOUT', 'REFUNDED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'SETTLED', 'EXPIRED')),
  bridge_metadata TEXT,
  action_kind TEXT NOT NULL DEFAULT 'contractCall',
  venue TEXT,
  operation TEXT,
  external_id TEXT
)`,

    // Table 4: policies (network column added in v8)
    `CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (${inList(POLICY_TYPES)})),
  rules TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  network TEXT CHECK (network IS NULL OR network IN (${inList(NETWORK_TYPES)})),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 5: pending_approvals (approval_channel added in v16, approval_type added in v39, typed_data_json added in v40, owner_message added in v63)
    `CREATE TABLE IF NOT EXISTS pending_approvals (
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
  owner_message TEXT,
  created_at INTEGER NOT NULL
)`,

    // Table 6: audit_log
    `CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  wallet_id TEXT,
  session_id TEXT,
  tx_id TEXT,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address TEXT
)`,

    // Table 7: key_value_store
    `CREATE TABLE IF NOT EXISTS key_value_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 8: notification_logs
    `CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  wallet_id TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (${inList(NOTIFICATION_LOG_STATUSES)})),
  error TEXT,
  message TEXT,
  created_at INTEGER NOT NULL
)`,

    // Table 9: token_registry (asset_id added in v22)
    `CREATE TABLE IF NOT EXISTS token_registry (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('builtin', 'custom')),
  asset_id TEXT,
  created_at INTEGER NOT NULL
)`,

    // Table 10: settings
    `CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0 CHECK (encrypted IN (0, 1)),
  category TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 11: schema_version
    `CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
)`,

    // Table 13: telegram_users (Telegram Bot user management, v1.6)
    `CREATE TABLE IF NOT EXISTS telegram_users (
  chat_id INTEGER PRIMARY KEY,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'PENDING' CHECK (role IN ('PENDING', 'ADMIN', 'READONLY')),
  registered_at INTEGER NOT NULL,
  approved_at INTEGER
)`,

    // Table 14: wc_sessions (WalletConnect session metadata, v1.6.1)
    `CREATE TABLE IF NOT EXISTS wc_sessions (
  wallet_id TEXT PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  topic TEXT NOT NULL UNIQUE,
  peer_meta TEXT,
  chain_id TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  namespaces TEXT,
  expiry INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`,

    // Table 15: wc_store (WalletConnect IKeyValueStorage, v1.6.1)
    `CREATE TABLE IF NOT EXISTS wc_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`,

    // Table 16: incoming_transactions (detected incoming transfers to monitored wallets, v27.1)
    `CREATE TABLE IF NOT EXISTS incoming_transactions (
  id TEXT PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  token_address TEXT,
  chain TEXT NOT NULL CHECK (chain IN (${inList(CHAIN_TYPES)})),
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (${inList(INCOMING_TX_STATUSES)})),
  block_number INTEGER,
  detected_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  is_suspicious INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tx_hash, wallet_id)
)`,

    // Table 17: incoming_tx_cursors (per-wallet cursor for gap recovery, v27.1)
    `CREATE TABLE IF NOT EXISTS incoming_tx_cursors (
  wallet_id TEXT PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  network TEXT NOT NULL,
  last_signature TEXT,
  last_block_number INTEGER,
  updated_at INTEGER NOT NULL
)`,

    // Table 18: defi_positions (DeFi position tracking, v29.2)
    `CREATE TABLE IF NOT EXISTS defi_positions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN (${inList(POSITION_CATEGORIES)})),
  provider TEXT NOT NULL,
  chain TEXT NOT NULL CHECK(chain IN (${inList(CHAIN_TYPES)})),
  environment TEXT NOT NULL DEFAULT 'mainnet',
  network TEXT CHECK(network IS NULL OR network IN (${inList(NETWORK_TYPES)})),
  asset_id TEXT,
  amount TEXT NOT NULL,
  amount_usd REAL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN (${inList(POSITION_STATUSES)})),
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  last_synced_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 19: wallet_apps (Human Wallet Apps registry, v29.7, v60: push_relay_url, v61: signing primary partial unique index)
    `CREATE TABLE IF NOT EXISTS wallet_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT '',
  signing_enabled INTEGER NOT NULL DEFAULT 1,
  alerts_enabled INTEGER NOT NULL DEFAULT 1,
  sign_topic TEXT,
  notify_topic TEXT,
  subscription_token TEXT,
  push_relay_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 20: webhooks (webhook outbound subscriptions, v37 OPS-04)
    `CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 21: webhook_logs (webhook delivery attempt history, v37 OPS-04)
    `CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  http_status INTEGER,
  attempt INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  request_duration INTEGER,
  created_at INTEGER NOT NULL
)`,

    // Table 22: agent_identities (ERC-8004 agent identity tracking, v39)
    `CREATE TABLE IF NOT EXISTS agent_identities (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  chain_agent_id TEXT NOT NULL,
  registry_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  agent_uri TEXT,
  registration_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'REGISTERED', 'WALLET_LINKED', 'DEREGISTERED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,

    // Table 23: reputation_cache (ERC-8004 reputation score cache, v39)
    `CREATE TABLE IF NOT EXISTS reputation_cache (
  agent_id TEXT NOT NULL,
  registry_address TEXT NOT NULL,
  tag1 TEXT NOT NULL DEFAULT '',
  tag2 TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL,
  score_decimals INTEGER NOT NULL DEFAULT 0,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  cached_at INTEGER NOT NULL,
  PRIMARY KEY (agent_id, registry_address, tag1, tag2)
)`,

    // Table 24: nft_metadata_cache (NFT metadata caching with TTL, v44)
    `CREATE TABLE IF NOT EXISTS nft_metadata_cache (
  id TEXT PRIMARY KEY,
  contract_address TEXT NOT NULL,
  token_id TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN (${inList(CHAIN_TYPES)})),
  network TEXT NOT NULL CHECK (network IN (${inList(NETWORK_TYPES)})),
  metadata_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
)`,

    // Table 25: userop_builds (UserOp Build/Sign API data, v45, network added v50)
    `CREATE TABLE IF NOT EXISTS userop_builds (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  call_data TEXT NOT NULL,
  sender TEXT NOT NULL,
  nonce TEXT NOT NULL,
  entry_point TEXT NOT NULL,
  network TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1))
)`,

    // Table 26: hyperliquid_orders (Hyperliquid DEX order history, v51)
    `CREATE TABLE IF NOT EXISTS hyperliquid_orders (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  sub_account_address TEXT,
  oid INTEGER,
  cloid TEXT,
  transaction_id TEXT REFERENCES transactions(id),
  market TEXT NOT NULL,
  asset_index INTEGER NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL CHECK(order_type IN ('MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT', 'TAKE_PROFIT')),
  size TEXT NOT NULL,
  price TEXT,
  trigger_price TEXT,
  tif TEXT CHECK(tif IN ('GTC', 'IOC', 'ALO')),
  reduce_only INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'RESTING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'TRIGGERED')),
  filled_size TEXT,
  avg_fill_price TEXT,
  is_spot INTEGER NOT NULL DEFAULT 0,
  leverage INTEGER,
  margin_mode TEXT CHECK(margin_mode IN ('CROSS', 'ISOLATED')),
  response_data TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,

    // Table 27: hyperliquid_sub_accounts (Hyperliquid Sub-account mapping, v52)
    `CREATE TABLE IF NOT EXISTS hyperliquid_sub_accounts (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  sub_account_address TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(wallet_id, sub_account_address)
)`,

    // Table 28: polymarket_orders (Polymarket CLOB order history, v53)
    `CREATE TABLE IF NOT EXISTS polymarket_orders (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  transaction_id TEXT REFERENCES transactions(id),
  condition_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  market_slug TEXT,
  outcome TEXT NOT NULL,
  order_id TEXT,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL CHECK (order_type IN ('GTC', 'GTD', 'FOK', 'IOC')),
  price TEXT NOT NULL,
  size TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'LIVE', 'MATCHED', 'PARTIALLY_FILLED', 'CANCELLED', 'EXPIRED')),
  filled_size TEXT,
  avg_fill_price TEXT,
  salt TEXT,
  maker_amount TEXT,
  taker_amount TEXT,
  signature_type INTEGER NOT NULL DEFAULT 0,
  fee_rate_bps INTEGER,
  expiration INTEGER,
  nonce TEXT,
  is_neg_risk INTEGER NOT NULL DEFAULT 0,
  response_data TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,

    // Table 29: polymarket_positions (Polymarket position tracking, v54)
    `CREATE TABLE IF NOT EXISTS polymarket_positions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  condition_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  market_slug TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
  size TEXT NOT NULL DEFAULT '0',
  avg_price TEXT,
  realized_pnl TEXT DEFAULT '0',
  market_resolved INTEGER NOT NULL DEFAULT 0,
  winning_outcome TEXT,
  is_neg_risk INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(wallet_id, token_id)
)`,

    // Table 30: polymarket_api_keys (Polymarket CLOB API credentials, v54)
    `CREATE TABLE IF NOT EXISTS polymarket_api_keys (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  api_key TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  api_passphrase_encrypted TEXT NOT NULL,
  signature_type INTEGER NOT NULL DEFAULT 0,
  proxy_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(wallet_id)
)`,

    // Table 31: wallet_credentials (External Action credential vault, v55)
    `CREATE TABLE IF NOT EXISTS wallet_credentials (
  id TEXT NOT NULL PRIMARY KEY,
  wallet_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('api-key','hmac-secret','rsa-private-key','session-token','custom')),
  name TEXT NOT NULL,
  encrypted_value BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
)`,
  ];
}

// ---------------------------------------------------------------------------
// Index creation statements
// ---------------------------------------------------------------------------

export function getCreateIndexStatements(): string[] {
  return [
    // wallets indexes (renamed from agents in v3)
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_public_key ON wallets(public_key)',
    'CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status)',
    'CREATE INDEX IF NOT EXISTS idx_wallets_chain_environment ON wallets(chain, environment)',
    'CREATE INDEX IF NOT EXISTS idx_wallets_owner_address ON wallets(owner_address)',

    // sessions indexes (v26.4: idx_sessions_wallet_id removed, wallet_id moved to session_wallets)
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)',

    // session_wallets indexes (v26.4)
    'CREATE INDEX IF NOT EXISTS idx_session_wallets_session ON session_wallets(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_session_wallets_wallet ON session_wallets(wallet_id)',

    // transactions indexes
    'CREATE INDEX IF NOT EXISTS idx_transactions_wallet_status ON transactions(wallet_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON transactions(session_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_queued_at ON transactions(queued_at)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_contract_address ON transactions(contract_address)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_id)',

    // policies indexes
    'CREATE INDEX IF NOT EXISTS idx_policies_wallet_enabled ON policies(wallet_id, enabled)',
    'CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type)',
    'CREATE INDEX IF NOT EXISTS idx_policies_network ON policies(network)',

    // pending_approvals indexes
    'CREATE INDEX IF NOT EXISTS idx_pending_approvals_tx_id ON pending_approvals(tx_id)',
    'CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires_at ON pending_approvals(expires_at)',

    // audit_log indexes
    'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_wallet_id ON audit_log(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_wallet_timestamp ON audit_log(wallet_id, timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_tx_id ON audit_log(tx_id)',

    // notification_logs indexes
    'CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type ON notification_logs(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_notification_logs_wallet_id ON notification_logs(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status)',
    'CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at)',

    // token_registry indexes
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_token_registry_network_address ON token_registry(network, address)',
    'CREATE INDEX IF NOT EXISTS idx_token_registry_network ON token_registry(network)',

    // settings indexes
    'CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)',

    // telegram_users indexes
    'CREATE INDEX IF NOT EXISTS idx_telegram_users_role ON telegram_users(role)',

    // wc_sessions indexes
    'CREATE INDEX IF NOT EXISTS idx_wc_sessions_topic ON wc_sessions(topic)',

    // incoming_transactions indexes
    'CREATE INDEX IF NOT EXISTS idx_incoming_tx_wallet_detected ON incoming_transactions(wallet_id, detected_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_incoming_tx_detected_at ON incoming_transactions(detected_at)',
    'CREATE INDEX IF NOT EXISTS idx_incoming_tx_chain_network ON incoming_transactions(chain, network)',
    "CREATE INDEX IF NOT EXISTS idx_incoming_tx_status ON incoming_transactions(status) WHERE status = 'DETECTED'",

    // v28.3: DeFi async tracking partial indexes on transactions
    'CREATE INDEX IF NOT EXISTS idx_transactions_bridge_status ON transactions(bridge_status) WHERE bridge_status IS NOT NULL',
    "CREATE INDEX IF NOT EXISTS idx_transactions_gas_waiting ON transactions(status) WHERE status = 'GAS_WAITING'",

    // v29.2: defi_positions indexes
    'CREATE INDEX IF NOT EXISTS idx_defi_positions_wallet_category ON defi_positions(wallet_id, category)',
    'CREATE INDEX IF NOT EXISTS idx_defi_positions_wallet_provider ON defi_positions(wallet_id, provider)',
    'CREATE INDEX IF NOT EXISTS idx_defi_positions_status ON defi_positions(status)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_defi_positions_unique ON defi_positions(wallet_id, provider, asset_id, category)',
    // v59: defi_positions environment index (Testnet Toggle)
    'CREATE INDEX IF NOT EXISTS idx_defi_positions_environment ON defi_positions(environment)',

    // v34: wallet_apps.wallet_type index
    'CREATE INDEX IF NOT EXISTS idx_wallet_apps_wallet_type ON wallet_apps(wallet_type)',

    // v61: signing primary partial unique index (one signing_enabled=1 per wallet_type)
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_apps_signing_primary ON wallet_apps(wallet_type) WHERE signing_enabled = 1',

    // v37: webhooks + webhook_logs indexes (OPS-04)
    'CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status)',
    'CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at)',

    // v39: agent_identities indexes (ERC-8004)
    'CREATE INDEX IF NOT EXISTS idx_agent_identities_wallet ON agent_identities(wallet_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_identities_chain ON agent_identities(registry_address, chain_agent_id)',

    // v44: nft_metadata_cache indexes
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_cache_unique ON nft_metadata_cache(contract_address, token_id, chain, network)',
    'CREATE INDEX IF NOT EXISTS idx_nft_cache_expires ON nft_metadata_cache(expires_at)',

    // v45: userop_builds indexes
    'CREATE INDEX IF NOT EXISTS idx_userop_builds_wallet_id ON userop_builds(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_userop_builds_expires ON userop_builds(expires_at)',

    // v51: hyperliquid_orders indexes
    'CREATE INDEX IF NOT EXISTS idx_hl_orders_wallet ON hyperliquid_orders(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_hl_orders_oid ON hyperliquid_orders(oid)',
    'CREATE INDEX IF NOT EXISTS idx_hl_orders_market ON hyperliquid_orders(market)',
    'CREATE INDEX IF NOT EXISTS idx_hl_orders_status ON hyperliquid_orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_hl_orders_created ON hyperliquid_orders(created_at)',

    // v52: hyperliquid_sub_accounts index
    'CREATE INDEX IF NOT EXISTS idx_hl_sub_wallet ON hyperliquid_sub_accounts(wallet_id)',

    // v53: polymarket_orders indexes
    'CREATE INDEX IF NOT EXISTS idx_pm_orders_wallet ON polymarket_orders(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_pm_orders_order_id ON polymarket_orders(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_pm_orders_condition ON polymarket_orders(condition_id)',
    'CREATE INDEX IF NOT EXISTS idx_pm_orders_status ON polymarket_orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_pm_orders_created ON polymarket_orders(created_at)',

    // v54: polymarket_positions indexes
    'CREATE INDEX IF NOT EXISTS idx_pm_positions_wallet ON polymarket_positions(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_pm_positions_condition ON polymarket_positions(condition_id)',
    'CREATE INDEX IF NOT EXISTS idx_pm_positions_resolved ON polymarket_positions(market_resolved)',

    // v54: polymarket_api_keys indexes (UNIQUE on wallet_id is inline)

    // v55: wallet_credentials indexes
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_credentials_wallet_name ON wallet_credentials(wallet_id, name)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_credentials_global_name ON wallet_credentials(name) WHERE wallet_id IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_wallet_credentials_wallet_id ON wallet_credentials(wallet_id)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_credentials_expires_at ON wallet_credentials(expires_at) WHERE expires_at IS NOT NULL',

    // v56: transactions action tracking indexes
    'CREATE INDEX IF NOT EXISTS idx_transactions_action_kind ON transactions(action_kind)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_venue ON transactions(venue) WHERE venue IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id) WHERE external_id IS NOT NULL',

    // v57: composite index for external action tracking queries
    'CREATE INDEX IF NOT EXISTS idx_transactions_action_kind_bridge_status ON transactions(action_kind, bridge_status) WHERE bridge_status IS NOT NULL',

    // v61: CHECK triggers for wallet_apps.signing_enabled (must be 0 or 1)
    `CREATE TRIGGER IF NOT EXISTS trg_wallet_apps_signing_check_insert
      BEFORE INSERT ON wallet_apps
      WHEN NEW.signing_enabled NOT IN (0, 1)
      BEGIN SELECT RAISE(ABORT, 'signing_enabled must be 0 or 1'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_wallet_apps_signing_check_update
      BEFORE UPDATE ON wallet_apps
      WHEN NEW.signing_enabled NOT IN (0, 1)
      BEGIN SELECT RAISE(ABORT, 'signing_enabled must be 0 or 1'); END`,
  ];
}
