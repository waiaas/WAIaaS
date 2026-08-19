/**
 * Drizzle ORM schema definitions for WAIaaS daemon SQLite database.
 *
 * 30 tables (schema v61): wallets, sessions, session_wallets, transactions, policies, pending_approvals, audit_log, key_value_store, notification_logs, token_registry, settings, telegram_users, wc_sessions, wc_store, incoming_transactions, incoming_tx_cursors, defi_positions, wallet_apps, webhooks, webhook_logs, agent_identities, reputation_cache, nft_metadata_cache, userop_builds, hyperliquid_orders, hyperliquid_sub_accounts, polymarket_orders, polymarket_positions, polymarket_api_keys, wallet_credentials
 *
 * CHECK constraints are derived from @waiaas/core enum SSoT arrays (not hardcoded strings).
 * All timestamps are Unix epoch seconds via { mode: 'timestamp' }.
 * All text PKs use UUID v7 for ms-precision time ordering (except audit_log which uses AUTOINCREMENT).
 *
 * v1.4.2: agents table renamed to wallets, agent_id columns renamed to wallet_id.
 * WALLET_STATUSES used for status CHECK constraint.
 *
 * v1.4.6: Environment model -- wallets.network replaced by wallets.environment.
 * v2.6.1: owner_approval_method column added for signing SDK approval channel preference.
 * transactions.network and policies.network columns added.
 * v26.4: session_wallets junction table added for 1:N session-wallet model.
 * sessions.walletId removed (migrated to session_wallets).
 * v28.8: wallet_type column added for wallet preset auto-setup.
 * v29.3: Removed default_network from wallets, is_default from session_wallets (default wallet/network concept removed).
 *
 * @see docs/25-sqlite-schema.md
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
  uniqueIndex,
  check,
  primaryKey,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
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
  AA_PROVIDER_NAMES,
} from '@waiaas/core';

// ---------------------------------------------------------------------------
// Utility: build CHECK constraint SQL from SSoT enum arrays
// ---------------------------------------------------------------------------

const buildCheckSql = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(', ')})`);

// ---------------------------------------------------------------------------
// Table 1: wallets -- wallet identity and lifecycle state (renamed from agents in v3)
// v1.4.6: network replaced by environment (environment model). v29.3: default_network removed.
// v30.9: aa_provider, aa_provider_api_key_encrypted, aa_bundler_url, aa_paymaster_url for per-wallet provider.
// ---------------------------------------------------------------------------

export const wallets = sqliteTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    chain: text('chain').notNull(),
    environment: text('environment').notNull(),
    publicKey: text('public_key').notNull(),
    status: text('status').notNull().default('CREATING'),
    ownerAddress: text('owner_address'),
    ownerVerified: integer('owner_verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    suspendedAt: integer('suspended_at', { mode: 'timestamp' }),
    suspensionReason: text('suspension_reason'),
    ownerApprovalMethod: text('owner_approval_method'),
    monitorIncoming: integer('monitor_incoming', { mode: 'boolean' }).notNull().default(false),
    walletType: text('wallet_type'),
    accountType: text('account_type').notNull().default('eoa'),
    signerKey: text('signer_key'),
    deployed: integer('deployed', { mode: 'boolean' }).notNull().default(true),
    entryPoint: text('entry_point'),
    aaProvider: text('aa_provider'),
    aaProviderApiKeyEncrypted: text('aa_provider_api_key_encrypted'),
    aaBundlerUrl: text('aa_bundler_url'),
    aaPaymasterUrl: text('aa_paymaster_url'),
    aaPaymasterPolicyId: text('aa_paymaster_policy_id'),
    factoryAddress: text('factory_address'),
  },
  (table) => [
    uniqueIndex('idx_wallets_public_key').on(table.publicKey),
    index('idx_wallets_status').on(table.status),
    index('idx_wallets_chain_environment').on(table.chain, table.environment),
    index('idx_wallets_owner_address').on(table.ownerAddress),
    check('check_chain', buildCheckSql('chain', CHAIN_TYPES)),
    check('check_environment', buildCheckSql('environment', ENVIRONMENT_TYPES)),
    check('check_status', buildCheckSql('status', WALLET_STATUSES)),
    check('check_owner_verified', sql`owner_verified IN (0, 1)`),
    check('check_account_type', buildCheckSql('account_type', ACCOUNT_TYPES)),
    check('check_aa_provider', sql.raw(`aa_provider IS NULL OR aa_provider IN (${AA_PROVIDER_NAMES.map(v => `'${v}'`).join(', ')})`)),
  ],
);

// ---------------------------------------------------------------------------
// Table 2: sessions -- JWT session tracking
// v26.4: walletId removed (migrated to session_wallets junction table)
// ---------------------------------------------------------------------------

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    constraints: text('constraints'),
    usageStats: text('usage_stats'),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    renewalCount: integer('renewal_count').notNull().default(0),
    maxRenewals: integer('max_renewals').notNull().default(0),
    lastRenewedAt: integer('last_renewed_at', { mode: 'timestamp' }),
    absoluteExpiresAt: integer('absolute_expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    source: text('source').notNull().default('api'),
    tokenIssuedCount: integer('token_issued_count').notNull().default(1),
  },
  (table) => [
    index('idx_sessions_expires_at').on(table.expiresAt),
    index('idx_sessions_token_hash').on(table.tokenHash),
  ],
);

// ---------------------------------------------------------------------------
// Table 2b: session_wallets -- session-wallet junction (1:N, v26.4)
// ---------------------------------------------------------------------------

export const sessionWallets = sqliteTable(
  'session_wallets',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_session_wallets_session').on(table.sessionId),
    index('idx_session_wallets_wallet').on(table.walletId),
  ],
);

// ---------------------------------------------------------------------------
// Table 3: transactions -- on-chain transaction records
// ---------------------------------------------------------------------------

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),
    sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    chain: text('chain').notNull(),
    txHash: text('tx_hash'),
    type: text('type').notNull(),
    amount: text('amount'),
    toAddress: text('to_address'),
    tokenMint: text('token_mint'),
    contractAddress: text('contract_address'),
    methodSignature: text('method_signature'),
    spenderAddress: text('spender_address'),
    approvedAmount: text('approved_amount'),
    parentId: text('parent_id').references((): AnySQLiteColumn => transactions.id, {
      onDelete: 'cascade',
    }),
    batchIndex: integer('batch_index'),
    status: text('status').notNull().default('PENDING'),
    tier: text('tier'),
    queuedAt: integer('queued_at', { mode: 'timestamp' }),
    executedAt: integer('executed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    reservedAmount: text('reserved_amount'),
    amountUsd: real('amount_usd'),
    reservedAmountUsd: real('reserved_amount_usd'),
    error: text('error'),
    metadata: text('metadata'),
    network: text('network'),
    // v28.3 DeFi async tracking columns
    bridgeStatus: text('bridge_status'),
    bridgeMetadata: text('bridge_metadata'),
    // v31.12 External Action tracking columns
    actionKind: text('action_kind').notNull().default('contractCall'),
    venue: text('venue'),
    operation: text('operation'),
    externalId: text('external_id'),
  },
  (table) => [
    index('idx_transactions_wallet_status').on(table.walletId, table.status),
    index('idx_transactions_session_id').on(table.sessionId),
    uniqueIndex('idx_transactions_tx_hash').on(table.txHash),
    index('idx_transactions_queued_at').on(table.queuedAt),
    index('idx_transactions_created_at').on(table.createdAt),
    index('idx_transactions_type').on(table.type),
    index('idx_transactions_contract_address').on(table.contractAddress),
    index('idx_transactions_parent_id').on(table.parentId),
    // v28.3: partial index documentation (actual WHERE clause in DDL/migration only)
    index('idx_transactions_bridge_status').on(table.bridgeStatus),
    index('idx_transactions_gas_waiting').on(table.status),
    check('check_tx_type', buildCheckSql('type', TRANSACTION_TYPES)),
    check('check_tx_status', buildCheckSql('status', TRANSACTION_STATUSES)),
    check(
      'check_tx_tier',
      sql.raw(
        `tier IS NULL OR tier IN (${POLICY_TIERS.map((v) => `'${v}'`).join(', ')})`,
      ),
    ),
    check(
      'check_tx_network',
      sql.raw(
        `network IS NULL OR network IN (${NETWORK_TYPES.map((v) => `'${v}'`).join(', ')})`,
      ),
    ),
    // v28.3: bridge_status CHECK constraint (SSoT: BRIDGE_STATUS_VALUES from @waiaas/actions)
    // Not importing from @waiaas/actions to avoid circular dependency; values must match BRIDGE_STATUS_VALUES
    check(
      'check_bridge_status',
      sql.raw(
        `bridge_status IS NULL OR bridge_status IN ('PENDING', 'COMPLETED', 'FAILED', 'BRIDGE_MONITORING', 'TIMEOUT', 'REFUNDED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'SETTLED', 'EXPIRED')`,
      ),
    ),
    // v31.12: External Action tracking indexes
    index('idx_transactions_action_kind').on(table.actionKind),
    index('idx_transactions_venue').on(table.venue),
    index('idx_transactions_external_id').on(table.externalId),
  ],
);

// ---------------------------------------------------------------------------
// Table 4: policies -- wallet and global policy rules
// ---------------------------------------------------------------------------

export const policies = sqliteTable(
  'policies',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id').references(() => wallets.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    rules: text('rules').notNull(),
    priority: integer('priority').notNull().default(0),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    network: text('network'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_policies_wallet_enabled').on(table.walletId, table.enabled),
    index('idx_policies_type').on(table.type),
    index('idx_policies_network').on(table.network),
    check('check_policy_type', buildCheckSql('type', POLICY_TYPES)),
    check(
      'check_policy_network',
      sql.raw(
        `network IS NULL OR network IN (${NETWORK_TYPES.map((v) => `'${v}'`).join(', ')})`,
      ),
    ),
  ],
);

// ---------------------------------------------------------------------------
// Table 5: pending_approvals -- APPROVAL tier owner sign-off tracking
// ---------------------------------------------------------------------------

export const pendingApprovals = sqliteTable(
  'pending_approvals',
  {
    id: text('id').primaryKey(),
    txId: text('tx_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    requiredBy: integer('required_by', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    rejectedAt: integer('rejected_at', { mode: 'timestamp' }),
    ownerSignature: text('owner_signature'),
    approvalChannel: text('approval_channel').default('rest_api'),
    approvalType: text('approval_type').notNull().default('SIWE'),
    typedDataJson: text('typed_data_json'),
    /** The exact text the owner signed. NULL for approvals recorded before v63. */
    ownerMessage: text('owner_message'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_pending_approvals_tx_id').on(table.txId),
    index('idx_pending_approvals_expires_at').on(table.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// Table 6: audit_log -- append-only security event log
// ---------------------------------------------------------------------------

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    eventType: text('event_type').notNull(),
    actor: text('actor').notNull(),
    walletId: text('wallet_id'),
    sessionId: text('session_id'),
    txId: text('tx_id'),
    details: text('details').notNull(),
    severity: text('severity').notNull().default('info'),
    ipAddress: text('ip_address'),
  },
  (table) => [
    index('idx_audit_log_timestamp').on(table.timestamp),
    index('idx_audit_log_event_type').on(table.eventType),
    index('idx_audit_log_wallet_id').on(table.walletId),
    index('idx_audit_log_severity').on(table.severity),
    index('idx_audit_log_wallet_timestamp').on(table.walletId, table.timestamp),
    index('idx_audit_log_tx_id').on(table.txId),
    check('check_severity', sql`severity IN ('info', 'warning', 'critical')`),
  ],
);

// ---------------------------------------------------------------------------
// Table 7: key_value_store -- system state (JWT secret, daemon metadata)
// ---------------------------------------------------------------------------

export const keyValueStore = sqliteTable('key_value_store', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ---------------------------------------------------------------------------
// Table 8: notification_logs -- notification delivery history
// ---------------------------------------------------------------------------

export const notificationLogs = sqliteTable(
  'notification_logs',
  {
    id: text('id').primaryKey(), // UUID v7
    eventType: text('event_type').notNull(),
    walletId: text('wallet_id'),
    channel: text('channel').notNull(), // telegram / discord / ntfy
    status: text('status').notNull(), // sent / failed
    error: text('error'), // failure error message (nullable)
    message: text('message'), // nullable - null for pre-v10 logs
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_notification_logs_event_type').on(table.eventType),
    index('idx_notification_logs_wallet_id').on(table.walletId),
    index('idx_notification_logs_status').on(table.status),
    index('idx_notification_logs_created_at').on(table.createdAt),
    check('check_notif_log_status', buildCheckSql('status', NOTIFICATION_LOG_STATUSES)),
  ],
);

// ---------------------------------------------------------------------------
// Table 9: token_registry -- EVM ERC-20 token management (builtin + custom)
// ---------------------------------------------------------------------------

export const tokenRegistry = sqliteTable(
  'token_registry',
  {
    id: text('id').primaryKey(), // UUID v7
    network: text('network').notNull(), // EvmNetworkType
    address: text('address').notNull(), // EIP-55 checksum address
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    decimals: integer('decimals').notNull(),
    source: text('source').notNull().default('custom'), // 'builtin' | 'custom'
    assetId: text('asset_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_token_registry_network_address').on(table.network, table.address),
    index('idx_token_registry_network').on(table.network),
    check('check_token_source', sql`source IN ('builtin', 'custom')`),
  ],
);

// ---------------------------------------------------------------------------
// Table 10: settings -- daemon operational settings (key-value)
// ---------------------------------------------------------------------------

export const settings = sqliteTable(
  'settings',
  {
    key: text('key').primaryKey(), // e.g., 'notifications.telegram_bot_token'
    value: text('value').notNull(), // plain or AES-GCM encrypted (base64 JSON)
    encrypted: integer('encrypted', { mode: 'boolean' }).notNull().default(false),
    category: text('category').notNull(), // 'notifications' | 'rpc' | 'security' | 'daemon' | 'walletconnect'
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_settings_category').on(table.category),
  ],
);

// ---------------------------------------------------------------------------
// Table 11: telegram_users -- Telegram Bot user management (v1.6)
// ---------------------------------------------------------------------------

export const telegramUsers = sqliteTable(
  'telegram_users',
  {
    chatId: integer('chat_id').primaryKey(),
    username: text('username'),
    role: text('role').notNull().default('PENDING'),
    registeredAt: integer('registered_at', { mode: 'timestamp' }).notNull(),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_telegram_users_role').on(table.role),
    check('check_telegram_role', sql`role IN ('PENDING', 'ADMIN', 'READONLY')`),
  ],
);

// ---------------------------------------------------------------------------
// Table 13: wc_sessions -- WalletConnect session metadata (v1.6.1)
// ---------------------------------------------------------------------------

export const wcSessions = sqliteTable(
  'wc_sessions',
  {
    walletId: text('wallet_id')
      .primaryKey()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull().unique(),
    peerMeta: text('peer_meta'),
    chainId: text('chain_id').notNull(),
    ownerAddress: text('owner_address').notNull(),
    namespaces: text('namespaces'),
    expiry: integer('expiry').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_wc_sessions_topic').on(table.topic),
  ],
);

// ---------------------------------------------------------------------------
// Table 14: wc_store -- WalletConnect IKeyValueStorage (v1.6.1)
// ---------------------------------------------------------------------------

export const wcStore = sqliteTable('wc_store', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ---------------------------------------------------------------------------
// Table 16: incoming_transactions -- detected incoming transfers to monitored wallets
// v27.1: Added for incoming transaction monitoring
// ---------------------------------------------------------------------------

export const incomingTransactions = sqliteTable(
  'incoming_transactions',
  {
    id: text('id').primaryKey(),
    txHash: text('tx_hash').notNull(),
    walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    fromAddress: text('from_address').notNull(),
    amount: text('amount').notNull(),
    tokenAddress: text('token_address'),
    chain: text('chain').notNull(),
    network: text('network').notNull(),
    status: text('status').notNull().default('DETECTED'),
    blockNumber: integer('block_number'),
    detectedAt: integer('detected_at', { mode: 'timestamp' }).notNull(),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
    isSuspicious: integer('is_suspicious', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('idx_incoming_tx_wallet_detected').on(table.walletId, table.detectedAt),
    index('idx_incoming_tx_detected_at').on(table.detectedAt),
    index('idx_incoming_tx_chain_network').on(table.chain, table.network),
    index('idx_incoming_tx_status').on(table.status),
    uniqueIndex('idx_incoming_tx_unique').on(table.txHash, table.walletId),
    check('check_incoming_chain', buildCheckSql('chain', CHAIN_TYPES)),
    check('check_incoming_status', buildCheckSql('status', INCOMING_TX_STATUSES)),
  ],
);

// ---------------------------------------------------------------------------
// Table 17: incoming_tx_cursors -- per-wallet cursor for gap recovery
// v27.1: Added for incoming transaction monitoring
// ---------------------------------------------------------------------------

export const incomingTxCursors = sqliteTable('incoming_tx_cursors', {
  walletId: text('wallet_id').primaryKey().references(() => wallets.id, { onDelete: 'cascade' }),
  chain: text('chain').notNull(),
  network: text('network').notNull(),
  lastSignature: text('last_signature'),
  lastBlockNumber: integer('last_block_number'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ---------------------------------------------------------------------------
// Table 18: defi_positions -- DeFi position tracking
// v29.2: Added for DeFi Lending framework position persistence
// ---------------------------------------------------------------------------

export const defiPositions = sqliteTable(
  'defi_positions',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    provider: text('provider').notNull(),
    chain: text('chain').notNull(),
    environment: text('environment').notNull().default('mainnet'),
    network: text('network'),
    assetId: text('asset_id'),
    amount: text('amount').notNull(),
    amountUsd: real('amount_usd'),
    metadata: text('metadata'),
    status: text('status').notNull().default('ACTIVE'),
    openedAt: integer('opened_at', { mode: 'timestamp' }).notNull(),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_defi_positions_wallet_category').on(table.walletId, table.category),
    index('idx_defi_positions_wallet_provider').on(table.walletId, table.provider),
    index('idx_defi_positions_status').on(table.status),
    uniqueIndex('idx_defi_positions_unique').on(
      table.walletId, table.provider, table.assetId, table.category,
    ),
    check('check_position_category', buildCheckSql('category', POSITION_CATEGORIES)),
    check('check_position_status', buildCheckSql('status', POSITION_STATUSES)),
    check('check_position_chain', buildCheckSql('chain', CHAIN_TYPES)),
  ],
);

// ---------------------------------------------------------------------------
// Table 19: wallet_apps -- Human Wallet Apps registry (v29.7)
// ---------------------------------------------------------------------------

export const walletApps = sqliteTable('wallet_apps', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  walletType: text('wallet_type').notNull().default(''),
  signingEnabled: integer('signing_enabled', { mode: 'boolean' }).notNull().default(true),
  alertsEnabled: integer('alerts_enabled', { mode: 'boolean' }).notNull().default(true),
  signTopic: text('sign_topic'),
  notifyTopic: text('notify_topic'),
  subscriptionToken: text('subscription_token'),
  pushRelayUrl: text('push_relay_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ---------------------------------------------------------------------------
// Table 20: webhooks -- webhook outbound subscriptions (v37 OPS-04)
// ---------------------------------------------------------------------------

export const webhooks = sqliteTable(
  'webhooks',
  {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    secretHash: text('secret_hash').notNull(),
    secretEncrypted: text('secret_encrypted').notNull(),
    events: text('events').notNull(), // JSON array
    description: text('description'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_webhooks_enabled').on(table.enabled),
    check('check_webhook_enabled', sql`enabled IN (0, 1)`),
  ],
);

// ---------------------------------------------------------------------------
// Table 21: webhook_logs -- webhook delivery attempt history (v37 OPS-04)
// ---------------------------------------------------------------------------

export const webhookLogs = sqliteTable(
  'webhook_logs',
  {
    id: text('id').primaryKey(),
    webhookId: text('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    status: text('status').notNull(),
    httpStatus: integer('http_status'),
    attempt: integer('attempt').notNull().default(1),
    error: text('error'),
    requestDuration: integer('request_duration'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_webhook_logs_webhook_id').on(table.webhookId),
    index('idx_webhook_logs_event_type').on(table.eventType),
    index('idx_webhook_logs_status').on(table.status),
    index('idx_webhook_logs_created_at').on(table.createdAt),
    check('check_webhook_log_status', sql`status IN ('success', 'failed')`),
  ],
);

// ---------------------------------------------------------------------------
// Table 22: agent_identities -- ERC-8004 agent identity tracking (v39)
// ---------------------------------------------------------------------------

export const agentIdentities = sqliteTable(
  'agent_identities',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    chainAgentId: text('chain_agent_id').notNull(),
    registryAddress: text('registry_address').notNull(),
    chainId: integer('chain_id').notNull(),
    agentUri: text('agent_uri'),
    registrationFileUrl: text('registration_file_url'),
    status: text('status').notNull().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_agent_identities_wallet').on(table.walletId),
    uniqueIndex('idx_agent_identities_chain').on(table.registryAddress, table.chainAgentId),
    check(
      'check_agent_identity_status',
      sql`status IN ('PENDING', 'REGISTERED', 'WALLET_LINKED', 'DEREGISTERED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Table 23: reputation_cache -- ERC-8004 reputation score cache (v39)
// ---------------------------------------------------------------------------

export const reputationCache = sqliteTable(
  'reputation_cache',
  {
    agentId: text('agent_id').notNull(),
    registryAddress: text('registry_address').notNull(),
    tag1: text('tag1').notNull().default(''),
    tag2: text('tag2').notNull().default(''),
    score: integer('score').notNull(),
    scoreDecimals: integer('score_decimals').notNull().default(0),
    feedbackCount: integer('feedback_count').notNull().default(0),
    cachedAt: integer('cached_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.agentId, table.registryAddress, table.tag1, table.tag2] }),
  ],
);

// ---------------------------------------------------------------------------
// Table 24: nft_metadata_cache -- NFT metadata caching with TTL (v44)
// ---------------------------------------------------------------------------

export const nftMetadataCache = sqliteTable(
  'nft_metadata_cache',
  {
    id: text('id').primaryKey(),
    contractAddress: text('contract_address').notNull(),
    tokenId: text('token_id').notNull(),
    chain: text('chain').notNull(),
    network: text('network').notNull(),
    metadataJson: text('metadata_json').notNull(),
    cachedAt: integer('cached_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_nft_cache_unique').on(table.contractAddress, table.tokenId, table.chain, table.network),
    index('idx_nft_cache_expires').on(table.expiresAt),
    check('check_nft_cache_chain', sql`chain IN (${sql.raw(CHAIN_TYPES.map((v) => `'${v}'`).join(', '))})`),
    check('check_nft_cache_network', sql`network IN (${sql.raw(NETWORK_TYPES.map((v) => `'${v}'`).join(', '))})`),
  ],
);

// ---------------------------------------------------------------------------
// Table 25: userop_builds -- UserOp Build/Sign API data (v45)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hyperliquid orders (v51)
// ---------------------------------------------------------------------------

export const hyperliquidOrders = sqliteTable(
  'hyperliquid_orders',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    subAccountAddress: text('sub_account_address'),
    oid: integer('oid'),
    cloid: text('cloid'),
    transactionId: text('transaction_id').references(() => transactions.id),
    market: text('market').notNull(),
    assetIndex: integer('asset_index').notNull(),
    side: text('side').notNull(), // BUY | SELL
    orderType: text('order_type').notNull(), // MARKET | LIMIT | STOP_MARKET | STOP_LIMIT | TAKE_PROFIT
    size: text('size').notNull(),
    price: text('price'),
    triggerPrice: text('trigger_price'),
    tif: text('tif'), // GTC | IOC | ALO
    reduceOnly: integer('reduce_only').notNull().default(0),
    status: text('status').notNull(), // PENDING | RESTING | FILLED | PARTIALLY_FILLED | CANCELLED | REJECTED | TRIGGERED
    filledSize: text('filled_size'),
    avgFillPrice: text('avg_fill_price'),
    isSpot: integer('is_spot').notNull().default(0),
    leverage: integer('leverage'),
    marginMode: text('margin_mode'), // CROSS | ISOLATED
    responseData: text('response_data'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_hl_orders_wallet').on(table.walletId),
    index('idx_hl_orders_oid').on(table.oid),
    index('idx_hl_orders_market').on(table.market),
    index('idx_hl_orders_status').on(table.status),
    index('idx_hl_orders_created').on(table.createdAt),
    check('check_hl_orders_side', sql`side IN ('BUY', 'SELL')`),
    check(
      'check_hl_orders_order_type',
      sql`order_type IN ('MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT', 'TAKE_PROFIT')`,
    ),
    check(
      'check_hl_orders_status',
      sql`status IN ('PENDING', 'RESTING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'TRIGGERED')`,
    ),
    check('check_hl_orders_tif', sql`tif IS NULL OR tif IN ('GTC', 'IOC', 'ALO')`),
    check(
      'check_hl_orders_margin_mode',
      sql`margin_mode IS NULL OR margin_mode IN ('CROSS', 'ISOLATED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Hyperliquid sub-accounts (v52)
// ---------------------------------------------------------------------------

export const hyperliquidSubAccounts = sqliteTable(
  'hyperliquid_sub_accounts',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    subAccountAddress: text('sub_account_address').notNull(),
    name: text('name'),
    createdAt: integer('created_at', { mode: 'number' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_hl_sub_wallet').on(table.walletId),
    uniqueIndex('idx_hl_sub_unique').on(table.walletId, table.subAccountAddress),
  ],
);

// ---------------------------------------------------------------------------
// UserOp builds (v45)
// ---------------------------------------------------------------------------

export const useropBuilds = sqliteTable(
  'userop_builds',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id').notNull(),
    callData: text('call_data').notNull(),
    sender: text('sender').notNull(),
    nonce: text('nonce').notNull(),
    entryPoint: text('entry_point').notNull(),
    network: text('network'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    used: integer('used').notNull().default(0),
  },
  (table) => [
    index('idx_userop_builds_wallet_id').on(table.walletId),
    index('idx_userop_builds_expires').on(table.expiresAt),
    check('check_userop_builds_used', sql`used IN (0, 1)`),
  ],
);

// ---------------------------------------------------------------------------
// Polymarket orders (v53)
// ---------------------------------------------------------------------------

export const polymarketOrders = sqliteTable(
  'polymarket_orders',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    transactionId: text('transaction_id').references(
      (): AnySQLiteColumn => transactions.id,
    ),
    conditionId: text('condition_id').notNull(),
    tokenId: text('token_id').notNull(),
    marketSlug: text('market_slug'),
    outcome: text('outcome').notNull(),
    orderId: text('order_id'),
    side: text('side').notNull(), // BUY | SELL
    orderType: text('order_type').notNull(), // GTC | GTD | FOK | IOC
    price: text('price').notNull(),
    size: text('size').notNull(),
    status: text('status').notNull(), // PENDING | LIVE | MATCHED | PARTIALLY_FILLED | CANCELLED | EXPIRED
    filledSize: text('filled_size'),
    avgFillPrice: text('avg_fill_price'),
    salt: text('salt'),
    makerAmount: text('maker_amount'),
    takerAmount: text('taker_amount'),
    signatureType: integer('signature_type').notNull().default(0),
    feeRateBps: integer('fee_rate_bps'),
    expiration: integer('expiration'),
    nonce: text('nonce'),
    isNegRisk: integer('is_neg_risk').notNull().default(0),
    responseData: text('response_data'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_pm_orders_wallet').on(table.walletId),
    index('idx_pm_orders_order_id').on(table.orderId),
    index('idx_pm_orders_condition').on(table.conditionId),
    index('idx_pm_orders_status').on(table.status),
    index('idx_pm_orders_created').on(table.createdAt),
    check('check_pm_orders_side', sql`side IN ('BUY', 'SELL')`),
    check(
      'check_pm_orders_order_type',
      sql`order_type IN ('GTC', 'GTD', 'FOK', 'IOC')`,
    ),
    check(
      'check_pm_orders_status',
      sql`status IN ('PENDING', 'LIVE', 'MATCHED', 'PARTIALLY_FILLED', 'CANCELLED', 'EXPIRED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Polymarket positions (v54)
// ---------------------------------------------------------------------------

export const polymarketPositions = sqliteTable(
  'polymarket_positions',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    conditionId: text('condition_id').notNull(),
    tokenId: text('token_id').notNull(),
    marketSlug: text('market_slug'),
    outcome: text('outcome').notNull(), // YES | NO
    size: text('size').notNull().default('0'),
    avgPrice: text('avg_price'),
    realizedPnl: text('realized_pnl').default('0'),
    marketResolved: integer('market_resolved').notNull().default(0),
    winningOutcome: text('winning_outcome'),
    isNegRisk: integer('is_neg_risk').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_pm_positions_wallet').on(table.walletId),
    index('idx_pm_positions_condition').on(table.conditionId),
    index('idx_pm_positions_resolved').on(table.marketResolved),
    uniqueIndex('idx_pm_positions_unique').on(table.walletId, table.tokenId),
    check('check_pm_positions_outcome', sql`outcome IN ('YES', 'NO')`),
  ],
);

// ---------------------------------------------------------------------------
// Polymarket API keys (v54)
// ---------------------------------------------------------------------------

export const polymarketApiKeys = sqliteTable(
  'polymarket_api_keys',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    apiKey: text('api_key').notNull(),
    apiSecretEncrypted: text('api_secret_encrypted').notNull(),
    apiPassphraseEncrypted: text('api_passphrase_encrypted').notNull(),
    signatureType: integer('signature_type').notNull().default(0),
    proxyAddress: text('proxy_address'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_pm_api_keys_wallet').on(table.walletId),
  ],
);

// ---------------------------------------------------------------------------
// Table 31: wallet_credentials -- External Action credential vault (v55)
// ---------------------------------------------------------------------------

export const walletCredentials = sqliteTable(
  'wallet_credentials',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id').references(() => wallets.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    name: text('name').notNull(),
    encryptedValue: blob('encrypted_value', { mode: 'buffer' }).notNull(),
    iv: blob('iv', { mode: 'buffer' }).notNull(),
    authTag: blob('auth_tag', { mode: 'buffer' }).notNull(),
    metadata: text('metadata').notNull().default('{}'),
    expiresAt: integer('expires_at'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_wallet_credentials_wallet_name').on(table.walletId, table.name),
    index('idx_wallet_credentials_global_name').on(table.name),
    index('idx_wallet_credentials_wallet_id').on(table.walletId),
    index('idx_wallet_credentials_expires_at').on(table.expiresAt),
    check(
      'check_credential_type',
      sql.raw(
        `type IN ('api-key', 'hmac-secret', 'rsa-private-key', 'session-token', 'custom')`,
      ),
    ),
  ],
);
