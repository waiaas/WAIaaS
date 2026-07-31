/**
 * WAIaaSClient - Core wallet client for WAIaaS daemon REST API.
 *
 * Wraps 40 REST API methods + 1 client-side helper with typed responses:
 * - getBalance(), getAddress(), getAssets() (wallet queries)
 * - getWalletInfo() (wallet management)
 * - sendToken(), getTransaction(), listTransactions(), listPendingTransactions() (transactions)
 * - listIncomingTransactions(), getIncomingTransactionSummary() (incoming transactions)
 * - createSession(), renewSession() (session management)
 * - getConnectInfo(), getRpcProxyUrl() (discovery)
 * - encodeCalldata(), signTransaction() (utils)
 * - x402Fetch() (x402 auto-payment)
 * - signHttpRequest(), verifyHttpSignature() (ERC-8128 signing)
 * - fetchWithErc8128() (ERC-8128 sign+fetch helper)
 * - wcConnect(), wcStatus(), wcDisconnect() (WalletConnect)
 * - executeAction() (action providers: DeFi swaps, etc.)
 * - registerAgent(), setAgentWallet(), unsetAgentWallet(), setAgentUri(),
 *   setAgentMetadata(), giveFeedback(), revokeFeedback(), requestValidation() (ERC-8004 write)
 * - getAgentInfo(), getAgentReputation(), getValidationStatus() (ERC-8004 read)
 * - acrossBridgeQuote(), acrossBridgeExecute(), acrossBridgeStatus(), acrossBridgeRoutes() (Across bridge)
 *
 * All methods use exponential backoff retry for 429/5xx responses.
 * sendToken() performs inline pre-validation before making the HTTP request.
 */

import { readFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { HttpClient } from './internal/http.js';
import { WAIaaSError } from './error.js';
import { withRetry } from './retry.js';
import { validateSendToken } from './validation.js';
import { DEFAULT_TIMEOUT } from './internal/constants.js';
import type {
  ConnectOptions,
  WAIaaSClientOptions,
  RetryOptions,
  BalanceOptions,
  AssetsOptions,
  BalanceResponse,
  AddressResponse,
  AssetsResponse,
  SendTokenParams,
  SendTokenResponse,
  TransactionResponse,
  TransactionListResponse,
  ListTransactionsParams,
  PendingTransactionsResponse,
  CreateSessionParams,
  CreateSessionResponse,
  RenewSessionResponse,
  RotateSessionTokenResponse,
  ListSessionsParams,
  PaginatedSessionList,
  ListPoliciesParams,
  PaginatedPolicyList,
  ConnectInfoResponse,
  EncodeCalldataParams,
  EncodeCalldataResponse,
  SignTransactionParams,
  SignTransactionResponse,
  BuildUserOpParams,
  BuildUserOpResponse,
  SignUserOpParams,
  SignUserOpResponse,
  WalletInfoResponse,
  MultiNetworkBalanceResponse,
  MultiNetworkAssetsResponse,
  X402FetchParams,
  X402FetchResponse,
  WcPairingResponse,
  WcSessionResponse,
  WcDisconnectResponse,
  IncomingTransactionListResponse,
  ListIncomingTransactionsParams,
  IncomingTransactionSummaryResponse,
  GetIncomingTransactionSummaryParams,
  ExecuteActionParams,
  ExecuteActionResponse,
  DeFiPositionsResponse,
  HealthFactorResponse,
  SimulateResponse,
  CreateWalletParams,
  CreateWalletResponse,
  Erc8004AgentInfoResponse,
  Erc8004ReputationResponse,
  Erc8004ValidationResponse,
  Erc8004RegisterAgentParams,
  Erc8004SetAgentWalletParams,
  Erc8004UnsetAgentWalletParams,
  Erc8004SetAgentUriParams,
  Erc8004SetAgentMetadataParams,
  Erc8004GiveFeedbackParams,
  Erc8004RevokeFeedbackParams,
  Erc8004RequestValidationParams,
  Erc8004GetReputationOptions,
  Erc8128SignParams,
  Erc8128SignResponse,
  Erc8128VerifyParams,
  Erc8128VerifyResponse,
  Erc8128FetchParams,
  Erc8128FetchResponse,
  ListNftsParams,
  NftListResponse,
  NftMetadataParams,
  NftMetadataResponse,
  TransferNftParams,
  DcentQuoteParams,
  DcentDexSwapParams,
  AcrossBridgeQuoteParams,
  AcrossBridgeExecuteParams,
  AcrossBridgeStatusParams,
  AcrossBridgeRoutesParams,
  OffchainActionsListResponse,
  OffchainActionDetail,
  ListOffchainActionsParams,
  CredentialMetadata,
  CreateCredentialParams,
} from './types.js';

export class WAIaaSClient {
  private http: HttpClient;
  private sessionToken: string | undefined;
  private sessionId: string | undefined;
  private masterPassword: string | undefined;
  private retryOptions?: RetryOptions;

  constructor(options: WAIaaSClientOptions) {
    this.http = new HttpClient(
      options.baseUrl.replace(/\/+$/, ''),
      options.timeout ?? DEFAULT_TIMEOUT,
    );
    this.sessionToken = options.sessionToken;
    this.masterPassword = options.masterPassword;
    this.retryOptions = options.retryOptions;
  }

  /**
   * Auto-discover a running daemon and connect, or optionally auto-start one.
   *
   * @example
   * ```typescript
   * // Daemon already running — auto-discover + connect
   * const client = await WAIaaSClient.connect();
   *
   * // Auto-start if not running (opt-in)
   * const client = await WAIaaSClient.connect({ autoStart: true });
   *
   * // Direct connection (skip auto-discovery)
   * const client = await WAIaaSClient.connect({ token: 'wai_sess_...', baseUrl: 'http://...' });
   * ```
   */
  static async connect(options?: ConnectOptions): Promise<WAIaaSClient> {
    const baseUrl = (options?.baseUrl ?? 'http://localhost:3100').replace(/\/+$/, '');
    const dataDir = options?.dataDir ?? process.env['WAIAAS_DATA_DIR'] ?? join(homedir(), '.waiaas');
    const autoStart = options?.autoStart ?? false;
    const startTimeoutMs = options?.startTimeoutMs ?? 30_000;

    // If token is explicitly provided, skip auto-discovery
    if (options?.token) {
      return new WAIaaSClient({
        baseUrl,
        sessionToken: options.token,
        timeout: options?.timeout,
        retryOptions: options?.retryOptions,
      });
    }

    // 1. Check if daemon is running via health check
    const running = await WAIaaSClient.checkHealth(baseUrl);

    if (!running && !autoStart) {
      throw new WAIaaSError({
        code: 'DAEMON_NOT_RUNNING',
        message:
          'WAIaaS daemon is not running.\n' +
          'Setup:\n' +
          '  npx @waiaas/cli init --auto-provision\n' +
          '  npx @waiaas/cli start &\n' +
          '  npx @waiaas/cli quickset\n' +
          'Docs: https://github.com/waiaas/WAIaaS',
        status: 0,
        retryable: false,
      });
    }

    if (!running && autoStart) {
      await WAIaaSClient.autoStartDaemon(dataDir, baseUrl, startTimeoutMs);
    }

    // 2. Read token from file
    const token = await WAIaaSClient.readTokenFile(dataDir);

    return new WAIaaSClient({
      baseUrl,
      sessionToken: token,
      timeout: options?.timeout,
      retryOptions: options?.retryOptions,
    });
  }

  /** @internal */
  private static async checkHealth(baseUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** @internal */
  private static async readTokenFile(dataDir: string): Promise<string> {
    const tokenPath = join(dataDir, 'mcp-token');
    try {
      const token = (await readFile(tokenPath, 'utf-8')).trim();
      if (!token) {
        throw new WAIaaSError({
          code: 'TOKEN_NOT_FOUND',
          message:
            `Token file is empty: ${tokenPath}\n` +
            'Run: npx @waiaas/cli quickset',
          status: 0,
          retryable: false,
        });
      }
      return token;
    } catch (err) {
      if (err instanceof WAIaaSError) throw err;
      throw new WAIaaSError({
        code: 'TOKEN_NOT_FOUND',
        message:
          `Token file not found: ${tokenPath}\n` +
          'Run: npx @waiaas/cli quickset',
        status: 0,
        retryable: false,
      });
    }
  }

  /** @internal */
  private static resolveCliCommand(): { command: string; args: string[] } {
    try {
      execSync('which waiaas', { stdio: 'ignore' });
      return { command: 'waiaas', args: [] };
    } catch {
      return { command: 'npx', args: ['@waiaas/cli'] };
    }
  }

  /** @internal */
  private static async autoStartDaemon(
    dataDir: string,
    baseUrl: string,
    timeoutMs: number,
  ): Promise<void> {
    const cli = WAIaaSClient.resolveCliCommand();

    // Ensure data dir exists (init --auto-provision if needed)
    try {
      await access(dataDir);
    } catch {
      const initArgs = [...cli.args, 'init', '--auto-provision', '--data-dir', dataDir];
      await WAIaaSClient.runCliSync(cli.command, initArgs);
    }

    // Start daemon (detached)
    const startArgs = [...cli.args, 'start', '--data-dir', dataDir];
    const child = spawn(cli.command, startArgs, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // Poll for readiness
    const deadline = Date.now() + timeoutMs;
    const pollIntervalMs = 500;
    let ready = false;
    while (Date.now() < deadline) {
      if (await WAIaaSClient.checkHealth(baseUrl)) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    if (!ready) {
      throw new WAIaaSError({
        code: 'START_TIMEOUT',
        message: `Daemon did not become ready within ${timeoutMs}ms`,
        status: 0,
        retryable: false,
      });
    }

    // Run quickset if token file doesn't exist
    const tokenPath = join(dataDir, 'mcp-token');
    try {
      await access(tokenPath);
    } catch {
      const quicksetArgs = [...cli.args, 'quickset', '--data-dir', dataDir];
      await WAIaaSClient.runCliSync(cli.command, quicksetArgs);
    }
  }

  /** @internal */
  private static runCliSync(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}: ${stderr}`));
      });
      child.on('error', reject);
    });
  }

  // --- Token management ---
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  clearSessionToken(): void {
    this.sessionToken = undefined;
    this.sessionId = undefined;
  }

  private authHeaders(): Record<string, string> {
    if (!this.sessionToken) {
      throw new WAIaaSError({
        code: 'NO_TOKEN',
        message: 'No session token set',
        status: 0,
        retryable: false,
      });
    }
    return { Authorization: `Bearer ${this.sessionToken}` };
  }

  private masterHeaders(masterPassword: string): Record<string, string> {
    return { 'X-Master-Password': masterPassword };
  }

  // --- Wallet queries ---
  async getBalance(options?: BalanceOptions): Promise<BalanceResponse> {
    const query = new URLSearchParams();
    if (options?.network) query.set('network', options.network);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<BalanceResponse>(
        `/v1/wallet/balance${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getAddress(): Promise<AddressResponse> {
    return withRetry(
      () => this.http.get<AddressResponse>('/v1/wallet/address', this.authHeaders()),
      this.retryOptions,
    );
  }

  async getAssets(options?: AssetsOptions): Promise<AssetsResponse> {
    const query = new URLSearchParams();
    if (options?.network) query.set('network', options.network);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<AssetsResponse>(
        `/v1/wallet/assets${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getAllBalances(): Promise<MultiNetworkBalanceResponse> {
    return withRetry(
      () => this.http.get<MultiNetworkBalanceResponse>(
        '/v1/wallet/balance?network=all',
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getAllAssets(): Promise<MultiNetworkAssetsResponse> {
    return withRetry(
      () => this.http.get<MultiNetworkAssetsResponse>(
        '/v1/wallet/assets?network=all',
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- NFT queries ---
  async listNfts(options: ListNftsParams): Promise<NftListResponse> {
    const query = new URLSearchParams();
    query.set('network', options.network);
    if (options.cursor) query.set('cursor', options.cursor);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    if (options.groupBy) query.set('groupBy', options.groupBy);
    if (options.walletId) query.set('walletId', options.walletId);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<NftListResponse>(
        `/v1/wallet/nfts${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getNftMetadata(tokenIdentifier: string, options: NftMetadataParams): Promise<NftMetadataResponse> {
    const query = new URLSearchParams();
    query.set('network', options.network);
    if (options.walletId) query.set('walletId', options.walletId);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<NftMetadataResponse>(
        `/v1/wallet/nfts/${encodeURIComponent(tokenIdentifier)}${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async transferNft(params: TransferNftParams): Promise<SendTokenResponse> {
    const body: Record<string, unknown> = {
      type: 'NFT_TRANSFER',
      to: params.to,
      token: params.token,
      network: params.network,
    };
    if (params.amount !== undefined) body.amount = params.amount;
    if (params.walletId) body.walletId = params.walletId;
    if (params.gasCondition) body.gasCondition = params.gasCondition;
    return withRetry(
      () => this.http.post<SendTokenResponse>(
        '/v1/transactions/send',
        body,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- DeFi queries ---
  async getPositions(options?: { walletId?: string }): Promise<DeFiPositionsResponse> {
    const query = new URLSearchParams();
    if (options?.walletId) query.set('wallet_id', options.walletId);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<DeFiPositionsResponse>(
        `/v1/wallet/positions${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getHealthFactor(options?: { walletId?: string; network?: string }): Promise<HealthFactorResponse> {
    const query = new URLSearchParams();
    if (options?.walletId) query.set('wallet_id', options.walletId);
    if (options?.network) query.set('network', options.network);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<HealthFactorResponse>(
        `/v1/wallet/health-factor${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- Transaction operations ---
  async sendToken(params: SendTokenParams): Promise<SendTokenResponse> {
    // Pre-validate before making HTTP request
    validateSendToken(params);
    return withRetry(
      () => this.http.post<SendTokenResponse>(
        '/v1/transactions/send',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Simulate a transaction without executing it (dry-run). */
  async simulate(params: SendTokenParams): Promise<SimulateResponse> {
    validateSendToken(params);
    return withRetry(
      () => this.http.post<SimulateResponse>(
        '/v1/transactions/simulate',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getTransaction(id: string): Promise<TransactionResponse> {
    return withRetry(
      () => this.http.get<TransactionResponse>(
        `/v1/transactions/${id}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async listTransactions(params?: ListTransactionsParams): Promise<TransactionListResponse> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return withRetry(
      () => this.http.get<TransactionListResponse>(
        `/v1/transactions${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async listPendingTransactions(): Promise<PendingTransactionsResponse> {
    return withRetry(
      () => this.http.get<PendingTransactionsResponse>(
        '/v1/transactions/pending',
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- Incoming transactions ---
  async listIncomingTransactions(
    params?: ListIncomingTransactionsParams,
  ): Promise<IncomingTransactionListResponse> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.chain) query.set('chain', params.chain);
    if (params?.network) query.set('network', params.network);
    if (params?.status) query.set('status', params.status);
    if (params?.token) query.set('token', params.token);
    if (params?.fromAddress) query.set('from_address', params.fromAddress);
    if (params?.since) query.set('since', String(params.since));
    if (params?.until) query.set('until', String(params.until));
    if (params?.walletId) query.set('wallet_id', params.walletId);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<IncomingTransactionListResponse>(
        `/v1/wallet/incoming${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async getIncomingTransactionSummary(
    params?: GetIncomingTransactionSummaryParams,
  ): Promise<IncomingTransactionSummaryResponse> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.chain) query.set('chain', params.chain);
    if (params?.network) query.set('network', params.network);
    if (params?.since) query.set('since', String(params.since));
    if (params?.until) query.set('until', String(params.until));
    if (params?.walletId) query.set('wallet_id', params.walletId);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<IncomingTransactionSummaryResponse>(
        `/v1/wallet/incoming/summary${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- Session management ---
  async createSession(
    params: CreateSessionParams,
    masterPassword: string,
  ): Promise<CreateSessionResponse> {
    const body: Record<string, unknown> = {};
    if (params.walletIds) body['walletIds'] = params.walletIds;
    if (params.walletId) body['walletId'] = params.walletId;
    if (params.ttl !== undefined) body['ttl'] = params.ttl;
    if (params.maxRenewals !== undefined) body['maxRenewals'] = params.maxRenewals;
    if (params.absoluteLifetime !== undefined) body['absoluteLifetime'] = params.absoluteLifetime;
    if (params.constraints) body['constraints'] = params.constraints;
    if (params.source) body['source'] = params.source;

    const result = await withRetry(
      () => this.http.post<CreateSessionResponse>(
        '/v1/sessions',
        body,
        this.masterHeaders(masterPassword),
      ),
      this.retryOptions,
    );

    // Auto-update session token and ID
    this.sessionToken = result.token;
    this.sessionId = result.id;

    return result;
  }

  async renewSession(): Promise<RenewSessionResponse> {
    if (!this.sessionId) {
      this.sessionId = this.extractSessionId();
    }
    const result = await withRetry(
      () => this.http.put<RenewSessionResponse>(
        `/v1/sessions/${this.sessionId}/renew`,
        {},
        this.authHeaders(),
      ),
      this.retryOptions,
    );
    // Auto-update token after successful renewal
    this.sessionToken = result.token;
    return result;
  }

  async rotateSessionToken(sessionId: string, masterPassword?: string): Promise<RotateSessionTokenResponse> {
    const pw = masterPassword ?? this.masterPassword;
    if (!pw) {
      throw new WAIaaSError({ code: 'NO_MASTER_PASSWORD', message: 'Master password required for rotate', status: 0, retryable: false });
    }
    const result = await withRetry(
      () => this.http.post<RotateSessionTokenResponse>(
        `/v1/sessions/${sessionId}/rotate`,
        {},
        this.masterHeaders(pw),
      ),
      this.retryOptions,
    );
    return result;
  }

  /** List sessions with optional wallet filter and pagination (admin operation). */
  async listSessions(masterPassword: string, params?: ListSessionsParams): Promise<PaginatedSessionList> {
    const qs = new URLSearchParams();
    if (params?.walletId) qs.set('walletId', params.walletId);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return withRetry(
      () => this.http.get<PaginatedSessionList>(
        `/v1/sessions${query ? `?${query}` : ''}`,
        this.masterHeaders(masterPassword),
      ),
      this.retryOptions,
    );
  }

  /** List policies with optional wallet filter and pagination (session auth). */
  async listPolicies(params?: ListPoliciesParams): Promise<PaginatedPolicyList> {
    const qs = new URLSearchParams();
    if (params?.walletId) qs.set('walletId', params.walletId);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return withRetry(
      () => this.http.get<PaginatedPolicyList>(
        `/v1/policies${query ? `?${query}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- Discovery ---
  async getConnectInfo(): Promise<ConnectInfoResponse> {
    return withRetry(
      () => this.http.get<ConnectInfoResponse>(
        '/v1/connect-info',
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /**
   * Get the RPC proxy URL for a specific wallet and EVM chain.
   * Returns the full URL to use as --rpc-url for Forge/Hardhat/ethers.js/viem.
   * Returns null if RPC proxy is not enabled.
   */
  async getRpcProxyUrl(walletId: string, chainId: number): Promise<string | null> {
    const info = await this.getConnectInfo();
    if (!info.rpcProxy?.enabled || !info.rpcProxy?.baseUrl) return null;
    return `${info.rpcProxy.baseUrl}/${walletId}/${chainId}`;
  }

  // --- Utils ---
  async encodeCalldata(params: EncodeCalldataParams): Promise<EncodeCalldataResponse> {
    return withRetry(
      () => this.http.post<EncodeCalldataResponse>(
        '/v1/utils/encode-calldata',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  async signTransaction(params: SignTransactionParams): Promise<SignTransactionResponse> {
    return withRetry(
      () => this.http.post<SignTransactionResponse>(
        '/v1/transactions/sign',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- UserOp Build/Sign (masterAuth) ---
  async buildUserOp(walletId: string, params: BuildUserOpParams): Promise<BuildUserOpResponse> {
    if (!this.masterPassword) {
      throw new WAIaaSError({ code: 'NO_MASTER_PASSWORD', message: 'Master password required for UserOp build', status: 0, retryable: false });
    }
    return withRetry(
      () => this.http.post<BuildUserOpResponse>(
        `/v1/wallets/${walletId}/userop/build`,
        params,
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  async signUserOp(walletId: string, params: SignUserOpParams): Promise<SignUserOpResponse> {
    if (!this.masterPassword) {
      throw new WAIaaSError({ code: 'NO_MASTER_PASSWORD', message: 'Master password required for UserOp sign', status: 0, retryable: false });
    }
    return withRetry(
      () => this.http.post<SignUserOpResponse>(
        `/v1/wallets/${walletId}/userop/sign`,
        params,
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  // --- Wallet info ---
  async getWalletInfo(): Promise<WalletInfoResponse> {
    const address = await withRetry(
      () => this.http.get<AddressResponse>('/v1/wallet/address', this.authHeaders()),
      this.retryOptions,
    );
    const networks = await withRetry(
      () => this.http.get<{ networks: Array<{ network: string }> }>(
        `/v1/wallets/${address.walletId}/networks`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
    return {
      walletId: address.walletId,
      chain: address.chain,
      network: address.network,
      environment: address.environment ?? '',
      address: address.address,
      networks: networks.networks ?? [],
    };
  }

  // --- x402 ---
  async x402Fetch(params: X402FetchParams): Promise<X402FetchResponse> {
    return withRetry(
      () => this.http.post<X402FetchResponse>(
        '/v1/x402/fetch',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- ERC-8128 ---

  /** Sign an HTTP request using ERC-8128 (RFC 9421 + EIP-191). */
  async signHttpRequest(params: Erc8128SignParams): Promise<Erc8128SignResponse> {
    return withRetry(
      () => this.http.post<Erc8128SignResponse>(
        '/v1/erc8128/sign',
        params,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Verify an ERC-8128 HTTP message signature. */
  async verifyHttpSignature(params: Erc8128VerifyParams): Promise<Erc8128VerifyResponse> {
    // REST API expects signature headers inside the headers dict, not as top-level fields
    const headers = { ...params.headers };
    headers['signature-input'] = params.signatureInput;
    headers['signature'] = params.signature;
    if (params.contentDigest) headers['content-digest'] = params.contentDigest;

    return withRetry(
      () => this.http.post<Erc8128VerifyResponse>(
        '/v1/erc8128/verify',
        { method: params.method, url: params.url, headers },
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Sign an HTTP request and fetch the URL in one call. Signs via ERC-8128, attaches signature headers, then fetches. */
  async fetchWithErc8128(params: Erc8128FetchParams): Promise<Erc8128FetchResponse> {
    // Step 1: Sign the request
    const method = params.method ?? 'GET';
    const signResult = await this.signHttpRequest({
      method,
      url: params.url,
      headers: params.headers,
      body: params.body,
      walletId: params.walletId,
      network: params.network,
      preset: params.preset,
      ttlSeconds: params.ttlSeconds,
    });

    // Step 2: Fetch with signed headers
    const fetchHeaders: Record<string, string> = {
      ...params.headers,
      'Signature-Input': signResult.signatureInput,
      'Signature': signResult.signature,
    };
    if (signResult.contentDigest) {
      fetchHeaders['Content-Digest'] = signResult.contentDigest;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
    };
    if (params.body) {
      fetchOptions.body = params.body;
    }

    const response = await fetch(params.url, fetchOptions);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: await response.text(),
      signatureHeaders: {
        signatureInput: signResult.signatureInput,
        signature: signResult.signature,
        contentDigest: signResult.contentDigest,
      },
    };
  }

  // --- WalletConnect ---
  async wcConnect(): Promise<WcPairingResponse> {
    return withRetry(
      () => this.http.post<WcPairingResponse>('/v1/wallet/wc/pair', {}, this.authHeaders()),
      this.retryOptions,
    );
  }

  async wcStatus(): Promise<WcSessionResponse> {
    return withRetry(
      () => this.http.get<WcSessionResponse>('/v1/wallet/wc/session', this.authHeaders()),
      this.retryOptions,
    );
  }

  async wcDisconnect(): Promise<WcDisconnectResponse> {
    return withRetry(
      () => this.http.delete<WcDisconnectResponse>('/v1/wallet/wc/session', this.authHeaders()),
      this.retryOptions,
    );
  }

  // --- Actions ---
  async executeAction(
    provider: string,
    action: string,
    params?: ExecuteActionParams,
  ): Promise<ExecuteActionResponse> {
    const body: Record<string, unknown> = {};
    if (params?.params) body.params = params.params;
    if (params?.network) body.network = params.network;
    if (params?.walletId) body.walletId = params.walletId;
    if (params?.gasCondition) body.gasCondition = params.gasCondition;
    return withRetry(
      () => this.http.post<ExecuteActionResponse>(
        `/v1/actions/${provider}/${action}`,
        body,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- DCent Swap convenience methods ---

  /** Get DCent swap quotes (informational -- no transaction created). */
  async getDcentQuotes(params: DcentQuoteParams): Promise<ExecuteActionResponse> {
    const { network, walletId, ...rest } = params;
    return this.executeAction('dcent_swap', 'get_quotes', {
      params: rest, network, walletId,
    });
  }

  /** Execute DCent DEX swap (same-chain, approve+txdata BATCH). */
  async dcentDexSwap(params: DcentDexSwapParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('dcent_swap', 'dex_swap', {
      params: rest, network, walletId, gasCondition,
    });
  }


  // --- ERC-8004 write actions (via executeAction) ---

  /** Register an agent on the ERC-8004 Identity Registry. */
  async registerAgent(params: Erc8004RegisterAgentParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'register_agent', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Link an agent wallet via EIP-712 signature. */
  async setAgentWallet(params: Erc8004SetAgentWalletParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'set_agent_wallet', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Unlink an agent wallet. */
  async unsetAgentWallet(params: Erc8004UnsetAgentWalletParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'unset_agent_wallet', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Set the agent URI in the Identity Registry. */
  async setAgentUri(params: Erc8004SetAgentUriParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'set_agent_uri', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Set agent metadata key-value pair. */
  async setAgentMetadata(params: Erc8004SetAgentMetadataParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'set_metadata', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Give feedback (reputation score) to another agent. */
  async giveFeedback(params: Erc8004GiveFeedbackParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'give_feedback', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Revoke previously given feedback. */
  async revokeFeedback(params: Erc8004RevokeFeedbackParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'revoke_feedback', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  /** Request validation from the ERC-8004 Validation Registry. */
  async requestValidation(params: Erc8004RequestValidationParams): Promise<ExecuteActionResponse> {
    const { network, walletId, gasCondition, ...rest } = params;
    return this.executeAction('erc8004_agent', 'request_validation', {
      params: rest,
      network,
      walletId,
      gasCondition,
    });
  }

  // --- ERC-8004 read queries ---

  /** Get agent identity info from on-chain registry. */
  async getAgentInfo(agentId: string): Promise<Erc8004AgentInfoResponse> {
    return withRetry(
      () => this.http.get<Erc8004AgentInfoResponse>(
        `/v1/erc8004/agent/${agentId}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Get agent reputation summary from on-chain registry. */
  async getAgentReputation(agentId: string, opts?: Erc8004GetReputationOptions): Promise<Erc8004ReputationResponse> {
    const query = new URLSearchParams();
    if (opts?.tag1) query.set('tag1', opts.tag1);
    if (opts?.tag2) query.set('tag2', opts.tag2);
    const qs = query.toString();
    return withRetry(
      () => this.http.get<Erc8004ReputationResponse>(
        `/v1/erc8004/agent/${agentId}/reputation${qs ? `?${qs}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Get validation request status. */
  async getValidationStatus(requestHash: string): Promise<Erc8004ValidationResponse> {
    return withRetry(
      () => this.http.get<Erc8004ValidationResponse>(
        `/v1/erc8004/validation/${requestHash}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  // --- Hyperliquid Perp convenience methods ---

  /** Open a Hyperliquid perpetual position. */
  async hlOpenPosition(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_open_position', { params, walletId });
  }

  /** Close a Hyperliquid perpetual position. */
  async hlClosePosition(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_close_position', { params, walletId });
  }

  /** Place a conditional order (stop-loss, take-profit). */
  async hlPlaceOrder(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_place_order', { params, walletId });
  }

  /** Cancel one or all orders for a market. */
  async hlCancelOrder(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_cancel_order', { params, walletId });
  }

  /** Set leverage for a market. */
  async hlSetLeverage(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_set_leverage', { params, walletId });
  }

  /** Set margin mode (CROSS or ISOLATED). */
  async hlSetMarginMode(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_set_margin_mode', { params, walletId });
  }

  /** Transfer USDC between Spot and Perp accounts. */
  async hlTransferUsdc(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_perp', 'hl_transfer_usdc', { params, walletId });
  }

  /** Get Hyperliquid perp positions. */
  async hlGetPositions(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/positions`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Hyperliquid open orders. */
  async hlGetOpenOrders(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/orders`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Hyperliquid perp markets. */
  async hlGetMarkets(): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>('/v1/hyperliquid/markets', this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get funding rate history. */
  async hlGetFundingRates(market: string, startTime?: number): Promise<unknown> {
    const params = new URLSearchParams({ market });
    if (startTime !== undefined) params.set('startTime', String(startTime));
    return withRetry(
      () => this.http.get<unknown>(`/v1/hyperliquid/funding-rates?${params.toString()}`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Hyperliquid account state. */
  async hlGetAccountState(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/account`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Hyperliquid trade history (fills). */
  async hlGetTradeHistory(walletId: string, limit?: number): Promise<unknown> {
    const params = limit ? `?limit=${limit}` : '';
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/fills${params}`, this.authHeaders()),
      this.retryOptions,
    );
  }

  // --- Hyperliquid Spot (Phase 350) ---

  /** Place a spot buy order on Hyperliquid. */
  async hlSpotBuy(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_spot', 'hl_spot_buy', { params, walletId });
  }

  /** Place a spot sell order on Hyperliquid. */
  async hlSpotSell(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_spot', 'hl_spot_sell', { params, walletId });
  }

  /** Cancel a spot order on Hyperliquid. */
  async hlSpotCancel(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_spot', 'hl_spot_cancel', { params, walletId });
  }

  /** Get Hyperliquid spot token balances. */
  async hlGetSpotBalances(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/spot/balances`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Hyperliquid spot market list. */
  async hlGetSpotMarkets(): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>('/v1/hyperliquid/spot/markets', this.authHeaders()),
      this.retryOptions,
    );
  }

  // --- Hyperliquid Sub-account (Phase 351) ---

  /** Create a new Hyperliquid sub-account. */
  async hlCreateSubAccount(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_sub', 'hl_create_sub_account', { params, walletId });
  }

  /** Transfer USDC between master and sub-account. */
  async hlSubTransfer(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('hyperliquid_sub', 'hl_sub_transfer', { params, walletId });
  }

  /** List Hyperliquid sub-accounts. */
  async hlListSubAccounts(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/sub-accounts`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get positions for a Hyperliquid sub-account. */
  async hlGetSubPositions(walletId: string, subAccount: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/hyperliquid/sub-accounts/${subAccount}/positions`, this.authHeaders()),
      this.retryOptions,
    );
  }

  // --- Across Bridge convenience methods ---

  /** Get Across bridge quote (fees, limits, estimated fill time). */
  async acrossBridgeQuote(params: AcrossBridgeQuoteParams): Promise<ExecuteActionResponse> {
    const { walletId, network, ...rest } = params;
    return this.executeAction('across_bridge', 'quote', { params: rest, walletId, network });
  }

  /** Execute Across bridge (approve+depositV3 BATCH for ERC-20 or msg.value for native ETH). */
  async acrossBridgeExecute(params: AcrossBridgeExecuteParams): Promise<ExecuteActionResponse> {
    const { walletId, network, gasCondition, ...rest } = params;
    return this.executeAction('across_bridge', 'execute', { params: rest, walletId, network, gasCondition });
  }

  /** Check Across bridge deposit status (filled/pending/expired/refunded). */
  async acrossBridgeStatus(params: AcrossBridgeStatusParams): Promise<ExecuteActionResponse> {
    const { walletId, network, ...rest } = params;
    return this.executeAction('across_bridge', 'status', { params: rest, walletId, network });
  }

  /** List available Across bridge routes (supported chain/token combinations). */
  async acrossBridgeRoutes(params?: AcrossBridgeRoutesParams): Promise<ExecuteActionResponse> {
    const { walletId, network, ...rest } = params ?? {};
    return this.executeAction('across_bridge', 'routes', { params: rest, walletId, network });
  }

  // --- Polymarket convenience methods ---

  /** Buy prediction market outcome tokens on Polymarket CLOB. */
  async pmBuy(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_order', 'pm_buy', { params, walletId });
  }

  /** Sell prediction market outcome tokens on Polymarket CLOB. */
  async pmSell(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_order', 'pm_sell', { params, walletId });
  }

  /** Cancel a specific Polymarket CLOB order. */
  async pmCancelOrder(walletId: string, orderId: string): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_order', 'pm_cancel_order', { params: { orderId }, walletId });
  }

  /** Cancel all Polymarket CLOB orders (optionally for a specific market). */
  async pmCancelAll(walletId: string, conditionId?: string): Promise<ExecuteActionResponse> {
    const params: Record<string, unknown> = {};
    if (conditionId) params.conditionId = conditionId;
    return this.executeAction('polymarket_order', 'pm_cancel_all', { params, walletId });
  }

  /** Update an existing Polymarket CLOB order (price/size). */
  async pmUpdateOrder(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_order', 'pm_update_order', { params, walletId });
  }

  /** Split USDC.e into YES+NO CTF token pair. */
  async pmSplitPosition(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_ctf', 'pm_split_position', { params, walletId });
  }

  /** Merge YES+NO CTF token pair back into USDC.e. */
  async pmMergePositions(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_ctf', 'pm_merge_positions', { params, walletId });
  }

  /** Redeem winning CTF tokens for USDC.e after market resolution. */
  async pmRedeemPositions(walletId: string, params: Record<string, unknown>): Promise<ExecuteActionResponse> {
    return this.executeAction('polymarket_ctf', 'pm_redeem_positions', { params, walletId });
  }

  /** Get Polymarket positions for a wallet. */
  async pmGetPositions(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/polymarket/positions`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Polymarket CLOB orders for a wallet. */
  async pmGetOrders(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/polymarket/orders`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Browse Polymarket prediction markets. */
  async pmGetMarkets(params?: { keyword?: string; category?: string; limit?: number }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.keyword) qs.set('keyword', params.keyword);
    if (params?.category) qs.set('category', params.category);
    if (params?.limit) qs.set('limit', String(params.limit));
    const qsStr = qs.toString();
    return withRetry(
      () => this.http.get<unknown>(`/v1/polymarket/markets${qsStr ? '?' + qsStr : ''}`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get detailed info about a specific Polymarket market. */
  async pmGetMarketDetail(conditionId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/polymarket/markets/${conditionId}`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Polymarket balance (USDC.e + CTF tokens) for a wallet. */
  async pmGetBalance(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/polymarket/balance`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Get Polymarket PnL summary for a wallet. */
  async pmGetPnl(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.get<unknown>(`/v1/wallets/${walletId}/polymarket/pnl`, this.authHeaders()),
      this.retryOptions,
    );
  }

  /** Set up Polymarket API keys and optional CTF approval. */
  async pmSetup(walletId: string): Promise<unknown> {
    return withRetry(
      () => this.http.post<unknown>(`/v1/wallets/${walletId}/polymarket/setup`, {}, this.authHeaders()),
      this.retryOptions,
    );
  }

  // --- External Actions (off-chain signedData/signedHttp) ---

  /** List off-chain action history with venue/status filter and pagination. */
  async listOffchainActions(params: ListOffchainActionsParams): Promise<OffchainActionsListResponse> {
    const qs = new URLSearchParams();
    if (params.venue) qs.set('venue', params.venue);
    if (params.status) qs.set('status', params.status);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return withRetry(
      () => this.http.get<OffchainActionsListResponse>(
        `/v1/wallets/${params.walletId}/actions${query ? `?${query}` : ''}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** Get off-chain action detail by ID. */
  async getActionResult(walletId: string, actionId: string): Promise<OffchainActionDetail> {
    return withRetry(
      () => this.http.get<OffchainActionDetail>(
        `/v1/wallets/${walletId}/actions/${actionId}`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
  }

  /** List credential metadata for a wallet (sessionAuth -- never returns values). */
  async listCredentials(walletId: string): Promise<CredentialMetadata[]> {
    const wrapper = await withRetry(
      () => this.http.get<{ credentials: CredentialMetadata[] }>(
        `/v1/wallets/${walletId}/credentials`,
        this.authHeaders(),
      ),
      this.retryOptions,
    );
    return wrapper.credentials;
  }

  // --- Admin Credential CRUD (masterAuth) ---

  /** Create a new credential for a wallet (masterAuth required). */
  async createCredential(walletId: string, params: CreateCredentialParams): Promise<CredentialMetadata> {
    if (!this.masterPassword) {
      throw new WAIaaSError({
        code: 'MASTER_PASSWORD_REQUIRED',
        message: 'createCredential requires masterPassword in client options',
        status: 0,
        retryable: false,
      });
    }
    const body: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      value: params.value,
    };
    if (params.expiresAt !== undefined) body.expiresAt = params.expiresAt;
    return withRetry(
      () => this.http.post<CredentialMetadata>(
        `/v1/wallets/${walletId}/credentials`,
        body,
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  /** Delete a credential by name reference (masterAuth required). */
  async deleteCredential(walletId: string, ref: string): Promise<{ deleted: boolean }> {
    if (!this.masterPassword) {
      throw new WAIaaSError({
        code: 'MASTER_PASSWORD_REQUIRED',
        message: 'deleteCredential requires masterPassword in client options',
        status: 0,
        retryable: false,
      });
    }
    return withRetry(
      () => this.http.delete<{ deleted: boolean }>(
        `/v1/wallets/${walletId}/credentials/${ref}`,
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  /** Rotate a credential value (masterAuth required). */
  async rotateCredential(walletId: string, ref: string, newValue: string): Promise<CredentialMetadata> {
    if (!this.masterPassword) {
      throw new WAIaaSError({
        code: 'MASTER_PASSWORD_REQUIRED',
        message: 'rotateCredential requires masterPassword in client options',
        status: 0,
        retryable: false,
      });
    }
    return withRetry(
      () => this.http.put<CredentialMetadata>(
        `/v1/wallets/${walletId}/credentials/${ref}/rotate`,
        { value: newValue },
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  // --- Wallet creation (masterAuth) ---
  async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
    if (!this.masterPassword) {
      throw new WAIaaSError({
        code: 'MASTER_PASSWORD_REQUIRED',
        message: 'createWallet requires masterPassword in client options',
        status: 0,
        retryable: false,
      });
    }
    const body: Record<string, unknown> = {
      name: params.name,
    };
    if (params.chain) body.chain = params.chain;
    if (params.environment) body.environment = params.environment;
    if (params.accountType) body.accountType = params.accountType;
    if (params.createSession !== undefined) body.createSession = params.createSession;
    return withRetry(
      () => this.http.post<CreateWalletResponse>(
        '/v1/wallets',
        body,
        this.masterHeaders(this.masterPassword!),
      ),
      this.retryOptions,
    );
  }

  private extractSessionId(): string {
    if (!this.sessionToken) {
      throw new WAIaaSError({
        code: 'NO_TOKEN',
        message: 'No session token set',
        status: 0,
        retryable: false,
      });
    }
    try {
      const payload = this.sessionToken.split('.')[1];
      if (!payload) throw new Error('Invalid token format');
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf-8'),
      ) as Record<string, unknown>;
      if (!decoded['sessionId']) throw new Error('No sessionId in token');
      return decoded['sessionId'] as string;
    } catch {
      throw new WAIaaSError({
        code: 'INVALID_TOKEN',
        message: 'Cannot extract session ID from token',
        status: 0,
        retryable: false,
      });
    }
  }
}
