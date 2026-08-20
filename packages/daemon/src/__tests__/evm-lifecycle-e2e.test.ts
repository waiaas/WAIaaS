/**
 * EVM lifecycle E2E tests: full lifecycle, dual chain, SIWE owner-auth.
 *
 * Tests cover:
 * - EVM wallet creation -> balance query -> ETH transfer -> CONFIRMED
 * - Solana + EVM dual chain simultaneous operation
 * - SIWE owner-auth (EIP-4361 + EIP-191) for EVM wallets
 *
 * Uses Hono createApp() with full deps: db, jwtSecretManager, masterPasswordHash,
 * config, policyEngine, delayQueue, approvalWorkflow, ownerLifecycle, sqlite,
 * Mock EVM/Solana adapters, Mock KeyStore, Mock AdapterPool.
 *
 * @see Phase 88-01
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import argon2 from 'argon2';
import { privateKeyToAccount } from 'viem/accounts';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import { JwtSecretManager } from '../infrastructure/jwt/index.js';
import { DaemonConfigSchema } from '../infrastructure/config/loader.js';
import { createApp } from '../api/server.js';
import { DatabasePolicyEngine } from '../pipeline/database-policy-engine.js';
import { DelayQueue } from '../workflow/delay-queue.js';
import { ApprovalWorkflow } from '../workflow/approval-workflow.js';
import { OwnerLifecycleService } from '../workflow/owner-state.js';
import type { IChainAdapter } from '@waiaas/core';
import type { AdapterPool } from '../infrastructure/adapter-pool.js';
import type { OpenAPIHono } from '@hono/zod-openapi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'test-master-password-evm-e2e';
const HOST = '127.0.0.1:3100';
const _SESSION_TTL = 3600;
let passwordHash: string;

// EVM test address (EIP-55 checksum)
const EVM_TEST_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
// Solana test address
const SOLANA_TEST_ADDRESS = '11111111111111111111111111111112';

// Hardcoded private key for SIWE test signing (never use in production)
const SIWE_TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// ---------------------------------------------------------------------------
// Mock adapters
// ---------------------------------------------------------------------------

function createMockEvmAdapter(overrides: Partial<IChainAdapter> = {}): IChainAdapter {
  return {
    chain: 'ethereum' as const,
    network: 'ethereum-sepolia' as const,
    connect: async () => {},
    disconnect: async () => {},
    isConnected: () => true,
    getHealth: async () => ({ healthy: true, latencyMs: 1 }),
    getBalance: async (addr: string) => ({
      address: addr,
      balance: 1_000_000_000_000_000_000n, // 1 ETH
      decimals: 18,
      symbol: 'ETH',
    }),
    buildTransaction: async () => ({
      chain: 'ethereum',
      serialized: new Uint8Array(128),
      estimatedFee: 21000n,
      metadata: {},
    }),
    simulateTransaction: async () => ({ success: true, logs: [] }),
    signTransaction: async () => new Uint8Array(65),
    submitTransaction: async () => ({
      txHash: 'mock-evm-hash-' + Date.now(),
      status: 'submitted' as const,
    }),
    waitForConfirmation: async (txHash: string) => ({
      txHash,
      status: 'confirmed' as const,
      confirmations: 1,
    }),
    getAssets: async () => [],
    estimateFee: async () => ({ fee: 21000n, decimals: 18, symbol: 'ETH' }),
    buildTokenTransfer: async () => { throw new Error('not implemented'); },
    getTokenInfo: async () => { throw new Error('not implemented'); },
    buildContractCall: async () => { throw new Error('not implemented'); },
    buildApprove: async () => { throw new Error('not implemented'); },
    buildBatch: async () => { throw new Error('not implemented'); },
    getTransactionFee: async () => { throw new Error('not implemented'); },
    getCurrentNonce: async () => 0,
    sweepAll: async () => { throw new Error('not implemented'); },
    ...overrides,
  };
}

function createMockSolanaAdapter(overrides: Partial<IChainAdapter> = {}): IChainAdapter {
  return {
    chain: 'solana' as const,
    network: 'solana-devnet' as const,
    connect: async () => {},
    disconnect: async () => {},
    isConnected: () => true,
    getHealth: async () => ({ healthy: true, latencyMs: 1 }),
    getBalance: async (addr: string) => ({
      address: addr,
      balance: 1_000_000_000n, // 1 SOL
      decimals: 9,
      symbol: 'SOL',
    }),
    buildTransaction: async () => ({
      chain: 'solana',
      serialized: new Uint8Array(128),
      estimatedFee: 5000n,
      metadata: {},
    }),
    simulateTransaction: async () => ({ success: true, logs: [] }),
    signTransaction: async () => new Uint8Array(256),
    submitTransaction: async () => ({
      txHash: 'mock-solana-hash-' + Date.now(),
      status: 'submitted' as const,
    }),
    waitForConfirmation: async (txHash: string) => ({
      txHash,
      status: 'confirmed' as const,
      confirmations: 1,
    }),
    getAssets: async () => [],
    estimateFee: async () => { throw new Error('not implemented'); },
    buildTokenTransfer: async () => { throw new Error('not implemented'); },
    getTokenInfo: async () => { throw new Error('not implemented'); },
    buildContractCall: async () => { throw new Error('not implemented'); },
    buildApprove: async () => { throw new Error('not implemented'); },
    buildBatch: async () => { throw new Error('not implemented'); },
    getTransactionFee: async () => { throw new Error('not implemented'); },
    getCurrentNonce: async () => 0,
    sweepAll: async () => { throw new Error('not implemented'); },
    ...overrides,
  };
}

/**
 * Create a mock adapter pool that routes resolve() calls to the correct adapter
 * based on chain + network parameters.
 */
function createMockAdapterPoolDual(adapters: Map<string, IChainAdapter>): AdapterPool {
  return {
    resolve: vi.fn().mockImplementation(async (chain: string, network: string) => {
      const key = `${chain}:${network}`;
      const adapter = adapters.get(key);
      if (!adapter) {
        throw new Error(`No mock adapter for ${key}`);
      }
      return adapter;
    }),
    disconnectAll: vi.fn().mockResolvedValue(undefined),
    get size() { return adapters.size; },
  } as unknown as AdapterPool;
}

/**
 * Create a mock adapter pool that always returns the given adapter.
 */
function createMockAdapterPool(adapter?: IChainAdapter): AdapterPool {
  const a = adapter ?? createMockEvmAdapter();
  return {
    resolve: vi.fn().mockResolvedValue(a),
    disconnectAll: vi.fn().mockResolvedValue(undefined),
    get size() { return 0; },
  } as unknown as AdapterPool;
}

/**
 * Mock keyStore that returns chain-appropriate addresses.
 * EVM chain -> 0x-prefixed EIP-55 address.
 * Solana (default) -> base58 address.
 */
function createMockKeyStore() {
  return {
    generateKeyPair: vi.fn().mockImplementation(async (_id: string, chain?: string) => {
      if (chain === 'ethereum') {
        return {
          publicKey: EVM_TEST_ADDRESS,
          encryptedPrivateKey: new Uint8Array(64),
        };
      }
      return {
        publicKey: SOLANA_TEST_ADDRESS,
        encryptedPrivateKey: new Uint8Array(64),
      };
    }),
    decryptPrivateKey: async () => new Uint8Array(64).fill(42),
    releaseKey: () => {},
    hasKey: async () => true,
    deleteKey: async () => {},
    lockAll: () => {},
    sodiumAvailable: true,
  } as any;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function masterAuthJsonHeaders(): Record<string, string> {
  return {
    Host: HOST,
    'X-Master-Password': TEST_PASSWORD,
    'Content-Type': 'application/json',
  };
}

function masterAuthHeader(): Record<string, string> {
  return { Host: HOST, 'X-Master-Password': TEST_PASSWORD };
}

function bearerHeader(token: string): Record<string, string> {
  return { Host: HOST, Authorization: `Bearer ${token}` };
}

function bearerJsonHeader(token: string): Record<string, string> {
  return {
    Host: HOST,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// SIWE message builder (EIP-4361 format)
// ---------------------------------------------------------------------------

function buildSIWEMessage(params: {
  address: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  /** ownerAuth requires the signed text to name the id being authorised. */
  statement?: string;
}): string {
  const domain = 'localhost';
  const uri = 'http://localhost:3100';
  const version = '1';
  const chainId = '1';
  const nonce = params.nonce ?? 'test-nonce-12345678';
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  const expirationTime = params.expirationTime ?? new Date(Date.now() + 3600_000).toISOString();

  // EIP-4361 format
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    params.statement ?? 'Sign in to WAIaaS',
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let sqlite: DatabaseType;
let db: ReturnType<typeof createDatabase>['db'];
let jwtManager: JwtSecretManager;
let policyEngine: DatabasePolicyEngine;
let delayQueue: DelayQueue;
let approvalWorkflow: ApprovalWorkflow;
let ownerLifecycle: OwnerLifecycleService;

beforeAll(async () => {
  passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 4096,
    timeCost: 2,
    parallelism: 1,
  });
});

// ===========================================================================
// Suite 1: EVM Wallet Full Lifecycle E2E
// ===========================================================================

describe('EVM Wallet Full Lifecycle E2E', () => {
  let app: OpenAPIHono;
  let mockKeyStore: ReturnType<typeof createMockKeyStore>;
  let mockEvmAdapter: IChainAdapter;
  let mockAdapterPool: AdapterPool;

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);

    jwtManager = new JwtSecretManager(db);
    await jwtManager.initialize();

    const config = DaemonConfigSchema.parse({});

    policyEngine = new DatabasePolicyEngine(db, sqlite);
    delayQueue = new DelayQueue({ db, sqlite });
    approvalWorkflow = new ApprovalWorkflow({
      db,
      sqlite,
      config: {
        policy_defaults_approval_timeout:
          config.security.policy_defaults_approval_timeout,
      },
    });
    ownerLifecycle = new OwnerLifecycleService({ db, sqlite });

    mockEvmAdapter = createMockEvmAdapter();
    mockAdapterPool = createMockAdapterPool(mockEvmAdapter);
    mockKeyStore = createMockKeyStore();

    app = createApp({
      db,
      sqlite,
      jwtSecretManager: jwtManager,
      masterPasswordHash: passwordHash,
      masterPassword: TEST_PASSWORD,
      config,
      adapterPool: mockAdapterPool,
      keyStore: mockKeyStore,
      policyEngine,
      delayQueue,
      approvalWorkflow,
      ownerLifecycle,
    });
  });

  afterEach(() => {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
  });

  it('Create EVM wallet -> returns 201 with 0x address', async () => {
    const res = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('evm-test');
    expect(body.chain).toBe('ethereum');
    expect(body.network).toBe('ethereum-sepolia');
    expect((body.publicKey as string).startsWith('0x')).toBe(true);

    // Verify keyStore was called with correct chain params
    expect(mockKeyStore.generateKeyPair).toHaveBeenCalledWith(
      expect.any(String),
      'ethereum',
      'ethereum-sepolia',
      TEST_PASSWORD,
    );
  });

  it('GET /v1/wallet/balance returns ETH balance for EVM wallet', async () => {
    // Create EVM wallet
    const createRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-balance-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });
    expect(createRes.status).toBe(201);
    const wallet = await json(createRes);
    const walletId = wallet.id as string;

    // Create session
    const sessionRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ walletId }),
    });
    expect(sessionRes.status).toBe(201);
    const session = await json(sessionRes);
    const token = session.token as string;

    // Get balance
    const balanceRes = await app.request('/v1/wallet/balance?network=ethereum-sepolia', {
      headers: bearerHeader(token),
    });
    expect(balanceRes.status).toBe(200);
    const balance = await json(balanceRes);
    expect(balance.chain).toBe('ethereum');
    expect(balance.network).toBe('ethereum-sepolia');
    expect(balance.balance).toBe('1000000000000000000'); // 1 ETH
    expect(balance.decimals).toBe(18);
    expect(balance.symbol).toBe('ETH');

    // Verify adapter pool resolved with correct chain:network
    expect(mockAdapterPool.resolve).toHaveBeenCalledWith(
      'ethereum',
      'ethereum-sepolia',
      expect.any(String),
    );
  });

  it('POST /v1/transactions/send -> CONFIRMED for EVM wallet', async () => {
    // Create EVM wallet
    const createRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-tx-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });
    expect(createRes.status).toBe(201);
    const wallet = await json(createRes);
    const walletId = wallet.id as string;

    // Create session
    const sessionRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ walletId }),
    });
    expect(sessionRes.status).toBe(201);
    const session = await json(sessionRes);
    const token = session.token as string;

    // Send ETH transfer (network required for EVM wallets after v27)
    const sendRes = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: bearerJsonHeader(token),
      body: JSON.stringify({
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595916Da2',
        amount: '1000000000000000000',
        network: 'ethereum-sepolia',
      }),
    });
    expect(sendRes.status).toBe(201);
    const sendBody = await json(sendRes);
    const txId = sendBody.id as string;
    expect(sendBody.status).toBe('PENDING');

    // Wait for async pipeline stages 2-6 (fire-and-forget) to complete
    await new Promise((r) => setTimeout(r, 200));

    // Check transaction reached CONFIRMED in DB
    const row = sqlite
      .prepare('SELECT status, tx_hash FROM transactions WHERE id = ?')
      .get(txId) as { status: string; tx_hash: string | null };
    expect(row.status).toBe('CONFIRMED');
    expect(row.tx_hash).toBeTruthy();
  });

  it('EVM wallet with SIWE owner-auth', async () => {
    // Create EVM wallet
    const createRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-siwe-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });
    expect(createRes.status).toBe(201);
    const wallet = await json(createRes);
    const walletId = wallet.id as string;

    // Get a viem account for SIWE signing
    const account = privateKeyToAccount(SIWE_TEST_PRIVATE_KEY as `0x${string}`);
    const ownerAddress = account.address; // EIP-55 checksummed

    // Set owner on wallet
    const setOwnerRes = await app.request(`/v1/wallets/${walletId}/owner`, {
      method: 'PUT',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ owner_address: ownerAddress }),
    });
    expect(setOwnerRes.status).toBe(200);
    const ownerBody = await json(setOwnerRes);
    expect(ownerBody.ownerAddress).toBe(ownerAddress);

    // Setup policy so transaction triggers APPROVAL tier
    const policyId = generateId();
    const ts = Math.floor(Date.now() / 1000);
    sqlite
      .prepare(
        `INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        policyId,
        walletId,
        'SPENDING_LIMIT',
        JSON.stringify({
          instant_max: '100',
          notify_max: '200',
          delay_max: '500',
          delay_seconds: 60,
        }),
        100,
        1,
        ts,
        ts,
      );

    // Create session
    const sessionRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ walletId }),
    });
    expect(sessionRes.status).toBe(201);
    const session = await json(sessionRes);
    const token = session.token as string;

    // Send transaction that triggers APPROVAL tier (amount > delay_max)
    const sendRes = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: bearerJsonHeader(token),
      body: JSON.stringify({
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595916Da2',
        amount: '1000000000000000000',
        network: 'ethereum-sepolia',
      }),
    });
    expect(sendRes.status).toBe(201);
    const sendBody = await json(sendRes);
    const txId = sendBody.id as string;

    // Wait for async pipeline to reach QUEUED (APPROVAL tier)
    await new Promise((r) => setTimeout(r, 200));

    // Verify transaction is QUEUED with APPROVAL tier
    const queuedRow = sqlite
      .prepare('SELECT status, tier FROM transactions WHERE id = ?')
      .get(txId) as { status: string; tier: string | null };
    expect(queuedRow.status).toBe('QUEUED');
    expect(queuedRow.tier).toBe('APPROVAL');

    // Build SIWE message for approval
    const siweMessage = buildSIWEMessage({ address: ownerAddress, statement: `approve:${txId}` });
    const siweMessageBase64 = Buffer.from(siweMessage, 'utf8').toString('base64');

    // Sign the SIWE message with viem account (EIP-191 personal_sign)
    const signature = await account.signMessage({ message: siweMessage });

    // Approve transaction with SIWE owner-auth headers
    const approveRes = await app.request(`/v1/transactions/${txId}/approve`, {
      method: 'POST',
      headers: {
        Host: HOST,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Owner-Signature': signature,
        'X-Owner-Message': siweMessageBase64,
        'X-Owner-Address': ownerAddress,
      },
    });
    expect(approveRes.status).toBe(200);
    const approveBody = await json(approveRes);
    expect(approveBody.status).toBe('EXECUTING');
    expect(approveBody.approvedAt).toBeDefined();

    // Verify owner was auto-verified (GRACE -> LOCKED)
    const walletRow = sqlite
      .prepare('SELECT owner_verified FROM wallets WHERE id = ?')
      .get(walletId) as { owner_verified: number };
    expect(walletRow.owner_verified).toBe(1);
  });
});

// ===========================================================================
// Suite 2: Dual Chain Simultaneous Operation
// ===========================================================================

describe('Dual Chain Simultaneous Operation', () => {
  let app: OpenAPIHono;
  let mockKeyStore: ReturnType<typeof createMockKeyStore>;
  let mockAdapterPool: AdapterPool;
  let mockEvmAdapter: IChainAdapter;
  let mockSolanaAdapter: IChainAdapter;

  beforeEach(async () => {
    const conn = createDatabase(':memory:');
    sqlite = conn.sqlite;
    db = conn.db;
    pushSchema(sqlite);

    jwtManager = new JwtSecretManager(db);
    await jwtManager.initialize();

    const config = DaemonConfigSchema.parse({});

    policyEngine = new DatabasePolicyEngine(db, sqlite);
    delayQueue = new DelayQueue({ db, sqlite });
    approvalWorkflow = new ApprovalWorkflow({
      db,
      sqlite,
      config: {
        policy_defaults_approval_timeout:
          config.security.policy_defaults_approval_timeout,
      },
    });
    ownerLifecycle = new OwnerLifecycleService({ db, sqlite });

    mockEvmAdapter = createMockEvmAdapter();
    mockSolanaAdapter = createMockSolanaAdapter();
    mockKeyStore = createMockKeyStore();

    // Dual-chain adapter pool
    const adapterMap = new Map<string, IChainAdapter>();
    adapterMap.set('ethereum:ethereum-sepolia', mockEvmAdapter);
    adapterMap.set('solana:solana-devnet', mockSolanaAdapter);
    mockAdapterPool = createMockAdapterPoolDual(adapterMap);

    app = createApp({
      db,
      sqlite,
      jwtSecretManager: jwtManager,
      masterPasswordHash: passwordHash,
      masterPassword: TEST_PASSWORD,
      config,
      adapterPool: mockAdapterPool,
      keyStore: mockKeyStore,
      policyEngine,
      delayQueue,
      approvalWorkflow,
      ownerLifecycle,
    });
  });

  afterEach(() => {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
  });

  it('Solana + EVM wallets coexist and operate independently', async () => {
    // Create Solana wallet
    const solCreateRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'solana-dual-test',
        chain: 'solana',
        network: 'solana-devnet',
      }),
    });
    expect(solCreateRes.status).toBe(201);
    const solWallet = await json(solCreateRes);
    const solWalletId = solWallet.id as string;

    // Create EVM wallet
    const evmCreateRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-dual-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });
    expect(evmCreateRes.status).toBe(201);
    const evmWallet = await json(evmCreateRes);
    const evmWalletId = evmWallet.id as string;

    // Create sessions for both
    const solSessionRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ walletId: solWalletId }),
    });
    expect(solSessionRes.status).toBe(201);
    const solSession = await json(solSessionRes);
    const solToken = solSession.token as string;

    const evmSessionRes = await app.request('/v1/sessions', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({ walletId: evmWalletId }),
    });
    expect(evmSessionRes.status).toBe(201);
    const evmSession = await json(evmSessionRes);
    const evmToken = evmSession.token as string;

    // Get balance for Solana wallet
    const solBalanceRes = await app.request('/v1/wallet/balance', {
      headers: bearerHeader(solToken),
    });
    expect(solBalanceRes.status).toBe(200);
    const solBalance = await json(solBalanceRes);
    expect(solBalance.symbol).toBe('SOL');
    expect(solBalance.decimals).toBe(9);
    expect(solBalance.balance).toBe('1000000000');

    // Get balance for EVM wallet (network required for EVM)
    const evmBalanceRes = await app.request('/v1/wallet/balance?network=ethereum-sepolia', {
      headers: bearerHeader(evmToken),
    });
    expect(evmBalanceRes.status).toBe(200);
    const evmBalance = await json(evmBalanceRes);
    expect(evmBalance.symbol).toBe('ETH');
    expect(evmBalance.decimals).toBe(18);
    expect(evmBalance.balance).toBe('1000000000000000000');

    // Send transactions for both wallets
    const solSendRes = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: bearerJsonHeader(solToken),
      body: JSON.stringify({
        to: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        amount: '1000000000',
      }),
    });
    expect(solSendRes.status).toBe(201);
    const solTx = await json(solSendRes);
    const solTxId = solTx.id as string;

    const evmSendRes = await app.request('/v1/transactions/send', {
      method: 'POST',
      headers: bearerJsonHeader(evmToken),
      body: JSON.stringify({
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595916Da2',
        amount: '1000000000000000000',
        network: 'ethereum-sepolia',
      }),
    });
    expect(evmSendRes.status).toBe(201);
    const evmTx = await json(evmSendRes);
    const evmTxId = evmTx.id as string;

    // Both have different txIds
    expect(solTxId).not.toBe(evmTxId);

    // Verify adapter pool was called with correct chain:network for each
    const resolveCalls = (mockAdapterPool.resolve as ReturnType<typeof vi.fn>).mock.calls;
    const resolveArgs = resolveCalls.map(
      (c: [string, string, string]) => `${c[0]}:${c[1]}`,
    );
    expect(resolveArgs).toContain('solana:solana-devnet');
    expect(resolveArgs).toContain('ethereum:ethereum-sepolia');

    // Wait for async pipelines
    await new Promise((r) => setTimeout(r, 200));

    // Both should reach CONFIRMED
    const solRow = sqlite
      .prepare('SELECT status FROM transactions WHERE id = ?')
      .get(solTxId) as { status: string };
    expect(solRow.status).toBe('CONFIRMED');

    const evmRow = sqlite
      .prepare('SELECT status FROM transactions WHERE id = ?')
      .get(evmTxId) as { status: string };
    expect(evmRow.status).toBe('CONFIRMED');
  });

  it('List wallets shows both chains', async () => {
    // Create Solana wallet
    const solCreateRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'solana-list-test',
        chain: 'solana',
        network: 'solana-devnet',
      }),
    });
    expect(solCreateRes.status).toBe(201);

    // Create EVM wallet
    const evmCreateRes = await app.request('/v1/wallets', {
      method: 'POST',
      headers: masterAuthJsonHeaders(),
      body: JSON.stringify({
        name: 'evm-list-test',
        chain: 'ethereum',
        network: 'ethereum-sepolia',
      }),
    });
    expect(evmCreateRes.status).toBe(201);

    // List all wallets
    const listRes = await app.request('/v1/wallets', {
      headers: masterAuthHeader(),
    });
    expect(listRes.status).toBe(200);
    const listBody = await json(listRes);
    const items = listBody.items as Array<Record<string, unknown>>;

    expect(items).toHaveLength(2);

    // Find each wallet by chain
    const solanaWallet = items.find((a) => a.chain === 'solana');
    const evmWallet = items.find((a) => a.chain === 'ethereum');

    expect(solanaWallet).toBeDefined();
    expect(solanaWallet!.name).toBe('solana-list-test');
    expect(solanaWallet!.network).toBe('solana-devnet');

    expect(evmWallet).toBeDefined();
    expect(evmWallet!.name).toBe('evm-list-test');
    // EVM wallets no longer have a single default_network; getSingleNetwork returns null, falling back to chain
    expect(evmWallet!.network).toBe('ethereum');
    expect((evmWallet!.publicKey as string).startsWith('0x')).toBe(true);
  });
});
