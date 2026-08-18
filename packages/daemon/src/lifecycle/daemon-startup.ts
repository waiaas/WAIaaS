/**
 * daemon-startup.ts - Extracted 6-step startup sequence from DaemonLifecycle.
 *
 * Contains the full _startInternal() body that was previously ~1,650 lines
 * in daemon.ts. Receives a DaemonState context object to read/write daemon fields.
 *
 * @see docs/28-daemon-lifecycle-cli.md
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { WAIaaSError, BUILT_IN_RPC_DEFAULTS, RpcPool, safeJsonParse, ConsoleLogger } from '@waiaas/core';
import type { LogLevel } from '@waiaas/core';
import { z } from 'zod';
import { KillSwitchService } from '../services/kill-switch-service.js';
import { AutoStopService } from '../services/autostop-service.js';
import type { AutoStopConfig } from '../services/autostop-service.js';
import { InMemoryCounter } from '../infrastructure/metrics/in-memory-counter.js';
import { AdminStatsService } from '../services/admin-stats-service.js';
import type { BalanceMonitorConfig } from '../services/monitoring/balance-monitor-service.js';
import { createDatabase, pushSchema, checkSchemaCompatibility } from '../infrastructure/database/index.js';
import { loadConfig } from '../infrastructure/config/index.js';
import { keyValueStore } from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../infrastructure/keystore/crypto.js';
import { DelayQueue } from '../workflow/delay-queue.js';
import { ApprovalWorkflow } from '../workflow/approval-workflow.js';
import { OwnerLifecycleService } from '../workflow/owner-state.js';
import { DatabasePolicyEngine } from '../pipeline/database-policy-engine.js';
import { JwtSecretManager } from '../infrastructure/jwt/index.js';
import argon2 from 'argon2';
import { BackgroundWorkers } from './workers.js';
import { resolveRpcUrl, resolveRpcUrlFromPool } from '../infrastructure/adapter-pool.js';
import type { DaemonState } from './daemon.js';
import { withTimeout } from './daemon.js';
import type { NotificationEventType } from '@waiaas/core';
import type { ChainType, NetworkType } from '@waiaas/core';
import type { Address } from 'viem';
import type { Server as HttpServer } from 'node:http';
import type { IPositionProvider } from '@waiaas/core';

const esmRequire = createRequire(import.meta.url);

/**
 * 6-step startup sequence with per-step timeouts.
 * Receives DaemonState to read/write daemon fields.
 */
export async function startDaemon(state: DaemonState, dataDir: string, masterPassword: string): Promise<void> {
  // Store master password for route handlers
  state.masterPassword = masterPassword;

  // ------------------------------------------------------------------
  // Step 1: Environment validation + config + flock (5s, fail-fast)
  // ------------------------------------------------------------------
  await withTimeout(
    (async () => {
      // Ensure data directory exists
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Load config
      state._config = loadConfig(dataDir);

      // Acquire daemon lock (flock-like via proper-lockfile)
      await state.acquireDaemonLock(dataDir);

      // Initialize daemon logger with config log_level (default: 'info')
      const configLogLevel = (state._config!.daemon.log_level ?? 'info') as LogLevel;
      state.logger = new ConsoleLogger('daemon', configLogLevel);
      state.logger.info('Step 1: Config loaded, daemon lock acquired');
    })(),
    5_000,
    'STEP1_CONFIG_LOCK',
  );

  // ------------------------------------------------------------------
  // Step 2: Database initialization (30s, fail-fast)
  // ------------------------------------------------------------------
  await withTimeout(
    (async () => {
      const dbPath = join(dataDir, state._config!.database.path);

      // Ensure DB directory exists
      const dbDir = dirname(dbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      const { sqlite, db } = createDatabase(dbPath);
      state.sqlite = sqlite;
      state._db = db;

      // Check schema compatibility before migration
      const compatibility = checkSchemaCompatibility(sqlite);
      if (compatibility.action === 'reject') {
        console.error(`Step 2: Schema incompatible -- ${compatibility.message}`);
        throw new WAIaaSError('SCHEMA_INCOMPATIBLE', {
          message: compatibility.message,
        });
      }
      if (compatibility.action === 'migrate') {
        state.logger.info('Step 2: Schema migration needed, applying...');
      }

      // Create all tables + run migrations (idempotent)
      pushSchema(sqlite);

      // Auto-import config.toml operational settings into DB (first boot only)
      const { SettingsService } = await import('../infrastructure/settings/index.js');
      state._settingsService = new SettingsService({
        db: state._db!,
        config: state._config!,
        masterPassword,
        passwordRef: state.passwordRef ?? undefined,
      });
      const importResult = state._settingsService.importFromConfig();
      if (importResult.imported > 0) {
        state.logger.info(`Step 2: Settings imported from config.toml (${importResult.imported} keys)`);
      }

      state.logger.info('Step 2: Database initialized');
    })(),
    30_000,
    'STEP2_DATABASE',
  );

  // ------------------------------------------------------------------
  // Step 2b: Master password validation (fail-fast)
  // ------------------------------------------------------------------
  await withTimeout(
    (async () => {
      const existingHash = state._db!
        .select()
        .from(keyValueStore)
        .where(eq(keyValueStore.key, 'master_password_hash'))
        .get();

      if (existingHash) {
        // Path A: DB hash exists -> verify against stored hash
        const isValid = await argon2.verify(existingHash.value, masterPassword);
        if (!isValid) {
          console.error('Invalid master password.');
          process.exit(1);
        }
        state.logger.info('Step 2b: Master password verified (DB hash)');
      } else {
        // Path B: No DB hash -> check for existing keystore files
        const keystoreDir = join(dataDir, 'keystore');
        const keystoreFiles = existsSync(keystoreDir)
          ? readdirSync(keystoreDir).filter(f => f.endsWith('.json'))
          : [];

        if (keystoreFiles.length > 0) {
          // Existing user migration: validate by decrypting first keystore
          const keystorePath = join(keystoreDir, keystoreFiles[0]!);
          const content = readFileSync(keystorePath, 'utf-8');
          const KeystoreSchema = z.object({
            crypto: z.object({
              cipherparams: z.object({ iv: z.string() }),
              ciphertext: z.string(),
              authTag: z.string(),
              kdfparams: z.object({
                salt: z.string(),
                memoryCost: z.number(),
                timeCost: z.number(),
                parallelism: z.number(),
                hashLength: z.number(),
              }),
            }),
          });
          const parseResult = safeJsonParse(content, KeystoreSchema);
          if (!parseResult.success) {
            console.error('Invalid keystore file format:', parseResult.error.message);
            process.exit(1);
          }
          const parsed = parseResult.data;
          const encrypted = {
            iv: Buffer.from(parsed.crypto.cipherparams.iv, 'hex'),
            ciphertext: Buffer.from(parsed.crypto.ciphertext, 'hex'),
            authTag: Buffer.from(parsed.crypto.authTag, 'hex'),
            salt: Buffer.from(parsed.crypto.kdfparams.salt, 'hex'),
            kdfparams: parsed.crypto.kdfparams,
          };
          try {
            const plain = await decrypt(encrypted, masterPassword);
            plain.fill(0); // zero immediately
          } catch {
            console.error('Invalid master password. Cannot decrypt existing wallets.');
            process.exit(1);
          }
          state.logger.info('Step 2b: Master password verified (keystore migration)');
        } else {
          state.logger.info('Step 2b: First install, no password validation needed');
        }

        // Store hash in DB for future startups
        const hash = await argon2.hash(masterPassword, {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        state._db!
          .insert(keyValueStore)
          .values({
            key: 'master_password_hash',
            value: hash,
            updatedAt: new Date(),
          })
          .onConflictDoNothing()
          .run();
      }
    })(),
    30_000,
    'STEP2B_PASSWORD_VALIDATION',
  );

  // ------------------------------------------------------------------
  // Step 3: Keystore unlock (30s, fail-fast)
  // ------------------------------------------------------------------
  await withTimeout(
    (async () => {
      // Dynamic import to avoid circular dependency issues
      const { LocalKeyStore: KeyStoreCls } = await import(
        '../infrastructure/keystore/index.js'
      );
      const keystoreDir = join(dataDir, 'keystore');
      if (!existsSync(keystoreDir)) {
        mkdirSync(keystoreDir, { recursive: true });
      }
      state.keyStore = new KeyStoreCls(keystoreDir);

      // v1.1: just verify keystore infrastructure is accessible
      // Full key decryption happens when agents are accessed
      if (masterPassword) {
        state.logger.info('Step 3: Keystore infrastructure verified (master password provided)');
      } else {
        state.logger.info('Step 3: Keystore infrastructure verified (no master password)');
      }
    })(),
    30_000,
    'STEP3_KEYSTORE',
  );

  // ------------------------------------------------------------------
  // Step 4: Adapter pool initialization (10s, fail-soft)
  // ------------------------------------------------------------------
  try {
    await withTimeout(
      (async () => {
        const { AdapterPool, configKeyToNetwork: configKeyToNet } = await import('../infrastructure/adapter-pool.js');

        // 1. Create empty RpcPool with onEvent callback for notifications
        state.rpcPool = new RpcPool({
          onEvent: (event) => {
            // RPC pool health notifications -- use 'system' as walletId
            // since these are infrastructure-level alerts, not wallet-specific.
            if (state.notificationService) {
              const vars: Record<string, string> = {
                network: event.network,
                url: event.url,
                errorCount: String(event.failureCount),
                totalEndpoints: String(event.totalEndpoints),
              };
              void state.notificationService.notify(
                event.type as NotificationEventType,
                'system',
                vars,
              );
            }
          },
        });

        // 2. Seed config.toml URLs first (highest priority)
        //    WAIAAS_RPC_* env vars are already applied to config.rpc by applyEnvOverrides in loader.ts
        const rpcConfig = state._config!.rpc;
        for (const [configKey, url] of Object.entries(rpcConfig)) {
          if (typeof url !== 'string' || !url) continue;
          const network = configKeyToNet(configKey);
          if (network) {
            state.rpcPool.register(network, [url]);
          }
        }

        // 3. Seed Admin Settings rpc_pool.* URLs (higher priority than built-in defaults)
        if (state._settingsService) {
          const { SETTING_DEFINITIONS } = await import('../infrastructure/settings/setting-keys.js');
          const rpcPoolKeys = SETTING_DEFINITIONS
            .filter(d => d.category === 'rpc_pool')
            .map(d => d.key);
          for (const settingKey of rpcPoolKeys) {
            const raw = state._settingsService.get(settingKey);
            if (!raw || raw === '[]') continue;
            try {
              const parsed = JSON.parse(raw) as string[];
              if (!Array.isArray(parsed) || parsed.length === 0) continue;
              const network = settingKey.replace('rpc_pool.', '');
              state.rpcPool.register(network, parsed);
            } catch { /* skip invalid JSON */ }
          }
        }

        // 4. Register built-in defaults (lower priority, appended after config + admin URLs)
        for (const [network, urls] of Object.entries(BUILT_IN_RPC_DEFAULTS)) {
          state.rpcPool.register(network, [...urls]);
        }

        // 5. Create AdapterPool with RpcPool
        state.adapterPool = new AdapterPool(state.rpcPool);
        state.logger.info(`Step 4: AdapterPool created with RpcPool (${state.rpcPool.getNetworks().length} networks seeded)`);
      })(),
      10_000,
      'STEP4_ADAPTER',
    );
  } catch (err) {
    // fail-soft: log warning but continue (daemon runs without chain adapter)
    console.warn('Step 4 (fail-soft): AdapterPool init warning:', err);
    state.adapterPool = null;
    state.rpcPool = null;
  }

  // ------------------------------------------------------------------
  // Step 4b: Create workflow instances (DelayQueue + ApprovalWorkflow)
  // ------------------------------------------------------------------
  if (state._db && state.sqlite && state._config) {
    state.delayQueue = new DelayQueue({ db: state._db, sqlite: state.sqlite });
    // #444: pass config as live-reading object so hot-reload changes propagate
    const initialTimeout = state._config.security.policy_defaults_approval_timeout;
    const approvalConfig = {
      get policy_defaults_approval_timeout() {
        try {
          const val = state._settingsService?.get('security.policy_defaults_approval_timeout');
          if (val) {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
        } catch { /* settings not available yet */ }
        return initialTimeout;
      },
    };
    state.approvalWorkflow = new ApprovalWorkflow({
      db: state._db,
      sqlite: state.sqlite,
      config: approvalConfig,
      onApproved: (txId) => state.handleApprovalApproved(txId),
    });
    state.logger.info('Step 4b: Workflow instances created (DelayQueue + ApprovalWorkflow)');
  }

  // ------------------------------------------------------------------
  // Step 4c: JWT Secret Manager + master password hash
  // ------------------------------------------------------------------
  if (state._db) {
    state.jwtSecretManager = new JwtSecretManager(state._db);
    await state.jwtSecretManager.initialize();
    state.masterPasswordHash = await argon2.hash(masterPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    // Create mutable ref for live password/hash updates (password change API)
    state.passwordRef = { password: masterPassword, hash: state.masterPasswordHash };
    state.logger.info('Step 4c: JWT secret manager initialized, master password hashed');
  }

  // ------------------------------------------------------------------
  // Step 4c-2: KillSwitchService initialization
  // ------------------------------------------------------------------
  if (state.sqlite) {
    state.killSwitchService = new KillSwitchService({
      sqlite: state.sqlite,
      // notificationService will be set after Step 4d
      eventBus: state.eventBus,
    });
    state.killSwitchService.ensureInitialized();
    state.logger.info('Step 4c-2: KillSwitchService initialized');
  }

  // ------------------------------------------------------------------
  // Step 4d: Notification Service initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    // Always create NotificationService regardless of config.toml enabled value.
    // When enabled=false, service starts with 0 channels (no notifications sent).
    // Admin UI can dynamically enable via hot-reload at runtime.
    const { NotificationService, TelegramChannel, DiscordChannel, SlackChannel } =
      await import('../notifications/index.js');

    // Read notification settings from SettingsService first, fall back to config.toml
    const ss = state._settingsService;
    const notifLocale = ((ss ? ss.get('notifications.locale') : null)
      || state._config!.notifications.locale || 'en') as 'en' | 'ko';
    const notifRateLimitRpm = Number(
      (ss ? ss.get('notifications.rate_limit_rpm') : null)
      || state._config!.notifications.rate_limit_rpm
      || 20,
    );

    state.notificationService = new NotificationService({
      db: state._db ?? undefined,
      config: {
        locale: notifLocale,
        rateLimitRpm: notifRateLimitRpm,
      },
    });

    // Inject SettingsService for category filtering
    if (ss) {
      state.notificationService.setSettingsService(ss);
    }

    // Initialize configured channels: SettingsService (DB) takes priority over config.toml
    const notifEnabled = ss
      ? ss.get('notifications.enabled') === 'true'
      : state._config!.notifications.enabled;

    if (notifEnabled) {
      const notifConfig = state._config!.notifications;

      const tgToken = (ss ? ss.get('notifications.telegram_bot_token') : null)
        || notifConfig.telegram_bot_token;
      const tgChatId = (ss ? ss.get('notifications.telegram_chat_id') : null)
        || notifConfig.telegram_chat_id;
      if (tgToken && tgChatId) {
        const telegram = new TelegramChannel();
        await telegram.initialize({
          telegram_bot_token: tgToken,
          telegram_chat_id: tgChatId,
        });
        state.notificationService.addChannel(telegram);
      }

      const discordUrl = (ss ? ss.get('notifications.discord_webhook_url') : null)
        || notifConfig.discord_webhook_url;
      if (discordUrl) {
        const discord = new DiscordChannel();
        await discord.initialize({
          discord_webhook_url: discordUrl,
        });
        state.notificationService.addChannel(discord);
      }

      // Global NtfyChannel removed in v29.10 -- per-wallet topics now in wallet_apps table.
      // Per-wallet ntfy channels are managed by the signing SDK / notification routing layer.

      const slackUrl = (ss ? ss.get('notifications.slack_webhook_url') : null)
        || notifConfig.slack_webhook_url;
      if (slackUrl) {
        const slack = new SlackChannel();
        await slack.initialize({
          slack_webhook_url: slackUrl,
        });
        state.notificationService.addChannel(slack);
      }
    }

    const channelNames = state.notificationService.getChannelNames();
    state.logger.debug(
      `Step 4d: NotificationService initialized (${channelNames.length} channels: ${channelNames.join(', ') || 'none'})`,
    );
  } catch (err) {
    console.warn('Step 4d (fail-soft): NotificationService init warning:', err);
    state.notificationService = null;
  }

  // Wire NotificationService to KillSwitchService (created before Step 4d)
  if (state.killSwitchService && state.notificationService) {
    // Re-create with notification service attached
    state.killSwitchService = new KillSwitchService({
      sqlite: state.sqlite!,
      notificationService: state.notificationService,
      eventBus: state.eventBus,
    });
    state.killSwitchService.ensureInitialized();
  }

  // ------------------------------------------------------------------
  // Step 4c-3: AutoStop Engine (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite && state.killSwitchService && state._settingsService) {
      const autoStopConfig: AutoStopConfig = {
        consecutiveFailuresThreshold: parseInt(state._settingsService.get('autostop.consecutive_failures_threshold'), 10),
        unusualActivityThreshold: parseInt(state._settingsService.get('autostop.unusual_activity_threshold'), 10),
        unusualActivityWindowSec: parseInt(state._settingsService.get('autostop.unusual_activity_window_sec'), 10),
        idleTimeoutSec: parseInt(state._settingsService.get('autostop.idle_timeout_sec'), 10),
        idleCheckIntervalSec: parseInt(state._settingsService.get('autostop.idle_check_interval_sec'), 10),
        enabled: state._settingsService.get('autostop.enabled') === 'true',
      };

      state.autoStopService = new AutoStopService({
        sqlite: state.sqlite,
        eventBus: state.eventBus,
        killSwitchService: state.killSwitchService,
        notificationService: state.notificationService ?? undefined,
        config: autoStopConfig,
      });

      if (autoStopConfig.enabled) {
        state.autoStopService.start();
        state.logger.info('Step 4c-3: AutoStop engine started');
      } else {
        state.logger.info('Step 4c-3: AutoStop engine disabled');
      }
    }
  } catch (err) {
    console.warn('Step 4c-3 (fail-soft): AutoStop engine init warning:', err);
    state.autoStopService = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-3b: InMemoryCounter + AdminStatsService (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite) {
      state.metricsCounter = new InMemoryCounter();

      // v30.2: inject metricsCounter into AutoStopService (STAT-02)
      if (state.autoStopService) {
        state.autoStopService.setMetricsCounter(state.metricsCounter);
      }

      const { version: daemonVersion } = esmRequire('../../package.json') as { version: string };
      state.adminStatsService = new AdminStatsService({
        sqlite: state.sqlite,
        metricsCounter: state.metricsCounter,
        autoStopService: state.autoStopService ?? undefined,
        startTime: state.daemonStartTime,
        version: daemonVersion,
        dataDir,
      });
      state.logger.info('Step 4c-3b: AdminStatsService created');
    }
  } catch (err) {
    console.warn('Step 4c-3b (fail-soft): AdminStatsService init warning:', err);
    state.adminStatsService = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-4: BalanceMonitorService initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite && state.adapterPool && state._config && state._settingsService) {
      const { BalanceMonitorService: BalanceMonitorCls } = await import(
        '../services/monitoring/balance-monitor-service.js'
      );

      const monitorConfig: BalanceMonitorConfig = {
        checkIntervalSec: parseInt(state._settingsService.get('monitoring.check_interval_sec'), 10),
        lowBalanceThresholdSol: parseFloat(state._settingsService.get('monitoring.low_balance_threshold_sol')),
        lowBalanceThresholdEth: parseFloat(state._settingsService.get('monitoring.low_balance_threshold_eth')),
        cooldownHours: parseInt(state._settingsService.get('monitoring.cooldown_hours'), 10),
        enabled: state._settingsService.get('monitoring.enabled') === 'true',
      };

      state.balanceMonitorService = new BalanceMonitorCls({
        sqlite: state.sqlite,
        adapterPool: state.adapterPool,
        config: state._config,
        notificationService: state.notificationService ?? undefined,
        monitorConfig,
      });

      if (monitorConfig.enabled) {
        state.balanceMonitorService.start();
        state.logger.info('Step 4c-4: Balance monitor started');
      } else {
        state.logger.info('Step 4c-4: Balance monitor disabled');
      }
    }
  } catch (err) {
    console.warn('Step 4c-4 (fail-soft): Balance monitor init warning:', err);
    state.balanceMonitorService = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-5: TelegramBotService initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    // Read telegram settings from SettingsService (falls back to config.toml)
    const ss = state._settingsService;
    // Token priority: telegram.bot_token > notifications.telegram_bot_token > config.toml
    const botToken = (ss ? (ss.get('telegram.bot_token') || ss.get('notifications.telegram_bot_token')) : null)
      || state._config!.telegram.bot_token;
    if (botToken) {
      const { TelegramBotService, TelegramApi } = await import(
        '../infrastructure/telegram/index.js'
      );
      const telegramApi = new TelegramApi(botToken);
      const telegramLocale = ((ss ? ss.get('telegram.locale') : null)
        || state._config!.telegram.locale
        || state._config!.notifications.locale
        || 'en') as 'en' | 'ko';
      state.telegramBotService = new TelegramBotService({
        sqlite: state.sqlite!,
        api: telegramApi,
        locale: telegramLocale,
        killSwitchService: state.killSwitchService ?? undefined,
        notificationService: state.notificationService ?? undefined,
        settingsService: state._settingsService ?? undefined,
        onApproved: (txId) => state.handleApprovalApproved(txId),
      });
      state.telegramBotService.start();
      state.telegramBotRef.current = state.telegramBotService;
      state.logger.info('Step 4c-5: Telegram Bot started');
    } else {
      state.logger.info('Step 4c-5: Telegram Bot disabled');
    }
  } catch (err) {
    console.warn('Step 4c-5 (fail-soft): Telegram Bot init warning:', err);
    state.telegramBotService = null;
    state.telegramBotRef.current = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-6: WalletConnect service initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    const wcProjectId = state._settingsService?.get('walletconnect.project_id');
    if (wcProjectId) {
      const { WcSessionService } = await import('../services/wc-session-service.js');
      state.wcSessionService = new WcSessionService({
        sqlite: state.sqlite!,
        settingsService: state._settingsService!,
      });
      await state.wcSessionService.initialize();
      state.wcServiceRef.current = state.wcSessionService;
      state.logger.info('Step 4c-6: WalletConnect service initialized');
    } else {
      state.logger.info('Step 4c-6: WalletConnect disabled (no project_id)');
    }
  } catch (err) {
    console.warn('Step 4c-6 (fail-soft): WalletConnect init warning:', err);
    state.wcSessionService = null;
    state.wcServiceRef.current = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-7: WcSigningBridge (fail-soft, requires WcSessionService + ApprovalWorkflow)
  // ------------------------------------------------------------------
  try {
    if (state.wcSessionService && state.approvalWorkflow && state.sqlite) {
      const { WcSigningBridge } = await import('../services/wc-signing-bridge.js');
      state.wcSigningBridgeRef.current = new WcSigningBridge({
        wcServiceRef: state.wcServiceRef,
        approvalWorkflow: state.approvalWorkflow,
        sqlite: state.sqlite,
        notificationService: state.notificationService ?? undefined,
        eventBus: state.eventBus,
      });
      state.logger.info('Step 4c-7: WcSigningBridge initialized');
    }
  } catch (err) {
    console.warn('Step 4c-7 (fail-soft): WcSigningBridge init warning:', err);
    state.wcSigningBridgeRef.current = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-8: Signing SDK lifecycle (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state._settingsService?.get('signing_sdk.enabled') === 'true') {
      const {
        SignRequestBuilder,
        SignResponseHandler,
        WalletLinkRegistry,
        PushRelaySigningChannel,
        TelegramSigningChannel,
        ApprovalChannelRouter,
        WalletNotificationChannel,
      } = await import('../services/signing-sdk/index.js');

      const walletLinkRegistry = new WalletLinkRegistry(state._settingsService!);
      const signRequestBuilder = new SignRequestBuilder({
        settingsService: state._settingsService!,
        walletLinkRegistry,
        sqlite: state.sqlite!,  // per-wallet topic lookup from wallet_apps table
      });
      const signResponseHandler = new SignResponseHandler(
        { sqlite: state.sqlite! },
        { onApproved: (txId) => state.handleApprovalApproved(txId) },
      );
      const pushRelayChannel = new PushRelaySigningChannel({
        signRequestBuilder,
        signResponseHandler,
        settingsService: state._settingsService!,
      });

      // Conditionally create TelegramSigningChannel (only if Telegram bot is running)
      let telegramChannel: InstanceType<typeof TelegramSigningChannel> | undefined;
      if (state.telegramBotService) {
        const { TelegramApi } = await import('../infrastructure/telegram/index.js');
        const botToken =
          (state._settingsService
            ? state._settingsService.get('telegram.bot_token') ||
              state._settingsService.get('notifications.telegram_bot_token')
            : null) || state._config!.telegram.bot_token;
        if (botToken) {
          const signingTelegramApi = new TelegramApi(botToken);
          telegramChannel = new TelegramSigningChannel({
            signRequestBuilder,
            signResponseHandler,
            settingsService: state._settingsService!,
            telegramApi: signingTelegramApi,
          });
        }
      }

      state.approvalChannelRouter = new ApprovalChannelRouter({
        sqlite: state.sqlite!,
        settingsService: state._settingsService!,
        pushRelayChannel,
        telegramChannel,
      });

      // Inject signResponseHandler into TelegramBotService for /sign_response command (GAP-2: CHAN-04)
      if (state.telegramBotService) {
        state.telegramBotService.setSignResponseHandler(signResponseHandler);
        state.logger.info('Step 4c-8: signResponseHandler injected into TelegramBotService');
      }

      // Wallet Notification Side Channel (v2.7)
      const walletNotifChannel = new WalletNotificationChannel({
        sqlite: state.sqlite!,
        settingsService: state._settingsService!,
      });
      state.notificationService?.setWalletNotificationChannel(walletNotifChannel);
      state.logger.info('Step 4c-8: WalletNotificationChannel injected into NotificationService');

      state.logger.info('Step 4c-8: Signing SDK initialized (ApprovalChannelRouter + channels)');
    } else {
      state.logger.info('Step 4c-8: Signing SDK disabled');
    }
  } catch (err) {
    console.warn('Step 4c-8 (fail-soft): Signing SDK init warning:', err);
  }

  // ------------------------------------------------------------------
  // Step 4c-9: IncomingTxMonitorService initialization (fail-soft)
  // ------------------------------------------------------------------
  // Pre-create BackgroundWorkers so Step 4c-9 (incoming monitor) can register its workers.
  // startAll() is still called in Step 6 after all workers are registered.
  if (!state.workers) {
    state.workers = new BackgroundWorkers();
  }

  try {
    if (state.sqlite && state._settingsService) {
      const incoming_enabled = state._settingsService.get('incoming.enabled');
      if (incoming_enabled === 'true') {
        const { IncomingTxMonitorService: IncomingTxMonitorCls } = await import(
          '../services/incoming/incoming-tx-monitor-service.js'
        );
        // Build config from SettingsService
        const ss = state._settingsService;
        const monitorConfig = {
          enabled: true,
          pollIntervalSec: parseInt(ss.get('incoming.poll_interval') || '30', 10),
          retentionDays: parseInt(ss.get('incoming.retention_days') || '90', 10),
          dustThresholdUsd: parseFloat(ss.get('incoming.suspicious_dust_usd') || '0.01'),
          amountMultiplier: parseFloat(ss.get('incoming.suspicious_amount_multiplier') || '10'),
          cooldownMinutes: parseInt(ss.get('incoming.cooldown_minutes') || '5', 10),
        };
        // subscriberFactory creates chain-specific subscribers via dynamic import
        // URL resolution: prefer RpcPool (multi-endpoint rotation), fallback to SettingsService
        const subscriberFactory = async (chain: string, network: string) => {
          const sSvc = state._settingsService!;
          // Per-network WSS URL resolution (#193):
          // Priority: per-network key -> global incoming.wss_url -> auto-derive from RPC URL
          const resolveWssUrl = (net: string, rpcUrl: string): string => {
            const perNetwork = sSvc.get(`incoming.wss_url.${net}`);
            if (perNetwork) return perNetwork;
            const global = sSvc.get('incoming.wss_url');
            if (global) return global;
            return rpcUrl.replace(/^https:\/\//, 'wss://');
          };

          if (chain === 'solana') {
            const rpcUrl = resolveRpcUrlFromPool(state.rpcPool, sSvc.get.bind(sSvc), chain, network);
            const wssUrl = resolveWssUrl(network, rpcUrl);
            const { SolanaIncomingSubscriber } = await import('@waiaas/adapter-solana');
            const solanaMode = (sSvc.get('incoming.solana_mode') || 'adaptive') as 'websocket' | 'polling' | 'adaptive';
            return new SolanaIncomingSubscriber({
              rpcUrl,
              wsUrl: wssUrl,
              mode: solanaMode,
              logger: state.logger,
            });
          }
          // EVM chains -- dynamic URL resolution via RPC Pool (#199)
          const rpcPool = state.rpcPool;
          const resolveRpcUrlFn = () => resolveRpcUrlFromPool(rpcPool, sSvc.get.bind(sSvc), chain, network);
          const initialRpcUrl = resolveRpcUrlFn();
          const wssUrl = resolveWssUrl(network, initialRpcUrl);
          const { EvmIncomingSubscriber } = await import('@waiaas/adapter-evm');
          const ns = state.notificationService;
          // Token address resolver for getLogs address filter (#203)
          const { TokenRegistryService } = await import('../infrastructure/token-registry/index.js');
          const tokenRegistry = state._db ? new TokenRegistryService(state._db) : null;
          let cachedTokenAddresses: Address[] = [];
          let cacheExpiry = 0;
          const resolveTokenAddresses = (): Address[] => {
            const now = Date.now();
            if (now < cacheExpiry) return cachedTokenAddresses;
            // Refresh every 60s to pick up runtime token additions
            try {
              if (tokenRegistry) {
                // Synchronous access: getTokensForNetwork is async but uses sync DB
                // Use a cached snapshot refreshed periodically
                void tokenRegistry.getTokensForNetwork(network).then((tokens) => {
                  cachedTokenAddresses = tokens
                    .map((t) => t.address as Address);
                  cacheExpiry = Date.now() + 60_000;
                });
              }
            } catch { /* keep previous cache */ }
            return cachedTokenAddresses;
          };
          // Prime the cache immediately
          if (tokenRegistry) {
            try {
              const tokens = await tokenRegistry.getTokensForNetwork(network);
              cachedTokenAddresses = tokens.map((t) => t.address as Address);
              cacheExpiry = Date.now() + 60_000;
            } catch { /* empty cache is fine -- ERC-20 polling will be skipped */ }
          }
          return new EvmIncomingSubscriber({
            resolveRpcUrl: resolveRpcUrlFn,
            reportRpcFailure: (url) => rpcPool?.reportFailure(network, url),
            reportRpcSuccess: (url) => rpcPool?.reportSuccess(network, url),
            wsUrl: wssUrl !== initialRpcUrl.replace(/^https:\/\//, 'wss://') ? wssUrl : undefined,
            resolveTokenAddresses,
            onRpcAlert: ns ? (alert) => {
              ns.notify(alert.type, alert.walletId, {
                network: alert.network,
                errorCount: String(alert.errorCount),
                lastError: alert.lastError,
                ...(alert.fromBlock ? { fromBlock: alert.fromBlock } : {}),
                ...(alert.toBlock ? { toBlock: alert.toBlock } : {}),
              });
            } : undefined,
            logger: state.logger,
          });
        };
        state.incomingTxMonitorService = new IncomingTxMonitorCls({
          sqlite: state.sqlite,
          db: state._db!,
          workers: state.workers ?? new BackgroundWorkers(),
          eventBus: state.eventBus,
          killSwitchService: state.killSwitchService,
          notificationService: state.notificationService,
          subscriberFactory,
          config: monitorConfig,
          logger: state.logger,
        });
        await state.incomingTxMonitorService.start();
        state.logger.info('Step 4c-9: Incoming TX monitor started');
      } else {
        state.logger.info('Step 4c-9: Incoming TX monitor disabled');
      }
    }
  } catch (err) {
    console.warn('Step 4c-9 (fail-soft): Incoming TX monitor init warning:', err);
    state.incomingTxMonitorService = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-10: AsyncPollingService initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state._db) {
      const { AsyncPollingService } = await import('../services/async-polling-service.js');
      const { transactions: txTable } = await import('../infrastructure/database/schema.js');
      state._asyncPollingService = new AsyncPollingService(state._db, {
        emitNotification: (eventType, walletId, data) => {
          if (state.notificationService) {
            void state.notificationService.notify(
              eventType as NotificationEventType,
              walletId,
              undefined, // vars (template interpolation -- not needed for bridge events)
              data,      // details (metadata passed through to notification)
            );
          }
        },
        releaseReservation: (txId) => {
          // Reset reserved_amount and reserved_amount_usd to 0 for the transaction
          state._db!
            .update(txTable)
            .set({ reservedAmount: '0', reservedAmountUsd: null })
            .where(eq(txTable.id, txId))
            .run();
        },
        resumePipeline: (txId, walletId) => {
          // Gas condition met: re-enter pipeline at stage 4 (execute from stage 4 onward)
          void state.executeFromStage4(txId, walletId);
        },
      });
      state.logger.info('Step 4c-10: AsyncPollingService initialized (with callbacks)');
    }
  } catch (err) {
    console.warn('Step 4c-10 (fail-soft): AsyncPollingService init warning:', err);
    state._asyncPollingService = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-10.5: PositionTracker initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite && state._settingsService) {
      const trackerEnabled = state._settingsService.get('position_tracker.enabled');
      if (trackerEnabled !== 'false') {
        const { PositionTracker } = await import('../services/defi/position-tracker.js');
        state.positionTracker = new PositionTracker({
          sqlite: state.sqlite,
          settingsService: state._settingsService,
          rpcPool: state.rpcPool ?? undefined,
        });
        state.positionTracker.start();
        state.logger.info('Step 4c-10.5: Position tracker started');
      } else {
        state.logger.info('Step 4c-10.5: Position tracker disabled');
      }
    }
  } catch (err) {
    console.warn('Step 4c-10.5 (fail-soft): Position tracker init warning:', err);
    state.positionTracker = null;
  }

  // ------------------------------------------------------------------
  // Step 4c-11: DeFiMonitorService initialization (fail-soft)
  // ------------------------------------------------------------------
  try {
    const { DeFiMonitorService } = await import('../services/monitoring/defi-monitor-service.js');
    state.defiMonitorService = new DeFiMonitorService();

    // Register HealthFactorMonitor
    if (state.sqlite) {
      const { HealthFactorMonitor } = await import('../services/monitoring/health-factor-monitor.js');
      const healthMonitor = new HealthFactorMonitor({
        sqlite: state.sqlite,
        notificationService: state.notificationService ?? undefined,
        positionTracker: state.positionTracker ?? undefined,
      });
      state.defiMonitorService.register(healthMonitor);
    }

    // Register MaturityMonitor
    if (state.sqlite) {
      const { MaturityMonitor } = await import('../services/monitoring/maturity-monitor.js');
      const maturityMonitor = new MaturityMonitor({
        sqlite: state.sqlite,
        eventBus: state.eventBus,
        notificationService: state.notificationService ?? undefined,
      });
      if (state._settingsService) {
        maturityMonitor.loadFromSettings(state._settingsService);
      }
      state.defiMonitorService.register(maturityMonitor);
    }

    // Register MarginMonitor
    if (state.sqlite) {
      const { MarginMonitor } = await import('../services/monitoring/margin-monitor.js');
      const marginMonitor = new MarginMonitor({
        sqlite: state.sqlite,
        eventBus: state.eventBus,
        notificationService: state.notificationService ?? undefined,
        positionTracker: state.positionTracker ?? undefined,
      });
      if (state._settingsService) {
        marginMonitor.loadFromSettings(state._settingsService);
      }
      state.defiMonitorService.register(marginMonitor);
    }

    state.defiMonitorService.start();
    state.logger.info(`Step 4c-11: DeFi monitor service started with ${state.defiMonitorService.monitorCount} monitors`);
  } catch (err) {
    console.warn('Step 4c-11 (fail-soft): DeFi monitor service init warning:', err);
    state.defiMonitorService = null;
  }

  // ------------------------------------------------------------------
  // Step 4e: Price Oracle (fail-soft)
  // ------------------------------------------------------------------
  try {
    const { InMemoryPriceCache, PythOracle, CoinGeckoOracle, OracleChain } =
      await import('../infrastructure/oracle/index.js');

    const priceCache = new InMemoryPriceCache();
    const pythOracle = new PythOracle();

    const coingeckoApiKey = state._settingsService?.get('oracle.coingecko_api_key');
    const coingeckoOracle = coingeckoApiKey
      ? new CoinGeckoOracle(coingeckoApiKey)
      : undefined;

    const thresholdStr = state._settingsService?.get('oracle.cross_validation_threshold');
    const crossValidationThreshold = thresholdStr ? Number(thresholdStr) : 5;

    state.priceOracle = new OracleChain({
      primary: pythOracle,
      fallback: coingeckoOracle,
      cache: priceCache,
      crossValidationThreshold,
    });

    state.logger.debug(
      `Step 4e: PriceOracle initialized (Pyth primary${coingeckoOracle ? ' + CoinGecko fallback' : ''})`,
    );
  } catch (err) {
    console.warn('Step 4e (fail-soft): PriceOracle init warning:', err);
    state.priceOracle = undefined;
  }

  // ------------------------------------------------------------------
  // Step 4e-2: ForexRateService (fail-soft)
  // ------------------------------------------------------------------
  try {
    const { CoinGeckoForexProvider, ForexRateService, InMemoryPriceCache } =
      await import('../infrastructure/oracle/index.js');

    const forexCache = new InMemoryPriceCache(
      30 * 60 * 1000,      // TTL: 30 minutes
      2 * 60 * 60 * 1000,  // staleMax: 2 hours
      64,                   // maxEntries: 64 (43 currencies + headroom)
    );
    const coingeckoApiKey = state._settingsService?.get('oracle.coingecko_api_key') ?? '';
    const forexProvider = new CoinGeckoForexProvider(coingeckoApiKey);
    state.forexRateService = new ForexRateService({ forexProvider, cache: forexCache });

    state.logger.info('Step 4e-2: ForexRateService initialized (30min cache)');
  } catch (err) {
    console.warn('Step 4e-2 (fail-soft): ForexRateService init warning:', err);
    state.forexRateService = null;
  }

  // ------------------------------------------------------------------
  // Step 4f: ActionProviderRegistry (fail-soft)
  // API keys are managed by SettingsService since v29.5 (#214)
  // ------------------------------------------------------------------
  try {
    const { ActionProviderRegistry } =
      await import('../infrastructure/action/index.js');

    state.actionProviderRegistry = new ActionProviderRegistry();

    // Create IRpcCaller for Aave V3 using RpcPool eth_call.
    // RpcPool.getUrl(network) provides priority-based URL rotation with cooldown.
    const rpcCaller = state.rpcPool ? (() => {
      const pool = state.rpcPool!;
      const networkMap: Record<number, string> = {
        1: 'ethereum-mainnet',
        42161: 'arbitrum-mainnet',
        10: 'optimism-mainnet',
        137: 'polygon-mainnet',
        8453: 'base-mainnet',
      };
      return {
        call: async (params: { to: string; data: string; chainId?: number }): Promise<string> => {
          const network = params.chainId ? (networkMap[params.chainId] ?? 'ethereum-mainnet') : 'ethereum-mainnet';
          const rpcUrl = pool.getUrl(network);
          const resp = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_call',
              params: [{ to: params.to, data: params.data }, 'latest'],
            }),
          });
          const json = await resp.json() as { result?: string; error?: { message: string } };
          if (json.error) throw new Error(json.error.message);
          return json.result ?? '0x';
        },
      };
    })() : undefined;

    // Store rpcCaller for HotReloadOrchestrator use
    state.rpcCaller = rpcCaller;

    // Register built-in action providers from @waiaas/actions (reads from SettingsService)
    const { registerBuiltInProviders } = await import('@waiaas/actions');
    const actionDebugEnv = process.env.WAIAAS_ACTION_DEBUG === 'true';
    const actionLogLevel = actionDebugEnv ? 'debug' as const : state.logger.level;
    const actionLogger = new ConsoleLogger('actions', actionLogLevel);
    // #419/#420: Pass RPC URL resolver + failure reporter so Kamino/Drift use pool rotation on 429
    const rpcPool = state.rpcPool;
    const sSvc = state._settingsService!;
    const solanaRpcResolver = () => resolveRpcUrlFromPool(rpcPool, sSvc.get.bind(sSvc), 'solana', 'solana-mainnet');
    const reportSolanaRpcFailure = (url: string) => rpcPool?.reportFailure('solana-mainnet', url);
    const builtIn = registerBuiltInProviders(state.actionProviderRegistry, sSvc, { rpcCaller, logger: actionLogger, solanaRpcResolver, reportSolanaRpcFailure });
    // Capture HyperliquidMarketData for HTTP routes (Phase 349)
    if (builtIn.hyperliquidMarketData) {
      state.hyperliquidMarketData = builtIn.hyperliquidMarketData;
    }

    // Register Polymarket providers when enabled (Phase 373)
    if (state._settingsService!.get('actions.polymarket_enabled') === 'true') {
      try {
        const { createPolymarketInfrastructure } = await import('@waiaas/actions');
        const { encryptSettingValue, decryptSettingValue } = await import('../infrastructure/settings/settings-crypto.js');
        const {
          polymarketOrders: pmOrdersTable,
          polymarketPositions: pmPositionsTable,
          polymarketApiKeys: pmApiKeysTable,
        } = await import('../infrastructure/database/schema.js');
        const { eq: drizzleEq } = await import('drizzle-orm');
        const { uuidv7 } = await import('uuidv7');

        const mpHash = state.masterPassword || '';
        const db = state._db!;
        const now = () => Math.floor(Date.now() / 1000);

        // Thin DB adapters wrapping Drizzle ORM for Polymarket interfaces (snake_case mapping)
        const apiKeyDbAdapter = {
          getApiKeyByWalletId: (walletId: string) => {
            const row = db.select().from(pmApiKeysTable).where(drizzleEq(pmApiKeysTable.walletId, walletId)).get();
            if (!row) return null;
            return { id: row.id, wallet_id: row.walletId, api_key: row.apiKey, api_secret_encrypted: row.apiSecretEncrypted, api_passphrase_encrypted: row.apiPassphraseEncrypted, signature_type: row.signatureType, proxy_address: row.proxyAddress, created_at: row.createdAt };
          },
          insertApiKey: (row: Record<string, unknown>) =>
            db.insert(pmApiKeysTable).values({ id: uuidv7(), walletId: row.wallet_id as string, apiKey: row.api_key as string, apiSecretEncrypted: row.api_secret_encrypted as string, apiPassphraseEncrypted: row.api_passphrase_encrypted as string, signatureType: (row.signature_type as number) ?? 0, proxyAddress: (row.proxy_address as string) ?? null, createdAt: now() }).run(),
          deleteApiKeyByWalletId: (walletId: string) =>
            db.delete(pmApiKeysTable).where(drizzleEq(pmApiKeysTable.walletId, walletId)).run(),
        };
        const orderDbAdapter = {
          insertOrder: (row: Record<string, unknown>) =>
            db.insert(pmOrdersTable).values(row as never).run(),
          updateOrderStatus: (id: string, status: string, updatedAt: number) =>
            db.update(pmOrdersTable).set({ status, updatedAt } as never).where(drizzleEq(pmOrdersTable.id, id)).run(),
          updateOrderStatusByOrderId: (orderId: string, status: string, updatedAt: number) =>
            db.update(pmOrdersTable).set({ status, updatedAt } as never).where(drizzleEq(pmOrdersTable.orderId, orderId)).run(),
        };

        // PositionDb adapter matching the PositionDb interface
        const positionDbAdapter = {
          getPositions: (walletId: string) => {
            const rows = db.select().from(pmPositionsTable).where(drizzleEq(pmPositionsTable.walletId, walletId)).all();
            return rows.map(r => ({ id: r.id, wallet_id: r.walletId, condition_id: r.conditionId, token_id: r.tokenId, market_slug: r.marketSlug, outcome: r.outcome, size: r.size, avg_price: r.avgPrice, realized_pnl: r.realizedPnl, market_resolved: r.marketResolved, winning_outcome: r.winningOutcome, is_neg_risk: r.isNegRisk, created_at: r.createdAt, updated_at: r.updatedAt }));
          },
          getPosition: (walletId: string, tokenId: string) => {
            const rows = db.select().from(pmPositionsTable).where(drizzleEq(pmPositionsTable.walletId, walletId)).all();
            const row = rows.find(r => r.tokenId === tokenId);
            if (!row) return null;
            return { id: row.id, wallet_id: row.walletId, condition_id: row.conditionId, token_id: row.tokenId, market_slug: row.marketSlug, outcome: row.outcome, size: row.size, avg_price: row.avgPrice, realized_pnl: row.realizedPnl, market_resolved: row.marketResolved, winning_outcome: row.winningOutcome, is_neg_risk: row.isNegRisk, created_at: row.createdAt, updated_at: row.updatedAt };
          },
          upsert: (row: Record<string, unknown>) =>
            db.insert(pmPositionsTable).values(row as never)
              .onConflictDoUpdate({ target: [pmPositionsTable.walletId, pmPositionsTable.tokenId], set: row as never }).run(),
          updateResolution: (conditionId: string, winningOutcome: string) =>
            db.update(pmPositionsTable).set({ marketResolved: 1, winningOutcome, updatedAt: now() } as never).where(drizzleEq(pmPositionsTable.conditionId, conditionId)).run(),
        };

        const encryptFn = (plaintext: string) => encryptSettingValue(plaintext, mpHash);
        const decryptFn = (ciphertext: string) => decryptSettingValue(ciphertext, mpHash);
        const pmInfra = createPolymarketInfrastructure(
          {},
          { apiKeys: apiKeyDbAdapter as never, orders: orderDbAdapter, positions: positionDbAdapter as never },
          encryptFn,
          decryptFn,
        );
        state.actionProviderRegistry.register(pmInfra.orderProvider);
        state.actionProviderRegistry.register(pmInfra.ctfProvider);
        state.polymarketInfra = pmInfra as unknown as typeof state.polymarketInfra;
        state.logger.info('Step 4f-pm: Polymarket providers registered (order + ctf)');
      } catch (err) {
        console.warn('Step 4f-pm (fail-soft): Polymarket registration failed:', err);
      }
    }

    // Load plugins from ~/.waiaas/actions/ (if exists)
    const actionsDir = join(dataDir, 'actions');
    if (existsSync(actionsDir)) {
      const result = await state.actionProviderRegistry.loadPlugins(actionsDir);
      state.logger.debug(
        `Step 4f: ActionProviderRegistry initialized (${builtIn.loaded.length} built-in, ${result.loaded.length} plugins loaded, ${result.failed.length} failed)`,
      );
    } else {
      state.logger.info(`Step 4f: ActionProviderRegistry initialized (${builtIn.loaded.length} built-in, no plugins directory)`);
    }
  } catch (err) {
    console.warn('Step 4f (fail-soft): ActionProviderRegistry init warning:', err);
  }

  // ------------------------------------------------------------------
  // Step 4f-2: Register bridge status trackers when lifi is enabled
  // ------------------------------------------------------------------
  if (state._asyncPollingService && state._settingsService?.get('actions.lifi_enabled') === 'true') {
    try {
      const { BridgeStatusTracker, BridgeMonitoringTracker } = await import('@waiaas/actions');
      const lifiConfig = {
        enabled: true,
        apiBaseUrl: state._settingsService!.get('actions.lifi_api_base_url'),
        apiKey: state._settingsService!.get('actions.lifi_api_key'),
        defaultSlippagePct: Number(state._settingsService!.get('actions.lifi_default_slippage_pct')),
        maxSlippagePct: Number(state._settingsService!.get('actions.lifi_max_slippage_pct')),
        requestTimeoutMs: 15_000,
      };
      state._asyncPollingService.registerTracker(new BridgeStatusTracker(lifiConfig));
      state._asyncPollingService.registerTracker(new BridgeMonitoringTracker(lifiConfig));
      state.logger.info('Step 4f-2: Bridge status trackers registered (bridge + bridge-monitoring)');
    } catch (err) {
      console.warn('Step 4f-2 (fail-soft): Bridge tracker registration failed:', err);
    }
  }

  // ------------------------------------------------------------------
  // Step 4f-2a: Register Across bridge status trackers when across_bridge is enabled
  // ------------------------------------------------------------------
  if (state._asyncPollingService && state._settingsService?.get('actions.across_bridge_enabled') === 'true') {
    try {
      const { AcrossBridgeStatusTracker, AcrossBridgeMonitoringTracker } = await import('@waiaas/actions');
      const acrossConfig = {
        enabled: true,
        apiBaseUrl: state._settingsService!.get('actions.across_bridge_api_base_url') || 'https://app.across.to/api',
        integratorId: state._settingsService!.get('actions.across_bridge_integrator_id') || '',
        fillDeadlineBufferSec: Number(state._settingsService!.get('actions.across_bridge_fill_deadline_buffer_sec')) || 21600,
        defaultSlippagePct: Number(state._settingsService!.get('actions.across_bridge_default_slippage_pct')) || 0.01,
        maxSlippagePct: Number(state._settingsService!.get('actions.across_bridge_max_slippage_pct')) || 0.03,
        requestTimeoutMs: 10_000,
      };
      state._asyncPollingService.registerTracker(new AcrossBridgeStatusTracker(acrossConfig));
      state._asyncPollingService.registerTracker(new AcrossBridgeMonitoringTracker(acrossConfig));
      state.logger.info('Step 4f-2a: Across bridge status trackers registered (across-bridge + across-bridge-monitoring)');
    } catch (err) {
      console.warn('Step 4f-2a (fail-soft): Across bridge tracker registration failed:', err);
    }
  }

  // ------------------------------------------------------------------
  // Step 4f-3: Register staking status trackers when lido/jito is enabled
  // ------------------------------------------------------------------
  if (state._asyncPollingService) {
    try {
      if (state._settingsService?.get('actions.lido_staking_enabled') === 'true') {
        const { LidoWithdrawalTracker } = await import('@waiaas/actions');
        state._asyncPollingService.registerTracker(new LidoWithdrawalTracker());
        state.logger.info('Step 4f-3: Lido withdrawal tracker registered');
      }
      if (state._settingsService?.get('actions.jito_staking_enabled') === 'true') {
        const { JitoEpochTracker } = await import('@waiaas/actions');
        state._asyncPollingService.registerTracker(new JitoEpochTracker());
        state.logger.info('Step 4f-3: Jito epoch tracker registered');
      }
    } catch (err) {
      console.warn('Step 4f-3 (fail-soft): Staking tracker registration failed:', err);
    }
  }

  // ------------------------------------------------------------------
  // Step 4f-4: Register GasConditionTracker (gas price condition monitoring)
  // ------------------------------------------------------------------
  if (state._asyncPollingService) {
    try {
      const gasConditionEnabled = state._settingsService?.get('gas_condition.enabled') !== 'false';
      if (gasConditionEnabled) {
        const { GasConditionTracker } = await import('../pipeline/gas-condition-tracker.js');
        state._asyncPollingService.registerTracker(new GasConditionTracker());
        state.logger.info('Step 4f-4: GasConditionTracker registered');
      } else {
        state.logger.info('Step 4f-4: GasConditionTracker disabled');
      }
    } catch (err) {
      console.warn('Step 4f-4 (fail-soft): GasConditionTracker registration failed:', err);
    }
  }


  // ------------------------------------------------------------------
  // Step 4f-6: Register IPositionProvider implementations with PositionTracker
  // ------------------------------------------------------------------
  if (state.positionTracker && state.actionProviderRegistry) {
    try {
      // Check each registered provider for IPositionProvider interface (duck-typing)
      for (const meta of state.actionProviderRegistry.listProviders()) {
        const provider = state.actionProviderRegistry.getProvider(meta.name);
        if (provider && 'getPositions' in provider && 'getSupportedCategories' in provider && 'getProviderName' in provider) {
          state.positionTracker.registerProvider(provider as unknown as IPositionProvider);
          state.logger.info(`Step 4f-5: Registered ${meta.name} with PositionTracker`);
        }
      }
      state.logger.info(`Step 4f-5: PositionTracker has ${state.positionTracker.providerCount} providers`);
      // Defer initial position sync to avoid competing with IncomingTxMonitor
      // for RPC calls during startup (#431). 5s delay + 2s inter-category stagger.
      if (state.positionTracker.providerCount > 0) {
        const tracker = state.positionTracker;
        void (async () => {
          await new Promise((r) => setTimeout(r, 5_000));
          const categories = ['LENDING', 'STAKING', 'YIELD', 'PERP'] as const;
          for (const cat of categories) {
            void tracker.syncCategory(cat);
            await new Promise((r) => setTimeout(r, 2_000));
          }
        })();
      }
    } catch (err) {
      console.warn('Step 4f-5 (fail-soft): PositionTracker provider registration warning:', err);
    }
  }

  // ------------------------------------------------------------------
  // Step 4g: VersionCheckService (create before Step 5 for Health endpoint)
  // ------------------------------------------------------------------
  if (state.sqlite && state._config!.daemon.update_check) {
    const { VersionCheckService } = await import('../infrastructure/version/index.js');
    state._versionCheckService = new VersionCheckService(state.sqlite);
    if (state.notificationService) {
      state._versionCheckService.setNotificationService(state.notificationService);
    }
    state.logger.info('Step 4g: VersionCheckService created');
  }

  // ------------------------------------------------------------------
  // Step 4h: EncryptedBackupService (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite) {
      const { isAbsolute } = await import('node:path');
      const { EncryptedBackupService } = await import('../infrastructure/backup/encrypted-backup-service.js');
      const backupDir = state._config!.backup?.dir ?? 'backups';
      const backupsDir = isAbsolute(backupDir) ? backupDir : join(dataDir, backupDir);
      state._encryptedBackupService = new EncryptedBackupService(dataDir, backupsDir, state.sqlite);
      state.logger.info('Step 4h: EncryptedBackupService created');
    }
  } catch (err) {
    console.warn('Step 4h (fail-soft): EncryptedBackupService init warning:', err);
  }

  // ------------------------------------------------------------------
  // Step 4i: WebhookService (fail-soft)
  // ------------------------------------------------------------------
  try {
    if (state.sqlite && state.eventBus) {
      const { WebhookService } = await import('../services/webhook-service.js');
      state.webhookService = new WebhookService(state.sqlite, state.eventBus, () => state.masterPassword);
      state.logger.info('Step 4i: WebhookService created');
    }
  } catch (err) {
    console.warn('Step 4i (fail-soft): WebhookService init warning:', err);
  }

  // ------------------------------------------------------------------
  // Step 5: HTTP server start (5s, fail-fast)
  // ------------------------------------------------------------------
  await withTimeout(
    (async () => {
      const { createApp } = await import('../api/index.js');
      const { serve } = await import('@hono/node-server');
      const { HotReloadOrchestrator } = await import('../infrastructure/settings/index.js');

      const hotReloader = new HotReloadOrchestrator({
        settingsService: state._settingsService!,
        notificationService: state.notificationService,
        adapterPool: state.adapterPool,
        autoStopService: state.autoStopService,
        balanceMonitorService: state.balanceMonitorService,
        wcServiceRef: state.wcServiceRef,
        wcSigningBridgeRef: state.wcSigningBridgeRef,
        approvalWorkflow: state.approvalWorkflow,
        sqlite: state.sqlite,
        telegramBotRef: state.telegramBotRef,
        killSwitchService: state.killSwitchService,
        incomingTxMonitorService: state.incomingTxMonitorService,
        actionProviderRegistryRef: { current: state.actionProviderRegistry },
        rpcCaller: state.rpcCaller ?? undefined,
        daemonLogger: state.logger,
      });

      // [Phase 320] Create ReputationCacheService for REPUTATION_THRESHOLD policy evaluation
      const { ReputationCacheService } = await import('../services/erc8004/index.js');
      const reputationCacheService = new ReputationCacheService(state._db!, state._settingsService ?? undefined);

      // [#272] Create SmartAccountService for ERC-4337 CREATE2 address prediction
      const { SmartAccountService } = await import('../infrastructure/smart-account/smart-account-service.js');
      const smartAccountService = new SmartAccountService();

      // [Phase 390] Bootstrap signer capabilities for external action signing
      const { SignerCapabilityRegistry } = await import('../signing/registry.js');
      const { bootstrapSignerCapabilities } = await import('../signing/bootstrap.js');
      const signerRegistry = new SignerCapabilityRegistry();
      bootstrapSignerCapabilities(signerRegistry);

      // [Phase 422] v32.0: ContractNameRegistry for notification enrichment
      const { ContractNameRegistry } = await import('@waiaas/core');
      state.contractNameRegistry = new ContractNameRegistry();

      const app = createApp({
        db: state._db!,
        sqlite: state.sqlite ?? undefined,
        keyStore: state.keyStore!,
        masterPassword: state.masterPassword,
        masterPasswordHash: state.masterPasswordHash || undefined,
        passwordRef: state.passwordRef ?? undefined,
        config: state._config!,
        adapterPool: state.adapterPool,
        policyEngine: new DatabasePolicyEngine(
          state._db!,
          state.sqlite ?? undefined,
          state._settingsService ?? undefined,
          reputationCacheService,
        ),
        reputationCache: reputationCacheService,
        jwtSecretManager: state.jwtSecretManager ?? undefined,
        delayQueue: state.delayQueue ?? undefined,
        approvalWorkflow: state.approvalWorkflow ?? undefined,
        // Owner approve/reject routes register only when BOTH approvalWorkflow and
        // ownerLifecycle are present (transactions.ts:1069). ownerLifecycle was never
        // constructed here, so POST /v1/transactions/{id}/approve and /reject were never
        // registered and returned 404 forever -- owner approval had no REST path at all.
        // sqlite is required by the service, so fall back to undefined when unavailable.
        ownerLifecycle: state.sqlite
          ? new OwnerLifecycleService({ db: state._db!, sqlite: state.sqlite })
          : undefined,
        notificationService: state.notificationService ?? undefined,
        settingsService: state._settingsService ?? undefined,
        priceOracle: state.priceOracle,
        actionProviderRegistry: state.actionProviderRegistry ?? undefined,
        smartAccountService,
        // apiKeyStore removed in v29.5 -- API keys via SettingsService
        onSettingsChanged: (changedKeys: string[]) => {
          void hotReloader.handleChangedKeys(changedKeys);
        },
        dataDir,
        forexRateService: state.forexRateService ?? undefined,
        eventBus: state.eventBus,
        killSwitchService: state.killSwitchService ?? undefined,
        wcServiceRef: state.wcServiceRef,
        wcSigningBridgeRef: state.wcSigningBridgeRef,
        approvalChannelRouter: state.approvalChannelRouter ?? undefined,
        versionCheckService: state._versionCheckService,
        encryptedBackupService: state._encryptedBackupService ?? undefined,
        adminStatsService: state.adminStatsService ?? undefined,
        autoStopService: state.autoStopService ?? undefined,
        metricsCounter: state.metricsCounter ?? undefined,
        hyperliquidMarketData: state.hyperliquidMarketData ?? undefined,
        polymarketInfra: state.polymarketInfra ?? undefined,
        signerRegistry,
        contractNameRegistry: state.contractNameRegistry ?? undefined,
        positionTracker: state.positionTracker ?? undefined,
      });

      const hostname = state._config!.daemon.hostname;
      const port = state._config!.daemon.port;
      const server = serve({
        fetch: app.fetch,
        hostname,
        port,
      });
      state.httpServer = server;

      // v31.14: Long-poll RPC proxy support -- keep connections alive for 10 minutes
      // Default Node.js keepAliveTimeout is 5s, which is too short for DELAY/APPROVAL tier
      // long-poll responses that can take up to 600s.
      // Hono serve() returns http.Server which exposes these timeout properties.
      const httpServer = server as HttpServer;
      httpServer.keepAliveTimeout = 600_000; // 600 seconds in milliseconds
      httpServer.headersTimeout = 605_000;   // Must be > keepAliveTimeout (Node.js docs)

      // Wait for server to actually start listening (catches EADDRINUSE)
      await new Promise<void>((resolve, reject) => {
        const onListening = () => {
          server.removeListener('error', onError);
          resolve();
        };
        const onError = (err: NodeJS.ErrnoException) => {
          server.removeListener('listening', onListening);
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use. Try a different port or stop the other process.`));
          } else {
            reject(err);
          }
        };
        // @hono/node-server serve() returns a Node.js http.Server
        server.once('listening', onListening);
        server.once('error', onError);
      });

      // Discover actual port (supports port=0 for OS-assigned dynamic port)
      const addr = server.address();
      const actualPort = (typeof addr === 'object' && addr !== null) ? addr.port : port;

      // Sidecar port discovery protocol (design doc 39, section 4.2.1)
      // SidecarManager parses this from stdout to discover the daemon's port
      console.log(`WAIAAS_PORT=${actualPort}`);

      // Fallback: also write port to file for cases where stdout parsing fails
      try {
        writeFileSync(join(dataDir, 'daemon.port'), String(actualPort));
      } catch {
        // Non-critical: stdout protocol is primary, file is fallback
      }

      state.logger.debug(
        `Step 5: HTTP server listening on ${hostname}:${actualPort}`,
      );
    })(),
    5_000,
    'STEP5_HTTP_SERVER',
  );

  // ------------------------------------------------------------------
  // Step 6: Background workers + PID (no timeout, fail-soft)
  // ------------------------------------------------------------------
  await startWorkers(state, dataDir);
}

/**
 * Step 6: Register and start all background workers, write PID file.
 */
async function startWorkers(state: DaemonState, dataDir: string): Promise<void> {
  try {
    // Ensure workers instance exists (should already be created before Step 4c-9)
    if (!state.workers) {
      state.workers = new BackgroundWorkers();
    }

    // Register WAL checkpoint worker (default: 5 min = 300s)
    const walInterval = state._config!.database.wal_checkpoint_interval * 1000;
    state.workers.register('wal-checkpoint', {
      interval: walInterval,
      handler: () => {
        if (state.sqlite && !state._isShuttingDown) {
          state.sqlite.pragma('wal_checkpoint(PASSIVE)');
        }
      },
    });

    // Register session cleanup worker (1 min = 60s)
    state.workers.register('session-cleanup', {
      interval: 60_000,
      handler: () => {
        if (state.sqlite && !state._isShuttingDown) {
          // Notify expired sessions before deletion (fire-and-forget)
          if (state.notificationService) {
            try {
              const expired = state.sqlite.prepare(
                "SELECT id, wallet_id FROM sessions WHERE expires_at > 0 AND expires_at < unixepoch() AND revoked_at IS NULL",
              ).all() as Array<{ id: string; wallet_id: string }>;
              for (const session of expired) {
                void state.notificationService.notify('SESSION_EXPIRED', session.wallet_id, {
                  sessionId: session.id,
                });
              }
            } catch {
              // Fire-and-forget: never block cleanup
            }
          }
          state.sqlite.exec(
            "DELETE FROM sessions WHERE expires_at > 0 AND expires_at < unixepoch() AND revoked_at IS NULL",
          );
        }
      },
    });

    // Register delay-expired worker (every 5s: check for expired DELAY transactions)
    // #327: Process expired items sequentially with concurrency limit to prevent
    // resource exhaustion from concurrent RPC calls when many items expire at once.
    if (state.delayQueue) {
      state.workers.register('delay-expired', {
        interval: 5_000,
        handler: () => {
          if (state._isShuttingDown) return;
          const now = Math.floor(Date.now() / 1000);
          const expired = state.delayQueue!.processExpired(now);
          if (expired.length === 0) return;
          // Process sequentially (one at a time) to avoid concurrent RPC/memory pressure
          void (async () => {
            for (const tx of expired) {
              if (state._isShuttingDown) break;
              try {
                await state.executeFromStage5(tx.txId, tx.walletId);
              } catch (err) {
                console.error(`[delay-expired] executeFromStage5(${tx.txId}) error:`, err);
              }
            }
          })();
        },
      });
    }

    // Register approval-expired worker (every 30s: expire timed-out approvals)
    if (state.approvalWorkflow) {
      state.workers.register('approval-expired', {
        interval: 30_000,
        handler: () => {
          if (state._isShuttingDown) return;
          const now = Math.floor(Date.now() / 1000);
          state.approvalWorkflow!.processExpiredApprovals(now);
        },
      });
    }

    // #329: Register submitted-tx-confirm worker (every 60s)
    // Retries confirmation for transactions stuck in SUBMITTED state after Stage 6 timeout.
    // Prevents STO-03 regression where on-chain success is not reflected in DB status.
    state.workers.register('submitted-tx-confirm', {
      interval: 60_000,
      handler: async () => {
        if (state._isShuttingDown || !state._db || !state.adapterPool || !state.sqlite) return;
        try {
          const { transactions } = await import('../infrastructure/database/schema.js');
          const { eq, and, isNotNull } = await import('drizzle-orm');
          const { insertAuditLog } = await import('../infrastructure/database/audit-helper.js');

          // Find SUBMITTED transactions with txHash that are older than 60s
          const cutoff = Math.floor(Date.now() / 1000) - 60;
          const stuckTxs = state._db
            .select({
              id: transactions.id,
              txHash: transactions.txHash,
              walletId: transactions.walletId,
              chain: transactions.chain,
              network: transactions.network,
              amount: transactions.amount,
              toAddress: transactions.toAddress,
              type: transactions.type,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.status, 'SUBMITTED'),
                isNotNull(transactions.txHash),
              ),
            )
            .all()
            .filter((tx) => {
              // Only retry if created before cutoff (avoid racing with Stage 6)
              const meta = state.sqlite!.prepare('SELECT created_at FROM transactions WHERE id = ?').get(tx.id) as { created_at?: number } | undefined;
              return !meta?.created_at || meta.created_at < cutoff;
            });

          for (const tx of stuckTxs) {
            if (state._isShuttingDown || !tx.txHash || !tx.network) continue;
            try {
              const rpcUrl = resolveRpcUrl(
                state._config!.rpc,
                tx.chain,
                tx.network,
              );
              const adapter = await state.adapterPool!.resolve(
                tx.chain as ChainType,
                tx.network as NetworkType,
                rpcUrl,
              );
              const result = await adapter.waitForConfirmation(tx.txHash, 10_000);
              if (result.status === 'confirmed' || result.status === 'finalized') {
                const executedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
                state._db!
                  .update(transactions)
                  .set({ status: 'CONFIRMED', executedAt })
                  .where(eq(transactions.id, tx.id))
                  .run();
                insertAuditLog(state.sqlite!, {
                  eventType: 'TX_CONFIRMED',
                  actor: 'system',
                  walletId: tx.walletId,
                  txId: tx.id,
                  details: { txHash: tx.txHash, source: 'submitted-tx-confirm-worker', network: tx.network },
                  severity: 'info',
                });
                void state.notificationService?.notify('TX_CONFIRMED', tx.walletId, {
                  txId: tx.id,
                  txHash: tx.txHash,
                  network: tx.network,
                  amount: tx.amount ?? '',
                  to: tx.toAddress ?? '',
                  type: tx.type ?? '',
                }, { txId: tx.id });
                console.info(`[submitted-tx-confirm] ${tx.id} confirmed via background retry`);
              } else if (result.status === 'failed') {
                state._db!
                  .update(transactions)
                  .set({ status: 'FAILED', error: 'Transaction reverted on-chain (background check)' })
                  .where(eq(transactions.id, tx.id))
                  .run();
                console.warn(`[submitted-tx-confirm] ${tx.id} failed on-chain`);
              }
              // status === 'submitted': still pending, retry on next interval
            } catch (_err) {
              // Swallow individual tx errors (RPC timeout, rate limit) -- will retry next interval
            }
          }
        } catch (err) {
          console.error('[submitted-tx-confirm] worker error:', err);
        }
      },
    });

    // Register userop-build-cleanup worker (5 min = 300s)
    // Deletes expired build records from userop_builds table (10-min TTL)
    state.workers.register('userop-build-cleanup', {
      interval: 300_000,
      handler: () => {
        if (state.sqlite && !state._isShuttingDown) {
          const now = Math.floor(Date.now() / 1000);
          state.sqlite.prepare('DELETE FROM userop_builds WHERE expires_at < ?').run(now);
        }
      },
    });

    // Register credential-cleanup worker (5 min = 300s)
    // Deletes expired credentials from wallet_credentials table
    state.workers.register('credential-cleanup', {
      interval: 300_000,
      handler: () => {
        if (state.sqlite && !state._isShuttingDown) {
          const now = Math.floor(Date.now() / 1000);
          const result = state.sqlite.prepare(
            'DELETE FROM wallet_credentials WHERE expires_at IS NOT NULL AND expires_at < ?',
          ).run(now);
          if (result.changes > 0) {
            state.logger.info(`[credential-cleanup] Deleted ${result.changes} expired credential(s)`);
          }
        }
      },
    });

    // Register async-status polling worker (30s)
    if (state._asyncPollingService) {
      const pollingService = state._asyncPollingService;
      state.workers.register('async-status', {
        interval: 30_000,
        handler: async () => {
          if (state._isShuttingDown) return;
          await pollingService.pollAll();
        },
      });
    }

    // Register version-check worker (uses instance created in Step 4g)
    if (state._versionCheckService) {
      const versionCheckInterval = state._config!.daemon.update_check_interval * 1000;
      state.workers.register('version-check', {
        interval: versionCheckInterval,
        runImmediately: true,
        handler: async () => { await state._versionCheckService!.check(); },
      });
      state.logger.info('Step 6: Version check worker registered');
    } else {
      state.logger.info('Step 6: Version check disabled');
    }

    // Register backup worker (auto-backup scheduler)
    if (state._encryptedBackupService && state._config!.backup.interval > 0) {
      const backupInterval = state._config!.backup.interval * 1000; // seconds -> ms
      const retentionCount = state._config!.backup.retention_count;
      const backupService = state._encryptedBackupService;
      const masterPwd = state.masterPassword;

      state.workers.register('backup-worker', {
        interval: backupInterval,
        handler: async () => {
          if (state._isShuttingDown) return;
          try {
            const info = await backupService.createBackup(masterPwd);
            state.logger.info(`Auto-backup created: ${info.filename} (${info.size} bytes)`);
            const pruned = backupService.pruneBackups(retentionCount);
            if (pruned > 0) {
              state.logger.info(`Auto-backup: pruned ${pruned} old backup(s), keeping ${retentionCount}`);
            }
          } catch (err) {
            console.error('Auto-backup failed:', err);
          }
        },
      });
      state.logger.info(`Step 6: Backup worker registered (interval=${state._config!.backup.interval}s, retention=${retentionCount})`);
    } else {
      state.logger.info('Step 6: Backup worker disabled (interval=0 or no backup service)');
    }

    state.workers.startAll();

    // Write PID file
    state.pidPath = join(dataDir, state._config!.daemon.pid_file);
    writeFileSync(state.pidPath, String(process.pid), 'utf-8');

    state.logger.info(`Step 6: Workers started, PID file written`);
    state.logger.info(
      `WAIaaS daemon ready on http://${state._config!.daemon.hostname}:${state._config!.daemon.port} (PID: ${process.pid})\n` +
      `  Admin UI: http://${state._config!.daemon.hostname}:${state._config!.daemon.port}/admin`,
    );
  } catch (err) {
    console.warn('Step 6 (fail-soft): Worker/PID warning:', err);
  }
}
