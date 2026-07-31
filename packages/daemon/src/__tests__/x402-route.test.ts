/**
 * Integration tests for POST /v1/x402/fetch (x402 auto-payment REST API).
 *
 * Uses in-memory SQLite + createApp + app.request() pattern.
 *
 * Tests cover:
 * 1. Authentication (sessionAuth)
 * 2. x402 disabled (config.x402.enabled=false)
 * 3. Domain policy (X402_ALLOWED_DOMAINS -- default deny)
 * 4. Non-402 passthrough
 * 5. SPENDING_LIMIT integration (INSTANT, NOTIFY)
 * 6. DELAY timeout handling
 * 7. APPROVAL immediate rejection
 * 8. Transaction record (type=X402_PAYMENT)
 * 9. Notification triggers (TX_REQUESTED/TX_CONFIRMED/TX_FAILED)
 * 10. Reservation release (releaseReservation on failure)
 *
 * Mocking: ssrf-guard.js, payment-signer.js
 *
 * @see packages/daemon/src/api/routes/x402.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import argon2 from 'argon2';
import type { OpenAPIHono } from '@hono/zod-openapi';

// ---------------------------------------------------------------------------
// Mock ssrf-guard (must be before imports that use it)
// ---------------------------------------------------------------------------
vi.mock('../services/x402/ssrf-guard.js', () => ({
  validateUrlSafety: vi.fn(),
  safeFetchWithRedirects: vi.fn(),
}));

import {
  validateUrlSafety,
  safeFetchWithRedirects,
} from '../services/x402/ssrf-guard.js';

const mockValidateUrlSafety = vi.mocked(validateUrlSafety);
const mockSafeFetchWithRedirects = vi.mocked(safeFetchWithRedirects);

// ---------------------------------------------------------------------------
// Mock payment-signer
// ---------------------------------------------------------------------------
vi.mock('../services/x402/payment-signer.js', () => ({
  signPayment: vi.fn(),
  USDC_DOMAINS: {
    'eip155:84532': {
      name: 'USDC',
      version: '2',
      chainId: 84532,
      verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock sleep from @waiaas/core (partial mock to avoid 60s+ delays in DELAY tests)
// ---------------------------------------------------------------------------
vi.mock('@waiaas/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@waiaas/core')>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

import { signPayment } from '../services/x402/payment-signer.js';
const mockSignPayment = vi.mocked(signPayment);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { createApp } from '../api/server.js';
import { createDatabase, pushSchema, generateId } from '../infrastructure/database/index.js';
import { JwtSecretManager, type JwtPayload } from '../infrastructure/jwt/index.js';
import type { DatabaseConnection } from '../infrastructure/database/index.js';
import type { DaemonConfig } from '../infrastructure/config/loader.js';
import type { LocalKeyStore } from '../infrastructure/keystore/keystore.js';
import { DatabasePolicyEngine } from '../pipeline/database-policy-engine.js';
import { eq } from 'drizzle-orm';
import { transactions } from '../infrastructure/database/schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

const HOST = '127.0.0.1:3100';
const TEST_MASTER_PASSWORD = 'test-master-password';
const MOCK_PUBLIC_KEY = '0x1234567890abcdef1234567890abcdef12345678';

function mockConfig(overrides?: Partial<DaemonConfig>): DaemonConfig {
  return {
    daemon: {
      port: 3100,
      hostname: '127.0.0.1',
      log_level: 'info',
      log_file: 'logs/daemon.log',
      log_max_size: '50MB',
      log_max_files: 5,
      pid_file: 'daemon.pid',
      shutdown_timeout: 30,
      dev_mode: false,
      admin_ui: true,
      admin_timeout: 900,
    },
    keystore: {
      argon2_memory: 65536,
      argon2_time: 3,
      argon2_parallelism: 4,
      backup_on_rotate: true,
    },
    database: {
      path: ':memory:',
      wal_checkpoint_interval: 300,
      busy_timeout: 5000,
      cache_size: 64000,
      mmap_size: 268435456,
    },
    rpc: {
      solana_mainnet: 'https://api.mainnet-beta.solana.com',
      solana_devnet: 'https://api.devnet.solana.com',
      solana_testnet: 'https://api.testnet.solana.com',
      solana_ws_mainnet: 'wss://api.mainnet-beta.solana.com',
      solana_ws_devnet: 'wss://api.devnet.solana.com',
      evm_ethereum_mainnet: 'https://eth.drpc.org',
      evm_ethereum_sepolia: 'https://sepolia.drpc.org',
      evm_polygon_mainnet: 'https://polygon.drpc.org',
      evm_polygon_amoy: 'https://polygon-amoy.drpc.org',
      evm_arbitrum_mainnet: 'https://arbitrum.drpc.org',
      evm_arbitrum_sepolia: 'https://arbitrum-sepolia.drpc.org',
      evm_optimism_mainnet: 'https://optimism.drpc.org',
      evm_optimism_sepolia: 'https://optimism-sepolia.drpc.org',
      evm_base_mainnet: 'https://base.drpc.org',
      evm_base_sepolia: 'https://base-sepolia.drpc.org',
    },
    notifications: {
      enabled: false,
      min_channels: 2,
      health_check_interval: 300,
      log_retention_days: 30,
      dedup_ttl: 300,
      telegram_bot_token: '',
      telegram_chat_id: '',
      discord_webhook_url: '',
      ntfy_server: 'https://ntfy.sh',
      ntfy_topic: '',
      locale: 'en' as const,
      rate_limit_rpm: 20,
    },
    security: {
      
      jwt_secret: '',
      max_sessions_per_wallet: 5,
      max_pending_tx: 10,
      nonce_storage: 'memory',
      nonce_cache_max: 1000,
      nonce_cache_ttl: 300,
      rate_limit_global_ip_rpm: 1000,
      rate_limit_session_rpm: 300,
      rate_limit_tx_rpm: 10,
      cors_origins: ['http://localhost:3100'],
      autostop_consecutive_failures_threshold: 5,
      policy_defaults_delay_seconds: 300,
      policy_defaults_approval_timeout: 3600,
      kill_switch_recovery_cooldown: 1800,
      kill_switch_max_recovery_attempts: 3,
    },
    walletconnect: {
      project_id: '',
    },
    x402: {
      enabled: true,
      request_timeout: 120,
    },
    ...overrides,
  };
}

function mockKeyStore(): LocalKeyStore {
  return {
    generateKeyPair: async () => ({
      publicKey: MOCK_PUBLIC_KEY,
      encryptedPrivateKey: new Uint8Array(64),
    }),
    decryptPrivateKey: async () => new Uint8Array(64),
    releaseKey: vi.fn(),
    hasKey: async () => true,
    deleteKey: async () => {},
    lockAll: () => {},
    sodiumAvailable: true,
  } as unknown as LocalKeyStore;
}

// 402 response fixture (PAYMENT-REQUIRED header)
function make402Response(overrides?: {
  amount?: string;
  network?: string;
  asset?: string;
  payTo?: string;
}): Response {
  const paymentRequired = {
    x402Version: 2,
    accepts: [{
      scheme: 'exact',
      network: overrides?.network ?? 'eip155:84532',
      amount: overrides?.amount ?? '1000000',
      asset: overrides?.asset ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      payTo: overrides?.payTo ?? '0xReceiverAddress1234567890abcdef12345678',
      maxTimeoutSeconds: 120,
      extra: {},
    }],
    resource: { url: 'https://api.example.com/premium/data' },
  };

  const encoded = Buffer.from(JSON.stringify(paymentRequired), 'utf-8').toString('base64');

  return new Response('Payment Required', {
    status: 402,
    headers: {
      'payment-required': encoded,
      'content-type': 'text/plain',
    },
  });
}

// Mock notification service
function mockNotificationService() {
  return {
    notify: vi.fn().mockResolvedValue(undefined),
    addChannel: vi.fn(),
    getChannelNames: vi.fn().mockReturnValue([]),
    getChannels: vi.fn().mockReturnValue([]),
    replaceChannels: vi.fn(),
    updateConfig: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let conn: DatabaseConnection;
let app: OpenAPIHono;
let jwtSecretManager: JwtSecretManager;
let policyEngine: DatabasePolicyEngine;
let notificationService: ReturnType<typeof mockNotificationService>;

beforeEach(async () => {
  vi.clearAllMocks();

  conn = createDatabase(':memory:');
  pushSchema(conn.sqlite);

  const masterPasswordHash = await argon2.hash(TEST_MASTER_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 4096,
    timeCost: 2,
    parallelism: 1,
  });

  jwtSecretManager = new JwtSecretManager(conn.db);
  await jwtSecretManager.initialize();

  policyEngine = new DatabasePolicyEngine(conn.db, conn.sqlite);
  notificationService = mockNotificationService();

  // Default mock behavior
  mockValidateUrlSafety.mockResolvedValue('https://api.example.com/premium/data');
  mockSignPayment.mockResolvedValue({
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:84532',
    payload: { signature: '0xmocksig' },
  } as Record<string, unknown>);

  app = createApp({
    db: conn.db,
    sqlite: conn.sqlite,
    keyStore: mockKeyStore(),
    masterPassword: TEST_MASTER_PASSWORD,
    masterPasswordHash,
    config: mockConfig(),
    policyEngine,
    jwtSecretManager,
    notificationService: notificationService as never,
  });
});

afterEach(() => {
  conn.sqlite.close();
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function createTestWallet(chain = 'ethereum', env = 'testnet'): Promise<string> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  conn.sqlite
    .prepare(
      `INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, 'x402-test-wallet', chain, env, MOCK_PUBLIC_KEY, 'ACTIVE', now, now);
  return id;
}

async function createSessionToken(walletId: string): Promise<string> {
  const sessionId = generateId();
  const now = Math.floor(Date.now() / 1000);

  conn.sqlite
    .prepare(
      `INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(sessionId, `hash-${sessionId}`, now + 86400, now + 86400 * 30, now);
  conn.sqlite
    .prepare(
      `INSERT INTO session_wallets (session_id, wallet_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(sessionId, walletId, now);

  const payload: JwtPayload = {
    sub: sessionId,

    iat: now,
    exp: now + 3600,
  };
  const token = await jwtSecretManager.signToken(payload);
  return `Bearer ${token}`;
}

function insertPolicy(opts: {
  walletId?: string | null;
  type: string;
  rules: string;
  priority?: number;
  enabled?: boolean;
  network?: string | null;
}): void {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  conn.sqlite
    .prepare(
      `INSERT INTO policies (id, wallet_id, type, rules, priority, enabled, network, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      opts.walletId ?? null,
      opts.type,
      opts.rules,
      opts.priority ?? 0,
      opts.enabled ?? true ? 1 : 0,
      opts.network ?? null,
      now,
      now,
    );
}

function makeRequest(
  auth: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(`http://${HOST}/v1/x402/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': HOST,
      Authorization: auth,
    },
    body: JSON.stringify(body ?? {
      url: 'https://api.example.com/premium/data',
      method: 'GET',
    }),
  });
}

function getTransaction(txId: string) {
  return conn.db.select().from(transactions).where(eq(transactions.id, txId)).get();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /v1/x402/fetch', () => {
  // -----------------------------------------------------------------------
  // 1. Authentication
  // -----------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await app.request(
        new Request(`http://${HOST}/v1/x402/fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Host': HOST,
          },
          body: JSON.stringify({ url: 'https://api.example.com/data' }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it('succeeds with valid session token (non-402 passthrough)', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      // Allow domain
      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // Mock non-402 response
      mockSafeFetchWithRedirects.mockResolvedValueOnce(
        new Response('{"data":"ok"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // 2. x402 disabled
  // -----------------------------------------------------------------------

  describe('x402 disabled', () => {
    it('returns 403 X402_DISABLED when config.x402.enabled=false', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      // Rebuild app with x402 disabled
      const masterPasswordHash = await argon2.hash(TEST_MASTER_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 1,
      });
      const disabledApp = createApp({
        db: conn.db,
        sqlite: conn.sqlite,
        keyStore: mockKeyStore(),
        masterPassword: TEST_MASTER_PASSWORD,
        masterPasswordHash,
        config: mockConfig({ x402: { enabled: false, request_timeout: 30 } }),
        policyEngine,
        jwtSecretManager,
      });

      const res = await disabledApp.request(makeRequest(auth));
      expect(res.status).toBe(403);
      const body = await json(res);
      expect(body.code).toBe('X402_DISABLED');
    });
  });

  // -----------------------------------------------------------------------
  // 3. Domain policy
  // -----------------------------------------------------------------------

  describe('domain policy', () => {
    it('returns 403 X402_DOMAIN_NOT_ALLOWED when no X402_ALLOWED_DOMAINS policy exists', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(403);
      const body = await json(res);
      expect(body.code).toBe('X402_DOMAIN_NOT_ALLOWED');
    });

    it('allows requests to whitelisted domains', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      mockSafeFetchWithRedirects.mockResolvedValueOnce(
        new Response('ok', { status: 200 }),
      );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
    });

    it('allows requests matching wildcard domains', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['*.example.com'] }),
      });

      mockSafeFetchWithRedirects.mockResolvedValueOnce(
        new Response('ok', { status: 200 }),
      );

      const res = await app.request(makeRequest(auth, {
        url: 'https://sub.example.com/data',
        method: 'GET',
      }));
      expect(res.status).toBe(200);
    });

    it('denies requests to non-matching domains', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['*.example.com'] }),
      });

      const res = await app.request(makeRequest(auth, {
        url: 'https://evil.com/data',
        method: 'GET',
      }));
      expect(res.status).toBe(403);
      const body = await json(res);
      expect(body.code).toBe('X402_DOMAIN_NOT_ALLOWED');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Non-402 passthrough
  // -----------------------------------------------------------------------

  describe('non-402 passthrough', () => {
    it('passes through 200 responses without DB record', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      mockSafeFetchWithRedirects.mockResolvedValueOnce(
        new Response('{"data":"premium content"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe(200);
      expect(body.body).toBe('{"data":"premium content"}');
      expect(body.payment).toBeUndefined();

      // No transaction record
      const txRows = conn.sqlite.prepare('SELECT * FROM transactions WHERE wallet_id = ?').all(walletId);
      expect(txRows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 5. SPENDING_LIMIT integration
  // -----------------------------------------------------------------------

  describe('SPENDING_LIMIT integration', () => {
    it('processes 402 with INSTANT tier successfully', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      // Allow domain
      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // SPENDING_LIMIT: INSTANT up to 10 USDC (10_000_000 raw units)
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '10000000',
          notify_max: '50000000',
          delay_max: '100000000',
          delay_seconds: 60,
        }),
      });

      // Mock 402 response (1 USDC = 1_000_000 raw)
      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(
          new Response('{"result":"paid content"}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.payment).toBeDefined();
      const payment = body.payment as Record<string, string>;
      expect(payment.amount).toBe('1000000');
      expect(payment.txId).toBeDefined();

      // Check transaction record
      const tx = getTransaction(payment.txId);
      expect(tx).toBeDefined();
      expect(tx!.type).toBe('X402_PAYMENT');
      expect(tx!.status).toBe('CONFIRMED');
      expect(tx!.tier).toBe('INSTANT');
    });

    it('processes 402 with NOTIFY tier successfully', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // SPENDING_LIMIT: amount 5_000_000 falls in NOTIFY range
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '1000000',
          notify_max: '50000000',
          delay_max: '100000000',
          delay_seconds: 60,
        }),
      });

      // 402 with 5 USDC
      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response({ amount: '5000000' }))
        .mockResolvedValueOnce(
          new Response('ok', { status: 200 }),
        );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
      const body = await json(res);
      const payment = body.payment as Record<string, string>;
      expect(payment.txId).toBeDefined();

      const tx = getTransaction(payment.txId);
      expect(tx!.tier).toBe('NOTIFY');
      expect(tx!.status).toBe('CONFIRMED');
    });
  });

  // -----------------------------------------------------------------------
  // 5b. Solana RPC wiring (issue #500)
  // -----------------------------------------------------------------------

  describe('Solana payment signing', () => {
    const SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
    const SOLANA_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
    const SOLANA_PAY_TO = 'GsbwXfJraMomNxBcjK9jBrJnkGXbBSFVfKAKzKKDkkeF';

    function allowPayment(walletId: string): void {
      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '10000000',
          notify_max: '50000000',
          delay_max: '100000000',
          delay_seconds: 60,
        }),
      });
    }

    function mockPaidFlow(network: string, asset: string, payTo: string): void {
      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response({ network, asset, payTo, amount: '50000' }))
        .mockResolvedValueOnce(
          new Response('{"result":"paid content"}', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
    }

    it('passes an RPC client to signPayment for Solana networks', async () => {
      const walletId = await createTestWallet('solana', 'testnet');
      const auth = await createSessionToken(walletId);
      allowPayment(walletId);
      mockPaidFlow(SOLANA_DEVNET, SOLANA_MINT, SOLANA_PAY_TO);

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);

      // Solana signing derives the transaction lifetime from getLatestBlockhash,
      // so the route must hand the signer an RPC client (6th argument).
      expect(mockSignPayment).toHaveBeenCalledTimes(1);
      const rpc = mockSignPayment.mock.calls[0][5] as { getLatestBlockhash?: unknown } | undefined;
      expect(rpc).toBeDefined();
      expect(typeof rpc!.getLatestBlockhash).toBe('function');
    });

    it('does not build an RPC client for EVM networks', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);
      allowPayment(walletId);
      mockPaidFlow(
        'eip155:84532',
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        '0xReceiverAddress1234567890abcdef12345678',
      );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);

      // EVM payments are signed offline (EIP-712) -- no RPC round trip.
      expect(mockSignPayment).toHaveBeenCalledTimes(1);
      expect(mockSignPayment.mock.calls[0][5]).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 6. DELAY timeout
  // -----------------------------------------------------------------------

  describe('DELAY timeout', () => {
    it('rejects with X402_DELAY_TIMEOUT when delay exceeds request_timeout', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // SPENDING_LIMIT: amount falls in DELAY range, delay_seconds=300 > request_timeout=120
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '100000',
          notify_max: '500000',
          delay_max: '100000000',
          delay_seconds: 300,
        }),
      });

      // 402 with 1 USDC (1_000_000) which is above notify_max (500000)
      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response());

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(408);
      const body = await json(res);
      expect(body.code).toBe('X402_DELAY_TIMEOUT');

      // Transaction should be CANCELLED
      const txRows = conn.sqlite
        .prepare('SELECT * FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ status: string; error: string }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.status).toBe('CANCELLED');
      expect(txRows[0]!.error).toBe('X402_DELAY_TIMEOUT');
    });

    it('processes DELAY tier when delay <= request_timeout', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // delay_seconds=60, request_timeout=120 -> within timeout (sleep mocked)
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '100000',
          notify_max: '500000',
          delay_max: '100000000',
          delay_seconds: 60,
        }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(
          new Response('ok', { status: 200 }),
        );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
      const body = await json(res);
      const payment = body.payment as Record<string, string>;
      expect(payment.txId).toBeDefined();

      const tx = getTransaction(payment.txId);
      expect(tx!.tier).toBe('DELAY');
      expect(tx!.status).toBe('CONFIRMED');
    });
  });

  // -----------------------------------------------------------------------
  // 7. APPROVAL immediate rejection
  // -----------------------------------------------------------------------

  describe('APPROVAL rejection', () => {
    it('rejects with X402_APPROVAL_REQUIRED for APPROVAL tier', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // SPENDING_LIMIT: 1 USDC is above delay_max -> APPROVAL
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '1000',
          notify_max: '5000',
          delay_max: '10000',
          delay_seconds: 60,
        }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response());

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(403);
      const body = await json(res);
      expect(body.code).toBe('X402_APPROVAL_REQUIRED');

      // Transaction should be CANCELLED with APPROVAL error
      const txRows = conn.sqlite
        .prepare('SELECT * FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ status: string; error: string; tier: string }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.status).toBe('CANCELLED');
      expect(txRows[0]!.tier).toBe('APPROVAL');
      expect(txRows[0]!.error).toBe('X402_APPROVAL_REQUIRED');
    });
  });

  // -----------------------------------------------------------------------
  // 8. Transaction record
  // -----------------------------------------------------------------------

  describe('transaction record', () => {
    it('records type=X402_PAYMENT with metadata on success', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(200);
      const body = await json(res);
      const payment = body.payment as Record<string, string>;

      const tx = getTransaction(payment.txId);
      expect(tx).toBeDefined();
      expect(tx!.type).toBe('X402_PAYMENT');
      expect(tx!.status).toBe('CONFIRMED');
      expect(tx!.amount).toBe('1000000');
      expect(tx!.toAddress).toBe('0xReceiverAddress1234567890abcdef12345678');
      expect(tx!.chain).toBe('ethereum');
      expect(tx!.network).toBe('base-sepolia');
      expect(tx!.executedAt).toBeDefined();

      // Check metadata
      const metadata = JSON.parse(tx!.metadata!) as Record<string, string>;
      expect(metadata.target_url).toBe('https://api.example.com/premium/data');
      expect(metadata.asset).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
      expect(metadata.scheme).toBe('exact');
    });

    it('records status=FAILED when payment is rejected', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // First call: 402, second call: still 402 (rejected)
      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(
          new Response('Payment Required', { status: 402 }),
        );

      const res = await app.request(makeRequest(auth));
      expect(res.status).toBe(402);
      const body = await json(res);
      expect(body.code).toBe('X402_PAYMENT_REJECTED');

      // Transaction should be FAILED
      const txRows = conn.sqlite
        .prepare('SELECT * FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ status: string; error: string }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.status).toBe('FAILED');
      expect(txRows[0]!.error).toBe('X402_PAYMENT_REJECTED');
    });
  });

  // -----------------------------------------------------------------------
  // 9. Notification triggers
  // -----------------------------------------------------------------------

  describe('notification triggers', () => {
    it('sends TX_REQUESTED and TX_CONFIRMED on payment success', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await app.request(makeRequest(auth));

      // Check notification calls
      const notifyCalls = notificationService.notify.mock.calls;
      const eventTypes = notifyCalls.map((c: unknown[]) => c[0]);
      expect(eventTypes).toContain('TX_REQUESTED');
      expect(eventTypes).toContain('TX_CONFIRMED');
    });

    it('sends TX_REQUESTED and TX_FAILED on payment rejection', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(new Response('rejected', { status: 402 }));

      await app.request(makeRequest(auth));

      const notifyCalls = notificationService.notify.mock.calls;
      const eventTypes = notifyCalls.map((c: unknown[]) => c[0]);
      expect(eventTypes).toContain('TX_REQUESTED');
      expect(eventTypes).toContain('TX_FAILED');
    });

    it('sends POLICY_VIOLATION on domain denial', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      // No X402_ALLOWED_DOMAINS policy -> default deny
      await app.request(makeRequest(auth));

      const notifyCalls = notificationService.notify.mock.calls;
      const eventTypes = notifyCalls.map((c: unknown[]) => c[0]);
      expect(eventTypes).toContain('POLICY_VIOLATION');
    });
  });

  // -----------------------------------------------------------------------
  // 10. Reservation release
  // -----------------------------------------------------------------------

  describe('reservation release', () => {
    it('releases reservation on payment rejection (402 retry)', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // SPENDING_LIMIT so reservation is set
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '10000000',
          notify_max: '50000000',
          delay_max: '100000000',
          delay_seconds: 60,
        }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response())
        .mockResolvedValueOnce(new Response('rejected', { status: 402 }));

      await app.request(makeRequest(auth));

      // Verify reserved_amount was cleared
      const txRows = conn.sqlite
        .prepare('SELECT reserved_amount FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ reserved_amount: string | null }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.reserved_amount).toBeNull();
    });

    it('releases reservation on APPROVAL rejection', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // Very low limits -> APPROVAL tier
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '100',
          notify_max: '500',
          delay_max: '1000',
          delay_seconds: 60,
        }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response());

      await app.request(makeRequest(auth));

      // reserved_amount should be NULL after release
      const txRows = conn.sqlite
        .prepare('SELECT reserved_amount FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ reserved_amount: string | null }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.reserved_amount).toBeNull();
    });

    it('releases reservation on DELAY_TIMEOUT rejection', async () => {
      const walletId = await createTestWallet();
      const auth = await createSessionToken(walletId);

      insertPolicy({
        type: 'X402_ALLOWED_DOMAINS',
        rules: JSON.stringify({ domains: ['api.example.com'] }),
      });

      // delay_seconds=300 > request_timeout=120
      insertPolicy({
        walletId,
        type: 'SPENDING_LIMIT',
        rules: JSON.stringify({
          instant_max: '100000',
          notify_max: '500000',
          delay_max: '100000000',
          delay_seconds: 300,
        }),
      });

      mockSafeFetchWithRedirects
        .mockResolvedValueOnce(make402Response());

      await app.request(makeRequest(auth));

      const txRows = conn.sqlite
        .prepare('SELECT reserved_amount FROM transactions WHERE wallet_id = ?')
        .all(walletId) as Array<{ reserved_amount: string | null }>;
      expect(txRows).toHaveLength(1);
      expect(txRows[0]!.reserved_amount).toBeNull();
    });
  });
});
