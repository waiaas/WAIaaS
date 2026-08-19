/**
 * Hono API server factory: createApp(deps) returns a configured Hono instance.
 *
 * Middleware registration order:
 *   1. cors (dynamic origin from settingsService/config)
 *   2. requestId
 *   3. hostGuard
 *   4. killSwitchGuard
 *   5. requestLogger
 *   6. ipRateLimiter (when settingsService available)
 *
 * Auth middleware (route-level, registered on app before sub-routers):
 *   - masterAuth: /v1/wallets, /v1/policies, /v1/sessions, /v1/sessions/:id (admin operations, skips /renew)
 *   - sessionAuth: /v1/sessions/:id/renew, /v1/wallet/*, /v1/transactions/*
 *   - /health remains public (no auth required)
 *
 * Error handler is registered via app.onError.
 *
 * The returned app instance is NOT started -- starting is DaemonLifecycle's job.
 *
 * @see docs/29-api-framework-design.md
 * @see docs/52-auth-redesign.md
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';

const require = createRequire(import.meta.url);
const { version: DAEMON_VERSION } = require('../../package.json') as { version: string };

// Compute absolute path to admin static files (from dist/api/server.js -> ../../public/admin)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// In SEA/Desktop mode the bootstrap shim (build-sea.mjs) extracts admin UI
// assets to a tmp dir and exposes the path via WAIAAS_ADMIN_STATIC_ROOT.
// Falls back to the monorepo dev path when the env var is absent.
const ADMIN_STATIC_ROOT = process.env['WAIAAS_ADMIN_STATIC_ROOT']
  ?? join(__dirname, '..', '..', 'public', 'admin');

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import type { AdapterPool } from '../infrastructure/adapter-pool.js';
import {
  requestId,
  hostGuard,
  createKillSwitchGuard,
  requestLogger,
  errorHandler,
  createSessionAuth,
  createMasterAuth,
  createOwnerAuth,
  cspMiddleware,
  createIpRateLimiter,
  createSessionRateLimiter,
  createTxRateLimiter,
} from './middleware/index.js';
import type { GetKillSwitchState } from './middleware/index.js';
import { createHealthRoute } from './routes/health.js';
import type { VersionCheckService } from '../infrastructure/version/index.js';
import { walletCrudRoutes } from './routes/wallets.js';
import { sessionRoutes } from './routes/sessions.js';
import { walletRoutes } from './routes/wallet.js';
import { transactionRoutes } from './routes/transactions.js';
import { policyRoutes } from './routes/policies.js';
import { nonceRoutes } from './routes/nonce.js';
import { utilsRoutes } from './routes/utils.js';
import { skillsRoutes } from './routes/skills.js';
import { adminRoutes } from './routes/admin.js';
import type { AdminRouteDeps } from './routes/admin.js';
import type { KillSwitchState } from './routes/admin.js';
import { createWalletAppsRoutes } from './routes/wallet-apps.js';
import { tokenRegistryRoutes } from './routes/tokens.js';
import { connectInfoRoutes } from './routes/connect-info.js';
import { NftIndexerClient } from '../infrastructure/nft/nft-indexer-client.js';
import { NftMetadataCacheService } from '../services/nft-metadata-cache.js';
import { nftRoutes } from './routes/nfts.js';
import { nftApprovalRoutes } from './routes/nft-approvals.js';
import { userOpRoutes } from './routes/userop.js';
import { auditLogRoutes } from './routes/audit-logs.js';
import { erc8004Routes } from './routes/erc8004.js';
import { erc8128Routes } from './routes/erc8128.js';
import { webhookRoutes } from './routes/webhooks.js';
import { incomingRoutes } from './routes/incoming.js';
import { createStakingRoutes } from './routes/staking.js';
import { createDefiPositionRoutes } from './routes/defi-positions.js';
import { mcpTokenRoutes } from './routes/mcp.js';
import { createHyperliquidRoutes } from './routes/hyperliquid.js';
import { createPolymarketRoutes } from './routes/polymarket.js';
import { credentialRoutes } from './routes/credentials.js';
import { adminCredentialRoutes } from './routes/admin-credentials.js';
import { externalActionRoutes } from './routes/external-actions.js';
import { LocalCredentialVault } from '../infrastructure/credential/index.js';
import { rpcProxyRoutes } from './routes/rpc-proxy.js';
import type { PolymarketInfraDeps } from './routes/polymarket.js';
import type { HyperliquidMarketData } from '@waiaas/actions';
import type { MasterPasswordRef } from './middleware/master-auth.js';
import type { LocalKeyStore } from '../infrastructure/keystore/keystore.js';
import type { DaemonConfig } from '../infrastructure/config/loader.js';
import { WAIaaSError } from '@waiaas/core';
import type { IPolicyEngine, IPriceOracle, IForexRateService, EventBus } from '@waiaas/core';
import type { KillSwitchService } from '../services/kill-switch-service.js';
import type { WcServiceRef } from '../services/wc-session-service.js';
import type { WcSigningBridgeRef } from '../services/wc-signing-bridge.js';
import type { ApprovalChannelRouter } from '../services/signing-sdk/approval-channel-router.js';
import type { JwtSecretManager } from '../infrastructure/jwt/index.js';
import type { ApprovalWorkflow } from '../workflow/approval-workflow.js';
import type { DelayQueue } from '../workflow/delay-queue.js';
import type { OwnerLifecycleService } from '../workflow/owner-state.js';
import type { NotificationService } from '../notifications/notification-service.js';
import type { SettingsService } from '../infrastructure/settings/index.js';
import type { ActionProviderRegistry } from '../infrastructure/action/action-provider-registry.js';
// ApiKeyStore removed in v29.5 (#214) -- API keys now managed by SettingsService
import type * as schema from '../infrastructure/database/schema.js';
import { TokenRegistryService } from '../infrastructure/token-registry/index.js';
import { WalletLinkRegistry } from '../services/signing-sdk/wallet-link-registry.js';
import { WalletAppService } from '../services/signing-sdk/wallet-app-service.js';
import { actionRoutes } from './routes/actions.js';
import { adminActionRoutes } from './routes/admin-actions.js';
import { x402Routes } from './routes/x402.js';
import { wcRoutes, wcSessionRoutes } from './routes/wc.js';
import { DatabasePolicyEngine } from '../pipeline/database-policy-engine.js';

export interface CreateAppDeps {
  getKillSwitchState?: GetKillSwitchState;
  setKillSwitchState?: (state: string, activatedBy?: string) => void;
  requestShutdown?: () => void;
  startTime?: number; // epoch seconds for uptime calculation
  db?: BetterSQLite3Database<typeof schema>;
  sqlite?: SQLiteDatabase;
  keyStore?: LocalKeyStore;
  masterPassword?: string;
  masterPasswordHash?: string; // Argon2id hash for masterAuth middleware
  /** Mutable ref for live password/hash updates (password change API). */
  passwordRef?: MasterPasswordRef;
  config?: DaemonConfig;
  adapterPool?: AdapterPool | null;
  policyEngine?: IPolicyEngine;
  jwtSecretManager?: JwtSecretManager;
  approvalWorkflow?: ApprovalWorkflow;
  delayQueue?: DelayQueue;
  ownerLifecycle?: OwnerLifecycleService;
  notificationService?: NotificationService;
  settingsService?: SettingsService;
  priceOracle?: IPriceOracle;
  actionProviderRegistry?: ActionProviderRegistry;
  onSettingsChanged?: (changedKeys: string[]) => void;
  dataDir?: string;
  forexRateService?: IForexRateService;
  eventBus?: EventBus;
  killSwitchService?: KillSwitchService;
  wcServiceRef?: WcServiceRef;
  wcSigningBridgeRef?: WcSigningBridgeRef;
  approvalChannelRouter?: ApprovalChannelRouter;
  versionCheckService?: VersionCheckService | null;
  /** Duck-typed to avoid circular dependency with IncomingTxMonitorService */
  incomingTxMonitorService?: { syncSubscriptions(): void | Promise<void> };
  /** Duck-typed to avoid circular import with EncryptedBackupService */
  encryptedBackupService?: { createBackup(password: string): Promise<{ path: string; filename: string; size: number; created_at: string; daemon_version: string; schema_version: number; file_count: number }>; listBackups(): Array<{ path: string; filename: string; size: number; created_at: string; daemon_version: string; schema_version: number; file_count: number }>; };
  /** AdminStatsService for GET /admin/stats (STAT-01) */
  adminStatsService?: import('../services/admin-stats-service.js').AdminStatsService;
  /** AutoStopService for /admin/autostop routes (PLUG-03) */
  autoStopService?: import('../services/autostop/autostop-service.js').AutoStopService;
  /** InMemoryCounter for tx/rpc metrics (STAT-02) */
  metricsCounter?: import('@waiaas/core').IMetricsCounter;
  /** SmartAccountService for ERC-4337 CREATE2 address prediction (Phase 314) */
  smartAccountService?: import('../infrastructure/smart-account/index.js').SmartAccountService;
  /** ReputationCacheService for REPUTATION_THRESHOLD policy evaluation (Phase 320) */
  reputationCache?: import('../services/erc8004/reputation-cache-service.js').ReputationCacheService;
  /** HyperliquidMarketData for read-only query endpoints (Phase 349) */
  hyperliquidMarketData?: HyperliquidMarketData | null;
  /** PolymarketInfrastructure for read-only query endpoints (Phase 373) */
  polymarketInfra?: PolymarketInfraDeps | null;
  /** ISignerCapabilityRegistry for external_actions capability discovery (Phase 390) */
  signerRegistry?: import('../signing/registry.js').ISignerCapabilityRegistry;
  /** v32.0: ContractNameRegistry for notification enrichment */
  contractNameRegistry?: import('@waiaas/core').ContractNameRegistry;
  /** #455: PositionTracker for on-demand sync after action execution */
  positionTracker?: import('../services/defi/position-tracker.js').PositionTracker;
}

/**
 * Create a Hono app instance with all middleware and routes configured.
 *
 * @param deps - Optional dependencies (extensible for future use)
 * @returns Configured OpenAPIHono instance (not started)
 */
export function createApp(deps: CreateAppDeps = {}): OpenAPIHono {
  const app = new OpenAPIHono();

  // Register global middleware in order
  // 1. CORS: dynamic origin from settingsService (hot-reload) or config fallback (CORS-01, CORS-02)
  app.use('*', cors({
    origin: (origin) => {
      let origins: string[];
      try {
        const raw = deps.settingsService?.get('security.cors_origins');
        origins = raw ? JSON.parse(raw) as string[] : (deps.config?.security?.cors_origins ?? ['http://localhost:3100', 'http://127.0.0.1:3100']);
      } catch {
        origins = deps.config?.security?.cors_origins ?? ['http://localhost:3100', 'http://127.0.0.1:3100'];
      }
      return origins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Master-Password', 'X-Request-Id'],
  }));
  app.use('*', requestId);
  app.use('*', hostGuard);
  // killSwitchGuard: prefer KillSwitchService if available, else use callback
  const killSwitchStateGetter: GetKillSwitchState = deps.killSwitchService
    ? () => deps.killSwitchService!.getState().state
    : (deps.getKillSwitchState ?? (() => 'ACTIVE'));
  app.use('*', createKillSwitchGuard(killSwitchStateGetter));
  app.use('*', requestLogger);

  // Rate limit: IP-based global limiter (RATE-02)
  if (deps.settingsService) {
    app.use('*', createIpRateLimiter({ settingsService: deps.settingsService }));
  }

  // Register error handler
  app.onError(errorHandler);

  // Register route-level auth middleware on the app (before sub-routers)
  if (deps.masterPasswordHash !== undefined || deps.passwordRef) {
    const masterAuth = createMasterAuth({ masterPasswordHash: deps.masterPasswordHash, passwordRef: deps.passwordRef, sqlite: deps.sqlite });
    // /v1/wallets: GET allows sessionAuth or masterAuth, POST requires masterAuth only
    app.use('/v1/wallets', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          // sessionAuth will handle GET in the sessionAuth block below
          await next();
          return;
        }
        // Otherwise fall through to masterAuth (admin GET)
      }
      return masterAuth(c, next);
    });
    // /v1/policies: GET allows sessionAuth or masterAuth, others require masterAuth only
    app.use('/v1/policies', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          // sessionAuth will handle GET in the sessionAuth block below
          await next();
          return;
        }
        // Otherwise fall through to masterAuth (admin GET)
      }
      return masterAuth(c, next);
    });
    app.use('/v1/policies/:id', masterAuth);
    // masterAuth on /v1/sessions (POST create, GET list)
    app.use('/v1/sessions', masterAuth);
    // masterAuth on /v1/sessions/:id for DELETE -- skip /renew sub-path (sessionAuth handles it)
    app.use('/v1/sessions/:id', async (c, next) => {
      if (c.req.path.endsWith('/renew')) {
        await next();
        return;
      }
      return masterAuth(c, next);
    });
    // masterAuth on session-wallet management sub-routes (v26.4)
    app.use('/v1/sessions/:id/wallets', masterAuth);
    app.use('/v1/sessions/:id/wallets/*', masterAuth);
  }

  // masterAuth for GET /v1/wallets/:id (wallet detail) -- skip sub-paths with own auth
  if (deps.masterPasswordHash !== undefined || deps.passwordRef) {
    const masterAuthForWalletDetail = createMasterAuth({ masterPasswordHash: deps.masterPasswordHash, passwordRef: deps.passwordRef, sqlite: deps.sqlite });
    app.use('/v1/wallets/:id', async (c, next) => {
      // Skip sub-paths that have their own auth registered below
      if (c.req.path.includes('/owner') || c.req.path.includes('/networks') || c.req.path.includes('/wc/') || c.req.path.includes('/provider') || c.req.path.includes('/nfts') || c.req.path.includes('/actions')) {
        await next();
        return;
      }
      // GET allows sessionAuth or masterAuth (dual-auth)
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          // sessionAuth will handle GET in the sessionAuth block below
          await next();
          return;
        }
      }
      return masterAuthForWalletDetail(c, next);
    });
  }

  // masterAuth for PUT /v1/wallets/:id/owner
  if (deps.masterPasswordHash !== undefined || deps.passwordRef) {
    const masterAuthForOwner = createMasterAuth({ masterPasswordHash: deps.masterPasswordHash, passwordRef: deps.passwordRef, sqlite: deps.sqlite });
    app.use('/v1/wallets/:id/owner', masterAuthForOwner);
    // dual-auth for /v1/wallets/:id/networks: GET with sessionAuth (agent SDK), mutation with masterAuth
    app.use('/v1/wallets/:id/networks', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          await next();
          return;
        }
      }
      return masterAuthForOwner(c, next);
    });
    app.use('/v1/wallets/:id/nfts', masterAuthForOwner);
    app.use('/v1/wallets/:id/nfts/*', masterAuthForOwner);
    // dual-auth for PUT /v1/wallets/:id/provider: sessionAuth (agent self-service) or masterAuth (admin)
    app.use('/v1/wallets/:id/provider', async (c, next) => {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer wai_sess_')) {
        // sessionAuth handles agent PUT (registered in the sessionAuth block below)
        await next();
        return;
      }
      return masterAuthForOwner(c, next);
    });
  }

  // masterAuth for WalletConnect routes
  if (deps.masterPasswordHash !== undefined || deps.passwordRef) {
    const masterAuthForWc = createMasterAuth({ masterPasswordHash: deps.masterPasswordHash, passwordRef: deps.passwordRef, sqlite: deps.sqlite });
    app.use('/v1/wallets/:id/wc/*', masterAuthForWc);
  }

  if (deps.jwtSecretManager && deps.db) {
    const sessionAuth = createSessionAuth({ jwtSecretManager: deps.jwtSecretManager, db: deps.db });
    // sessionAuth for session renewal (uses own token)
    app.use('/v1/sessions/:id/renew', sessionAuth);
    app.use('/v1/wallet/*', sessionAuth);
    // sessionAuth for GET /v1/wallets/:id/networks (dual-auth: agent SDK read)
    app.use('/v1/wallets/:id/networks', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
      }
      await next();
    });
    // sessionAuth for PUT /v1/wallets/:id/provider (dual-auth: agent self-service)
    app.use('/v1/wallets/:id/provider', async (c, next) => {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer wai_sess_')) {
        return sessionAuth(c, next);
      }
      await next();
    });
    // sessionAuth for GET /v1/transactions (exact path -- wildcard won't match base)
    app.use('/v1/transactions', sessionAuth);
    app.use('/v1/transactions/*', sessionAuth);
    // sessionAuth for external actions query (GET /v1/wallets/:id/actions)
    app.use('/v1/wallets/:id/actions', sessionAuth);
    app.use('/v1/wallets/:id/actions/*', sessionAuth);
    app.use('/v1/utils/*', sessionAuth);
    // dual-auth for GET /v1/actions/providers: masterAuth (Admin UI) or sessionAuth (agent)
    app.use('/v1/actions/providers', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
        // masterAuth handles admin GET (falls through to masterAuth block below)
        await next();
        return;
      }
      return sessionAuth(c, next);
    });
    app.use('/v1/actions/*', async (c, next) => {
      // GET /v1/actions/providers is handled by dual-auth middleware above
      if (c.req.method === 'GET' && c.req.path.endsWith('/actions/providers')) {
        await next();
        return;
      }
      return sessionAuth(c, next);
    });
    app.use('/v1/x402/*', sessionAuth);
    app.use('/v1/rpc-evm/*', sessionAuth);
    app.use('/v1/connect-info', sessionAuth);
    app.use('/v1/erc8004/*', sessionAuth);
    app.use('/v1/erc8128/*', sessionAuth);
    // sessionAuth for GET /v1/wallets (dual-auth: agent read-only access, scoped to session wallets)
    app.use('/v1/wallets', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
      }
      await next();
    });
    // sessionAuth for GET /v1/wallets/:id (dual-auth: agent read-only access, verifies wallet access)
    app.use('/v1/wallets/:id', async (c, next) => {
      // Skip sub-paths that have their own sessionAuth
      if (c.req.path.includes('/owner') || c.req.path.includes('/networks') || c.req.path.includes('/wc/') || c.req.path.includes('/provider') || c.req.path.includes('/nfts') || c.req.path.includes('/actions')) {
        await next();
        return;
      }
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
      }
      await next();
    });
    // sessionAuth for GET /v1/policies and GET /v1/tokens (dual-auth: agent read-only access)
    // Only apply sessionAuth when Bearer token is present; masterAuth GET is handled above.
    app.use('/v1/policies', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
      }
      await next();
    });
    app.use('/v1/tokens', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          return sessionAuth(c, next);
        }
      }
      await next();
    });
  }

  // ownerAuth for approve and reject routes (requires DB for agent lookup)
  if (deps.db) {
    const ownerAuthFor = (action: 'approve' | 'reject' | 'verify') =>
      createOwnerAuth({ db: deps.db!, settingsService: deps.settingsService, action });
    app.use('/v1/transactions/:id/approve', ownerAuthFor('approve'));
    app.use('/v1/transactions/:id/reject', ownerAuthFor('reject'));
    app.use('/v1/wallets/:id/owner/verify', ownerAuthFor('verify'));
  }

  // masterAuth for admin routes (except GET /admin/kill-switch which is public)
  if (deps.masterPasswordHash !== undefined || deps.passwordRef) {
    const masterAuthForAdmin = createMasterAuth({ masterPasswordHash: deps.masterPasswordHash, passwordRef: deps.passwordRef, sqlite: deps.sqlite });
    app.use('/v1/admin/status', masterAuthForAdmin);
    app.use('/v1/admin/kill-switch', async (c, next) => {
      // POST requires masterAuth, GET is public
      if (c.req.method === 'POST') {
        return masterAuthForAdmin(c, next);
      }
      await next();
    });
    app.use('/v1/admin/recover', masterAuthForAdmin);
    app.use('/v1/admin/shutdown', masterAuthForAdmin);
    app.use('/v1/admin/rotate-secret', masterAuthForAdmin);
    app.use('/v1/admin/notifications/*', masterAuthForAdmin);
    app.use('/v1/admin/settings', masterAuthForAdmin);
    app.use('/v1/admin/settings/*', masterAuthForAdmin);
    app.use('/v1/admin/api-keys', masterAuthForAdmin);
    app.use('/v1/admin/api-keys/*', masterAuthForAdmin);
    app.use('/v1/admin/forex/*', masterAuthForAdmin);
    app.use('/v1/admin/kill-switch/escalate', masterAuthForAdmin);
    // /v1/tokens: GET allows sessionAuth or masterAuth, others require masterAuth only
    app.use('/v1/tokens', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          // sessionAuth will handle GET in the sessionAuth block below
          await next();
          return;
        }
        // Otherwise fall through to masterAuth (admin GET)
      }
      return masterAuthForAdmin(c, next);
    });
    app.use('/v1/mcp/tokens', masterAuthForAdmin);
    app.use('/v1/admin/wallets/*', masterAuthForAdmin);
    app.use('/v1/admin/sessions/*', masterAuthForAdmin);
    app.use('/v1/admin/telegram-users', masterAuthForAdmin);
    app.use('/v1/admin/telegram-users/*', masterAuthForAdmin);
    app.use('/v1/admin/transactions', masterAuthForAdmin);
    app.use('/v1/admin/transactions/*', masterAuthForAdmin);
    app.use('/v1/admin/incoming', masterAuthForAdmin);
    app.use('/v1/admin/rpc-status', masterAuthForAdmin);
    app.use('/v1/admin/defi/*', masterAuthForAdmin);
    app.use('/v1/admin/master-password', masterAuthForAdmin);
    // masterAuth for audit-logs query API (OPS-02)
    app.use('/v1/audit-logs', masterAuthForAdmin);
    // masterAuth for webhook CRUD API (OPS-04)
    app.use('/v1/webhooks', masterAuthForAdmin);
    app.use('/v1/webhooks/*', masterAuthForAdmin);
    // masterAuth for admin stats + autostop rules API (STAT-01, PLUG-03)
    app.use('/v1/admin/stats', masterAuthForAdmin);
    app.use('/v1/admin/autostop/*', masterAuthForAdmin);
    // masterAuth for encrypted backup API (OPS-03)
    app.use('/v1/admin/backup', masterAuthForAdmin);
    app.use('/v1/admin/backups', masterAuthForAdmin);
    // masterAuth for POST /v1/admin/actions/* (Admin UI action execution -- #273)
    app.use('/v1/admin/actions/*', masterAuthForAdmin);
    // masterAuth for credential vault API (CRED-05, CRED-06)
    app.use('/v1/admin/credentials', masterAuthForAdmin);
    app.use('/v1/admin/credentials/*', masterAuthForAdmin);
    // masterAuth for per-wallet credential CRUD (write operations)
    app.use('/v1/wallets/:id/credentials', masterAuthForAdmin);
    app.use('/v1/wallets/:id/credentials/*', masterAuthForAdmin);
    // masterAuth for GET /v1/actions/providers (Admin UI reads provider list)
    app.use('/v1/actions/providers', async (c, next) => {
      if (c.req.method === 'GET') {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer wai_sess_')) {
          // sessionAuth handles agent GET in the sessionAuth block above
          await next();
          return;
        }
        return masterAuthForAdmin(c, next);
      }
      await next();
    });
  }

  // ownerAuth for POST /v1/owner/kill-switch
  if (deps.db) {
    const ownerAuthForKillSwitch = createOwnerAuth({ db: deps.db, settingsService: deps.settingsService, action: 'verify' });
    app.use('/v1/owner/kill-switch', ownerAuthForKillSwitch);
  }

  // Rate limit: session-based limiter (RATE-02) -- after auth middleware sets sessionId
  if (deps.settingsService) {
    app.use('/v1/wallet/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/transactions/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/actions/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/x402/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/rpc-evm/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/erc8004/*', createSessionRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/erc8128/*', createSessionRateLimiter({ settingsService: deps.settingsService }));

    // Rate limit: TX-specific tighter limiter (RATE-02) -- transaction submission endpoints only
    app.use('/v1/transactions', createTxRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/actions/execute', createTxRateLimiter({ settingsService: deps.settingsService }));
    app.use('/v1/admin/actions/execute', createTxRateLimiter({ settingsService: deps.settingsService }));
  }

  // Register routes
  app.route('/health', createHealthRoute({ versionCheckService: deps.versionCheckService ?? null }));

  // Register nonce route (public, no auth required)
  app.route('/v1', nonceRoutes());

  // Register skills route (public, no auth required -- AI agent skill references)
  app.route('/v1', skillsRoutes());

  // Register utils routes (sessionAuth required -- stateless utilities)
  app.route('/v1', utilsRoutes());

  // Register wallet CRUD routes when deps are available
  const effectiveMasterPassword = deps.passwordRef?.password ?? deps.masterPassword;
  if (deps.db && deps.sqlite && deps.keyStore && effectiveMasterPassword !== undefined && deps.config) {
    app.route(
      '/v1',
      walletCrudRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        keyStore: deps.keyStore,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        config: deps.config,
        adapterPool: deps.adapterPool ?? undefined,
        notificationService: deps.notificationService,
        eventBus: deps.eventBus,
        jwtSecretManager: deps.jwtSecretManager ?? undefined,
        incomingTxMonitorService: deps.incomingTxMonitorService,
        settingsService: deps.settingsService,
        walletLinkRegistry: deps.settingsService
          ? new WalletLinkRegistry(deps.settingsService)
          : undefined,
        walletAppService: deps.sqlite
          ? new WalletAppService(deps.sqlite)
          : undefined,
        smartAccountService: deps.smartAccountService,
      }),
    );
  }

  // Register session routes when deps are available (masterAuth + JWT)
  if (deps.db && deps.jwtSecretManager && deps.config) {
    app.route(
      '/v1',
      sessionRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        jwtSecretManager: deps.jwtSecretManager,
        config: deps.config,
        settingsService: deps.settingsService,
        notificationService: deps.notificationService,
        eventBus: deps.eventBus,
      }),
    );
  }

  // Register policy routes when DB is available (masterAuth covers /v1/policies)
  if (deps.db) {
    app.route(
      '/v1',
      policyRoutes({ db: deps.db }),
    );
  }

  // Create shared TokenRegistryService for walletRoutes and tokenRegistryRoutes
  const tokenRegistryService = deps.db ? new TokenRegistryService(deps.db) : null;

  if (deps.db) {
    app.route(
      '/v1',
      walletRoutes({
        db: deps.db,
        adapterPool: deps.adapterPool ?? null,
        config: deps.config ?? null,
        tokenRegistryService,
        forexRateService: deps.forexRateService,
        settingsService: deps.settingsService,
      }),
    );
  }

  // Register incoming transaction routes (sessionAuth via /v1/wallet/* wildcard)
  if (deps.db) {
    app.route(
      '/v1',
      incomingRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        priceOracle: deps.priceOracle,
        forexRateService: deps.forexRateService,
        settingsService: deps.settingsService,
      }),
    );
  }

  // Register NFT query routes (sessionAuth via /v1/wallet/*, masterAuth via /v1/wallets/:id/nfts)
  if (deps.db && deps.settingsService) {
    const nftIndexerClient = new NftIndexerClient({ settingsService: deps.settingsService });
    const nftMetadataCacheService = new NftMetadataCacheService({ db: deps.db, nftIndexerClient });
    app.route(
      '/v1',
      nftRoutes({
        db: deps.db,
        nftIndexerClient,
        nftMetadataCacheService,
      }),
    );
  }

  // Register NFT approval routes (sessionAuth via /v1/wallet/*, masterAuth via /v1/wallets/:id/nfts/*)
  if (deps.db && deps.adapterPool) {
    app.route(
      '/v1',
      nftApprovalRoutes({
        db: deps.db,
        adapterPool: deps.adapterPool,
      }),
    );
  }

  // Register UserOp routes (masterAuth via /v1/wallets/:id/userop/*)
  if (deps.db && deps.sqlite && deps.keyStore && effectiveMasterPassword) {
    app.route(
      '/v1',
      userOpRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        keyStore: deps.keyStore,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        rpcConfig: deps.config?.rpc,
        metricsCounter: deps.metricsCounter,
        policyEngine: deps.policyEngine,
        notificationService: deps.notificationService,
        eventBus: deps.eventBus,
      }),
    );
  }

  // Register Hyperliquid query routes (GET endpoints, no pipeline)
  if (deps.db) {
    app.route(
      '',
      createHyperliquidRoutes({
        db: deps.db,
        marketData: deps.hyperliquidMarketData ?? null,
      }),
    );
  }

  // Register Polymarket query routes (GET endpoints, no pipeline)
  if (deps.db) {
    app.route(
      '',
      createPolymarketRoutes({
        db: deps.db,
        polymarketInfra: deps.polymarketInfra ?? null,
      }),
    );
  }

  // Register staking position routes (sessionAuth via /v1/wallet/* wildcard)
  if (deps.db) {
    app.route(
      '/v1',
      createStakingRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        priceOracle: deps.priceOracle,
      }),
    );
  }

  // Register DeFi position routes (sessionAuth via /v1/wallet/* wildcard)
  if (deps.db) {
    app.route(
      '/v1',
      createDefiPositionRoutes({
        db: deps.db,
        sqlite: deps.sqlite,
        actionProviderRegistry: deps.actionProviderRegistry,
      }),
    );
  }

  // Register transaction routes when all pipeline deps are available
  if (
    deps.db &&
    deps.keyStore &&
    effectiveMasterPassword !== undefined &&
    deps.adapterPool &&
    deps.policyEngine &&
    deps.config
  ) {
    app.route(
      '/v1',
      transactionRoutes({
        db: deps.db,
        adapterPool: deps.adapterPool,
        config: deps.config,
        keyStore: deps.keyStore,
        policyEngine: deps.policyEngine,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        approvalWorkflow: deps.approvalWorkflow,
        delayQueue: deps.delayQueue,
        ownerLifecycle: deps.ownerLifecycle,
        sqlite: deps.sqlite,
        notificationService: deps.notificationService,
        priceOracle: deps.priceOracle,
        settingsService: deps.settingsService,
        forexRateService: deps.forexRateService,
        eventBus: deps.eventBus,
        wcSigningBridgeRef: deps.wcSigningBridgeRef,
        approvalChannelRouter: deps.approvalChannelRouter,
        metricsCounter: deps.metricsCounter,
        reputationCache: deps.reputationCache,
        tokenRegistryService,
        contractNameRegistry: deps.contractNameRegistry,
      }),
    );
  }

  // Register action routes when registry + pipeline deps are available
  if (
    deps.actionProviderRegistry &&
    deps.settingsService &&
    deps.db &&
    deps.keyStore &&
    effectiveMasterPassword !== undefined &&
    deps.adapterPool &&
    deps.policyEngine &&
    deps.config
  ) {
    app.route(
      '/v1',
      actionRoutes({
        registry: deps.actionProviderRegistry,
        db: deps.db,
        adapterPool: deps.adapterPool,
        config: deps.config,
        keyStore: deps.keyStore,
        policyEngine: deps.policyEngine,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        approvalWorkflow: deps.approvalWorkflow,
        delayQueue: deps.delayQueue,
        ownerLifecycle: deps.ownerLifecycle,
        sqlite: deps.sqlite,
        notificationService: deps.notificationService,
        priceOracle: deps.priceOracle,
        settingsService: deps.settingsService!,
        // v30.8: Wire EIP-712 approval + ERC-8004 notification + cache invalidation deps
        wcSigningBridgeRef: deps.wcSigningBridgeRef,
        approvalChannelRouter: deps.approvalChannelRouter,
        eventBus: deps.eventBus,
        reputationCache: deps.reputationCache,
        contractNameRegistry: deps.contractNameRegistry,
        positionTracker: deps.positionTracker,
      }),
    );

    // Register admin action routes (masterAuth -- #273)
    app.route(
      '/v1',
      adminActionRoutes({
        registry: deps.actionProviderRegistry,
        db: deps.db,
        adapterPool: deps.adapterPool,
        config: deps.config,
        keyStore: deps.keyStore,
        policyEngine: deps.policyEngine,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        approvalWorkflow: deps.approvalWorkflow,
        delayQueue: deps.delayQueue,
        sqlite: deps.sqlite,
        notificationService: deps.notificationService,
        priceOracle: deps.priceOracle,
        settingsService: deps.settingsService!,
        wcSigningBridgeRef: deps.wcSigningBridgeRef,
        approvalChannelRouter: deps.approvalChannelRouter,
        eventBus: deps.eventBus,
        reputationCache: deps.reputationCache,
        contractNameRegistry: deps.contractNameRegistry,
      }),
    );
  }

  // Register x402 routes when pipeline deps + config are available
  if (
    deps.db &&
    deps.sqlite &&
    deps.keyStore &&
    effectiveMasterPassword !== undefined &&
    deps.policyEngine &&
    deps.policyEngine instanceof DatabasePolicyEngine &&
    deps.config
  ) {
    app.route('/v1', x402Routes({
      db: deps.db,
      sqlite: deps.sqlite,
      keyStore: deps.keyStore,
      policyEngine: deps.policyEngine,
      masterPassword: effectiveMasterPassword,
      passwordRef: deps.passwordRef,
      config: deps.config,
      notificationService: deps.notificationService,
      priceOracle: deps.priceOracle,
      adapterPool: deps.adapterPool ?? null,
      settingsService: deps.settingsService,
      eventBus: deps.eventBus,
    }));
  }

  // Register admin routes when DB is available
  if (deps.db) {
    // Kill switch state holder: wraps getKillSwitchState callback with enriched state
    const killSwitchHolder: KillSwitchState = {
      state: 'ACTIVE',
      activatedAt: null,
      activatedBy: null,
    };

    // Sync initial state from KillSwitchService or callback
    if (deps.killSwitchService) {
      const ksInfo = deps.killSwitchService.getState();
      killSwitchHolder.state = ksInfo.state;
      killSwitchHolder.activatedAt = ksInfo.activatedAt;
      killSwitchHolder.activatedBy = ksInfo.activatedBy;
    } else if (deps.getKillSwitchState) {
      killSwitchHolder.state = deps.getKillSwitchState();
    }

    app.route(
      '/v1',
      adminRoutes({
        db: deps.db,
        jwtSecretManager: deps.jwtSecretManager,
        passwordRef: deps.passwordRef,
        getKillSwitchState: () => killSwitchHolder,
        setKillSwitchState: (state: string, activatedBy?: string) => {
          killSwitchHolder.state = state;
          if (state === 'SUSPENDED' || state === 'LOCKED') {
            killSwitchHolder.activatedAt = Math.floor(Date.now() / 1000);
            killSwitchHolder.activatedBy = activatedBy ?? null;
          } else {
            killSwitchHolder.activatedAt = null;
            killSwitchHolder.activatedBy = null;
          }
        },
        killSwitchService: deps.killSwitchService,
        requestShutdown: deps.requestShutdown,
        startTime: deps.startTime ?? Math.floor(Date.now() / 1000),
        version: DAEMON_VERSION,
        adminTimeout: deps.config?.daemon?.admin_timeout ?? 900,
        notificationService: deps.notificationService,
        notificationConfig: deps.config?.notifications,
        settingsService: deps.settingsService,
        onSettingsChanged: deps.onSettingsChanged,
        adapterPool: deps.adapterPool ?? null,
        daemonConfig: deps.config,
        priceOracle: deps.priceOracle,
        actionProviderRegistry: deps.actionProviderRegistry,
        forexRateService: deps.forexRateService,
        sqlite: deps.sqlite,
        dataDir: deps.dataDir,
        versionCheckService: deps.versionCheckService ?? null,
        delayQueue: deps.delayQueue,
        approvalWorkflow: deps.approvalWorkflow,
        rpcPool: deps.adapterPool?.pool,
        encryptedBackupService: deps.encryptedBackupService as AdminRouteDeps['encryptedBackupService'],
        adminStatsService: deps.adminStatsService,
        autoStopService: deps.autoStopService,
        contractNameRegistry: deps.contractNameRegistry,
      }),
    );

    // Register credential vault routes (v31.12 -- CRED-05, CRED-06)
    if (effectiveMasterPassword !== undefined) {
      const vault = new LocalCredentialVault(deps.db, () => deps.passwordRef?.password ?? effectiveMasterPassword!);
      app.route('/v1', credentialRoutes({ credentialVault: vault }));
      app.route('/v1', adminCredentialRoutes({ credentialVault: vault }));
    }

    // Register external actions query routes (sessionAuth via /v1/wallets/:id/actions)
    app.route('/v1', externalActionRoutes({ db: deps.db }));

    // Register wallet apps routes (masterAuth via admin middleware)
    if (deps.sqlite) {
      app.route(
        '/v1',
        createWalletAppsRoutes({
          walletAppService: new WalletAppService(deps.sqlite),
          settingsService: deps.settingsService,
        }),
      );
    }

    // Register owner kill-switch route (ownerAuth protected)
    if (deps.killSwitchService) {
      const ownerKsRouter = new OpenAPIHono();
      const ownerKillSwitchService = deps.killSwitchService;
      ownerKsRouter.post('/owner/kill-switch', async (c) => {
        const ownerAddress = c.get('ownerAddress' as never) as string | undefined;
        const result = ownerKillSwitchService.activateWithCascade(ownerAddress ?? 'owner');
        if (!result.success) {
          throw new WAIaaSError('KILL_SWITCH_ACTIVE', {
            message: result.error ?? 'Kill switch is already active',
          });
        }
        const state = ownerKillSwitchService.getState();
        return c.json(
          {
            state: 'SUSPENDED' as const,
            activatedAt: state.activatedAt ?? Math.floor(Date.now() / 1000),
          },
          200,
        );
      });
      app.route('/v1', ownerKsRouter);
    }
  }

  // Register audit log query routes (masterAuth required)
  if (deps.sqlite) {
    app.route('/v1', auditLogRoutes({ sqlite: deps.sqlite }));
  }

  // Register webhook CRUD routes (masterAuth required)
  if (deps.sqlite && effectiveMasterPassword) {
    app.route('/v1', webhookRoutes({ sqlite: deps.sqlite, masterPassword: effectiveMasterPassword }));
  }

  // Register token registry routes when DB is available
  if (deps.db && tokenRegistryService) {
    app.route(
      '/v1',
      tokenRegistryRoutes({
        tokenRegistryService,
        rpcConfig: deps.config?.rpc,
      }),
    );
  }

  // Register MCP token provisioning routes when deps are available
  if (deps.db && deps.jwtSecretManager && deps.config && deps.dataDir) {
    app.route(
      '/v1',
      mcpTokenRoutes({
        db: deps.db,
        jwtSecretManager: deps.jwtSecretManager,
        config: deps.config,
        settingsService: deps.settingsService,
        dataDir: deps.dataDir,
        notificationService: deps.notificationService,
      }),
    );
  }

  // Register WalletConnect routes (always, with mutable WcServiceRef).
  // Handlers throw WC_NOT_CONFIGURED (503) when service is unavailable.
  // The ref pattern allows hot-reload to swap the underlying WcSessionService.
  if (deps.db) {
    const wcServiceRef = deps.wcServiceRef ?? { current: null };
    app.route('/v1', wcRoutes({ db: deps.db, wcServiceRef }));
    app.route('/v1', wcSessionRoutes({ db: deps.db, wcServiceRef }));
  }

  // Register connect-info route (sessionAuth, no masterAuth)
  if (deps.db) {
    const nftIndexerClient = deps.settingsService
      ? new NftIndexerClient({ settingsService: deps.settingsService })
      : undefined;
    app.route('/v1', connectInfoRoutes({
      db: deps.db,
      config: deps.config ?? {} as DaemonConfig,
      settingsService: deps.settingsService,
      actionProviderRegistry: deps.actionProviderRegistry,
      nftIndexerClient,
      signerRegistry: deps.signerRegistry,
      version: DAEMON_VERSION,
    }));
  }

  // Register ERC-8004 read-only routes (sessionAuth via /v1/erc8004/* wildcard)
  if (deps.db) {
    app.route('/v1', erc8004Routes({
      db: deps.db,
      settingsService: deps.settingsService,
    }));
  }

  // Register ERC-8128 signed HTTP requests routes (sessionAuth via /v1/erc8128/* wildcard)
  if (deps.db && deps.keyStore) {
    app.route('/v1', erc8128Routes({
      db: deps.db,
      keyStore: deps.keyStore,
      masterPassword: deps.masterPassword ?? '',
      passwordRef: deps.passwordRef,
      notificationService: deps.notificationService,
      settingsService: deps.settingsService,
      eventBus: deps.eventBus,
    }));
  }

  // Register RPC proxy routes when pipeline deps are available
  if (
    deps.db &&
    deps.keyStore &&
    effectiveMasterPassword !== undefined &&
    deps.adapterPool &&
    deps.policyEngine &&
    deps.config
  ) {
    app.route(
      '/v1',
      rpcProxyRoutes({
        db: deps.db,
        keyStore: deps.keyStore,
        masterPassword: effectiveMasterPassword,
        passwordRef: deps.passwordRef,
        adapterPool: deps.adapterPool,
        policyEngine: deps.policyEngine,
        config: deps.config,
        settingsService: deps.settingsService,
        eventBus: deps.eventBus,
        approvalWorkflow: deps.approvalWorkflow,
        delayQueue: deps.delayQueue,
        notificationService: deps.notificationService,
        priceOracle: deps.priceOracle,
        wcSigningBridgeRef: deps.wcSigningBridgeRef,
        approvalChannelRouter: deps.approvalChannelRouter,
        sqlite: deps.sqlite,
      }),
    );
  }

  // Register OpenAPI spec endpoint (GET /doc)
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      title: 'WAIaaS API',
      version: DAEMON_VERSION,
      description: 'AI Agent Wallet-as-a-Service REST API',
    },
  });

  // Register Admin UI static serving (conditional on config)
  if (deps.config?.daemon?.admin_ui !== false) {
    // CSP headers for admin paths
    app.use('/admin/*', cspMiddleware);

    // Serve static files from public/admin/ using absolute path
    app.use('/admin/*', serveStatic({
      root: ADMIN_STATIC_ROOT,
      rewriteRequestPath: (path: string) => path.replace(/^\/admin/, ''),
    }));

    // SPA fallback: any /admin/* path that didn't match a static file -> index.html
    app.get('/admin/*', serveStatic({
      root: ADMIN_STATIC_ROOT,
      path: 'index.html',
    }));

    // Redirect /admin to /admin/ for consistency
    app.get('/admin', (c) => c.redirect('/admin/'));
  }

  return app;
}
