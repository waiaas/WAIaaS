/**
 * Setting key definitions (SSoT) for daemon operational settings.
 *
 * Each setting has a key (DB storage), category, configPath (for config.toml lookup),
 * defaultValue (matching DaemonConfigSchema .default()), and isCredential flag.
 *
 * Categories: notifications, rpc, security, daemon, walletconnect, oracle, display, autostop, monitoring, telegram, signing_sdk, incoming, actions, rpc_proxy
 *
 * @see packages/daemon/src/infrastructure/config/loader.ts for DaemonConfigSchema defaults
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingDefinition {
  /** DB storage key, e.g. 'notifications.telegram_bot_token' */
  key: string;
  /** Category for grouping, e.g. 'notifications' */
  category: string;
  /** Path in config.toml, e.g. 'notifications.telegram_bot_token' */
  configPath: string;
  /** Default value (string, matching DaemonConfigSchema .default()) */
  defaultValue: string;
  /** If true, value is AES-GCM encrypted before DB storage */
  isCredential: boolean;
  /** Human-readable label (e.g. 'Telegram Bot Token') */
  label: string;
  /** One-line description of this setting */
  description: string;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const SETTING_CATEGORIES = [
  'notifications',
  'rpc',
  'security',
  'daemon',
  'walletconnect',
  'oracle',
  'display',
  'autostop',
  'monitoring',
  'telegram',
  'signing_sdk',
  'incoming',
  'actions',
  'policy',
  'gas_condition',
  'rpc_pool',
  'position_tracker',
  'smart_account',
  'erc8128',
  'rpc_proxy',
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Label derivation helper
// ---------------------------------------------------------------------------

/**
 * Derive a human-readable label from a setting key's last segment.
 * e.g. 'notifications.telegram_bot_token' -> 'Telegram Bot Token'
 */
function deriveLabel(key: string): string {
  const lastSegment = key.includes('.') ? key.split('.').pop()! : key;
  return lastSegment
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bRpm\b/g, 'RPM')
    .replace(/\bRpc\b/g, 'RPC')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bSec\b/g, 'Sec')
    .replace(/\bMs\b/g, 'ms')
    .replace(/\bPct\b/g, '%')
    .replace(/\bBps\b/g, 'BPS')
    .replace(/\bUsd\b/g, 'USD')
    .replace(/\bSol\b/g, 'SOL')
    .replace(/\bEth\b/g, 'ETH')
    .replace(/\bEvm\b/g, 'EVM')
    .replace(/\bWss\b/g, 'WSS')
    .replace(/\bIp\b/g, 'IP')
    .replace(/\bSdk\b/g, 'SDK')
    .replace(/\bTtl\b/g, 'TTL')
    .replace(/\bLtv\b/g, 'LTV')
    .replace(/\bHf\b/g, 'HF');
}

// ---------------------------------------------------------------------------
// Setting Definitions
// ---------------------------------------------------------------------------

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  // --- notifications category ---
  { key: 'notifications.enabled', category: 'notifications', configPath: 'notifications.enabled', defaultValue: 'false', isCredential: false, label: 'Enabled', description: 'Enable or disable the notification system' },
  { key: 'notifications.telegram_bot_token', category: 'notifications', configPath: 'notifications.telegram_bot_token', defaultValue: '', isCredential: true, label: 'Telegram Bot Token', description: 'Telegram bot API token for sending notifications' },
  { key: 'notifications.telegram_chat_id', category: 'notifications', configPath: 'notifications.telegram_chat_id', defaultValue: '', isCredential: false, label: 'Telegram Chat ID', description: 'Telegram chat/channel ID for notification delivery' },
  { key: 'notifications.discord_webhook_url', category: 'notifications', configPath: 'notifications.discord_webhook_url', defaultValue: '', isCredential: true, label: 'Discord Webhook URL', description: 'Discord webhook URL for sending notifications' },
  { key: 'notifications.slack_webhook_url', category: 'notifications', configPath: 'notifications.slack_webhook_url', defaultValue: '', isCredential: true, label: 'Slack Webhook URL', description: 'Slack webhook URL for sending notifications' },
  { key: 'notifications.locale', category: 'notifications', configPath: 'notifications.locale', defaultValue: 'en', isCredential: false, label: 'Locale', description: 'Notification message language (en, ko, etc.)' },
  { key: 'notifications.rate_limit_rpm', category: 'notifications', configPath: 'notifications.rate_limit_rpm', defaultValue: '20', isCredential: false, label: 'Rate Limit RPM', description: 'Maximum notification messages per minute' },
  { key: 'notifications.notify_categories', category: 'notifications', configPath: 'notifications.notify_categories', defaultValue: '[]', isCredential: false, label: 'Notify Categories', description: 'JSON array of notification category filters' },
  { key: 'notifications.notify_events', category: 'notifications', configPath: 'notifications.notify_events', defaultValue: '[]', isCredential: false, label: 'Notify Events', description: 'JSON array of specific notification event filters' },

  // --- rpc category (Solana 3 + EVM 12 + XRPL 3) ---
  { key: 'rpc.solana_mainnet', category: 'rpc', configPath: 'rpc.solana_mainnet', defaultValue: 'https://api.mainnet-beta.solana.com', isCredential: false, label: 'Solana Mainnet', description: 'Solana mainnet RPC endpoint URL' },
  { key: 'rpc.solana_devnet', category: 'rpc', configPath: 'rpc.solana_devnet', defaultValue: 'https://api.devnet.solana.com', isCredential: false, label: 'Solana Devnet', description: 'Solana devnet RPC endpoint URL' },
  { key: 'rpc.solana_testnet', category: 'rpc', configPath: 'rpc.solana_testnet', defaultValue: 'https://api.testnet.solana.com', isCredential: false, label: 'Solana Testnet', description: 'Solana testnet RPC endpoint URL' },
  { key: 'rpc.evm_ethereum_mainnet', category: 'rpc', configPath: 'rpc.evm_ethereum_mainnet', defaultValue: 'https://eth.drpc.org', isCredential: false, label: 'Ethereum Mainnet', description: 'Ethereum mainnet RPC endpoint URL' },
  { key: 'rpc.evm_ethereum_sepolia', category: 'rpc', configPath: 'rpc.evm_ethereum_sepolia', defaultValue: 'https://1rpc.io/sepolia', isCredential: false, label: 'Ethereum Sepolia', description: 'Ethereum Sepolia testnet RPC endpoint URL' },
  { key: 'rpc.evm_polygon_mainnet', category: 'rpc', configPath: 'rpc.evm_polygon_mainnet', defaultValue: 'https://polygon.drpc.org', isCredential: false, label: 'Polygon Mainnet', description: 'Polygon mainnet RPC endpoint URL' },
  { key: 'rpc.evm_polygon_amoy', category: 'rpc', configPath: 'rpc.evm_polygon_amoy', defaultValue: 'https://polygon-amoy.drpc.org', isCredential: false, label: 'Polygon Amoy', description: 'Polygon Amoy testnet RPC endpoint URL' },
  { key: 'rpc.evm_arbitrum_mainnet', category: 'rpc', configPath: 'rpc.evm_arbitrum_mainnet', defaultValue: 'https://arbitrum.drpc.org', isCredential: false, label: 'Arbitrum Mainnet', description: 'Arbitrum mainnet RPC endpoint URL' },
  { key: 'rpc.evm_arbitrum_sepolia', category: 'rpc', configPath: 'rpc.evm_arbitrum_sepolia', defaultValue: 'https://arbitrum-sepolia.drpc.org', isCredential: false, label: 'Arbitrum Sepolia', description: 'Arbitrum Sepolia testnet RPC endpoint URL' },
  { key: 'rpc.evm_optimism_mainnet', category: 'rpc', configPath: 'rpc.evm_optimism_mainnet', defaultValue: 'https://optimism.drpc.org', isCredential: false, label: 'Optimism Mainnet', description: 'Optimism mainnet RPC endpoint URL' },
  { key: 'rpc.evm_optimism_sepolia', category: 'rpc', configPath: 'rpc.evm_optimism_sepolia', defaultValue: 'https://optimism-sepolia.drpc.org', isCredential: false, label: 'Optimism Sepolia', description: 'Optimism Sepolia testnet RPC endpoint URL' },
  { key: 'rpc.evm_base_mainnet', category: 'rpc', configPath: 'rpc.evm_base_mainnet', defaultValue: 'https://base.drpc.org', isCredential: false, label: 'Base Mainnet', description: 'Base mainnet RPC endpoint URL' },
  { key: 'rpc.evm_base_sepolia', category: 'rpc', configPath: 'rpc.evm_base_sepolia', defaultValue: 'https://base-sepolia.drpc.org', isCredential: false, label: 'Base Sepolia', description: 'Base Sepolia testnet RPC endpoint URL' },
  { key: 'rpc.evm_hyperevm_mainnet', category: 'rpc', configPath: 'rpc.evm_hyperevm_mainnet', defaultValue: 'https://rpc.hyperliquid.xyz/evm', isCredential: false, label: 'HyperEVM Mainnet', description: 'HyperEVM mainnet RPC endpoint URL' },
  { key: 'rpc.evm_hyperevm_testnet', category: 'rpc', configPath: 'rpc.evm_hyperevm_testnet', defaultValue: 'https://rpc.hyperliquid-testnet.xyz/evm', isCredential: false, label: 'HyperEVM Testnet', description: 'HyperEVM testnet RPC endpoint URL' },
  { key: 'rpc.xrpl_mainnet', category: 'rpc', configPath: 'rpc.xrpl_mainnet', defaultValue: 'wss://xrplcluster.com', isCredential: false, label: 'XRPL Mainnet', description: 'XRPL mainnet WebSocket RPC endpoint URL' },
  { key: 'rpc.xrpl_testnet', category: 'rpc', configPath: 'rpc.xrpl_testnet', defaultValue: 'wss://s.altnet.rippletest.net:51233', isCredential: false, label: 'XRPL Testnet', description: 'XRPL testnet WebSocket RPC endpoint URL' },
  { key: 'rpc.xrpl_devnet', category: 'rpc', configPath: 'rpc.xrpl_devnet', defaultValue: 'wss://s.devnet.rippletest.net:51233', isCredential: false, label: 'XRPL Devnet', description: 'XRPL devnet WebSocket RPC endpoint URL' },

  // --- security category ---
  { key: 'security.max_sessions_per_wallet', category: 'security', configPath: 'security.max_sessions_per_wallet', defaultValue: '5', isCredential: false, label: 'Max Sessions Per Wallet', description: 'Maximum concurrent sessions allowed per wallet' },
  { key: 'security.max_pending_tx', category: 'security', configPath: 'security.max_pending_tx', defaultValue: '10', isCredential: false, label: 'Max Pending Tx', description: 'Maximum pending transactions allowed per wallet' },
  { key: 'security.rate_limit_global_ip_rpm', category: 'security', configPath: 'security.rate_limit_global_ip_rpm', defaultValue: '1000', isCredential: false, label: 'Rate Limit Global IP RPM', description: 'Rate limit: maximum requests per minute' },
  { key: 'security.rate_limit_session_rpm', category: 'security', configPath: 'security.rate_limit_session_rpm', defaultValue: '300', isCredential: false, label: 'Rate Limit Session RPM', description: 'Rate limit: maximum requests per minute' },
  { key: 'security.rate_limit_tx_rpm', category: 'security', configPath: 'security.rate_limit_tx_rpm', defaultValue: '10', isCredential: false, label: 'Rate Limit Tx RPM', description: 'Rate limit: maximum requests per minute' },
  { key: 'security.cors_origins', category: 'security', configPath: 'security.cors_origins', defaultValue: '["http://localhost:3100","http://127.0.0.1:3100"]', isCredential: false, label: 'CORS Origins', description: 'Allowed CORS origins (JSON array of URLs)' },
  { key: 'security.policy_defaults_delay_seconds', category: 'security', configPath: 'security.policy_defaults_delay_seconds', defaultValue: '300', isCredential: false, label: 'Policy Defaults Delay Seconds', description: 'Default delay duration for DELAY tier transactions' },
  { key: 'security.policy_defaults_approval_timeout', category: 'security', configPath: 'security.policy_defaults_approval_timeout', defaultValue: '3600', isCredential: false, label: 'Policy Defaults Approval Timeout', description: 'Timeout duration in seconds' },
  // DB-only: no config.toml counterpart. Turning this off restores pre-v63 ownerAuth,
  // where a captured signature could authorise any later approval on the same wallet.
  { key: 'security.owner_message_binding', category: 'security', configPath: 'security.owner_message_binding', defaultValue: 'true', isCredential: false, label: 'Owner Message Binding', description: 'Require the signed owner message to reference the transaction or wallet id being authorised' },

  // --- policy default deny toggles (Phase 116) ---
  { key: 'policy.default_deny_tokens', category: 'policy', configPath: 'security.default_deny_tokens', defaultValue: 'true', isCredential: false, label: 'Default Deny Tokens', description: 'Deny all tokens not in ALLOWED_TOKENS policy' },
  { key: 'policy.default_deny_contracts', category: 'policy', configPath: 'security.default_deny_contracts', defaultValue: 'true', isCredential: false, label: 'Default Deny Contracts', description: 'Deny all contracts not in CONTRACT_WHITELIST policy' },
  { key: 'policy.default_deny_spenders', category: 'policy', configPath: 'security.default_deny_spenders', defaultValue: 'true', isCredential: false, label: 'Default Deny Spenders', description: 'Deny all spenders not in APPROVED_SPENDERS policy' },
  { key: 'policy.default_deny_x402_domains', category: 'policy', configPath: 'security.default_deny_x402_domains', defaultValue: 'true', isCredential: false, label: 'Default Deny X402 Domains', description: 'Deny all x402 domains not in X402_ALLOWED_DOMAINS policy' },
  { key: 'policy.default_deny_erc8128_domains', category: 'policy', configPath: 'security.default_deny_erc8128_domains', defaultValue: 'true', isCredential: false, label: 'Default Deny Erc8128 Domains', description: 'Deny all ERC-8128 domains not in allowed list' },
  // --- Phase 389: venue whitelist toggle ---
  { key: 'venue_whitelist_enabled', category: 'policy', configPath: 'security.venue_whitelist_enabled', defaultValue: 'false', isCredential: false, label: 'Venue Whitelist Enabled', description: 'Enable or disable this feature' },

  // --- daemon category ---
  { key: 'daemon.log_level', category: 'daemon', configPath: 'daemon.log_level', defaultValue: 'info', isCredential: false, label: 'Log Level', description: 'Daemon log verbosity level (debug, info, warn, error)' },

  // --- walletconnect category ---
  { key: 'walletconnect.project_id', category: 'walletconnect', configPath: 'walletconnect.project_id', defaultValue: '', isCredential: false, label: 'Project Id', description: 'WalletConnect Cloud project ID' },
  { key: 'walletconnect.relay_url', category: 'walletconnect', configPath: 'walletconnect.relay_url', defaultValue: 'wss://relay.walletconnect.com', isCredential: false, label: 'Relay URL', description: 'WalletConnect relay server WebSocket URL' },

  // --- oracle category ---
  // DB-only: no config.toml [oracle] section. Managed exclusively via Admin Settings.
  { key: 'oracle.coingecko_api_key', category: 'oracle', configPath: 'oracle.coingecko_api_key', defaultValue: '', isCredential: true, label: 'Coingecko API Key', description: 'API key for external service authentication' },
  { key: 'oracle.cross_validation_threshold', category: 'oracle', configPath: 'oracle.cross_validation_threshold', defaultValue: '5', isCredential: false, label: 'Cross Validation Threshold', description: 'Threshold value for triggering action' },

  // --- display category ---
  { key: 'display.currency', category: 'display', configPath: 'display.currency', defaultValue: 'USD', isCredential: false, label: 'Currency', description: 'Display currency for USD value conversions' },

  // --- autostop category (AUTO-05 runtime-overridable) ---
  { key: 'autostop.consecutive_failures_threshold', category: 'autostop', configPath: 'security.autostop_consecutive_failures_threshold', defaultValue: '5', isCredential: false, label: 'Consecutive Failures Threshold', description: 'Threshold value for triggering action' },
  { key: 'autostop.unusual_activity_threshold', category: 'autostop', configPath: 'security.autostop_unusual_activity_threshold', defaultValue: '20', isCredential: false, label: 'Unusual Activity Threshold', description: 'Threshold value for triggering action' },
  { key: 'autostop.unusual_activity_window_sec', category: 'autostop', configPath: 'security.autostop_unusual_activity_window_sec', defaultValue: '300', isCredential: false, label: 'Unusual Activity Window Sec', description: 'Time window for unusual activity detection' },
  { key: 'autostop.idle_timeout_sec', category: 'autostop', configPath: 'security.autostop_idle_timeout_sec', defaultValue: '3600', isCredential: false, label: 'Idle Timeout Sec', description: 'Timeout duration in seconds' },
  { key: 'autostop.idle_check_interval_sec', category: 'autostop', configPath: 'security.autostop_idle_check_interval_sec', defaultValue: '60', isCredential: false, label: 'Idle Check Interval Sec', description: 'Polling or check interval duration' },
  { key: 'autostop.enabled', category: 'autostop', configPath: 'security.autostop_enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },

  // --- autostop per-rule enable (PLUG-04) ---
  { key: 'autostop.rule.consecutive_failures.enabled', category: 'autostop', configPath: 'security.autostop_rule_consecutive_failures_enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'autostop.rule.unusual_activity.enabled', category: 'autostop', configPath: 'security.autostop_rule_unusual_activity_enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'autostop.rule.idle_timeout.enabled', category: 'autostop', configPath: 'security.autostop_rule_idle_timeout_enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },

  // --- monitoring category (BMON-05 runtime-overridable) ---
  { key: 'monitoring.check_interval_sec', category: 'monitoring', configPath: 'security.monitoring_check_interval_sec', defaultValue: '300', isCredential: false, label: 'Check Interval Sec', description: 'Polling or check interval duration' },
  { key: 'monitoring.low_balance_threshold_sol', category: 'monitoring', configPath: 'security.monitoring_low_balance_threshold_sol', defaultValue: '0.01', isCredential: false, label: 'Low Balance Threshold SOL', description: 'Low balance alert threshold for SOL wallets' },
  { key: 'monitoring.low_balance_threshold_eth', category: 'monitoring', configPath: 'security.monitoring_low_balance_threshold_eth', defaultValue: '0.005', isCredential: false, label: 'Low Balance Threshold ETH', description: 'Low balance alert threshold for ETH wallets' },
  { key: 'monitoring.cooldown_hours', category: 'monitoring', configPath: 'security.monitoring_cooldown_hours', defaultValue: '24', isCredential: false, label: 'Cooldown Hours', description: 'Cooldown between repeated balance alerts' },
  { key: 'monitoring.enabled', category: 'monitoring', configPath: 'security.monitoring_enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },

  // --- telegram category (Bot service settings) ---
  { key: 'telegram.bot_token', category: 'telegram', configPath: 'telegram.bot_token', defaultValue: '', isCredential: true, label: 'Bot Token', description: 'Telegram bot token for interactive bot service' },
  { key: 'telegram.locale', category: 'telegram', configPath: 'telegram.locale', defaultValue: 'en', isCredential: false, label: 'Locale', description: 'Telegram bot message language' },

  // --- signing_sdk category (CONF-01: 6 operational keys, CONF-02: 1 wallets JSON key) ---
  // DB-only: no config.toml [signing_sdk] section. Managed exclusively via Admin Settings.
  { key: 'signing_sdk.enabled', category: 'signing_sdk', configPath: 'signing_sdk.enabled', defaultValue: 'false', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'signing_sdk.request_expiry_min', category: 'signing_sdk', configPath: 'signing_sdk.request_expiry_min', defaultValue: '30', isCredential: false, label: 'Request Expiry Min', description: 'Signing request expiry time in minutes' },
  { key: 'signing_sdk.preferred_channel', category: 'signing_sdk', configPath: 'signing_sdk.preferred_channel', defaultValue: 'push_relay', isCredential: false, label: 'Preferred Channel', description: 'Preferred signing notification channel (push_relay, telegram)' },
  { key: 'signing_sdk.preferred_wallet', category: 'signing_sdk', configPath: 'signing_sdk.preferred_wallet', defaultValue: '', isCredential: false, label: 'Preferred Wallet', description: '[DEPRECATED] No longer used by SignRequestBuilder. Use signing_enabled column in wallet_apps.' },
  { key: 'signing_sdk.wallets', category: 'signing_sdk', configPath: 'signing_sdk.wallets', defaultValue: '[]', isCredential: false, label: 'Wallets', description: 'JSON array of configured wallet app connections' },
  { key: 'signing_sdk.notifications_enabled', category: 'signing_sdk', configPath: 'signing_sdk.notifications_enabled', defaultValue: 'true', isCredential: false, label: 'Notifications Enabled', description: 'Enable or disable this feature' },

  // --- incoming category (Incoming TX monitor settings) ---
  { key: 'incoming.enabled', category: 'incoming', configPath: 'incoming.enabled', defaultValue: 'false', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'incoming.poll_interval', category: 'incoming', configPath: 'incoming.poll_interval', defaultValue: '30', isCredential: false, label: 'Poll Interval', description: 'Incoming transaction poll interval in seconds' },
  { key: 'incoming.retention_days', category: 'incoming', configPath: 'incoming.retention_days', defaultValue: '90', isCredential: false, label: 'Retention Days', description: 'Incoming transaction data retention period in days' },
  { key: 'incoming.suspicious_dust_usd', category: 'incoming', configPath: 'incoming.suspicious_dust_usd', defaultValue: '0.01', isCredential: false, label: 'Suspicious Dust USD', description: 'USD threshold for dust transaction detection' },
  { key: 'incoming.suspicious_amount_multiplier', category: 'incoming', configPath: 'incoming.suspicious_amount_multiplier', defaultValue: '10', isCredential: false, label: 'Suspicious Amount Multiplier', description: 'Multiplier for unusual amount detection' },
  { key: 'incoming.cooldown_minutes', category: 'incoming', configPath: 'incoming.cooldown_minutes', defaultValue: '5', isCredential: false, label: 'Cooldown Minutes', description: 'Cooldown between duplicate incoming TX alerts' },
  { key: 'incoming.solana_mode', category: 'incoming', configPath: 'incoming.solana_mode', defaultValue: 'adaptive', isCredential: false, label: 'Solana Monitor Mode', description: 'Solana incoming TX monitor mode: websocket | polling | adaptive (auto-fallback on 429)' },
  { key: 'incoming.wss_url', category: 'incoming', configPath: 'incoming.wss_url', defaultValue: '', isCredential: false, label: 'WSS URL', description: 'Global WebSocket URL for incoming TX monitoring' },
  // Per-network WSS URL overrides (#193): takes priority over global incoming.wss_url
  { key: 'incoming.wss_url.solana-mainnet', category: 'incoming', configPath: 'incoming.wss_url.solana-mainnet', defaultValue: '', isCredential: false, label: 'Solana-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.solana-devnet', category: 'incoming', configPath: 'incoming.wss_url.solana-devnet', defaultValue: '', isCredential: false, label: 'Solana-Devnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.solana-testnet', category: 'incoming', configPath: 'incoming.wss_url.solana-testnet', defaultValue: '', isCredential: false, label: 'Solana-Testnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.ethereum-mainnet', category: 'incoming', configPath: 'incoming.wss_url.ethereum-mainnet', defaultValue: '', isCredential: false, label: 'Ethereum-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.ethereum-sepolia', category: 'incoming', configPath: 'incoming.wss_url.ethereum-sepolia', defaultValue: '', isCredential: false, label: 'Ethereum-Sepolia', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.arbitrum-mainnet', category: 'incoming', configPath: 'incoming.wss_url.arbitrum-mainnet', defaultValue: '', isCredential: false, label: 'Arbitrum-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.arbitrum-sepolia', category: 'incoming', configPath: 'incoming.wss_url.arbitrum-sepolia', defaultValue: '', isCredential: false, label: 'Arbitrum-Sepolia', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.optimism-mainnet', category: 'incoming', configPath: 'incoming.wss_url.optimism-mainnet', defaultValue: '', isCredential: false, label: 'Optimism-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.optimism-sepolia', category: 'incoming', configPath: 'incoming.wss_url.optimism-sepolia', defaultValue: '', isCredential: false, label: 'Optimism-Sepolia', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.base-mainnet', category: 'incoming', configPath: 'incoming.wss_url.base-mainnet', defaultValue: '', isCredential: false, label: 'Base-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.base-sepolia', category: 'incoming', configPath: 'incoming.wss_url.base-sepolia', defaultValue: '', isCredential: false, label: 'Base-Sepolia', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.polygon-mainnet', category: 'incoming', configPath: 'incoming.wss_url.polygon-mainnet', defaultValue: '', isCredential: false, label: 'Polygon-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.polygon-amoy', category: 'incoming', configPath: 'incoming.wss_url.polygon-amoy', defaultValue: '', isCredential: false, label: 'Polygon-Amoy', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.hyperevm-mainnet', category: 'incoming', configPath: 'incoming.wss_url.hyperevm-mainnet', defaultValue: '', isCredential: false, label: 'Hyperevm-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.hyperevm-testnet', category: 'incoming', configPath: 'incoming.wss_url.hyperevm-testnet', defaultValue: '', isCredential: false, label: 'Hyperevm-Testnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.xrpl-mainnet', category: 'incoming', configPath: 'incoming.wss_url.xrpl-mainnet', defaultValue: '', isCredential: false, label: 'Xrpl-Mainnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.xrpl-testnet', category: 'incoming', configPath: 'incoming.wss_url.xrpl-testnet', defaultValue: '', isCredential: false, label: 'Xrpl-Testnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },
  { key: 'incoming.wss_url.xrpl-devnet', category: 'incoming', configPath: 'incoming.wss_url.xrpl-devnet', defaultValue: '', isCredential: false, label: 'Xrpl-Devnet', description: 'WebSocket URL override for incoming TX monitoring on this network' },

  // --- actions category (DeFi action providers) ---
  { key: 'actions.jupiter_swap_enabled', category: 'actions', configPath: 'actions.jupiter_swap_enabled', defaultValue: 'true', isCredential: false, label: 'Jupiter Swap Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.jupiter_swap_api_base_url', category: 'actions', configPath: 'actions.jupiter_swap_api_base_url', defaultValue: 'https://api.jup.ag/swap/v1', isCredential: false, label: 'Jupiter Swap API Base URL', description: 'Base URL for external API requests' },
  { key: 'actions.jupiter_swap_api_key', category: 'actions', configPath: 'actions.jupiter_swap_api_key', defaultValue: '', isCredential: true, label: 'Jupiter Swap API Key', description: 'API key for external service authentication' },
  { key: 'actions.jupiter_swap_default_slippage_bps', category: 'actions', configPath: 'actions.jupiter_swap_default_slippage_bps', defaultValue: '50', isCredential: false, label: 'Jupiter Swap Default Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.jupiter_swap_max_slippage_bps', category: 'actions', configPath: 'actions.jupiter_swap_max_slippage_bps', defaultValue: '500', isCredential: false, label: 'Jupiter Swap Max Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.jupiter_swap_max_price_impact_pct', category: 'actions', configPath: 'actions.jupiter_swap_max_price_impact_pct', defaultValue: '1', isCredential: false, label: 'Jupiter Swap Max Price Impact %', description: 'Jupiter Swap DEX aggregator setting' },
  { key: 'actions.jupiter_swap_jito_tip_lamports', category: 'actions', configPath: 'actions.jupiter_swap_jito_tip_lamports', defaultValue: '1000', isCredential: false, label: 'Jupiter Swap Jito Tip Lamports', description: 'Jupiter Swap DEX aggregator setting' },
  { key: 'actions.jupiter_swap_request_timeout_ms', category: 'actions', configPath: 'actions.jupiter_swap_request_timeout_ms', defaultValue: '10000', isCredential: false, label: 'Jupiter Swap Request Timeout ms', description: 'Request timeout in milliseconds' },
  { key: 'actions.zerox_swap_enabled', category: 'actions', configPath: 'actions.zerox_swap_enabled', defaultValue: 'true', isCredential: false, label: 'Zerox Swap Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.zerox_swap_api_key', category: 'actions', configPath: 'actions.zerox_swap_api_key', defaultValue: '', isCredential: true, label: 'Zerox Swap API Key', description: 'API key for external service authentication' },
  { key: 'actions.zerox_swap_default_slippage_bps', category: 'actions', configPath: 'actions.zerox_swap_default_slippage_bps', defaultValue: '100', isCredential: false, label: 'Zerox Swap Default Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.zerox_swap_max_slippage_bps', category: 'actions', configPath: 'actions.zerox_swap_max_slippage_bps', defaultValue: '500', isCredential: false, label: 'Zerox Swap Max Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.zerox_swap_request_timeout_ms', category: 'actions', configPath: 'actions.zerox_swap_request_timeout_ms', defaultValue: '10000', isCredential: false, label: 'Zerox Swap Request Timeout ms', description: 'Request timeout in milliseconds' },
  { key: 'actions.lifi_enabled', category: 'actions', configPath: 'actions.lifi_enabled', defaultValue: 'true', isCredential: false, label: 'Lifi Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.lifi_api_key', category: 'actions', configPath: 'actions.lifi_api_key', defaultValue: '', isCredential: true, label: 'Lifi API Key', description: 'API key for external service authentication' },
  { key: 'actions.lifi_api_base_url', category: 'actions', configPath: 'actions.lifi_api_base_url', defaultValue: 'https://li.quest/v1', isCredential: false, label: 'Lifi API Base URL', description: 'Base URL for external API requests' },
  { key: 'actions.lifi_default_slippage_pct', category: 'actions', configPath: 'actions.lifi_default_slippage_pct', defaultValue: '0.03', isCredential: false, label: 'Lifi Default Slippage %', description: 'Slippage tolerance as decimal percentage' },
  { key: 'actions.lifi_max_slippage_pct', category: 'actions', configPath: 'actions.lifi_max_slippage_pct', defaultValue: '0.05', isCredential: false, label: 'Lifi Max Slippage %', description: 'Slippage tolerance as decimal percentage' },

  // --- Lido Staking ---
  { key: 'actions.lido_staking_enabled', category: 'actions', configPath: 'actions.lido_staking_enabled', defaultValue: 'true', isCredential: false, label: 'Lido Staking Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.lido_staking_steth_address', category: 'actions', configPath: 'actions.lido_staking_steth_address', defaultValue: '', isCredential: false, label: 'Lido Staking Steth Address', description: 'On-chain contract or account address' },
  { key: 'actions.lido_staking_withdrawal_queue_address', category: 'actions', configPath: 'actions.lido_staking_withdrawal_queue_address', defaultValue: '', isCredential: false, label: 'Lido Staking Withdrawal Queue Address', description: 'On-chain contract or account address' },

  // --- Jito Staking ---
  { key: 'actions.jito_staking_enabled', category: 'actions', configPath: 'actions.jito_staking_enabled', defaultValue: 'true', isCredential: false, label: 'Jito Staking Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.jito_staking_stake_pool_address', category: 'actions', configPath: 'actions.jito_staking_stake_pool_address', defaultValue: '', isCredential: false, label: 'Jito Staking Stake Pool Address', description: 'On-chain contract or account address' },
  { key: 'actions.jito_staking_jitosol_mint', category: 'actions', configPath: 'actions.jito_staking_jitosol_mint', defaultValue: '', isCredential: false, label: 'Jito Staking Jitosol Mint', description: 'Jito SOL staking setting' },

  // --- Aave V3 Lending ---
  { key: 'actions.aave_v3_enabled', category: 'actions', configPath: 'actions.aave_v3_enabled', defaultValue: 'true', isCredential: false, label: 'Aave V3 Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.aave_v3_health_factor_warning_threshold', category: 'actions', configPath: 'actions.aave_v3_health_factor_warning_threshold', defaultValue: '1.2', isCredential: false, label: 'Aave V3 Health Factor Warning Threshold', description: 'Threshold value for triggering action' },
  { key: 'actions.aave_v3_position_sync_interval_sec', category: 'actions', configPath: 'actions.aave_v3_position_sync_interval_sec', defaultValue: '300', isCredential: false, label: 'Aave V3 Position Sync Interval Sec', description: 'Polling or check interval duration' },
  { key: 'actions.aave_v3_max_ltv_pct', category: 'actions', configPath: 'actions.aave_v3_max_ltv_pct', defaultValue: '0.8', isCredential: false, label: 'Aave V3 Max LTV %', description: 'Aave V3 lending protocol setting' },

  // --- Kamino Lending ---
  { key: 'actions.kamino_enabled', category: 'actions', configPath: 'actions.kamino_enabled', defaultValue: 'true', isCredential: false, label: 'Kamino Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.kamino_market', category: 'actions', configPath: 'actions.kamino_market', defaultValue: 'main', isCredential: false, label: 'Kamino Market', description: 'Kamino Solana lending setting' },
  { key: 'actions.kamino_hf_threshold', category: 'actions', configPath: 'actions.kamino_hf_threshold', defaultValue: '1.2', isCredential: false, label: 'Kamino HF Threshold', description: 'Threshold value for triggering action' },

  // --- Pendle Yield ---
  { key: 'actions.pendle_yield_enabled', category: 'actions', configPath: 'actions.pendle_yield_enabled', defaultValue: 'true', isCredential: false, label: 'Pendle Yield Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.pendle_yield_api_base_url', category: 'actions', configPath: 'actions.pendle_yield_api_base_url', defaultValue: 'https://api-v2.pendle.finance/core', isCredential: false, label: 'Pendle Yield API Base URL', description: 'Base URL for external API requests' },
  { key: 'actions.pendle_yield_api_key', category: 'actions', configPath: 'actions.pendle_yield_api_key', defaultValue: '', isCredential: true, label: 'Pendle Yield API Key', description: 'API key for external service authentication' },
  { key: 'actions.pendle_yield_default_slippage_bps', category: 'actions', configPath: 'actions.pendle_yield_default_slippage_bps', defaultValue: '100', isCredential: false, label: 'Pendle Yield Default Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.pendle_yield_max_slippage_bps', category: 'actions', configPath: 'actions.pendle_yield_max_slippage_bps', defaultValue: '500', isCredential: false, label: 'Pendle Yield Max Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.pendle_yield_request_timeout_ms', category: 'actions', configPath: 'actions.pendle_yield_request_timeout_ms', defaultValue: '10000', isCredential: false, label: 'Pendle Yield Request Timeout ms', description: 'Request timeout in milliseconds' },
  { key: 'actions.pendle_yield_maturity_warning_days', category: 'actions', configPath: 'actions.pendle_yield_maturity_warning_days', defaultValue: '7', isCredential: false, label: 'Pendle Yield Maturity Warning Days', description: 'Pendle yield trading setting' },

  // --- Drift Perp ---
  { key: 'actions.drift_enabled', category: 'actions', configPath: 'actions.drift_enabled', defaultValue: 'true', isCredential: false, label: 'Drift Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.drift_max_leverage', category: 'actions', configPath: 'actions.drift_max_leverage', defaultValue: '5', isCredential: false, label: 'Drift Max Leverage', description: 'Maximum allowed leverage multiplier' },
  { key: 'actions.drift_max_position_usd', category: 'actions', configPath: 'actions.drift_max_position_usd', defaultValue: '10000', isCredential: false, label: 'Drift Max Position USD', description: 'Maximum amount in USD' },
  { key: 'actions.drift_margin_warning_threshold_pct', category: 'actions', configPath: 'actions.drift_margin_warning_threshold_pct', defaultValue: '0.15', isCredential: false, label: 'Drift Margin Warning Threshold %', description: 'Threshold percentage for triggering action' },
  { key: 'actions.drift_position_sync_interval_sec', category: 'actions', configPath: 'actions.drift_position_sync_interval_sec', defaultValue: '60', isCredential: false, label: 'Drift Position Sync Interval Sec', description: 'Polling or check interval duration' },

  // --- gas_condition category (Gas conditional execution) ---
  // DB-only: no config.toml [gas_condition] section. Managed exclusively via Admin Settings.
  { key: 'gas_condition.enabled', category: 'gas_condition', configPath: 'gas_condition.enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'gas_condition.poll_interval_sec', category: 'gas_condition', configPath: 'gas_condition.poll_interval_sec', defaultValue: '30', isCredential: false, label: 'Poll Interval Sec', description: 'Polling or check interval duration' },
  { key: 'gas_condition.default_timeout_sec', category: 'gas_condition', configPath: 'gas_condition.default_timeout_sec', defaultValue: '3600', isCredential: false, label: 'Default Timeout Sec', description: 'Timeout duration in seconds' },
  { key: 'gas_condition.max_timeout_sec', category: 'gas_condition', configPath: 'gas_condition.max_timeout_sec', defaultValue: '86400', isCredential: false, label: 'Max Timeout Sec', description: 'Timeout duration in seconds' },
  { key: 'gas_condition.max_pending_count', category: 'gas_condition', configPath: 'gas_condition.max_pending_count', defaultValue: '100', isCredential: false, label: 'Max Pending Count', description: 'Maximum gas-conditional transactions in queue' },

  // --- rpc_pool category (per-network URL lists managed via Admin Settings API) ---
  // DB-only: no config.toml [rpc_pool] section. Managed exclusively via Admin Settings.
  { key: 'rpc_pool.solana-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.solana-mainnet', defaultValue: '[]', isCredential: false, label: 'Solana-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.solana-devnet', category: 'rpc_pool', configPath: 'rpc_pool.solana-devnet', defaultValue: '[]', isCredential: false, label: 'Solana-Devnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.solana-testnet', category: 'rpc_pool', configPath: 'rpc_pool.solana-testnet', defaultValue: '[]', isCredential: false, label: 'Solana-Testnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.ethereum-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.ethereum-mainnet', defaultValue: '[]', isCredential: false, label: 'Ethereum-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.ethereum-sepolia', category: 'rpc_pool', configPath: 'rpc_pool.ethereum-sepolia', defaultValue: '[]', isCredential: false, label: 'Ethereum-Sepolia', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.arbitrum-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.arbitrum-mainnet', defaultValue: '[]', isCredential: false, label: 'Arbitrum-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.arbitrum-sepolia', category: 'rpc_pool', configPath: 'rpc_pool.arbitrum-sepolia', defaultValue: '[]', isCredential: false, label: 'Arbitrum-Sepolia', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.optimism-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.optimism-mainnet', defaultValue: '[]', isCredential: false, label: 'Optimism-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.optimism-sepolia', category: 'rpc_pool', configPath: 'rpc_pool.optimism-sepolia', defaultValue: '[]', isCredential: false, label: 'Optimism-Sepolia', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.base-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.base-mainnet', defaultValue: '[]', isCredential: false, label: 'Base-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.base-sepolia', category: 'rpc_pool', configPath: 'rpc_pool.base-sepolia', defaultValue: '[]', isCredential: false, label: 'Base-Sepolia', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.polygon-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.polygon-mainnet', defaultValue: '[]', isCredential: false, label: 'Polygon-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.polygon-amoy', category: 'rpc_pool', configPath: 'rpc_pool.polygon-amoy', defaultValue: '[]', isCredential: false, label: 'Polygon-Amoy', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.hyperevm-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.hyperevm-mainnet', defaultValue: '[]', isCredential: false, label: 'Hyperevm-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.hyperevm-testnet', category: 'rpc_pool', configPath: 'rpc_pool.hyperevm-testnet', defaultValue: '[]', isCredential: false, label: 'Hyperevm-Testnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.xrpl-mainnet', category: 'rpc_pool', configPath: 'rpc_pool.xrpl-mainnet', defaultValue: '[]', isCredential: false, label: 'Xrpl-Mainnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.xrpl-testnet', category: 'rpc_pool', configPath: 'rpc_pool.xrpl-testnet', defaultValue: '[]', isCredential: false, label: 'Xrpl-Testnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },
  { key: 'rpc_pool.xrpl-devnet', category: 'rpc_pool', configPath: 'rpc_pool.xrpl-devnet', defaultValue: '[]', isCredential: false, label: 'Xrpl-Devnet', description: 'JSON array of RPC endpoint URLs for pool rotation' },

  // --- position_tracker category (DeFi position sync) ---
  // DB-only: no config.toml [position_tracker] section. Managed exclusively via Admin Settings.
  { key: 'position_tracker.enabled', category: 'position_tracker', configPath: 'position_tracker.enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },

  // --- smart_account category (ERC-4337 Account Abstraction) ---
  // v30.9: enabled default changed to 'true' (DFLT-01). bundler_url/paymaster_url/paymaster_api_key
  // and all per-chain overrides removed (23 keys) -- replaced by per-wallet provider model (PROV-09).
  { key: 'smart_account.enabled', category: 'smart_account', configPath: 'smart_account.enabled', defaultValue: 'true', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'smart_account.entry_point', category: 'smart_account', configPath: 'smart_account.entry_point', defaultValue: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', isCredential: false, label: 'Entry Point', description: 'ERC-4337 EntryPoint contract address' },
  { key: 'smart_account.pimlico.api_key', category: 'smart_account', configPath: 'smart_account.pimlico.api_key', defaultValue: '', isCredential: true, label: 'API Key', description: 'Pimlico bundler/paymaster API key' },
  { key: 'smart_account.pimlico.paymaster_policy_id', category: 'smart_account', configPath: 'smart_account.pimlico.paymaster_policy_id', defaultValue: '', isCredential: false, label: 'Paymaster Policy Id', description: 'Pimlico paymaster policy ID' },
  { key: 'smart_account.alchemy.api_key', category: 'smart_account', configPath: 'smart_account.alchemy.api_key', defaultValue: '', isCredential: true, label: 'API Key', description: 'Alchemy bundler/paymaster API key' },
  { key: 'smart_account.alchemy.paymaster_policy_id', category: 'smart_account', configPath: 'smart_account.alchemy.paymaster_policy_id', defaultValue: '', isCredential: false, label: 'Paymaster Policy Id', description: 'Alchemy paymaster policy ID' },

  // --- ERC-8004 Agent Identity ---
  { key: 'actions.erc8004_agent_enabled', category: 'actions', configPath: 'actions.erc8004_agent_enabled', defaultValue: 'true', isCredential: false, label: 'Erc8004 Agent Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.erc8004_identity_registry_address', category: 'actions', configPath: 'actions.erc8004_identity_registry_address', defaultValue: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432', isCredential: false, label: 'Erc8004 Identity Registry Address', description: 'On-chain contract or account address' },
  { key: 'actions.erc8004_reputation_registry_address', category: 'actions', configPath: 'actions.erc8004_reputation_registry_address', defaultValue: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63', isCredential: false, label: 'Erc8004 Reputation Registry Address', description: 'On-chain contract or account address' },
  { key: 'actions.erc8004_validation_registry_address', category: 'actions', configPath: 'actions.erc8004_validation_registry_address', defaultValue: '', isCredential: false, label: 'Erc8004 Validation Registry Address', description: 'On-chain contract or account address' },
  { key: 'actions.erc8004_registration_file_base_url', category: 'actions', configPath: 'actions.erc8004_registration_file_base_url', defaultValue: '', isCredential: false, label: 'Erc8004 Registration File Base URL', description: 'ERC-8004 agent identity setting' },
  { key: 'actions.erc8004_auto_publish_registration', category: 'actions', configPath: 'actions.erc8004_auto_publish_registration', defaultValue: 'true', isCredential: false, label: 'Erc8004 Auto Publish Registration', description: 'ERC-8004 agent identity setting' },
  { key: 'actions.erc8004_reputation_cache_ttl_sec', category: 'actions', configPath: 'actions.erc8004_reputation_cache_ttl_sec', defaultValue: '300', isCredential: false, label: 'Erc8004 Reputation Cache TTL Sec', description: 'Cache or data time-to-live duration' },
  { key: 'actions.erc8004_min_reputation_score', category: 'actions', configPath: 'actions.erc8004_min_reputation_score', defaultValue: '0', isCredential: false, label: 'Erc8004 Min Reputation Score', description: 'ERC-8004 agent identity setting' },
  { key: 'actions.erc8004_reputation_rpc_timeout_ms', category: 'actions', configPath: 'actions.erc8004_reputation_rpc_timeout_ms', defaultValue: '3000', isCredential: false, label: 'Erc8004 Reputation RPC Timeout ms', description: 'Request timeout in milliseconds' },

  // --- NFT Indexer ---
  { key: 'actions.alchemy_nft_api_key', category: 'actions', configPath: 'actions.alchemy_nft_api_key', defaultValue: '', isCredential: true, label: 'Alchemy Nft API Key', description: 'API key for external service authentication' },
  { key: 'actions.helius_das_api_key', category: 'actions', configPath: 'actions.helius_das_api_key', defaultValue: '', isCredential: true, label: 'Helius Das API Key', description: 'API key for external service authentication' },
  { key: 'actions.nft_indexer_cache_ttl_sec', category: 'actions', configPath: 'actions.nft_indexer_cache_ttl_sec', defaultValue: '300', isCredential: false, label: 'Nft Indexer Cache TTL Sec', description: 'Cache or data time-to-live duration' },

  // --- D'CENT Swap Aggregator ---
  { key: 'actions.dcent_swap_enabled', category: 'actions', configPath: 'actions.dcent_swap_enabled', defaultValue: 'true', isCredential: false, label: 'Dcent Swap Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.dcent_swap_api_url', category: 'actions', configPath: 'actions.dcent_swap_api_url', defaultValue: 'https://agent-swap.dcentwallet.com', isCredential: false, label: 'Dcent Swap API URL', description: 'Base URL for external API requests' },
  { key: 'actions.dcent_swap_default_slippage_bps', category: 'actions', configPath: 'actions.dcent_swap_default_slippage_bps', defaultValue: '100', isCredential: false, label: 'Dcent Swap Default Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.dcent_swap_max_slippage_bps', category: 'actions', configPath: 'actions.dcent_swap_max_slippage_bps', defaultValue: '500', isCredential: false, label: 'Dcent Swap Max Slippage BPS', description: 'Slippage tolerance in basis points (1 bps = 0.01%)' },
  { key: 'actions.dcent_swap_currency_cache_ttl_ms', category: 'actions', configPath: 'actions.dcent_swap_currency_cache_ttl_ms', defaultValue: '86400000', isCredential: false, label: 'Dcent Swap Currency Cache TTL ms', description: 'Cache or data time-to-live duration' },

  // --- Hyperliquid Perp Trading (Phase 349) ---
  { key: 'actions.hyperliquid_enabled', category: 'actions', configPath: 'actions.hyperliquid_enabled', defaultValue: 'true', isCredential: false, label: 'Hyperliquid Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.hyperliquid_network', category: 'actions', configPath: 'actions.hyperliquid_network', defaultValue: 'mainnet', isCredential: false, label: 'Hyperliquid Network', description: 'Hyperliquid trading platform setting' },
  { key: 'actions.hyperliquid_api_url', category: 'actions', configPath: 'actions.hyperliquid_api_url', defaultValue: '', isCredential: false, label: 'Hyperliquid API URL', description: 'Base URL for external API requests' },
  { key: 'actions.hyperliquid_rate_limit_weight_per_min', category: 'actions', configPath: 'actions.hyperliquid_rate_limit_weight_per_min', defaultValue: '600', isCredential: false, label: 'Hyperliquid Rate Limit Weight Per Min', description: 'Hyperliquid trading platform setting' },
  { key: 'actions.hyperliquid_default_leverage', category: 'actions', configPath: 'actions.hyperliquid_default_leverage', defaultValue: '1', isCredential: false, label: 'Hyperliquid Default Leverage', description: 'Hyperliquid trading platform setting' },
  { key: 'actions.hyperliquid_default_margin_mode', category: 'actions', configPath: 'actions.hyperliquid_default_margin_mode', defaultValue: 'CROSS', isCredential: false, label: 'Hyperliquid Default Margin Mode', description: 'Hyperliquid trading platform setting' },
  { key: 'actions.hyperliquid_builder_address', category: 'actions', configPath: 'actions.hyperliquid_builder_address', defaultValue: '', isCredential: false, label: 'Hyperliquid Builder Address', description: 'On-chain contract or account address' },
  { key: 'actions.hyperliquid_builder_fee', category: 'actions', configPath: 'actions.hyperliquid_builder_fee', defaultValue: '0', isCredential: false, label: 'Hyperliquid Builder Fee', description: 'Hyperliquid trading platform setting' },
  { key: 'actions.hyperliquid_order_status_poll_interval_ms', category: 'actions', configPath: 'actions.hyperliquid_order_status_poll_interval_ms', defaultValue: '2000', isCredential: false, label: 'Hyperliquid Order Status Poll Interval ms', description: 'Polling or check interval duration' },
  { key: 'actions.hyperliquid_request_timeout_ms', category: 'actions', configPath: 'actions.hyperliquid_request_timeout_ms', defaultValue: '10000', isCredential: false, label: 'Hyperliquid Request Timeout ms', description: 'Request timeout in milliseconds' },

  // --- Polymarket Prediction Market ---
  { key: 'actions.polymarket_enabled', category: 'actions', configPath: 'actions.polymarket_enabled', defaultValue: 'true', isCredential: false, label: 'Polymarket Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.polymarket_default_fee_bps', category: 'actions', configPath: 'actions.polymarket_default_fee_bps', defaultValue: '0', isCredential: false, label: 'Polymarket Default Fee BPS', description: 'Polymarket prediction market setting' },
  { key: 'actions.polymarket_order_expiry_seconds', category: 'actions', configPath: 'actions.polymarket_order_expiry_seconds', defaultValue: '86400', isCredential: false, label: 'Polymarket Order Expiry Seconds', description: 'Polymarket prediction market setting' },
  { key: 'actions.polymarket_max_position_usdc', category: 'actions', configPath: 'actions.polymarket_max_position_usdc', defaultValue: '1000', isCredential: false, label: 'Polymarket Max Position Usdc', description: 'Maximum amount in USD' },
  { key: 'actions.polymarket_proxy_wallet', category: 'actions', configPath: 'actions.polymarket_proxy_wallet', defaultValue: 'false', isCredential: false, label: 'Polymarket Proxy Wallet', description: 'Polymarket prediction market setting' },
  { key: 'actions.polymarket_neg_risk_enabled', category: 'actions', configPath: 'actions.polymarket_neg_risk_enabled', defaultValue: 'true', isCredential: false, label: 'Polymarket Neg Risk Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.polymarket_auto_approve_ctf', category: 'actions', configPath: 'actions.polymarket_auto_approve_ctf', defaultValue: 'true', isCredential: false, label: 'Polymarket Auto Approve Ctf', description: 'Polymarket prediction market setting' },

  // --- Across Bridge ---
  { key: 'actions.across_bridge_enabled', category: 'actions', configPath: 'actions.across_bridge_enabled', defaultValue: 'true', isCredential: false, label: 'Across Bridge Enabled', description: 'Enable or disable this feature' },
  { key: 'actions.across_bridge_api_base_url', category: 'actions', configPath: 'actions.across_bridge_api_base_url', defaultValue: 'https://app.across.to/api', isCredential: false, label: 'Across Bridge API Base URL', description: 'Base URL for external API requests' },
  { key: 'actions.across_bridge_integrator_id', category: 'actions', configPath: 'actions.across_bridge_integrator_id', defaultValue: '', isCredential: false, label: 'Across Bridge Integrator Id', description: 'Across Protocol cross-chain bridge setting' },
  { key: 'actions.across_bridge_fill_deadline_buffer_sec', category: 'actions', configPath: 'actions.across_bridge_fill_deadline_buffer_sec', defaultValue: '21600', isCredential: false, label: 'Across Bridge Fill Deadline Buffer Sec', description: 'Across Protocol cross-chain bridge setting' },
  { key: 'actions.across_bridge_default_slippage_pct', category: 'actions', configPath: 'actions.across_bridge_default_slippage_pct', defaultValue: '0.01', isCredential: false, label: 'Across Bridge Default Slippage %', description: 'Slippage tolerance as decimal percentage' },
  { key: 'actions.across_bridge_max_slippage_pct', category: 'actions', configPath: 'actions.across_bridge_max_slippage_pct', defaultValue: '0.03', isCredential: false, label: 'Across Bridge Max Slippage %', description: 'Slippage tolerance as decimal percentage' },
  { key: 'actions.across_bridge_request_timeout_ms', category: 'actions', configPath: 'actions.across_bridge_request_timeout_ms', defaultValue: '10000', isCredential: false, label: 'Across Bridge Request Timeout ms', description: 'Request timeout in milliseconds' },

  // --- XRPL DEX ---
  { key: 'actions.xrpl_dex_enabled', category: 'actions', configPath: 'actions.xrpl_dex_enabled', defaultValue: 'true', isCredential: false, label: 'XRPL DEX Enabled', description: 'Enable XRPL native orderbook DEX action provider' },
  { key: 'actions.xrpl_dex_rpc_url', category: 'actions', configPath: 'actions.xrpl_dex_rpc_url', defaultValue: 'wss://xrplcluster.com', isCredential: false, label: 'XRPL DEX RPC URL', description: 'XRPL WebSocket RPC URL for DEX orderbook queries' },

  // --- erc8128 category (ERC-8128 Signed HTTP Requests) ---
  { key: 'erc8128.enabled', category: 'erc8128', configPath: 'erc8128.enabled', defaultValue: 'false', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'erc8128.default_preset', category: 'erc8128', configPath: 'erc8128.default_preset', defaultValue: 'standard', isCredential: false, label: 'Default Preset', description: 'Default signing preset for ERC-8128 requests' },
  { key: 'erc8128.default_ttl_sec', category: 'erc8128', configPath: 'erc8128.default_ttl_sec', defaultValue: '300', isCredential: false, label: 'Default TTL Sec', description: 'Cache or data time-to-live duration' },
  { key: 'erc8128.default_nonce', category: 'erc8128', configPath: 'erc8128.default_nonce', defaultValue: 'true', isCredential: false, label: 'Default Nonce', description: 'Include nonce in ERC-8128 signatures by default' },
  { key: 'erc8128.default_algorithm', category: 'erc8128', configPath: 'erc8128.default_algorithm', defaultValue: 'ethereum-eip191', isCredential: false, label: 'Default Algorithm', description: 'Default signing algorithm for ERC-8128' },
  { key: 'erc8128.default_rate_limit_rpm', category: 'erc8128', configPath: 'erc8128.default_rate_limit_rpm', defaultValue: '60', isCredential: false, label: 'Default Rate Limit RPM', description: 'Rate limit: maximum requests per minute' },
  // --- rpc_proxy category (EVM RPC proxy mode settings) ---
  { key: 'rpc_proxy.enabled', category: 'rpc_proxy', configPath: 'rpc_proxy.enabled', defaultValue: 'false', isCredential: false, label: 'Enabled', description: 'Enable or disable this feature' },
  { key: 'rpc_proxy.allowed_methods', category: 'rpc_proxy', configPath: 'rpc_proxy.allowed_methods', defaultValue: '[]', isCredential: false, label: 'Allowed Methods', description: 'JSON array of allowed RPC methods for proxy' },
  { key: 'rpc_proxy.delay_timeout_seconds', category: 'rpc_proxy', configPath: 'rpc_proxy.delay_timeout_seconds', defaultValue: '300', isCredential: false, label: 'Delay Timeout Seconds', description: 'Delay timeout for proxied signing transactions' },
  { key: 'rpc_proxy.approval_timeout_seconds', category: 'rpc_proxy', configPath: 'rpc_proxy.approval_timeout_seconds', defaultValue: '600', isCredential: false, label: 'Approval Timeout Seconds', description: 'Approval timeout for proxied signing transactions' },
  { key: 'rpc_proxy.max_gas_limit', category: 'rpc_proxy', configPath: 'rpc_proxy.max_gas_limit', defaultValue: '30000000', isCredential: false, label: 'Max Gas Limit', description: 'Maximum gas limit for proxied transactions' },
  { key: 'rpc_proxy.max_bytecode_size', category: 'rpc_proxy', configPath: 'rpc_proxy.max_bytecode_size', defaultValue: '49152', isCredential: false, label: 'Max Bytecode Size', description: 'Maximum bytecode size for contract deployment via proxy' },
  { key: 'rpc_proxy.deploy_default_tier', category: 'rpc_proxy', configPath: 'rpc_proxy.deploy_default_tier', defaultValue: 'APPROVAL', isCredential: false, label: 'Deploy Default Tier', description: 'Default security tier for contract deployments via proxy' },
] as const;

// ---------------------------------------------------------------------------
// [Phase 331] Action tier override Zod schema
// ---------------------------------------------------------------------------

/** Valid values for action tier override: INSTANT/NOTIFY/DELAY/APPROVAL or '' (use provider default). */
export const ActionTierOverrideSchema = z.enum(['INSTANT', 'NOTIFY', 'DELAY', 'APPROVAL', '']);

// ---------------------------------------------------------------------------
// [Phase 331] Dynamic tier key pattern
// ---------------------------------------------------------------------------

/**
 * Regex matching dynamic tier override keys: `actions.{providerKey}_{actionName}_tier`
 * e.g. `actions.jupiter_swap_swap_tier`, `actions.erc8004_agent_register_agent_tier`
 */
const TIER_KEY_PATTERN = /^actions\.[a-z][a-z0-9_]*_tier$/;

/**
 * Generate a dynamic SettingDefinition for an action tier override key.
 * Returns undefined if the key doesn't match the tier key pattern.
 */
function getDynamicTierDefinition(key: string): SettingDefinition | undefined {
  if (!TIER_KEY_PATTERN.test(key)) return undefined;
  return {
    key,
    category: 'actions',
    configPath: key,
    defaultValue: '',
    isCredential: false,
    label: deriveLabel(key),
    description: 'Action tier override (INSTANT, NOTIFY, DELAY, APPROVAL, or empty for provider default)',
  };
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map from key -> SettingDefinition for O(1) lookup */
const definitionMap = new Map<string, SettingDefinition>(
  SETTING_DEFINITIONS.map((def) => [def.key, def]),
);

/** Get a setting definition by key, or undefined if not found.
 * Checks static definitions first, then falls back to dynamic tier key pattern. */
export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return definitionMap.get(key) ?? getDynamicTierDefinition(key);
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  notifications: 'Notifications',
  rpc: 'RPC Endpoints',
  security: 'Security',
  policy: 'Policy Defaults',
  daemon: 'Daemon',
  walletconnect: 'WalletConnect',
  oracle: 'Price Oracle',
  display: 'Display',
  autostop: 'Auto-Stop',
  monitoring: 'Balance Monitoring',
  telegram: 'Telegram Bot',
  signing_sdk: 'Signing SDK',
  incoming: 'Incoming TX Monitor',
  actions: 'Action Providers',
  gas_condition: 'Gas Conditional',
  rpc_pool: 'RPC Pool',
  position_tracker: 'Position Tracker',
  smart_account: 'Smart Account',
  erc8128: 'ERC-8128',
  rpc_proxy: 'RPC Proxy',
};

// ---------------------------------------------------------------------------
// Grouping helper (for GET /admin/settings/schema?grouped=true)
// ---------------------------------------------------------------------------

export interface SettingCategoryGroup {
  name: string;
  label: string;
  settings: readonly SettingDefinition[];
}

/**
 * Group all setting definitions by category.
 * Returns an array of { name, label, settings } objects.
 */
export function groupSettingsByCategory(): SettingCategoryGroup[] {
  const groups = new Map<string, SettingDefinition[]>();
  for (const def of SETTING_DEFINITIONS) {
    const existing = groups.get(def.category);
    if (existing) {
      existing.push(def);
    } else {
      groups.set(def.category, [def]);
    }
  }
  return Array.from(groups.entries()).map(([name, settings]) => ({
    name,
    label: CATEGORY_LABELS[name] ?? name,
    settings,
  }));
}
