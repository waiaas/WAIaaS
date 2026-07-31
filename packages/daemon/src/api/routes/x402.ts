/**
 * x402 Routes: POST /v1/x402/fetch
 *
 * Orchestrates x402 auto-payment flow:
 * 1. Config check (x402.enabled)
 * 2. Domain policy evaluation (X402_ALLOWED_DOMAINS -- default deny)
 * 3. SSRF guard + initial HTTP request
 * 4. Non-402 passthrough (no DB record)
 * 5. 402 parsing + scheme selection
 * 6. Transaction record (type=X402_PAYMENT)
 * 7. USD resolution + SPENDING_LIMIT evaluation (evaluateAndReserve)
 * 8. DELAY/APPROVAL tier handling
 * 9. Payment signing + retry request
 * 10. DB update (CONFIRMED/FAILED) + notification triggers
 *
 * @see packages/daemon/src/services/x402/x402-handler.ts (parse402Response, selectPaymentRequirement)
 * @see packages/daemon/src/services/x402/x402-domain-policy.ts (evaluateX402Domain)
 * @see packages/daemon/src/services/x402/x402-usd-resolver.ts (resolveX402UsdAmount)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, or, and, isNull, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import { createSolanaRpc } from '@solana/kit';
import { WAIaaSError, resolveX402Network, CAIP2_TO_NETWORK, sleep } from '@waiaas/core';
import type { IPriceOracle, PolicyEvaluation, EventBus } from '@waiaas/core';
import type { MasterPasswordRef } from '../middleware/master-auth.js';
import type { AdapterPool } from '../../infrastructure/adapter-pool.js';
import { resolveRpcUrl } from '../../infrastructure/adapter-pool.js';
import type { DaemonConfig } from '../../infrastructure/config/loader.js';
import { wallets, transactions, policies } from '../../infrastructure/database/schema.js';
import type * as schema from '../../infrastructure/database/schema.js';
import type { LocalKeyStore } from '../../infrastructure/keystore/keystore.js';
import { generateId } from '../../infrastructure/database/id.js';
import { evaluateX402Domain } from '../../services/x402/x402-domain-policy.js';
import { resolveX402UsdAmount } from '../../services/x402/x402-usd-resolver.js';
import { parse402Response, selectPaymentRequirement } from '../../services/x402/x402-handler.js';
import { validateUrlSafety, safeFetchWithRedirects } from '../../services/x402/ssrf-guard.js';
import { signPayment } from '../../services/x402/payment-signer.js';
import type { NotificationService } from '../../notifications/notification-service.js';
import type { SettingsService } from '../../infrastructure/settings/settings-service.js';
import { buildErrorResponses, openApiValidationHook } from './openapi-schemas.js';
import { resolveWalletId } from '../helpers/resolve-wallet-id.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Policy engine with evaluateAndReserve + releaseReservation (DatabasePolicyEngine). */
interface X402PolicyEngine {
  evaluateAndReserve(
    walletId: string,
    transaction: {
      type: string;
      amount: string;
      toAddress: string;
      chain: string;
      network?: string;
    },
    txId: string,
    usdAmount?: number,
  ): PolicyEvaluation;
  releaseReservation(txId: string): void;
}

export interface X402RouteDeps {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: SQLiteDatabase;
  keyStore: LocalKeyStore;
  policyEngine: X402PolicyEngine;
  masterPassword: string;
  /** Mutable ref for live password updates. Takes precedence over masterPassword. */
  passwordRef?: MasterPasswordRef;
  config: DaemonConfig;
  notificationService?: NotificationService;
  priceOracle?: IPriceOracle;
  adapterPool: AdapterPool | null;
  settingsService?: SettingsService;
  eventBus?: EventBus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a payment payload as a base64 PAYMENT-SIGNATURE header value.
 */
function encodePaymentSignatureHeader(paymentPayload: Record<string, unknown>): string {
  const json = JSON.stringify(paymentPayload);
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Build a passthrough response object from a non-402 fetch response.
 */
async function buildPassthroughResponse(
  response: Response,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return { status: response.status, headers, body };
}

// ---------------------------------------------------------------------------
// Route definition (OpenAPIHono createRoute)
// ---------------------------------------------------------------------------

const x402FetchRoute = createRoute({
  method: 'post',
  path: '/x402/fetch',
  tags: ['x402'],
  summary: 'Fetch URL with x402 auto-payment',
  description:
    'Proxy an HTTP request to an external URL. If the server responds with ' +
    'HTTP 402, automatically sign a payment and retry. Policy evaluation ' +
    '(X402_ALLOWED_DOMAINS, SPENDING_LIMIT) is applied before payment.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            url: z.string().url(),
            method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
            headers: z.record(z.string()).optional(),
            body: z.string().optional(),
            walletId: z.string().uuid().optional().describe('Target wallet ID (optional -- auto-resolved if session has single wallet)'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Response from the external server (with optional payment info)',
      content: {
        'application/json': {
          schema: z.object({
            status: z.number().int(),
            headers: z.record(z.string()),
            body: z.string(),
            payment: z.object({
              amount: z.string(),
              asset: z.string(),
              network: z.string(),
              payTo: z.string(),
              txId: z.string(),
            }).optional(),
          }),
        },
      },
    },
    ...buildErrorResponses([
      'X402_DISABLED',
      'X402_DOMAIN_NOT_ALLOWED',
      'X402_SSRF_BLOCKED',
      'X402_UNSUPPORTED_SCHEME',
      'X402_PAYMENT_REJECTED',
      'X402_DELAY_TIMEOUT',
      'X402_APPROVAL_REQUIRED',
      'X402_SERVER_ERROR',
      'WALLET_NOT_FOUND',
      'POLICY_DENIED',
    ]),
  },
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create x402 route sub-router.
 *
 * POST /x402/fetch -> proxy URL with x402 auto-payment
 */
export function x402Routes(deps: X402RouteDeps): OpenAPIHono {
  const router = new OpenAPIHono({ defaultHook: openApiValidationHook });

  router.openapi(x402FetchRoute, async (c) => {
    // -----------------------------------------------------------------------
    // Phase A: Pre-payment validation
    // -----------------------------------------------------------------------

    // A1. Check x402 enabled
    if (!deps.config.x402?.enabled) {
      throw new WAIaaSError('X402_DISABLED', {
        message: 'x402 payments are disabled in configuration',
      });
    }

    // A2. Parse request body + resolve walletId
    const body = c.req.valid('json');
    const walletId = resolveWalletId(c, deps.db, body.walletId);
    const sessionId = c.get('sessionId' as never) as string | undefined;
    const targetUrl = new URL(body.url);
    const targetDomain = targetUrl.hostname;

    // A4. Look up wallet
    const wallet = await deps.db.select().from(wallets).where(eq(wallets.id, walletId)).get();
    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: `Wallet '${walletId}' not found`,
      });
    }

    // A5. Load X402_ALLOWED_DOMAINS policy and evaluate domain
    // 4-level override: wallet+network > wallet+null > global+network > global+null
    const policyRows = await deps.db
      .select()
      .from(policies)
      .where(
        and(
          or(eq(policies.walletId, walletId), isNull(policies.walletId)),
          eq(policies.type, 'X402_ALLOWED_DOMAINS'),
          eq(policies.enabled, true),
        ),
      )
      .orderBy(desc(policies.priority))
      .all();

    // Apply 4-level override resolution for domain policies
    const resolvedPolicies = resolveX402DomainPolicies(policyRows, walletId);

    const domainResult = evaluateX402Domain(resolvedPolicies, targetDomain, deps.settingsService);
    if (domainResult && !domainResult.allowed) {
      void deps.notificationService?.notify('POLICY_VIOLATION', walletId, {
        reason: domainResult.reason ?? 'Domain not allowed',
        type: 'X402_ALLOWED_DOMAINS',
      });
      throw new WAIaaSError('X402_DOMAIN_NOT_ALLOWED', {
        message: domainResult.reason ?? `Domain '${targetDomain}' not allowed for x402 payments`,
      });
    }

    // A6. SSRF guard + initial HTTP request
    const validatedUrl = await validateUrlSafety(body.url);
    const response = await safeFetchWithRedirects(
      validatedUrl,
      body.method ?? 'GET',
      body.headers,
      body.body,
    );

    // A7. Non-402 passthrough (no DB record, no policy evaluation)
    if (response.status !== 402) {
      const passthrough = await buildPassthroughResponse(response);
      return c.json(passthrough, 200);
    }

    // -----------------------------------------------------------------------
    // Phase B: 402 detected -- payment flow
    // -----------------------------------------------------------------------

    // B1. Parse 402 response
    const paymentRequired = await parse402Response(response);

    // B2. Determine supported networks from CAIP2_TO_NETWORK
    const supportedNetworks = new Set(Object.keys(CAIP2_TO_NETWORK));

    // B3. Select best payment requirement
    const selected = selectPaymentRequirement(
      paymentRequired.accepts,
      supportedNetworks,
    );

    // B4. Resolve chain + network from CAIP-2
    const resolved = resolveX402Network(selected.network);
    const resolvedChain = resolved.chain;
    const resolvedNetwork = resolved.network;

    // B5. Generate transaction ID + INSERT into DB
    const txId = generateId();
    const nowTs = new Date(Math.floor(Date.now() / 1000) * 1000);

    await deps.db.insert(transactions).values({
      id: txId,
      walletId,
      chain: resolvedChain,
      network: resolvedNetwork,
      type: 'X402_PAYMENT',
      status: 'PENDING',
      amount: selected.amount,
      toAddress: selected.payTo,
      sessionId: sessionId ?? null,
      metadata: JSON.stringify({
        target_url: body.url,
        payment_amount: selected.amount,
        network: selected.network,
        asset: selected.asset,
        scheme: selected.scheme,
      }),
      createdAt: nowTs,
    });

    // B6. TX_REQUESTED notification (fire-and-forget)
    void deps.notificationService?.notify('TX_REQUESTED', walletId, {
      amount: selected.amount,
      to: selected.payTo,
      type: 'X402_PAYMENT',
      display_amount: '', // x402: USD-based payments, no forex conversion needed
    }, { txId });

    // v1.6: emit wallet:activity TX_REQUESTED event
    deps.eventBus?.emit('wallet:activity', {
      walletId,
      activity: 'TX_REQUESTED',
      details: { txId, type: 'X402_PAYMENT' },
      timestamp: Math.floor(Date.now() / 1000),
    });

    // B7. USD resolution for SPENDING_LIMIT evaluation
    const usdAmount = await resolveX402UsdAmount(
      selected.amount,
      selected.asset,
      selected.network,
      deps.priceOracle,
    );

    // B8. SPENDING_LIMIT evaluation via evaluateAndReserve (TOCTOU prevention)
    const evaluation = deps.policyEngine.evaluateAndReserve(
      walletId,
      {
        type: 'TRANSFER',
        amount: selected.amount,
        toAddress: selected.payTo,
        chain: resolvedChain,
        network: resolvedNetwork,
      },
      txId,
      usdAmount,
    );

    // B9. Handle policy denial
    if (!evaluation.allowed) {
      await deps.db
        .update(transactions)
        .set({ status: 'CANCELLED', tier: evaluation.tier, error: evaluation.reason ?? 'Policy denied' })
        .where(eq(transactions.id, txId));
      deps.policyEngine.releaseReservation(txId);
      void deps.notificationService?.notify('TX_FAILED', walletId, {
        reason: evaluation.reason ?? 'Policy denied',
        amount: selected.amount,
        display_amount: '',
      }, { txId });

      // v1.6: emit transaction:failed event (policy denial)
      deps.eventBus?.emit('transaction:failed', {
        walletId,
        txId,
        error: evaluation.reason ?? 'Policy denied',
        network: resolvedNetwork,
        type: 'X402_PAYMENT',
        timestamp: Math.floor(Date.now() / 1000),
      });

      throw new WAIaaSError('POLICY_DENIED', {
        message: evaluation.reason ?? 'Transaction denied by spending limit policy',
      });
    }

    // B10. Handle APPROVAL tier -- immediate rejection
    if (evaluation.tier === 'APPROVAL') {
      await deps.db
        .update(transactions)
        .set({ status: 'CANCELLED', tier: 'APPROVAL', error: 'X402_APPROVAL_REQUIRED' })
        .where(eq(transactions.id, txId));
      deps.policyEngine.releaseReservation(txId);
      void deps.notificationService?.notify('TX_FAILED', walletId, {
        reason: 'x402 payment requires owner approval (amount too high)',
        amount: selected.amount,
        display_amount: '',
      }, { txId });

      // v1.6: emit transaction:failed event (approval required)
      deps.eventBus?.emit('transaction:failed', {
        walletId,
        txId,
        error: 'x402 payment requires owner approval (amount too high)',
        network: resolvedNetwork,
        type: 'X402_PAYMENT',
        timestamp: Math.floor(Date.now() / 1000),
      });

      throw new WAIaaSError('X402_APPROVAL_REQUIRED', {
        message: 'x402 payment requires owner approval (amount too high)',
      });
    }

    // B11. Handle DELAY tier
    if (evaluation.tier === 'DELAY') {
      const delaySeconds = evaluation.delaySeconds ?? deps.config.security.policy_defaults_delay_seconds;
      const requestTimeout = deps.config.x402?.request_timeout ?? 30;

      if (delaySeconds > requestTimeout) {
        await deps.db
          .update(transactions)
          .set({ status: 'CANCELLED', tier: 'DELAY', error: 'X402_DELAY_TIMEOUT' })
          .where(eq(transactions.id, txId));
        deps.policyEngine.releaseReservation(txId);
        void deps.notificationService?.notify('TX_FAILED', walletId, {
          reason: `Delay ${delaySeconds}s exceeds request timeout ${requestTimeout}s`,
          amount: selected.amount,
          display_amount: '',
        }, { txId });

        // v1.6: emit transaction:failed event (delay timeout)
        deps.eventBus?.emit('transaction:failed', {
          walletId,
          txId,
          error: `Delay ${delaySeconds}s exceeds request timeout ${requestTimeout}s`,
          network: resolvedNetwork,
          type: 'X402_PAYMENT',
          timestamp: Math.floor(Date.now() / 1000),
        });

        throw new WAIaaSError('X402_DELAY_TIMEOUT', {
          message: `Delay of ${delaySeconds}s exceeds x402 request timeout of ${requestTimeout}s`,
        });
      }

      // Delay is within timeout -- wait then proceed
      await sleep(delaySeconds * 1000);
    }

    // B12. Update tier on transaction
    await deps.db
      .update(transactions)
      .set({ tier: evaluation.tier })
      .where(eq(transactions.id, txId));

    // -----------------------------------------------------------------------
    // Phase C: Payment signing + retry
    // -----------------------------------------------------------------------

    try {
      // C1. Sign payment
      // Solana signing needs an RPC client: the payer builds the transaction
      // itself (blockhash lookup) because the facilitator only co-signs as
      // feePayer. EVM signing is offline (EIP-712) and needs no RPC.
      const signingRpc = resolvedChain === 'solana'
        ? createSolanaRpc(resolveRpcUrl(deps.config.rpc, resolvedChain, resolvedNetwork))
        : undefined;

      const paymentPayload = await signPayment(
        selected,
        deps.keyStore,
        walletId,
        wallet.publicKey,
        deps.passwordRef?.password ?? deps.masterPassword,
        signingRpc,
      );

      // Fill resource.url in the payment payload
      paymentPayload.resource = { url: body.url };

      // C2. Encode PAYMENT-SIGNATURE header
      const encodedSignature = encodePaymentSignatureHeader(paymentPayload);
      const retryHeaders: Record<string, string> = {
        ...(body.headers ?? {}),
        'PAYMENT-SIGNATURE': encodedSignature,
      };

      // C3. Re-request with payment signature
      const retryResponse = await safeFetchWithRedirects(
        validatedUrl,
        body.method ?? 'GET',
        retryHeaders,
        body.body,
      );

      // C4. Handle retry response
      if (retryResponse.status === 402) {
        // Payment rejected by server
        await deps.db
          .update(transactions)
          .set({ status: 'FAILED', error: 'X402_PAYMENT_REJECTED' })
          .where(eq(transactions.id, txId));
        deps.policyEngine.releaseReservation(txId);
        void deps.notificationService?.notify('TX_FAILED', walletId, {
          reason: 'Payment was rejected by the resource server after retry',
          amount: selected.amount,
          display_amount: '',
        }, { txId });

        // v1.6: emit transaction:failed event (payment rejected)
        deps.eventBus?.emit('transaction:failed', {
          walletId,
          txId,
          error: 'Payment was rejected by the resource server after retry',
          network: resolvedNetwork,
          type: 'X402_PAYMENT',
          timestamp: Math.floor(Date.now() / 1000),
        });

        throw new WAIaaSError('X402_PAYMENT_REJECTED', {
          message: 'Payment was rejected by the resource server after retry',
        });
      }

      if (!retryResponse.ok) {
        // Server error after payment
        await deps.db
          .update(transactions)
          .set({ status: 'FAILED', error: `X402_SERVER_ERROR: HTTP ${retryResponse.status}` })
          .where(eq(transactions.id, txId));
        deps.policyEngine.releaseReservation(txId);
        void deps.notificationService?.notify('TX_FAILED', walletId, {
          reason: `Resource server returned ${retryResponse.status} after payment`,
          amount: selected.amount,
          display_amount: '',
        }, { txId });

        // v1.6: emit transaction:failed event (server error)
        deps.eventBus?.emit('transaction:failed', {
          walletId,
          txId,
          error: `Resource server returned ${retryResponse.status} after payment`,
          network: resolvedNetwork,
          type: 'X402_PAYMENT',
          timestamp: Math.floor(Date.now() / 1000),
        });

        throw new WAIaaSError('X402_SERVER_ERROR', {
          message: `Resource server returned ${retryResponse.status} after payment`,
        });
      }

      // C5. Payment succeeded
      const confirmedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
      await deps.db
        .update(transactions)
        .set({ status: 'CONFIRMED', executedAt: confirmedAt })
        .where(eq(transactions.id, txId));

      void deps.notificationService?.notify('TX_CONFIRMED', walletId, {
        txHash: '',
        amount: selected.amount,
        to: selected.payTo,
        display_amount: '',
      }, { txId });

      // v1.6: emit transaction:completed event (x402 payment confirmed)
      deps.eventBus?.emit('transaction:completed', {
        walletId,
        txId,
        txHash: '',
        amount: selected.amount,
        network: resolvedNetwork,
        type: 'X402_PAYMENT',
        timestamp: Math.floor(Date.now() / 1000),
      });

      // C6. Build response
      const responseBody = await buildPassthroughResponse(retryResponse);
      return c.json(
        {
          ...responseBody,
          payment: {
            amount: selected.amount,
            asset: selected.asset,
            network: selected.network,
            payTo: selected.payTo,
            txId,
          },
        },
        200,
      );
    } catch (error) {
      // If error is a WAIaaSError we already threw, re-throw it
      if (error instanceof WAIaaSError) {
        throw error;
      }

      // Unexpected error during payment -- mark FAILED + release reservation
      await deps.db
        .update(transactions)
        .set({
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown payment error',
        })
        .where(eq(transactions.id, txId));
      deps.policyEngine.releaseReservation(txId);
      void deps.notificationService?.notify('TX_FAILED', walletId, {
        reason: error instanceof Error ? error.message : 'Unknown payment error',
        amount: selected.amount,
        display_amount: '',
      }, { txId });

      // v1.6: emit transaction:failed event (unexpected error)
      deps.eventBus?.emit('transaction:failed', {
        walletId,
        txId,
        error: error instanceof Error ? error.message : 'Unknown payment error',
        network: resolvedNetwork,
        type: 'X402_PAYMENT',
        timestamp: Math.floor(Date.now() / 1000),
      });

      throw new WAIaaSError('X402_SERVER_ERROR', {
        message: error instanceof Error ? error.message : 'Unknown payment error',
      });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Policy resolution helper
// ---------------------------------------------------------------------------

/**
 * Resolve X402_ALLOWED_DOMAINS policies with 4-level override priority.
 * Returns resolved policy rows suitable for evaluateX402Domain.
 */
function resolveX402DomainPolicies(
  rows: Array<{
    id: string;
    walletId: string | null;
    type: string;
    rules: string;
    priority: number;
    enabled: boolean | null;
    network: string | null;
  }>,
  walletId: string,
): Array<{
  id: string;
  walletId: string | null;
  type: string;
  rules: string;
  priority: number;
  enabled: boolean | null;
  network: string | null;
}> {
  // Simple 4-level override: wallet > global, network-specific > all-networks
  // For X402_ALLOWED_DOMAINS, we pick the highest-priority match
  const typeMap = new Map<string, typeof rows[number]>();

  // Phase 1: global + all-networks (lowest priority)
  for (const row of rows) {
    if (row.walletId === null && row.network === null) {
      typeMap.set(row.type, row);
    }
  }

  // Phase 2: global + network-specific
  for (const row of rows) {
    if (row.walletId === null && row.network !== null) {
      typeMap.set(row.type, row);
    }
  }

  // Phase 3: wallet-specific + all-networks
  for (const row of rows) {
    if (row.walletId === walletId && row.network === null) {
      typeMap.set(row.type, row);
    }
  }

  // Phase 4: wallet-specific + network-specific (highest priority)
  for (const row of rows) {
    if (row.walletId === walletId && row.network !== null) {
      typeMap.set(row.type, row);
    }
  }

  return Array.from(typeMap.values());
}
