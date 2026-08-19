/**
 * WAIaaSOwnerClient - Owner operations client for WAIaaS daemon.
 *
 * Provides typed methods for owner-authenticated operations:
 * - approve(txId): Approve a pending transaction
 * - reject(txId): Reject a pending transaction
 * - activateKillSwitch(): Activate emergency kill switch
 * - getKillSwitchStatus(): Get current kill switch state
 * - recover(): Deactivate kill switch (requires masterPassword)
 *
 * OwnerAuth flow:
 * 1. Fetch nonce from GET /v1/nonce
 * 2. Sign the nonce with owner's Ed25519 private key
 * 3. Send X-Owner-Address, X-Owner-Message, X-Owner-Signature headers
 *
 * @see docs/52-auth-redesign.md
 */

import { HttpClient } from './internal/http.js';
import { WAIaaSError } from './error.js';
import { withRetry } from './retry.js';
import { DEFAULT_TIMEOUT } from './internal/constants.js';
import type {
  WAIaaSOwnerClientOptions,
  ApproveResponse,
  RejectResponse,
  KillSwitchActivateResponse,
  KillSwitchStatusResponse,
  RecoverResponse,
  NonceResponse,
  RetryOptions,
} from './types.js';

export class WAIaaSOwnerClient {
  private http: HttpClient;
  private ownerAddress: string;
  private signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  private masterPassword?: string;
  private retryOptions?: RetryOptions;

  constructor(options: WAIaaSOwnerClientOptions) {
    this.http = new HttpClient(
      options.baseUrl.replace(/\/+$/, ''),
      options.timeout ?? DEFAULT_TIMEOUT,
    );
    this.ownerAddress = options.ownerAddress;
    this.signMessage = options.signMessage;
    this.masterPassword = options.masterPassword;
    this.retryOptions = options.retryOptions;
  }

  /**
   * Fetch nonce from daemon and construct ownerAuth headers.
   *
   * Headers sent:
   * - X-Owner-Address: owner wallet address (base58 for Solana)
   * - X-Owner-Message: `<action>:<id> (nonce: <nonce>)`
   * - X-Owner-Signature: base64-encoded Ed25519 detached signature
   *
   * The message carries an `action:id` token because the daemon refuses a
   * signature that does not name what it authorises: without it, one captured
   * signature would approve every later request on the same wallet, and a
   * signature made to reject a transaction could be replayed to approve it.
   * The nonce is kept so two approvals of the same id are not byte-identical.
   *
   * @param action What is being authorised
   * @param boundId Transaction id, or wallet id for owner verification
   */
  private async ownerAuthHeaders(
    action: 'approve' | 'reject' | 'verify',
    boundId?: string,
  ): Promise<Record<string, string>> {
    const nonceResp = await this.http.get<NonceResponse>('/v1/nonce');
    // boundId is omitted only for /v1/admin/kill-switch, whose route has no :id
    // for the daemon to bind against. That endpoint does not currently pass
    // ownerAuth for an unrelated, pre-existing reason, so there is nothing to
    // bind to here yet.
    const text = boundId
      ? `${action}:${boundId} (nonce: ${nonceResp.nonce})`
      : nonceResp.nonce;
    const message = new TextEncoder().encode(text);
    const signature = await this.signMessage(message);
    return {
      'X-Owner-Address': this.ownerAddress,
      'X-Owner-Message': text,
      'X-Owner-Signature': Buffer.from(signature).toString('base64'),
    };
  }

  /**
   * Construct masterAuth headers for admin operations.
   * @throws WAIaaSError if masterPassword not set
   */
  private masterAuthHeaders(): Record<string, string> {
    if (!this.masterPassword) {
      throw new WAIaaSError({
        code: 'NO_MASTER_PASSWORD',
        message: 'Master password not set (required for recover)',
        status: 0,
        retryable: false,
      });
    }
    return { 'X-Master-Password': this.masterPassword };
  }

  /**
   * Approve a pending transaction.
   * Calls POST /v1/transactions/:id/approve with ownerAuth headers.
   */
  async approve(txId: string): Promise<ApproveResponse> {
    return withRetry(async () => {
      const headers = await this.ownerAuthHeaders('approve', txId);
      return this.http.post<ApproveResponse>(
        `/v1/transactions/${txId}/approve`,
        {},
        headers,
      );
    }, this.retryOptions);
  }

  /**
   * Reject a pending transaction.
   * Calls POST /v1/transactions/:id/reject with ownerAuth headers.
   */
  async reject(txId: string): Promise<RejectResponse> {
    return withRetry(async () => {
      const headers = await this.ownerAuthHeaders('reject', txId);
      return this.http.post<RejectResponse>(
        `/v1/transactions/${txId}/reject`,
        {},
        headers,
      );
    }, this.retryOptions);
  }

  /**
   * Activate the emergency kill switch.
   * Calls POST /v1/admin/kill-switch with ownerAuth headers.
   */
  async activateKillSwitch(): Promise<KillSwitchActivateResponse> {
    return withRetry(async () => {
      const headers = await this.ownerAuthHeaders('verify');
      return this.http.post<KillSwitchActivateResponse>(
        '/v1/admin/kill-switch',
        {},
        headers,
      );
    }, this.retryOptions);
  }

  /**
   * Get current kill switch state.
   * Calls GET /v1/admin/kill-switch (public endpoint, no auth required).
   */
  async getKillSwitchStatus(): Promise<KillSwitchStatusResponse> {
    return withRetry(async () => {
      return this.http.get<KillSwitchStatusResponse>('/v1/admin/kill-switch');
    }, this.retryOptions);
  }

  /**
   * Deactivate kill switch and recover normal operation.
   * Calls POST /v1/admin/recover with masterAuth header.
   * Requires masterPassword to be set in constructor options.
   */
  async recover(): Promise<RecoverResponse> {
    return withRetry(async () => {
      const headers = this.masterAuthHeaders();
      return this.http.post<RecoverResponse>(
        '/v1/admin/recover',
        {},
        headers,
      );
    }, this.retryOptions);
  }
}
