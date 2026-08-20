/**
 * Transaction routes: POST /v1/transactions/send, POST /v1/transactions/sign,
 * GET /v1/transactions/:id, POST /v1/transactions/:id/approve,
 * POST /v1/transactions/:id/reject, POST /v1/transactions/:id/cancel.
 *
 * POST /v1/transactions/send:
 *   - Requires sessionAuth (Authorization: Bearer wai_sess_<token>),
 *     applied at server level in createApp()
 *   - Parses body with SendTransactionRequestSchema
 *   - Stage 1 runs synchronously (DB INSERT -> returns 201 with txId)
 *   - Stages 2-6 run asynchronously (fire-and-forget with error catching)
 *
 * GET /v1/transactions/:id:
 *   - Requires sessionAuth
 *   - Returns transaction status JSON
 *   - 404 if not found
 *
 * v1.2: Wallet identification via JWT walletId from sessionAuth context.
 *
 * @see docs/37-rest-api-complete-spec.md
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, and, inArray, lt, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import { WAIaaSError, formatAmount, parseAmount, enrichTransaction } from '@waiaas/core';
import type { ChainType, NetworkType, EnvironmentType, IPolicyEngine } from '@waiaas/core';
import type { TokenRegistryService } from '../../infrastructure/token-registry/token-registry-service.js';
import { resolveTokenFromAssetId } from '../middleware/resolve-asset.js';
import type { AdapterPool } from '../../infrastructure/adapter-pool.js';
import { resolveRpcUrl } from '../../infrastructure/adapter-pool.js';
import type { MasterPasswordRef } from '../middleware/master-auth.js';
import type { DaemonConfig } from '../../infrastructure/config/loader.js';
import { wallets, transactions } from '../../infrastructure/database/schema.js';
import type { LocalKeyStore } from '../../infrastructure/keystore/keystore.js';
import type * as schema from '../../infrastructure/database/schema.js';
import {
  stage1Validate,
  stage2Auth,
  stage3Policy,
  stageGasCondition,
  stage4Wait,
  stage5Execute,
  stage6Confirm,
} from '../../pipeline/stages.js';
import type { PipelineContext } from '../../pipeline/stages.js';
import { resolveNetwork } from '../../pipeline/network-resolver.js';
import type { ApprovalWorkflow } from '../../workflow/approval-workflow.js';
import type { DelayQueue } from '../../workflow/delay-queue.js';
import type { OwnerLifecycleService } from '../../workflow/owner-state.js';
import type { NotificationService } from '../../notifications/notification-service.js';
import type { IPriceOracle, IForexRateService, EventBus, IMetricsCounter } from '@waiaas/core';
import type { SettingsService } from '../../infrastructure/settings/settings-service.js';
import type { WcSigningBridgeRef } from '../../services/wc-signing-bridge.js';
import type { ApprovalChannelRouter } from '../../services/signing-sdk/approval-channel-router.js';
import {
  TransactionRequestOpenAPI,
  TransferRequestOpenAPI,
  TokenTransferRequestOpenAPI,
  ContractCallRequestOpenAPI,
  ApproveRequestOpenAPI,
  BatchRequestOpenAPI,
  SendTransactionRequestOpenAPI,
  TxSendResponseSchema,
  TxDetailResponseSchema,
  TxListResponseSchema,
  TxPendingListResponseSchema,
  TxApproveResponseSchema,
  TxRejectResponseSchema,
  TxCancelResponseSchema,
  TxSignRequestSchema,
  TxSignResponseSchema,
  TxSignMessageRequestSchema,
  TxSignMessageResponseSchema,
  DryRunSimulationResultOpenAPI,
  buildErrorResponses,
  openApiValidationHook,
} from './openapi-schemas.js';
import { executeSignOnly } from '../../pipeline/sign-only.js';
import { executeSignMessage } from '../../pipeline/sign-message.js';
import { TransactionPipeline } from '../../pipeline/pipeline.js';
import { resolveDisplayCurrencyCode, fetchDisplayRate, toDisplayAmount } from './display-currency-helper.js';
import { resolveWalletId, verifyWalletAccess } from '../helpers/resolve-wallet-id.js';
import { isLiteModeSmartAccount, getLiteModeError } from './wallets.js';
import { resolveContractFields } from './admin-monitoring.js';

export interface TransactionRouteDeps {
  db: BetterSQLite3Database<typeof schema>;
  adapterPool: AdapterPool;
  config: DaemonConfig;
  keyStore: LocalKeyStore;
  policyEngine: IPolicyEngine;
  masterPassword: string;
  /** Mutable ref for live password updates. Takes precedence over masterPassword. */
  passwordRef?: MasterPasswordRef;
  approvalWorkflow?: ApprovalWorkflow;
  delayQueue?: DelayQueue;
  ownerLifecycle?: OwnerLifecycleService;
  sqlite?: SQLiteDatabase;
  notificationService?: NotificationService;
  priceOracle?: IPriceOracle;
  settingsService?: SettingsService;
  forexRateService?: IForexRateService;
  eventBus?: EventBus;
  wcSigningBridgeRef?: WcSigningBridgeRef;
  approvalChannelRouter?: ApprovalChannelRouter;
  // v30.2: metrics counter for tx/rpc instrumentation (STAT-02)
  metricsCounter?: IMetricsCounter;
  // v30.8: reputation cache for REPUTATION_THRESHOLD policy evaluation (Phase 320)
  reputationCache?: import('../../services/erc8004/reputation-cache-service.js').ReputationCacheService;
  // v31.16: token registry for assetId -> token metadata resolution (Phase 408)
  tokenRegistryService?: TokenRegistryService | null;
  // v32.0: contract name registry for notification enrichment
  contractNameRegistry?: import('@waiaas/core').ContractNameRegistry;
}

// ---------------------------------------------------------------------------
// Amount formatting helpers (Phase 404 - RESP-01 ~ RESP-05)
// ---------------------------------------------------------------------------

/**
 * Get native token info (decimals, symbol) for a given chain/network.
 * Returns null for unsupported chains.
 */
export function getNativeTokenInfo(
  chain: string,
  network?: string | null,
): { decimals: number; symbol: string } | null {
  if (chain === 'solana') return { decimals: 9, symbol: 'SOL' };
  if (chain === 'evm' || chain === 'ethereum') {
    const symbolMap: Record<string, string> = {
      'ethereum-mainnet': 'ETH', 'ethereum-sepolia': 'ETH', 'ethereum-holesky': 'ETH',
      'polygon-mainnet': 'POL', 'polygon-amoy': 'POL',
      'arbitrum-mainnet': 'ETH', 'arbitrum-sepolia': 'ETH',
      'optimism-mainnet': 'ETH', 'optimism-sepolia': 'ETH',
      'base-mainnet': 'ETH', 'base-sepolia': 'ETH',
      'avalanche-mainnet': 'AVAX', 'avalanche-fuji': 'AVAX',
      'bsc-mainnet': 'BNB', 'bsc-testnet': 'BNB',
    };
    return { decimals: 18, symbol: symbolMap[network ?? ''] ?? 'ETH' };
  }
  if (chain === 'ripple') return { decimals: 6, symbol: 'XRP' };
  return null;
}

/**
 * Resolve amountFormatted/decimals/symbol for a transaction.
 * Returns null fields when amount is null, metadata unavailable, or conversion fails.
 */
export function resolveAmountMetadata(
  chain: string,
  network: string | null | undefined,
  type: string,
  amount: string | null | undefined,
): { amountFormatted: string | null; decimals: number | null; symbol: string | null } {
  if (!amount) {
    return { amountFormatted: null, decimals: null, symbol: null };
  }

  try {
    // Only TRANSFER has well-defined native token semantics
    if (type === 'TRANSFER') {
      const tokenInfo = getNativeTokenInfo(chain, network);
      if (!tokenInfo) {
        return { amountFormatted: null, decimals: null, symbol: null };
      }
      const formatted = formatAmount(BigInt(amount), tokenInfo.decimals);
      return {
        amountFormatted: formatted,
        decimals: tokenInfo.decimals,
        symbol: tokenInfo.symbol,
      };
    }

    // TOKEN_TRANSFER would need token registry lookup (deferred to route handler with deps)
    // CONTRACT_CALL, APPROVE, BATCH, etc. - amount semantics vary by type
    return { amountFormatted: null, decimals: null, symbol: null };
  } catch {
    return { amountFormatted: null, decimals: null, symbol: null };
  }
}

// ---------------------------------------------------------------------------
// humanAmount XOR validation + conversion (Phase 405 - HAMNT-01 ~ HAMNT-03)
// ---------------------------------------------------------------------------

/**
 * Validate that exactly one of amount/humanAmount is provided.
 * Throws WAIaaSError('VALIDATION_FAILED') if both or neither are present.
 */
export function validateAmountXOR(
  request: { amount?: string; humanAmount?: string },
): void {
  if (request.amount && request.humanAmount) {
    throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
      message: 'amount and humanAmount are mutually exclusive. Provide exactly one.',
    });
  }
  if (!request.amount && !request.humanAmount) {
    throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
      message: 'Either amount or humanAmount must be provided.',
    });
  }
}

/**
 * If humanAmount is provided, convert to smallest-unit string using decimals.
 * Returns the original amount if humanAmount is not present.
 */
export function resolveHumanAmount(
  request: { amount?: string; humanAmount?: string },
  decimals: number,
): string {
  if (request.humanAmount) {
    return parseAmount(request.humanAmount, decimals).toString();
  }
  return request.amount!;
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const sendTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/send',
  tags: ['Transactions'],
  summary: 'Send a transaction',
  request: {
    body: {
      content: {
        'application/json': { schema: TransactionRequestOpenAPI },
      },
    },
  },
  responses: {
    201: {
      description: 'Transaction submitted to pipeline',
      content: { 'application/json': { schema: TxSendResponseSchema } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND']),
  },
});

const signTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/sign',
  tags: ['Transactions'],
  summary: 'Sign an external unsigned transaction',
  description:
    'Parse, evaluate against policies, and sign an unsigned transaction built by an external dApp. Returns the signed transaction synchronously. DELAY/APPROVAL tier requests are immediately rejected.',
  request: {
    body: {
      content: {
        'application/json': { schema: TxSignRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Transaction signed successfully',
      content: { 'application/json': { schema: TxSignResponseSchema } },
    },
    ...buildErrorResponses([
      'INVALID_TRANSACTION',
      'WALLET_NOT_SIGNER',
      'POLICY_DENIED',
      'WALLET_NOT_FOUND',
    ]),
  },
});

const signMessageRoute = createRoute({
  method: 'post',
  path: '/transactions/sign-message',
  tags: ['Transactions'],
  summary: 'Sign a message (personal_sign or EIP-712 signTypedData)',
  description:
    'Sign a raw message (personal_sign) or EIP-712 typed data (signTypedData). Returns the signature synchronously. EIP-712 signTypedData is EVM-only.',
  request: {
    body: {
      content: {
        'application/json': { schema: TxSignMessageRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Message signed successfully',
      content: { 'application/json': { schema: TxSignMessageResponseSchema } },
    },
    ...buildErrorResponses([
      'ACTION_VALIDATION_FAILED',
      'WALLET_NOT_FOUND',
    ]),
  },
});

const getTransactionRoute = createRoute({
  method: 'get',
  path: '/transactions/{id}',
  tags: ['Transactions'],
  summary: 'Get transaction details',
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      display_currency: z.string().optional().describe('Display currency code (e.g. KRW, EUR). Defaults to server setting.'),
    }),
  },
  responses: {
    200: {
      description: 'Transaction details',
      content: { 'application/json': { schema: TxDetailResponseSchema } },
    },
    ...buildErrorResponses(['TX_NOT_FOUND']),
  },
});

const approveTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/{id}/approve',
  tags: ['Transactions'],
  summary: 'Approve a pending transaction (ownerAuth)',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Transaction approved',
      content: { 'application/json': { schema: TxApproveResponseSchema } },
    },
    ...buildErrorResponses(['TX_NOT_FOUND']),
  },
});

const rejectTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/{id}/reject',
  tags: ['Transactions'],
  summary: 'Reject a pending transaction (ownerAuth)',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Transaction rejected',
      content: { 'application/json': { schema: TxRejectResponseSchema } },
    },
    ...buildErrorResponses(['TX_NOT_FOUND']),
  },
});

const cancelTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/{id}/cancel',
  tags: ['Transactions'],
  summary: 'Cancel a delayed transaction (sessionAuth)',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Transaction cancelled',
      content: { 'application/json': { schema: TxCancelResponseSchema } },
    },
    ...buildErrorResponses(['TX_NOT_FOUND']),
  },
});

const listTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions',
  tags: ['Transactions'],
  summary: 'List transactions',
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
      cursor: z.string().uuid().optional(),
      display_currency: z.string().optional().describe('Display currency code (e.g. KRW, EUR). Defaults to server setting.'),
    }),
  },
  responses: {
    200: {
      description: 'Paginated transaction list',
      content: { 'application/json': { schema: TxListResponseSchema } },
    },
  },
});

const simulateTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions/simulate',
  tags: ['Transactions'],
  summary: 'Simulate a transaction (dry-run)',
  description:
    'Simulate a transaction without executing it. Returns policy tier, estimated fees, balance changes, and warnings. No side effects (no DB writes, signing, or notifications).',
  request: {
    body: {
      content: {
        'application/json': { schema: TransactionRequestOpenAPI },
      },
    },
  },
  responses: {
    200: {
      description: 'Simulation result',
      content: { 'application/json': { schema: DryRunSimulationResultOpenAPI } },
    },
    ...buildErrorResponses(['WALLET_NOT_FOUND', 'WALLET_TERMINATED', 'ACTION_VALIDATION_FAILED', 'SIMULATION_TIMEOUT']),
  },
});

const pendingTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions/pending',
  tags: ['Transactions'],
  summary: 'List pending transactions',
  responses: {
    200: {
      description: 'Pending transactions (PENDING/QUEUED)',
      content: { 'application/json': { schema: TxPendingListResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create transaction route sub-router.
 *
 * POST /transactions/send -> submits to pipeline, returns 201 with txId
 * POST /transactions/sign -> sign external unsigned tx, returns 200 with signed tx
 * GET  /transactions -> list transactions with cursor pagination
 * GET  /transactions/pending -> list QUEUED/DELAYED/PENDING_APPROVAL txs
 * GET  /transactions/:id -> returns transaction status
 * POST /transactions/:id/approve -> approve pending tx (ownerAuth)
 * POST /transactions/:id/reject -> reject pending tx (ownerAuth)
 * POST /transactions/:id/cancel -> cancel delayed tx (sessionAuth)
 */
export function transactionRoutes(deps: TransactionRouteDeps): OpenAPIHono {
  const router = new OpenAPIHono({ defaultHook: openApiValidationHook });

  // Register 5-type transaction request schemas as OpenAPI components.
  // These are referenced by TransactionRequestOpenAPI's oneOf $ref entries
  // but aren't directly used by route definitions, so we register them
  // explicitly to ensure they appear in GET /doc components/schemas.
  router.openAPIRegistry.register('TransferRequest', TransferRequestOpenAPI);
  router.openAPIRegistry.register('TokenTransferRequest', TokenTransferRequestOpenAPI);
  router.openAPIRegistry.register('ContractCallRequest', ContractCallRequestOpenAPI);
  router.openAPIRegistry.register('ApproveRequest', ApproveRequestOpenAPI);
  router.openAPIRegistry.register('BatchRequest', BatchRequestOpenAPI);
  router.openAPIRegistry.register('SendTransactionRequest', SendTransactionRequestOpenAPI);

  // ---------------------------------------------------------------------------
  // POST /transactions/send
  // ---------------------------------------------------------------------------

  router.openapi(sendTransactionRoute, async (c) => {
    // Raw JSON body -- bypass Hono Zod validation (z.any() passthrough).
    // Actual Zod validation is delegated to stage1Validate (5-type or legacy).
    // NOTE: Must read body BEFORE resolveWalletId since raw JSON can only be read once.
    const request = await c.req.json();

    // Resolve walletId from body.walletId > query > single-wallet auto-resolve
    const walletId = resolveWalletId(c, deps.db, request.walletId);

    // Look up wallet
    const wallet = await deps.db.select().from(wallets).where(eq(wallets.id, walletId)).get();
    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }
    if (wallet.status === 'TERMINATED') {
      throw new WAIaaSError('WALLET_TERMINATED');
    }

    // Block Lite mode Smart Account from sending transactions directly
    if (isLiteModeSmartAccount({ accountType: wallet.accountType, aaProvider: wallet.aaProvider })) {
      throw getLiteModeError();
    }

    // Resolve network: request > getSingleNetwork auto-resolve
    let resolvedNetwork: string;
    try {
      resolvedNetwork = resolveNetwork(
        request.network as NetworkType | undefined,
        wallet.environment as EnvironmentType,
        wallet.chain as ChainType,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('environment')) {
        console.warn(
          `[SECURITY] Environment-network mismatch attempt: ` +
          `wallet=${walletId}, chain=${wallet.chain}, env=${wallet.environment}, ` +
          `requestedNetwork=${request.network ?? 'null'}`,
        );
        throw new WAIaaSError('ENVIRONMENT_NETWORK_MISMATCH', {
          message: err.message,
        });
      }
      throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
        message: err instanceof Error ? err.message : 'Network validation failed',
      });
    }

    // Phase 408: Resolve assetId -> token metadata (before humanAmount conversion needs decimals)
    const txType = request.type as string | undefined;
    if ((txType === 'TOKEN_TRANSFER' || txType === 'APPROVE') && request.token?.assetId && deps.tokenRegistryService) {
      const resolved = await resolveTokenFromAssetId(
        request.token,
        resolvedNetwork,
        deps.tokenRegistryService,
      );
      request.token = { ...request.token, ...resolved.token };
      if (resolved.network && !request.network) {
        resolvedNetwork = resolved.network;
      }
      // After resolve, validate required fields
      if (!request.token.address) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'Could not resolve token address from assetId',
        });
      }
      if (request.token.decimals === undefined) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'decimals is required for unregistered token (not found in registry)',
        });
      }
      if (!request.token.symbol) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'symbol is required for unregistered token (not found in registry)',
        });
      }
    }

    // Phase 405: humanAmount -> amount conversion (before pipeline)
    if ('humanAmount' in request && request.humanAmount) {
      if (txType === 'TRANSFER') {
        validateAmountXOR(request);
        const nativeToken = getNativeTokenInfo(wallet.chain, resolvedNetwork);
        if (!nativeToken) {
          throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
            message: `Cannot resolve native token decimals for chain '${wallet.chain}'`,
          });
        }
        request.amount = resolveHumanAmount(request, nativeToken.decimals);
        delete request.humanAmount;
      } else if (txType === 'TOKEN_TRANSFER' || txType === 'APPROVE') {
        validateAmountXOR(request);
        const decimals = request.token?.decimals;
        if (typeof decimals !== 'number') {
          throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
            message: 'token.decimals is required when using humanAmount for TOKEN_TRANSFER/APPROVE',
          });
        }
        request.amount = resolveHumanAmount(request, decimals);
        delete request.humanAmount;
      }
    } else if ('type' in request && (request.type === 'TRANSFER' || request.type === 'TOKEN_TRANSFER' || request.type === 'APPROVE')) {
      // Validate that amount is present when humanAmount is not (XOR check for missing both)
      if (!request.amount) {
        validateAmountXOR(request);
      }
    }

    // Resolve adapter from pool for this wallet's chain:resolvedNetwork
    const rpcUrl = resolveRpcUrl(
      deps.config.rpc,
      wallet.chain,
      resolvedNetwork,
    );
    const adapter = await deps.adapterPool.resolve(
      wallet.chain as ChainType,
      resolvedNetwork as NetworkType,
      rpcUrl,
    );

    // Build pipeline context
    const ctx: PipelineContext = {
      db: deps.db,
      adapter,
      keyStore: deps.keyStore,
      policyEngine: deps.policyEngine,
      masterPassword: deps.passwordRef?.password ?? deps.masterPassword,
      walletId,
      wallet: {
        publicKey: wallet.publicKey,
        chain: wallet.chain,
        environment: wallet.environment,
        accountType: wallet.accountType,
        aaProvider: wallet.aaProvider,
        aaProviderApiKeyEncrypted: wallet.aaProviderApiKeyEncrypted,
        aaBundlerUrl: wallet.aaBundlerUrl,
        aaPaymasterUrl: wallet.aaPaymasterUrl,
        aaPaymasterPolicyId: wallet.aaPaymasterPolicyId,
      },
      resolvedNetwork,
      resolvedRpcUrl: rpcUrl,
      request,
      txId: '', // stage1Validate will assign
      sessionId: c.get('sessionId' as never) as string | undefined,
      sqlite: deps.sqlite,
      delayQueue: deps.delayQueue,
      approvalWorkflow: deps.approvalWorkflow,
      config: {
        policy_defaults_delay_seconds: deps.config.security.policy_defaults_delay_seconds,
        policy_defaults_approval_timeout: deps.config.security.policy_defaults_approval_timeout,
      },
      notificationService: deps.notificationService,
      priceOracle: deps.priceOracle,
      settingsService: deps.settingsService,
      forexRateService: deps.forexRateService,
      eventBus: deps.eventBus,
      wcSigningBridge: deps.wcSigningBridgeRef?.current ?? undefined,
      approvalChannelRouter: deps.approvalChannelRouter,
      metricsCounter: deps.metricsCounter,
      reputationCache: deps.reputationCache,
      contractNameRegistry: deps.contractNameRegistry,
    };

    // Stage 1: Validate + DB INSERT (synchronous -- assigns ctx.txId)
    await stage1Validate(ctx);

    // Return 201 immediately with txId (Stage 1 complete)
    const response = c.json(
      {
        id: ctx.txId,
        status: 'PENDING',
      },
      201,
    );

    // Stages 2-6 run asynchronously (fire-and-forget)
    void (async () => {
      try {
        await stage2Auth(ctx);
        await stage3Policy(ctx);
        await stageGasCondition(ctx);
        await stage4Wait(ctx);
        await stage5Execute(ctx);
        await stage6Confirm(ctx);
      } catch (error) {
        // PIPELINE_HALTED is intentional -- do NOT mark as FAILED
        // Transaction is QUEUED, waiting for delay expiry or owner approval / gas condition
        if (error instanceof WAIaaSError && error.code === 'PIPELINE_HALTED') {
          return;
        }

        // If stages 2-6 fail and DB hasn't been updated yet, mark as FAILED
        try {
          const tx = await deps.db
            .select()
            .from(transactions)
            .where(eq(transactions.id, ctx.txId))
            .get();

          if (tx && tx.status !== 'CONFIRMED' && tx.status !== 'FAILED' && tx.status !== 'CANCELLED') {
            const errorMessage = error instanceof Error ? error.message : 'Pipeline execution failed';
            await deps.db
              .update(transactions)
              .set({ status: 'FAILED', error: errorMessage })
              .where(eq(transactions.id, ctx.txId));
          }
        } catch {
          // Swallow DB update errors in background
        }
      }
    })();

    return response;
  });

  // ---------------------------------------------------------------------------
  // POST /transactions/simulate (sessionAuth -- dry-run simulation)
  // ---------------------------------------------------------------------------

  router.openapi(simulateTransactionRoute, async (c) => {
    const request = await c.req.json();

    // Resolve walletId from body.walletId > query > single-wallet auto-resolve
    const walletId = resolveWalletId(c, deps.db, request.walletId);

    // Look up wallet
    const wallet = await deps.db.select().from(wallets).where(eq(wallets.id, walletId)).get();
    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }
    if (wallet.status === 'TERMINATED') {
      throw new WAIaaSError('WALLET_TERMINATED');
    }

    // Resolve network
    let resolvedNetwork: string;
    try {
      resolvedNetwork = resolveNetwork(
        request.network as NetworkType | undefined,
        wallet.environment as EnvironmentType,
        wallet.chain as ChainType,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('environment')) {
        throw new WAIaaSError('ENVIRONMENT_NETWORK_MISMATCH', {
          message: err.message,
        });
      }
      throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
        message: err instanceof Error ? err.message : 'Network validation failed',
      });
    }

    // Phase 408: Resolve assetId -> token metadata (simulate route)
    const simTxType = request.type as string | undefined;
    if ((simTxType === 'TOKEN_TRANSFER' || simTxType === 'APPROVE') && request.token?.assetId && deps.tokenRegistryService) {
      const resolved = await resolveTokenFromAssetId(
        request.token,
        resolvedNetwork,
        deps.tokenRegistryService,
      );
      request.token = { ...request.token, ...resolved.token };
      if (resolved.network && !request.network) {
        resolvedNetwork = resolved.network;
      }
      if (!request.token.address) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'Could not resolve token address from assetId',
        });
      }
      if (request.token.decimals === undefined) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'decimals is required for unregistered token (not found in registry)',
        });
      }
      if (!request.token.symbol) {
        throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
          message: 'symbol is required for unregistered token (not found in registry)',
        });
      }
    }

    // Phase 405: humanAmount -> amount conversion (simulate route)
    if ('humanAmount' in request && request.humanAmount) {
      if (simTxType === 'TRANSFER') {
        validateAmountXOR(request);
        const nativeToken = getNativeTokenInfo(wallet.chain, resolvedNetwork);
        if (!nativeToken) {
          throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
            message: `Cannot resolve native token decimals for chain '${wallet.chain}'`,
          });
        }
        request.amount = resolveHumanAmount(request, nativeToken.decimals);
        delete request.humanAmount;
      } else if (simTxType === 'TOKEN_TRANSFER' || simTxType === 'APPROVE') {
        validateAmountXOR(request);
        const decimals = request.token?.decimals;
        if (typeof decimals !== 'number') {
          throw new WAIaaSError('ACTION_VALIDATION_FAILED', {
            message: 'token.decimals is required when using humanAmount for TOKEN_TRANSFER/APPROVE',
          });
        }
        request.amount = resolveHumanAmount(request, decimals);
        delete request.humanAmount;
      }
    }

    // Resolve adapter from pool
    const rpcUrl = resolveRpcUrl(
      deps.config.rpc,
      wallet.chain,
      resolvedNetwork,
    );
    const adapter = await deps.adapterPool.resolve(
      wallet.chain as ChainType,
      resolvedNetwork as NetworkType,
      rpcUrl,
    );

    // Create pipeline and execute dry-run (synchronous response)
    const pipeline = new TransactionPipeline({
      db: deps.db,
      adapter,
      keyStore: deps.keyStore,
      policyEngine: deps.policyEngine,
      masterPassword: deps.passwordRef?.password ?? deps.masterPassword,
      priceOracle: deps.priceOracle,
      settingsService: deps.settingsService,
      resolvedRpcUrl: rpcUrl,
    });

    const result = await pipeline.executeDryRun(walletId, request);
    return c.json(result, 200);
  });

  // ---------------------------------------------------------------------------
  // POST /transactions/sign (sessionAuth -- sign external unsigned tx)
  // ---------------------------------------------------------------------------

  router.openapi(signTransactionRoute, async (c) => {
    const body = c.req.valid('json');
    const walletId = resolveWalletId(c, deps.db, body.walletId);
    const sessionId = c.get('sessionId' as never) as string | undefined;

    // Look up wallet
    const wallet = await deps.db.select().from(wallets).where(eq(wallets.id, walletId)).get();
    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', { message: `Wallet '${walletId}' not found` });
    }
    if (wallet.status === 'TERMINATED') {
      throw new WAIaaSError('WALLET_TERMINATED');
    }

    // Resolve network (same pattern as POST /transactions/send)
    const resolvedNetwork = resolveNetwork(
      body.network as NetworkType | undefined,
      wallet.environment as EnvironmentType,
      wallet.chain as ChainType,
    );

    // Resolve adapter
    const rpcUrl = resolveRpcUrl(
      deps.config.rpc,
      wallet.chain,
      resolvedNetwork,
    );
    const adapter = await deps.adapterPool.resolve(
      wallet.chain as ChainType,
      resolvedNetwork as NetworkType,
      rpcUrl,
    );

    // Execute sign-only pipeline (fully synchronous within request)
    const result = await executeSignOnly(
      {
        db: deps.db,
        sqlite: deps.sqlite,
        adapter,
        keyStore: deps.keyStore,
        policyEngine: deps.policyEngine,
        masterPassword: deps.passwordRef?.password ?? deps.masterPassword,
        notificationService: deps.notificationService,
        eventBus: deps.eventBus,
      },
      walletId,
      { transaction: body.transaction, chain: wallet.chain, network: resolvedNetwork },
      sessionId,
    );

    // Transform to match OpenAPI schema (txHash: string | null, not undefined)
    return c.json(
      {
        ...result,
        txHash: result.txHash ?? null,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /transactions/sign-message (sessionAuth -- sign message or EIP-712 typed data)
  // ---------------------------------------------------------------------------

  router.openapi(signMessageRoute, async (c) => {
    const body = c.req.valid('json');
    const walletId = resolveWalletId(c, deps.db, body.walletId);
    const sessionId = c.get('sessionId' as never) as string | undefined;

    // Look up wallet
    const wallet = await deps.db.select().from(wallets).where(eq(wallets.id, walletId)).get();
    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', { message: `Wallet '${walletId}' not found` });
    }
    if (wallet.status === 'TERMINATED') {
      throw new WAIaaSError('WALLET_TERMINATED');
    }

    // Execute sign-message pipeline (cast body to SignMessageRequest -- OpenAPI uses z.string() for network)
    const result = await executeSignMessage(
      {
        db: deps.db,
        keyStore: deps.keyStore,
        masterPassword: deps.passwordRef?.password ?? deps.masterPassword,
        notificationService: deps.notificationService,
        eventBus: deps.eventBus,
      },
      walletId,
      wallet.chain,
      body as Parameters<typeof executeSignMessage>[3],
      sessionId,
    );

    return c.json(result, 200);
  });

  // ---------------------------------------------------------------------------
  // GET /transactions (list with cursor pagination)
  // ---------------------------------------------------------------------------

  router.openapi(listTransactionsRoute, async (c) => {
    const walletId = resolveWalletId(c, deps.db);
    const { limit: rawLimit, cursor, display_currency: queryCurrency } = c.req.valid('query');
    const limit = rawLimit ?? 20;

    // Resolve display currency from query param or server setting
    const currencyCode = resolveDisplayCurrencyCode(queryCurrency, deps.settingsService);
    const displayRate = await fetchDisplayRate(currencyCode, deps.forexRateService);

    // Build conditions
    const conditions = [eq(transactions.walletId, walletId)];
    if (cursor) {
      conditions.push(lt(transactions.id, cursor));
    }

    // Fetch limit + 1 to detect hasMore
    const rows = await deps.db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = items.length > 0 ? items[items.length - 1]!.id : null;

    return c.json(
      {
        items: items.map((tx) => {
          const meta = resolveAmountMetadata(tx.chain, tx.network, tx.type, tx.amount);
          return enrichTransaction({
            id: tx.id,
            walletId: tx.walletId,
            type: tx.type,
            status: tx.status,
            tier: tx.tier,
            chain: tx.chain,
            network: tx.network ?? null,
            toAddress: tx.toAddress,
            amount: tx.amount,
            txHash: tx.txHash,
            error: tx.error,
            createdAt: tx.createdAt ? Math.floor(tx.createdAt.getTime() / 1000) : null,
            displayAmount: toDisplayAmount(tx.amountUsd, currencyCode, displayRate),
            displayCurrency: currencyCode ?? null,
            amountFormatted: meta.amountFormatted,
            amountDecimals: meta.decimals,
            amountSymbol: meta.symbol,
            ...resolveContractFields(tx.type, tx.toAddress, tx.network, deps.contractNameRegistry),
          });
        }),
        cursor: hasMore ? nextCursor : null,
        hasMore,
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // GET /transactions/pending
  // ---------------------------------------------------------------------------

  router.openapi(pendingTransactionsRoute, async (c) => {
    const walletId = resolveWalletId(c, deps.db);

    const rows = await deps.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.walletId, walletId),
          inArray(transactions.status, ['PENDING', 'QUEUED']),
        ),
      )
      .orderBy(desc(transactions.id));

    return c.json(
      {
        items: rows.map((tx) => enrichTransaction({
          id: tx.id,
          walletId: tx.walletId,
          type: tx.type,
          status: tx.status,
          tier: tx.tier,
          chain: tx.chain,
          network: tx.network ?? null,
          toAddress: tx.toAddress,
          amount: tx.amount,
          txHash: tx.txHash,
          error: tx.error,
          createdAt: tx.createdAt ? Math.floor(tx.createdAt.getTime() / 1000) : null,
          ...resolveContractFields(tx.type, tx.toAddress, tx.network, deps.contractNameRegistry),
        })),
      },
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // GET /transactions/:id
  // ---------------------------------------------------------------------------

  router.openapi(getTransactionRoute, async (c) => {
    const { id: txId } = c.req.valid('param');
    const { display_currency: queryCurrency } = c.req.valid('query');

    if (!txId) {
      throw new WAIaaSError('TX_NOT_FOUND', {
        message: 'Transaction ID is required',
      });
    }

    const tx = await deps.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txId))
      .get();

    if (!tx) {
      throw new WAIaaSError('TX_NOT_FOUND', {
        message: `Transaction '${txId}' not found`,
      });
    }

    // Resolve display currency from query param or server setting
    const currencyCode = resolveDisplayCurrencyCode(queryCurrency, deps.settingsService);
    const displayRate = await fetchDisplayRate(currencyCode, deps.forexRateService);

    // Check if this is an atomic smart account BATCH
    const txWallet = await deps.db.select().from(wallets).where(eq(wallets.id, tx.walletId)).get();
    const isAtomicBatch = tx.type === 'BATCH' && txWallet?.accountType === 'smart';

    // Phase 404: Resolve human-readable amount metadata
    const amountMeta = resolveAmountMetadata(tx.chain, tx.network, tx.type, tx.amount);

    return c.json(
      enrichTransaction({
        id: tx.id,
        walletId: tx.walletId,
        type: tx.type,
        status: tx.status,
        tier: tx.tier,
        chain: tx.chain,
        network: tx.network ?? null,
        toAddress: tx.toAddress,
        amount: tx.amount,
        txHash: tx.txHash,
        error: tx.error,
        createdAt: tx.createdAt ? Math.floor(tx.createdAt.getTime() / 1000) : null,
        displayAmount: toDisplayAmount(tx.amountUsd, currencyCode, displayRate),
        displayCurrency: currencyCode ?? null,
        ...(tx.type === 'BATCH' ? { atomic: isAtomicBatch } : {}),
        amountFormatted: amountMeta.amountFormatted,
        amountDecimals: amountMeta.decimals,
        amountSymbol: amountMeta.symbol,
        ...resolveContractFields(tx.type, tx.toAddress, tx.network, deps.contractNameRegistry),
      }),
      200,
    );
  });

  // ---------------------------------------------------------------------------
  // POST /transactions/:id/approve (ownerAuth)
  // ---------------------------------------------------------------------------

  if (deps.approvalWorkflow && deps.ownerLifecycle) {
    const approvalWorkflow = deps.approvalWorkflow;
    const ownerLifecycle = deps.ownerLifecycle;

    router.openapi(approveTransactionRoute, async (c) => {
      const { id: txId } = c.req.valid('param');

      // Verify the tx exists and get walletId for ownerAuth verification
      const tx = await deps.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, txId))
        .get();

      if (!tx) {
        throw new WAIaaSError('TX_NOT_FOUND', {
          message: `Transaction '${txId}' not found`,
        });
      }

      // Get owner signature from header (set by ownerAuth middleware)
      const ownerSignature = c.req.header('X-Owner-Signature') ?? '';

      // Approve the transaction
      const result = approvalWorkflow.approve(txId, ownerSignature, c.get('ownerMessage'));

      // ownerAuth success -> mark owner verified (GRACE -> LOCKED auto-transition)
      try {
        ownerLifecycle.markOwnerVerified(tx.walletId);
      } catch {
        // If markOwnerVerified fails (e.g., NONE state), don't fail the approval
      }

      return c.json(
        {
          id: txId,
          status: 'EXECUTING',
          approvedAt: result.approvedAt,
        },
        200,
      );
    });

    // ---------------------------------------------------------------------------
    // POST /transactions/:id/reject (ownerAuth)
    // ---------------------------------------------------------------------------

    router.openapi(rejectTransactionRoute, async (c) => {
      const { id: txId } = c.req.valid('param');

      // Verify the tx exists
      const tx = await deps.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, txId))
        .get();

      if (!tx) {
        throw new WAIaaSError('TX_NOT_FOUND', {
          message: `Transaction '${txId}' not found`,
        });
      }

      // Reject the transaction
      const result = approvalWorkflow.reject(
        txId,
        c.req.header('X-Owner-Signature') ?? '',
        c.get('ownerMessage'),
      );

      // ownerAuth success -> mark owner verified (GRACE -> LOCKED auto-transition)
      try {
        ownerLifecycle.markOwnerVerified(tx.walletId);
      } catch {
        // If markOwnerVerified fails (e.g., NONE state), don't fail the rejection
      }

      return c.json(
        {
          id: txId,
          status: 'CANCELLED',
          rejectedAt: result.rejectedAt,
        },
        200,
      );
    });
  }

  // ---------------------------------------------------------------------------
  // POST /transactions/:id/cancel (sessionAuth -- wallet cancels own DELAY tx)
  // ---------------------------------------------------------------------------

  if (deps.delayQueue) {
    const delayQueue = deps.delayQueue;

    router.openapi(cancelTransactionRoute, async (c) => {
      const { id: txId } = c.req.valid('param');

      // Verify the tx exists
      const tx = await deps.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, txId))
        .get();

      if (!tx) {
        throw new WAIaaSError('TX_NOT_FOUND', {
          message: `Transaction '${txId}' not found`,
        });
      }

      // Verify session has access to the transaction's wallet via session_wallets
      const callerSessionId = c.get('sessionId' as never) as string;
      verifyWalletAccess(callerSessionId, tx.walletId, deps.db);

      // Cancel the delay
      delayQueue.cancelDelay(txId);

      return c.json(
        {
          id: txId,
          status: 'CANCELLED',
        },
        200,
      );
    });
  }

  return router;
}
