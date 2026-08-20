/**
 * Error hint templates for AI agent self-recovery.
 * Hints are English-only (AI agent consumption).
 * 31 of 40 actionable error codes have hints.
 * 9 codes intentionally have no hint (security/permanent/info-only).
 *
 * @see docs/55-dx-improvement-spec.md section 2.2
 */

export const errorHintMap: Record<string, string> = {
  // AUTH domain (6 of 8)
  INVALID_TOKEN: 'Create a new session via POST /v1/sessions with masterAuth credentials.',
  TOKEN_EXPIRED: 'Renew the session via PUT /v1/sessions/{id}/renew, or create a new session.',
  SESSION_REVOKED: 'Create a new session via POST /v1/sessions with masterAuth credentials.',
  INVALID_SIGNATURE: 'Check the signature format and that the signed message contains the required action:id token. The error message names the exact token expected.',
  INVALID_NONCE: 'Fetch a fresh nonce from GET /v1/nonce and retry within 5 minutes.',
  INVALID_MASTER_PASSWORD: 'Check the X-Master-Password header value.',
  // MASTER_PASSWORD_LOCKED: no hint (wait 30min, no action)
  // SYSTEM_LOCKED: no hint (Kill Switch, Owner recovery needed)

  // SESSION domain (7 of 8)
  SESSION_NOT_FOUND: 'The session may have been revoked. Create a new session via POST /v1/sessions.',
  SESSION_EXPIRED: 'Create a new session via POST /v1/sessions with masterAuth credentials.',
  SESSION_LIMIT_EXCEEDED: 'Revoke unused sessions via DELETE /v1/sessions/{id} and retry.',
  CONSTRAINT_VIOLATED: 'Check session constraints (IP, operations). Create a session with correct constraints.',
  RENEWAL_LIMIT_REACHED: 'Maximum renewals reached. Create a new session via POST /v1/sessions.',
  SESSION_ABSOLUTE_LIFETIME_EXCEEDED: 'Absolute session lifetime exceeded. Create a new session via POST /v1/sessions.',
  RENEWAL_TOO_EARLY: 'Wait until 50% of session TTL has elapsed before renewing.',
  // SESSION_RENEWAL_MISMATCH: no hint (security issue)

  // TX domain (7 of 21 actionable)
  ABI_ENCODING_FAILED: 'Check that functionName exists in the provided ABI and args match the expected types. Use a JSON array of ABI fragments for the abi parameter.',
  INSUFFICIENT_BALANCE: 'Fund the wallet. Check balance via GET /v1/wallet/balance.',
  INVALID_ADDRESS: 'Verify the recipient address format for the target blockchain.',
  TX_NOT_FOUND: 'Verify the transaction ID. List transactions via GET /v1/transactions.',
  TX_EXPIRED: 'The transaction expired. Submit a new transaction via POST /v1/transactions/send.',
  TX_ALREADY_PROCESSED: 'This transaction was already processed. Check status via GET /v1/transactions/{id}.',
  CHAIN_ERROR: 'Blockchain RPC error. Retry after a short delay.',

  // POLICY domain (4 of 5)
  POLICY_NOT_FOUND: 'Verify the policy ID. List policies via GET /v1/policies.',
  POLICY_DENIED: 'Transaction denied by policy. Review policies via GET /v1/policies.',
  SPENDING_LIMIT_EXCEEDED: 'Spending limit exceeded for the current window. Wait for the window to reset or request a policy change.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Wait and retry after the rate limit window resets.',
  // WHITELIST_DENIED: no hint (security)

  // OWNER domain (3 of 5)
  OWNER_NOT_CONNECTED: 'Register an owner via PUT /v1/wallets/{walletId}/owner.',
  APPROVAL_TIMEOUT: 'The approval request timed out. Submit a new transaction.',
  APPROVAL_NOT_FOUND: 'No pending approval for this transaction. Check status via GET /v1/transactions/{id}.',
  // OWNER_ALREADY_CONNECTED: no hint (state only)

  // SYSTEM domain (4 of 6)
  KEYSTORE_LOCKED: 'The keystore is temporarily locked. Retry after a short delay.',
  CHAIN_NOT_SUPPORTED: 'This blockchain is not supported. Use SOLANA or EVM.',
  SHUTTING_DOWN: 'The daemon is shutting down. Wait for restart.',
  ADAPTER_NOT_AVAILABLE: 'Chain adapter is not available. The daemon may still be initializing. Retry.',
  // KILL_SWITCH_ACTIVE: no hint (agent cannot recover)
  // KILL_SWITCH_NOT_ACTIVE: no hint (info only)

  // WALLET domain (2 of 3)
  WALLET_NOT_FOUND: 'Verify the wallet ID. List wallets via GET /v1/wallets.',
  WALLET_SUSPENDED: 'Wallet is suspended. Contact the administrator.',
  // WALLET_TERMINATED: no hint (permanent)
};

/**
 * Resolve hint for a given error code with optional variable substitution.
 * Variables in {braces} are replaced from the context map.
 */
export function resolveHint(
  code: string,
  context?: Record<string, string>,
): string | undefined {
  const template = errorHintMap[code];
  if (!template) return undefined;
  if (!context) return template;

  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? `{${key}}`);
}
