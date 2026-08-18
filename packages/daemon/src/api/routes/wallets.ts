/**
 * Wallet route handlers: POST /v1/wallets, GET /v1/wallets, GET /v1/wallets/:id,
 * PUT /v1/wallets/:id/owner.
 *
 * POST /v1/wallets: create a wallet with key pair.
 * GET /v1/wallets: list all wallets (masterAuth).
 * GET /v1/wallets/:id: get wallet detail including ownerState (masterAuth).
 * PUT /v1/wallets/:id/owner: register/change owner address (masterAuth).
 *
 * v1.2: Protected by masterAuth middleware (X-Master-Password header required),
 *       applied at server level in createApp().
 *
 * @see docs/37-rest-api-complete-spec.md
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { WAIaaSError, getSingleNetwork, getNetworksForEnvironment, BUILTIN_PRESETS, AA_PROVIDER_CHAIN_MAP, type WalletPreset } from '@waiaas/core';
import type { ChainType, EnvironmentType, NetworkType, EventBus, AaProviderName, AccountType } from '@waiaas/core';
import { wallets, sessions, sessionWallets, transactions, policies, auditLog, notificationLogs, wcSessions, incomingTransactions, incomingTxCursors, defiPositions, agentIdentities, hyperliquidOrders, hyperliquidSubAccounts, useropBuilds, polymarketOrders, polymarketPositions, polymarketApiKeys } from '../../infrastructure/database/schema.js';
import { generateId } from '../../infrastructure/database/id.js';
import { insertAuditLog } from '../../infrastructure/database/audit-helper.js';
import type { MasterPasswordRef } from '../middleware/master-auth.js';
import type { LocalKeyStore } from '../../infrastructure/keystore/keystore.js';
import type { DaemonConfig } from '../../infrastructure/config/loader.js';
import type { NotificationService } from '../../notifications/notification-service.js';
import type { JwtSecretManager, JwtPayload } from '../../infrastructure/jwt/index.js';
import type * as schema from '../../infrastructure/database/schema.js';
import { resolveOwnerState, OwnerLifecycleService } from '../../workflow/owner-state.js';
import type { SettingsService } from '../../infrastructure/settings/settings-service.js';
import type { WalletLinkRegistry } from '../../services/signing-sdk/wallet-link-registry.js';
import type { WalletAppService } from '../../services/signing-sdk/wallet-app-service.js';
import { PresetAutoSetupService } from '../../services/signing-sdk/preset-auto-setup.js';
import { validateOwnerAddress } from '../middleware/address-validation.js';
import { verifyWalletAccess } from '../helpers/resolve-wallet-id.js';
import type { AdapterPool } from '../../infrastructure/adapter-pool.js';
import { resolveRpcUrl } from '../../infrastructure/adapter-pool.js';
import type { SmartAccountService } from '../../infrastructure/smart-account/index.js';
import { getFactorySupportedNetworks } from '../../infrastructure/smart-account/smart-account-service.js';
import { encryptProviderApiKey } from '../../infrastructure/smart-account/aa-provider-crypto.js';
import {
  CreateWalletRequestOpenAPI,
  WalletCreateResponseSchema,
  SetOwnerRequestSchema,
  UpdateWalletRequestSchema,
  WalletNetworksResponseSchema,
  WalletCrudResponseSchema,
  WalletOwnerResponseSchema,
  OwnerVerifyResponseSchema,
  WalletListResponseSchema,
  WalletDetailResponseSchema,
  WalletDeleteResponseSchema,
  WalletPurgeResponseSchema,
  WalletSuspendRequestSchema,
  WalletSuspendResponseSchema,
  WalletResumeResponseSchema,
  WithdrawResponseSchema,
  PatchWalletRequestSchema,
  PatchWalletResponseSchema,
  SetProviderRequestSchema,
  SetProviderResponseSchema,
  buildErrorResponses,
  openApiValidationHook,
} from './openapi-schemas.js';

export interface WalletCrudRouteDeps {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: SQLiteDatabase;
  keyStore: LocalKeyStore;
  masterPassword: string;
  /** Mutable ref for live password updates. Takes precedence over masterPassword. */
  passwordRef?: MasterPasswordRef;
  config: DaemonConfig;
  adapterPool?: AdapterPool;
  notificationService?: NotificationService;
  eventBus?: EventBus;
  jwtSecretManager?: JwtSecretManager;
  /** Duck-typed to avoid circular dependency with IncomingTxMonitorService */
  incomingTxMonitorService?: { syncSubscriptions(): void | Promise<void> };
  /** SettingsService for preset auto-setup (Phase 266). Optional for backward compat. */
  settingsService?: SettingsService;
  /** WalletLinkRegistry for preset auto-setup (Phase 266). Optional for backward compat. */
  walletLinkRegistry?: WalletLinkRegistry;
  /** WalletAppService for preset auto-registration (v29.7). Optional for backward compat. */
  walletAppService?: WalletAppService;
  /** SmartAccountService for ERC-4337 CREATE2 address prediction. Optional for backward compat. */
  smartAccountService?: SmartAccountService;
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const createWalletRoute = createRoute({
  method: 'post',
  path: '/wallets',
  tags: ['Wallets'],
  summary: 'Create a new wallet',
  request: {
    body: {
      content: {
        'application/json': { schema: CreateWalletRequestOpenAPI },
      },
    },
  },
  responses: {
    201: {
      description: 'Wallet created (with optional auto-created session)',
      content: { 'application/json': { schema: WalletCreateResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'ACTION_VALIDATION_FAILED']),
  },
});

const setOwnerRoute = createRoute({
  method: 'put',
  path: '/wallets/{id}/owner',
  tags: ['Wallets'],
  summary: 'Set wallet owner address',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: SetOwnerRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Owner updated',
      content: { 'application/json': { schema: WalletOwnerResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'OWNER_ALREADY_CONNECTED']),
  },
});

const verifyOwnerRoute = createRoute({
  method: 'post',
  path: '/wallets/{id}/owner/verify',
  tags: ['Wallets'],
  summary: 'Verify owner via signature (GRACE -> LOCKED)',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Owner verified',
      content: { 'application/json': { schema: OwnerVerifyResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'OWNER_NOT_CONNECTED', 'INVALID_SIGNATURE']),
  },
});

const listWalletsRoute = createRoute({
  method: 'get',
  path: '/wallets',
  tags: ['Wallets'],
  summary: 'List all wallets',
  responses: {
    200: {
      description: 'Wallet list',
      content: { 'application/json': { schema: WalletListResponseSchema } },
    },
  },
});

const walletDetailRoute = createRoute({
  method: 'get',
  path: '/wallets/{id}',
  tags: ['Wallets'],
  summary: 'Get wallet details',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Wallet detail with owner state',
      content: { 'application/json': { schema: WalletDetailResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND']),
  },
});

const updateWalletRoute = createRoute({
  method: 'put',
  path: '/wallets/{id}',
  tags: ['Wallets'],
  summary: 'Update wallet name',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: UpdateWalletRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Wallet updated',
      content: { 'application/json': { schema: WalletCrudResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND']),
  },
});

const patchWalletRoute = createRoute({
  method: 'patch',
  path: '/wallets/{id}',
  tags: ['Wallets'],
  summary: 'Update wallet monitoring settings',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: PatchWalletRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Wallet monitoring settings updated',
      content: { 'application/json': { schema: PatchWalletResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND']),
  },
});

const deleteWalletRoute = createRoute({
  method: 'delete',
  path: '/wallets/{id}',
  tags: ['Wallets'],
  summary: 'Terminate wallet',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Wallet terminated',
      content: { 'application/json': { schema: WalletDeleteResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'WALLET_TERMINATED']),
  },
});

const purgeWalletRoute = createRoute({
  method: 'delete',
  path: '/wallets/{id}/purge',
  tags: ['Wallets'],
  summary: 'Permanently delete a terminated wallet and all associated data',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Wallet permanently deleted',
      content: { 'application/json': { schema: WalletPurgeResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'WALLET_NOT_TERMINATED']),
  },
});

const suspendWalletRoute = createRoute({
  method: 'post',
  path: '/wallets/{id}/suspend',
  tags: ['Wallets'],
  summary: 'Suspend wallet',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: WalletSuspendRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Wallet suspended',
      content: { 'application/json': { schema: WalletSuspendResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'INVALID_STATE_TRANSITION']),
  },
});

const resumeWalletRoute = createRoute({
  method: 'post',
  path: '/wallets/{id}/resume',
  tags: ['Wallets'],
  summary: 'Resume suspended wallet',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Wallet resumed',
      content: { 'application/json': { schema: WalletResumeResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'INVALID_STATE_TRANSITION']),
  },
});

const walletNetworksRoute = createRoute({
  method: 'get',
  path: '/wallets/{id}/networks',
  tags: ['Wallets'],
  summary: 'List available networks for wallet',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Available networks',
      content: { 'application/json': { schema: WalletNetworksResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND']),
  },
});

const setProviderRoute = createRoute({
  method: 'put',
  path: '/wallets/{id}/provider',
  tags: ['Wallets'],
  summary: 'Set wallet AA provider configuration',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: SetProviderRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Provider updated',
      content: { 'application/json': { schema: SetProviderResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'ACTION_VALIDATION_FAILED', 'WALLET_ACCESS_DENIED']),
  },
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create wallet CRUD route sub-router.
 *
 * GET  /wallets -> list all wallets (masterAuth).
 * GET  /wallets/:id -> get wallet detail with ownerState (masterAuth).
 * POST /wallets -> creates wallet with key pair, inserts to DB, returns 201.
 * PUT  /wallets/:id/owner -> register/change owner address (masterAuth).
 */
export function walletCrudRoutes(deps: WalletCrudRouteDeps): OpenAPIHono {
  const router = new OpenAPIHono({ defaultHook: openApiValidationHook });
  const ownerLifecycle = new OwnerLifecycleService({ db: deps.db, sqlite: deps.sqlite });

  // ---------------------------------------------------------------------------
  // GET /wallets (list)
  // ---------------------------------------------------------------------------

  router.openapi(listWalletsRoute, async (c) => {
    const sessionId = c.get('sessionId' as never) as string | undefined;

    let allWallets;
    if (sessionId) {
      // Session-scoped: only return wallets linked to this session
      const links = deps.db
        .select({ walletId: sessionWallets.walletId })
        .from(sessionWallets)
        .where(eq(sessionWallets.sessionId, sessionId))
        .all();
      const walletIds = links.map((l) => l.walletId);
      allWallets = walletIds.length > 0
        ? deps.db.select().from(wallets).where(inArray(wallets.id, walletIds)).all()
        : [];
    } else {
      // masterAuth: return all wallets
      allWallets = await deps.db.select().from(wallets);
    }

    return c.json(
      {
        items: allWallets.map((a) => ({
          id: a.id,
          name: a.name,
          chain: a.chain,
          network: getSingleNetwork(a.chain as ChainType, a.environment as EnvironmentType) ?? a.chain,
          environment: a.environment!,
          publicKey: a.publicKey,
          status: a.status,
          ownerAddress: a.ownerAddress ?? null,
          ownerState: resolveOwnerState({
            ownerAddress: a.ownerAddress,
            ownerVerified: a.ownerVerified,
          }),
          monitorIncoming: a.monitorIncoming ?? false,
          accountType: (a.accountType ?? 'eoa') as AccountType,
          signerKey: a.signerKey ?? null,
          deployed: a.deployed ?? true,
          factoryAddress: a.factoryAddress ?? null,
          provider: buildProviderStatus({
            aaProvider: a.aaProvider ?? null,
            aaPaymasterUrl: a.aaPaymasterUrl ?? null,
          }),
          createdAt: a.createdAt ? Math.floor(a.createdAt.getTime() / 1000) : 0,
        })),
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // GET /wallets/:id (detail)
  // ---------------------------------------------------------------------------

  router.openapi(walletDetailRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    // Session-scoped: verify wallet access via session_wallets junction
    const sessionId = c.get('sessionId' as never) as string | undefined;
    if (sessionId) {
      verifyWalletAccess(sessionId, walletId, deps.db);
    }

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    const ownerState = resolveOwnerState({
      ownerAddress: wallet.ownerAddress,
      ownerVerified: wallet.ownerVerified,
    });

    const accountType = (wallet.accountType ?? 'eoa') as AccountType;
    const factoryAddr: string | null = wallet.factoryAddress ?? null;
    const networkId = getSingleNetwork(wallet.chain as ChainType, wallet.environment as EnvironmentType) ?? wallet.chain;

    // Factory supported networks (static list + optional runtime verification)
    let factorySupportedNetworks: string[] | null = null;
    let factoryVerifiedOnNetwork: boolean | null = null;
    if (accountType === 'smart' && factoryAddr) {
      factorySupportedNetworks = getFactorySupportedNetworks(factoryAddr);
      // Runtime verification via eth_getCode (best-effort, non-blocking)
      if (deps.smartAccountService && wallet.chain === 'ethereum') {
        try {
          const rpcUrl = resolveRpcUrl(
            deps.config.rpc,
            wallet.chain as ChainType,
            networkId,
          );
          if (rpcUrl) {
            const { createPublicClient, http } = await import('viem');
            const client = createPublicClient({ transport: http(rpcUrl) });
            factoryVerifiedOnNetwork = await deps.smartAccountService.verifyFactoryOnNetwork(
              factoryAddr, networkId, client,
            );
          }
        } catch {
          // RPC failure — leave as null (fallback to static list)
        }
      }
    }

    return c.json(
      {
        id: wallet.id,
        name: wallet.name,
        chain: wallet.chain,
        network: networkId,
        environment: wallet.environment!,
        publicKey: wallet.publicKey,
        status: wallet.status,
        ownerAddress: wallet.ownerAddress,
        ownerVerified: wallet.ownerVerified,
        ownerState,
        approvalMethod: wallet.ownerApprovalMethod ?? null,
        walletType: wallet.walletType ?? null,
        accountType,
        signerKey: wallet.signerKey ?? null,
        deployed: wallet.deployed ?? true,
        factoryAddress: factoryAddr,
        factorySupportedNetworks,
        factoryVerifiedOnNetwork,
        provider: buildProviderStatus({
          aaProvider: wallet.aaProvider ?? null,
          aaPaymasterUrl: wallet.aaPaymasterUrl ?? null,
        }),
        suspendedAt: wallet.suspendedAt ? Math.floor(wallet.suspendedAt.getTime() / 1000) : null,
        suspensionReason: wallet.suspensionReason ?? null,
        createdAt: wallet.createdAt ? Math.floor(wallet.createdAt.getTime() / 1000) : 0,
        updatedAt: wallet.updatedAt ? Math.floor(wallet.updatedAt.getTime() / 1000) : null,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /wallets
  // ---------------------------------------------------------------------------

  router.openapi(createWalletRoute, async (c) => {
    // OpenAPIHono validates the body automatically via createRoute schema
    const parsed = c.req.valid('json');
    const chain = parsed.chain as ChainType;
    const environment = parsed.environment as EnvironmentType;
    const accountType = parsed.accountType ?? 'eoa';

    // Smart account validation (ERC-4337)
    const aaProvider = parsed.aaProvider ?? null;
    const aaProviderApiKey = parsed.aaProviderApiKey ?? null;
    const aaBundlerUrl = parsed.aaBundlerUrl ?? null;
    const aaPaymasterUrl = parsed.aaPaymasterUrl ?? null;
    const aaPaymasterPolicyId = parsed.aaPaymasterPolicyId ?? null;

    if (accountType === 'smart') {
      // Only EVM chains support smart accounts
      if (chain === 'solana') {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'Smart accounts are only supported on EVM chains',
        });
      }

      // Feature gate check via Admin Settings
      const enabled = deps.settingsService?.get('smart_account.enabled');
      if (enabled !== 'true') {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'Smart account feature is not enabled. Enable via Admin Settings: smart_account.enabled',
        });
      }

      // aaProvider is optional: omitting creates Lite mode (UserOp Build/Sign API only)
      // Full mode requires provider configuration (set via PUT /wallets/:id/provider)
    }

    // Derive network for key generation (Solana: single network; EVM: first available)
    const network = getSingleNetwork(chain, environment)
      ?? getNetworksForEnvironment(chain, environment)[0]!;

    // Generate wallet ID
    const id = generateId();

    // Generate key pair via keystore (EOA signer for both EOA and smart accounts)
    const currentPassword = deps.passwordRef?.password ?? deps.masterPassword;
    const { publicKey } = await deps.keyStore.generateKeyPair(
      id,
      chain,
      network,
      currentPassword,
    );

    // Smart account: predict CREATE2 address using the EOA signer
    let walletPublicKey = publicKey;
    let signerKey: string | null = null;
    let deployed = true;
    let entryPoint: string | null = null;
    let factoryAddress: string | null = null;

    if (accountType === 'smart' && deps.smartAccountService) {
      // The EOA key is the signer (owner) of the smart account
      signerKey = publicKey;

      // Get entry point from settings (or default v0.7)
      entryPoint = deps.settingsService?.get('smart_account.entry_point')
        ?? '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

      const { createPublicClient, http } = await import('viem');
      const { privateKeyToAccount } = await import('viem/accounts');

      // Get the private key from keystore to create a LocalAccount for viem
      const privateKeyBytes = await deps.keyStore.decryptPrivateKey(id, currentPassword);
      const privateKeyHex = `0x${Buffer.from(privateKeyBytes).toString('hex')}` as `0x${string}`;
      const ownerAccount = privateKeyToAccount(privateKeyHex);

      // Determine viem chain from network name using EVM_CHAIN_MAP
      const { EVM_CHAIN_MAP } = await import('@waiaas/adapter-evm');
      const chainEntry = EVM_CHAIN_MAP[network as keyof typeof EVM_CHAIN_MAP];
      const viemChain = chainEntry?.viemChain;

      // Address prediction needs a live eth_call, so a single dead endpoint would
      // fail wallet creation outright (#502). Walk the RpcPool candidates instead,
      // reporting each outcome so cooldowns apply. Falls back to the config URL
      // when no pool is wired (legacy path).
      const rpcPool = deps.adapterPool?.pool;
      const isPooled = rpcPool?.hasNetwork(network) ?? false;
      const attempts = isPooled ? rpcPool!.getStatus(network).length : 1;

      let smartAccountInfo: Awaited<
        ReturnType<NonNullable<typeof deps.smartAccountService>['createSmartAccount']>
      > | null = null;
      let lastRpcError: unknown;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        let rpcUrl: string;
        if (isPooled) {
          try {
            rpcUrl = rpcPool!.getUrl(network);
          } catch (err) {
            // Every candidate is in cooldown -- stop and surface the last real error
            lastRpcError = lastRpcError ?? err;
            break;
          }
        } else {
          rpcUrl = resolveRpcUrl(deps.config.rpc, chain, network);
        }

        const client = createPublicClient({
          chain: viemChain,
          transport: http(rpcUrl),
        });

        try {
          smartAccountInfo = await deps.smartAccountService.createSmartAccount({
            owner: ownerAccount,
            client,
            entryPoint: entryPoint as `0x${string}`,
          });
          if (isPooled) rpcPool!.reportSuccess(network, rpcUrl);
          break;
        } catch (err) {
          lastRpcError = err;
          if (isPooled) rpcPool!.reportFailure(network, rpcUrl);
        }
      }

      if (!smartAccountInfo) throw lastRpcError;

      walletPublicKey = smartAccountInfo.address;
      factoryAddress = smartAccountInfo.factoryAddress;
      deployed = false;
    }

    // Insert into wallets table
    const now = new Date(Math.floor(Date.now() / 1000) * 1000); // truncate to seconds

    // Encrypt provider API key if present (PROV-04: AES-256-GCM)
    const encryptedApiKey = aaProviderApiKey
      ? encryptProviderApiKey(aaProviderApiKey, currentPassword)
      : null;

    await deps.db.insert(wallets).values({
      id,
      name: parsed.name,
      chain: parsed.chain,
      environment,
      publicKey: walletPublicKey,
      status: 'ACTIVE',
      accountType,
      signerKey,
      deployed,
      entryPoint,
      aaProvider,
      aaProviderApiKeyEncrypted: encryptedApiKey,
      aaBundlerUrl,
      aaPaymasterUrl,
      aaPaymasterPolicyId,
      factoryAddress,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log: WALLET_CREATED
    insertAuditLog(deps.sqlite, {
      eventType: 'WALLET_CREATED',
      actor: 'master',
      walletId: id,
      details: { chain: parsed.chain, environment, publicKey },
      severity: 'info',
    });

    // Auto-create session if requested (default: true)
    let session: { id: string; token: string; expiresAt: number } | null = null;

    if (parsed.createSession && deps.jwtSecretManager) {
      const nowSec = Math.floor(now.getTime() / 1000);

      const sessionId = generateId();
      // v29.9: auto-created sessions are unlimited by default
      const jwtPayload: JwtPayload = {
        sub: sessionId,
        iat: nowSec,
      };
      const token = await deps.jwtSecretManager.signToken(jwtPayload);
      const tokenHash = createHash('sha256').update(token).digest('hex');

      deps.db.insert(sessions).values({
        id: sessionId,
        tokenHash,
        expiresAt: new Date(0), // unlimited
        absoluteExpiresAt: new Date(0), // unlimited
        createdAt: now,
        renewalCount: 0,
        maxRenewals: 0, // unlimited
        constraints: null,
      }).run();

      // Insert session_wallets link (v26.4: 1:N session-wallet model)
      deps.db.insert(sessionWallets).values({
        sessionId,
        walletId: id,
        createdAt: now,
      }).run();

      session = { id: sessionId, token, expiresAt: 0 }; // unlimited

      void deps.notificationService?.notify('SESSION_CREATED', id, { sessionId });
      deps.eventBus?.emit('wallet:activity', {
        walletId: id,
        activity: 'SESSION_CREATED',
        details: { sessionId },
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    // Return 201 with wallet JSON
    return c.json(
      {
        id,
        name: parsed.name,
        chain: parsed.chain,
        network: network as string,
        environment,
        publicKey: walletPublicKey,
        status: 'ACTIVE',
        ownerAddress: null,
        ownerState: 'NONE' as const,
        monitorIncoming: false,
        accountType,
        signerKey,
        deployed,
        provider: buildProviderStatus({
          aaProvider,
          aaPaymasterUrl,
        }),
        createdAt: Math.floor(now.getTime() / 1000),
        session,
      },
      201,
    );
  });

  // ---------------------------------------------------------------------------
  // PUT /wallets/:id (update name)
  // ---------------------------------------------------------------------------

  router.openapi(updateWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');
    const body = c.req.valid('json');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await deps.db
      .update(wallets)
      .set({ name: body.name, updatedAt: now })
      .where(eq(wallets.id, walletId))
      .run();

    return c.json(
      {
        id: wallet.id,
        name: body.name,
        chain: wallet.chain,
        network: getSingleNetwork(wallet.chain as ChainType, wallet.environment as EnvironmentType) ?? wallet.chain,
        environment: wallet.environment!,
        publicKey: wallet.publicKey,
        status: wallet.status,
        ownerAddress: wallet.ownerAddress ?? null,
        ownerState: resolveOwnerState({
          ownerAddress: wallet.ownerAddress,
          ownerVerified: wallet.ownerVerified,
        }),
        monitorIncoming: wallet.monitorIncoming ?? false,
        accountType: (wallet.accountType ?? 'eoa') as AccountType,
        signerKey: wallet.signerKey ?? null,
        deployed: wallet.deployed ?? true,
        provider: buildProviderStatus({
          aaProvider: wallet.aaProvider ?? null,
          aaPaymasterUrl: wallet.aaPaymasterUrl ?? null,
        }),
        createdAt: wallet.createdAt ? Math.floor(wallet.createdAt.getTime() / 1000) : 0,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // PATCH /wallets/:id (update monitoring settings)
  // ---------------------------------------------------------------------------

  router.openapi(patchWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');
    const body = c.req.valid('json');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    if (body.monitorIncoming !== undefined) {
      await deps.db
        .update(wallets)
        .set({ monitorIncoming: body.monitorIncoming })
        .where(eq(wallets.id, walletId))
        .run();

      // Fire-and-forget: reconcile subscriptions with updated DB state
      void deps.incomingTxMonitorService?.syncSubscriptions();
    }

    // Re-fetch wallet to get updated state
    const updated = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    return c.json(
      {
        id: walletId,
        monitorIncoming: updated?.monitorIncoming ?? false,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // DELETE /wallets/:id (terminate)
  // ---------------------------------------------------------------------------

  router.openapi(deleteWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    if (wallet.status === 'TERMINATED') {
      throw new WAIaaSError('WALLET_TERMINATED', {
        message: `Wallet '${walletId}' is already terminated`,
      });
    }

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    // --- Cascade defense: process session_wallets before wallet termination ---

    // Step 1: Find all session_wallets links for this wallet
    const linkedSessions = deps.db
      .select({
        sessionId: sessionWallets.sessionId,
      })
      .from(sessionWallets)
      .where(eq(sessionWallets.walletId, walletId))
      .all();

    // Step 2: Per-session cascade defense (auto-revoke if last wallet)
    for (const link of linkedSessions) {
      // Find other wallets still linked to this session
      const otherWallets = deps.db
        .select({
          walletId: sessionWallets.walletId,
        })
        .from(sessionWallets)
        .where(and(
          eq(sessionWallets.sessionId, link.sessionId),
          sql`${sessionWallets.walletId} != ${walletId}`,
        ))
        .all();

      if (otherWallets.length === 0) {
        // Last wallet in this session -> auto-revoke the session
        deps.db
          .update(sessions)
          .set({ revokedAt: now })
          .where(eq(sessions.id, link.sessionId))
          .run();
      }
    }

    // Step 3: Remove all session_wallets links for this wallet
    deps.db
      .delete(sessionWallets)
      .where(eq(sessionWallets.walletId, walletId))
      .run();

    // --- End cascade defense ---

    // 4. Cancel pending transactions
    await deps.db
      .update(transactions)
      .set({ status: 'CANCELLED' })
      .where(
        and(
          eq(transactions.walletId, walletId),
          inArray(transactions.status, ['PENDING', 'PENDING_APPROVAL']),
        ),
      )
      .run();

    // 5. Set status to TERMINATED
    await deps.db
      .update(wallets)
      .set({ status: 'TERMINATED', updatedAt: now })
      .where(eq(wallets.id, walletId))
      .run();

    return c.json(
      {
        id: walletId,
        status: 'TERMINATED' as const,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // DELETE /wallets/:id/purge (permanent hard delete)
  // ---------------------------------------------------------------------------

  router.openapi(purgeWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    if (wallet.status !== 'TERMINATED') {
      throw new WAIaaSError('WALLET_NOT_TERMINATED', {
        message: `Wallet '${walletId}' must be terminated before purging (current: ${wallet.status})`,
      });
    }

    // Delete keystore file
    await deps.keyStore.deleteKey(walletId);

    // Cascade delete all related data (order matters for FK constraints)
    // Tables with wallet_id reference (explicit delete for safety, even if FK cascade is set)
    deps.db.delete(polymarketApiKeys).where(eq(polymarketApiKeys.walletId, walletId)).run();
    deps.db.delete(polymarketPositions).where(eq(polymarketPositions.walletId, walletId)).run();
    deps.db.delete(polymarketOrders).where(eq(polymarketOrders.walletId, walletId)).run();
    deps.db.delete(useropBuilds).where(eq(useropBuilds.walletId, walletId)).run();
    deps.db.delete(hyperliquidSubAccounts).where(eq(hyperliquidSubAccounts.walletId, walletId)).run();
    deps.db.delete(hyperliquidOrders).where(eq(hyperliquidOrders.walletId, walletId)).run();
    deps.db.delete(agentIdentities).where(eq(agentIdentities.walletId, walletId)).run();
    deps.db.delete(defiPositions).where(eq(defiPositions.walletId, walletId)).run();
    deps.db.delete(incomingTransactions).where(eq(incomingTransactions.walletId, walletId)).run();
    deps.db.delete(incomingTxCursors).where(eq(incomingTxCursors.walletId, walletId)).run();
    deps.db.delete(wcSessions).where(eq(wcSessions.walletId, walletId)).run();
    deps.db.delete(notificationLogs).where(eq(notificationLogs.walletId, walletId)).run();
    deps.db.delete(auditLog).where(eq(auditLog.walletId, walletId)).run();
    deps.db.delete(policies).where(eq(policies.walletId, walletId)).run();
    deps.db.delete(transactions).where(eq(transactions.walletId, walletId)).run();
    deps.db.delete(sessionWallets).where(eq(sessionWallets.walletId, walletId)).run();

    // Finally delete the wallet itself
    deps.db.delete(wallets).where(eq(wallets.id, walletId)).run();

    // Audit log (wallet row is already deleted, so use raw SQL helper)
    insertAuditLog(deps.sqlite, {
      eventType: 'WALLET_PURGED',
      actor: 'admin',
      walletId,
      severity: 'critical',
      details: { name: wallet.name },
    });

    return c.json(
      {
        id: walletId,
        status: 'PURGED' as const,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /wallets/:id/suspend
  // ---------------------------------------------------------------------------

  router.openapi(suspendWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');
    const body = c.req.valid('json');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    if (wallet.status !== 'ACTIVE') {
      throw new WAIaaSError('INVALID_STATE_TRANSITION', {
        message: `Cannot suspend wallet in '${wallet.status}' status. Only ACTIVE wallets can be suspended.`,
      });
    }

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    const reason = body.reason ?? 'MANUAL';

    await deps.db
      .update(wallets)
      .set({
        status: 'SUSPENDED',
        suspendedAt: now,
        suspensionReason: reason,
        updatedAt: now,
      })
      .where(eq(wallets.id, walletId))
      .run();

    // Audit log: WALLET_SUSPENDED (manual suspend)
    insertAuditLog(deps.sqlite, {
      eventType: 'WALLET_SUSPENDED',
      actor: 'master',
      walletId,
      details: { reason, previousStatus: wallet.status, trigger: 'manual' },
      severity: 'warning',
    });

    return c.json(
      {
        id: walletId,
        status: 'SUSPENDED' as const,
        suspendedAt: Math.floor(now.getTime() / 1000),
        suspensionReason: reason,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /wallets/:id/resume
  // ---------------------------------------------------------------------------

  router.openapi(resumeWalletRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    if (wallet.status !== 'SUSPENDED') {
      throw new WAIaaSError('INVALID_STATE_TRANSITION', {
        message: `Cannot resume wallet in '${wallet.status}' status. Only SUSPENDED wallets can be resumed.`,
      });
    }

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    await deps.db
      .update(wallets)
      .set({
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
        updatedAt: now,
      })
      .where(eq(wallets.id, walletId))
      .run();

    return c.json(
      {
        id: walletId,
        status: 'ACTIVE' as const,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // PUT /wallets/:id/owner
  // ---------------------------------------------------------------------------

  router.openapi(setOwnerRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    // Look up wallet
    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    // Check if LOCKED -- needs ownerAuth, not just masterAuth
    const state = resolveOwnerState({
      ownerAddress: wallet.ownerAddress,
      ownerVerified: wallet.ownerVerified,
    });

    if (state === 'LOCKED') {
      throw new WAIaaSError('OWNER_ALREADY_CONNECTED', {
        message: 'Use ownerAuth to change owner in LOCKED state',
      });
    }

    // Parse body via validated input
    const body = c.req.valid('json');
    const ownerAddress = body.owner_address;

    if (!ownerAddress || typeof ownerAddress !== 'string') {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: 'owner_address is required',
      });
    }

    // Validate owner_address format by chain type
    const validation = validateOwnerAddress(wallet.chain as ChainType, ownerAddress);
    if (!validation.valid) {
      throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
        message: `Invalid owner address for ${wallet.chain}: ${validation.error}`,
      });
    }

    // Use normalized address (EIP-55 for ethereum, as-is for solana)
    const normalizedAddress = validation.normalized!;

    // Set owner with normalized address
    ownerLifecycle.setOwner(walletId, normalizedAddress);

    // wallet_type processing
    let warning: string | null = null;
    const walletType = body.wallet_type ?? null;

    if (walletType) {
      const preset: WalletPreset = BUILTIN_PRESETS[walletType];
      // preset is guaranteed to exist since WalletPresetTypeSchema only allows builtin values

      // wallet_type + approval_method both provided: preset takes priority + warning
      if (body.approval_method !== undefined && body.approval_method !== null) {
        warning = `wallet_type '${walletType}' preset overrides approval_method. Preset value '${preset.approvalMethod}' applied instead of '${body.approval_method}'.`;
      }

      // Wrap DB changes + auto-setup in SQLite transaction for atomicity
      const txnFn = deps.sqlite.transaction(() => {
        // Save preset's approval_method and wallet_type to DB
        deps.sqlite.prepare(
          'UPDATE wallets SET owner_approval_method = ?, wallet_type = ? WHERE id = ?',
        ).run(preset.approvalMethod, walletType, walletId);

        // Auto-setup: configure signing SDK settings atomically (Phase 266)
        if (deps.settingsService && deps.walletLinkRegistry) {
          const autoSetup = new PresetAutoSetupService(
            deps.settingsService,
            deps.walletLinkRegistry,
            deps.walletAppService,
          );
          autoSetup.apply(preset);
        }
      });
      txnFn();
    } else {
      // No wallet_type: use existing approval_method logic (three-state protocol):
      //   undefined (omitted) = preserve existing value, no DB update
      //   null (explicit) = clear column to NULL (revert to Auto/global fallback)
      //   valid string = save value to DB
      if (body.approval_method !== undefined) {
        deps.sqlite.prepare(
          'UPDATE wallets SET owner_approval_method = ? WHERE id = ?',
        ).run(body.approval_method, walletId);
      }
    }

    // Audit log: OWNER_REGISTERED
    insertAuditLog(deps.sqlite, {
      eventType: 'OWNER_REGISTERED',
      actor: 'master',
      walletId,
      details: { ownerAddress: normalizedAddress, chain: wallet.chain },
      severity: 'info',
    });

    // Fire-and-forget: notify owner set
    void deps.notificationService?.notify('OWNER_SET', walletId, {
      ownerAddress: normalizedAddress,
    });

    // v1.6: emit wallet:activity OWNER_SET event
    deps.eventBus?.emit('wallet:activity', {
      walletId,
      activity: 'OWNER_SET',
      details: { ownerAddress: normalizedAddress },
      timestamp: Math.floor(Date.now() / 1000),
    });

    // Fetch updated wallet
    const updated = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    return c.json(
      {
        id: updated!.id,
        name: updated!.name,
        chain: updated!.chain,
        network: getSingleNetwork(updated!.chain as ChainType, updated!.environment as EnvironmentType) ?? updated!.chain,
        environment: updated!.environment!,
        publicKey: updated!.publicKey,
        status: updated!.status,
        ownerAddress: updated!.ownerAddress,
        ownerVerified: updated!.ownerVerified,
        approvalMethod: updated!.ownerApprovalMethod ?? null,
        walletType: updated!.walletType ?? null,
        warning,
        updatedAt: updated!.updatedAt ? Math.floor(updated!.updatedAt.getTime() / 1000) : null,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /wallets/:id/owner/verify
  // ---------------------------------------------------------------------------

  router.openapi(verifyOwnerRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    const state = resolveOwnerState({
      ownerAddress: wallet.ownerAddress,
      ownerVerified: wallet.ownerVerified,
    });

    if (state === 'NONE') {
      throw new WAIaaSError('OWNER_NOT_CONNECTED', {
        message: 'No owner address registered for this wallet',
      });
    }

    if (state === 'LOCKED') {
      // Already verified, no-op
      return c.json(
        {
          ownerState: 'LOCKED' as const,
          ownerAddress: wallet.ownerAddress,
          ownerVerified: true,
        },
        200,
      );
    }

    // GRACE -> LOCKED: ownerAuth middleware already verified the signature
    ownerLifecycle.markOwnerVerified(walletId);

    return c.json(
      {
        ownerState: 'LOCKED' as const,
        ownerAddress: wallet.ownerAddress,
        ownerVerified: true,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // GET /wallets/:id/networks
  // ---------------------------------------------------------------------------

  router.openapi(walletNetworksRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    const networks = getNetworksForEnvironment(
      wallet.chain as ChainType,
      wallet.environment as EnvironmentType,
    );

    return c.json(
      {
        id: wallet.id,
        chain: wallet.chain,
        environment: wallet.environment!,
        availableNetworks: networks.map((n) => ({
          network: n,
        })),
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /wallets/:id/withdraw
  // ---------------------------------------------------------------------------

  const withdrawRoute = createRoute({
    method: 'post',
    path: '/wallets/{id}/withdraw',
    tags: ['Wallets'],
    summary: 'Withdraw all assets to owner address',
    request: {
      params: z.object({ id: z.string().uuid() }),
    },
    responses: {
      200: {
        description: 'Sweep results per asset',
        content: { 'application/json': { schema: WithdrawResponseSchema } },
      },
      ...buildErrorResponses(['WALLET_NOT_FOUND', 'NO_OWNER', 'WITHDRAW_LOCKED_ONLY', 'SWEEP_TOTAL_FAILURE']),
    },
  });

  router.openapi(withdrawRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND');
    }

    // Validate owner state: must be LOCKED
    const ownerState = resolveOwnerState(wallet);
    if (ownerState === 'NONE') {
      throw new WAIaaSError('NO_OWNER');
    }
    if (ownerState !== 'LOCKED') {
      throw new WAIaaSError('WITHDRAW_LOCKED_ONLY');
    }

    if (!deps.adapterPool) {
      throw new WAIaaSError('ADAPTER_NOT_AVAILABLE');
    }

    // Resolve adapter -- use getSingleNetwork for Solana, first network for EVM
    const singleNetwork = getSingleNetwork(wallet.chain as ChainType, wallet.environment as EnvironmentType);
    const withdrawNetwork = singleNetwork ?? getNetworksForEnvironment(wallet.chain as ChainType, wallet.environment as EnvironmentType)[0]!;
    const rpcUrl = resolveRpcUrl(
      deps.config.rpc,
      wallet.chain,
      withdrawNetwork,
    );
    const adapter = await deps.adapterPool.resolve(
      wallet.chain as ChainType,
      withdrawNetwork as NetworkType,
      rpcUrl,
    );

    // Decrypt private key
    const privateKey = await deps.keyStore.decryptPrivateKey(
      walletId,
      deps.passwordRef?.password ?? deps.masterPassword,
    );

    // Sweep all assets to owner address
    if (!adapter.sweepAll) {
      throw new WAIaaSError('CHAIN_ERROR', { message: 'sweepAll not supported for this chain' });
    }
    const sweepResult = await adapter.sweepAll(
      wallet.publicKey,
      wallet.ownerAddress!,
      privateKey,
    );

    if (sweepResult.succeeded === 0 && sweepResult.total > 0) {
      throw new WAIaaSError('SWEEP_TOTAL_FAILURE');
    }

    return c.json(
      {
        total: sweepResult.total,
        succeeded: sweepResult.succeeded,
        failed: sweepResult.failed,
        results: sweepResult.results.map((r) => ({
          asset: r.mint,
          amount: r.amount.toString(),
          txHash: r.txHash,
          error: r.error,
          status: r.txHash ? ('success' as const) : ('failed' as const),
        })),
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // PUT /wallets/:id/provider (set AA provider)
  // ---------------------------------------------------------------------------

  router.openapi(setProviderRoute, async (c) => {
    const { id: walletId } = c.req.valid('param');

    // SessionAuth access control: verify wallet ownership
    const sessionId = c.get('sessionId' as never) as string | undefined;
    if (sessionId) {
      verifyWalletAccess(sessionId, walletId, deps.db);
    }

    const wallet = await deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .get();

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    // Only smart account wallets can have providers
    if (wallet.accountType !== 'smart') {
      throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
        message: 'Provider configuration is only available for smart account wallets',
      });
    }

    const body = c.req.valid('json');
    const provider = body.provider;

    // Encrypt API key if present
    const currentPassword = deps.passwordRef?.password ?? deps.masterPassword;
    const encryptedApiKey = body.apiKey
      ? encryptProviderApiKey(body.apiKey, currentPassword)
      : null;

    // Determine bundler/paymaster URLs
    let bundlerUrl: string | null = null;
    let paymasterUrl: string | null = null;

    if (provider === 'custom') {
      bundlerUrl = body.bundlerUrl ?? null;
      paymasterUrl = body.paymasterUrl ?? null;
    }
    // For preset providers, URLs are derived at runtime from chain mapping -- no need to store

    // #252: policyId applies to all provider types (Alchemy required, Pimlico optional)
    const policyId = body.policyId ?? null;

    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await deps.db
      .update(wallets)
      .set({
        aaProvider: provider,
        aaProviderApiKeyEncrypted: encryptedApiKey,
        aaBundlerUrl: bundlerUrl,
        aaPaymasterUrl: paymasterUrl,
        aaPaymasterPolicyId: policyId,
        updatedAt: now,
      })
      .where(eq(wallets.id, walletId))
      .run();

    // Build provider status for response
    const providerStatus = buildProviderStatus({
      aaProvider: provider,
      aaPaymasterUrl: paymasterUrl,
    })!;

    // Audit log
    const actor = sessionId ? `session:${sessionId}` : 'master';
    insertAuditLog(deps.sqlite, {
      eventType: 'PROVIDER_UPDATED',
      actor,
      walletId,
      details: { provider },
      severity: 'info',
    });

    return c.json(
      {
        id: walletId,
        provider: providerStatus,
        updatedAt: Math.floor(now.getTime() / 1000),
      },
      200,
    );
  });

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a wallet is a Lite mode Smart Account (no provider configured).
 * Lite mode wallets cannot send transactions directly -- they must use the
 * UserOp Build/Sign API for external gas sponsorship.
 */
export function isLiteModeSmartAccount(wallet: { accountType: string; aaProvider: string | null }): boolean {
  return wallet.accountType === 'smart' && !wallet.aaProvider;
}

/**
 * Create a WAIaaSError for Lite mode send attempts.
 * Returns CHAIN_ERROR with guidance to use userop API.
 */
export function getLiteModeError(): WAIaaSError {
  return new WAIaaSError('CHAIN_ERROR', {
    message: 'Smart Account in Lite mode cannot send transactions directly. Use POST /v1/wallets/:id/userop/build and POST /v1/wallets/:id/userop/sign to construct and sign UserOperations for external sponsorship.',
  });
}

/**
 * Build provider status from wallet DB record for API responses.
 * Returns null if wallet has no provider configured.
 */
export function buildProviderStatus(wallet: { aaProvider: string | null; aaPaymasterUrl?: string | null }): { name: AaProviderName; supportedChains: string[]; paymasterEnabled: boolean } | null {
  if (!wallet.aaProvider) return null;
  const provider = wallet.aaProvider as AaProviderName;
  if (provider === 'custom') {
    return {
      name: 'custom' as const,
      supportedChains: [],
      paymasterEnabled: !!wallet.aaPaymasterUrl,
    };
  }
  // Preset provider: derive supportedChains from AA_PROVIDER_CHAIN_MAP
  const chains = Object.keys(AA_PROVIDER_CHAIN_MAP[provider]);
  return {
    name: provider,
    supportedChains: chains,
    paymasterEnabled: true,
  };
}
