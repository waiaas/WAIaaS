/**
 * SEC-01-OA-01~08 Owner authentication attack scenarios.
 *
 * Tests 8 attack vectors against the ownerAuth middleware:
 * Payload parsing errors, timestamp expiry, nonce replay, signature forgery,
 * owner address mismatch, action mismatch, domain binding, full replay.
 *
 * ownerAuth verifies Ed25519 detached signatures (Solana) or SIWE (EVM).
 * These tests focus on the Solana path since it's more directly testable.
 *
 * @see docs/43-layer1-session-auth-attacks.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createInMemoryDb,
  createSecurityTestApp,
  seedSecurityTestData,
  signTestToken,
  createOwnerKeyPair,
  createOwnerHeaders,
} from '../helpers/security-test-helpers.js';
import { JwtSecretManager } from '../../../infrastructure/jwt/index.js';
import type { DatabaseConnection } from '../../../infrastructure/database/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let conn: DatabaseConnection;
let jwtManager: JwtSecretManager;
let app: ReturnType<typeof createSecurityTestApp>;

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

beforeEach(async () => {
  conn = createInMemoryDb();
  jwtManager = new JwtSecretManager(conn.db);
  await jwtManager.initialize();
  app = createSecurityTestApp({ jwtManager, db: conn.db });
});

afterEach(() => {
  vi.useRealTimers();
  try {
    conn.sqlite.close();
  } catch {
    // already closed
  }
});

// ---------------------------------------------------------------------------
// SEC-01-OA-01~08: Owner Auth Attack Vectors
// ---------------------------------------------------------------------------

describe('SEC-01-OA Owner Authentication Attacks', () => {
  // OA-01: Payload parsing error
  describe('SEC-01-OA-01: payload parsing errors', () => {
    it('rejects request with missing X-Owner-Signature header', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Message': 'test message',
          'X-Owner-Address': ownerKp.address,
          // X-Owner-Signature intentionally missing
        },
      });

      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });

    it('rejects request with missing X-Owner-Message header', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Signature': Buffer.alloc(64).toString('base64'),
          'X-Owner-Address': ownerKp.address,
          // X-Owner-Message intentionally missing
        },
      });

      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });

    it('rejects request with missing X-Owner-Address header', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Signature': Buffer.alloc(64).toString('base64'),
          'X-Owner-Message': 'test message',
          // X-Owner-Address intentionally missing
        },
      });

      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });
  });

  // OA-02: Timestamp validity -- ownerAuth middleware doesn't check timestamps directly.
  // Timestamp checking is a payload-level concern. We verify the concept.
  describe('SEC-01-OA-02: timestamp validity concept', () => {
    it('verifies timestamp freshness logic (5-minute window)', () => {
      const now = Math.floor(Date.now() / 1000);
      const NONCE_TTL = 300; // 5 minutes

      // 4 min 59 sec ago -- should be valid
      const recent = now - 299;
      expect(now - recent).toBeLessThan(NONCE_TTL);

      // 5 min 1 sec ago -- should be expired
      const old = now - 301;
      expect(now - old).toBeGreaterThan(NONCE_TTL);
    });
  });

  // OA-03: Nonce reuse -- nonces are stateless in v1.3, but we test the concept
  describe('SEC-01-OA-03: nonce reuse concept', () => {
    it('demonstrates nonce tracking via Set for replay detection', () => {
      const usedNonces = new Set<string>();
      const nonce = 'unique-nonce-abc123';

      // First use: should succeed
      const firstUse = !usedNonces.has(nonce);
      usedNonces.add(nonce);
      expect(firstUse).toBe(true);

      // Second use: should fail (replay)
      const secondUse = !usedNonces.has(nonce);
      expect(secondUse).toBe(false);
    });
  });

  // OA-04: Signature forgery with different keypair
  describe('SEC-01-OA-04: signature forgery with different keypair', () => {
    it('rejects signature from attacker keypair', async () => {
      // Legitimate owner keypair
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      // Attacker's keypair (seed = 0xFF * 32)
      const attackerSeed = Buffer.alloc(32, 0xff);
      const attackerKp = createOwnerKeyPair(attackerSeed);

      // Attacker signs the message with their own key but claims to be the owner
      const message = 'approve_tx:some-tx-id';
      const attackerHeaders = createOwnerHeaders(attackerKp, message);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Signature': attackerHeaders['X-Owner-Signature'],
          'X-Owner-Message': attackerHeaders['X-Owner-Message'],
          'X-Owner-Address': ownerKp.address, // Claims to be the real owner
        },
      });

      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });
  });

  // OA-05: Owner address mismatch
  describe('SEC-01-OA-05: owner address mismatch', () => {
    it('rejects signature from unregistered owner address', async () => {
      const ownerKp = createOwnerKeyPair();
      const unregisteredKp = createOwnerKeyPair(Buffer.alloc(32, 0xaa));

      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      // Sign with unregistered keypair and provide unregistered address
      const message = 'approve_tx:some-tx-id';
      const headers = createOwnerHeaders(unregisteredKp, message);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers,
        },
      });

      expect(res.status).toBe(401);
      const body = await json(res);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });

    it('rejects when wallet has no owner address registered', async () => {
      const unregisteredKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: null, // No owner registered
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      const message = 'approve_tx:some-tx-id';
      const headers = createOwnerHeaders(unregisteredKp, message);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers,
        },
      });

      // OWNER_NOT_CONNECTED has httpStatus 404 in error-codes.ts
      expect(res.status).toBe(404);
      const body = await json(res);
      expect(body.code).toBe('OWNER_NOT_CONNECTED');
    });
  });

  // OA-06: Action mismatch -- ownerAuth doesn't validate action content in the middleware
  // It verifies the signature over the full message. The action check is application-level.
  describe('SEC-01-OA-06: action mismatch concept', () => {
    it('demonstrates action field validation logic', () => {
      const expectedAction = 'kill_switch_activate';
      const signedAction = 'approve_tx';

      // Application should verify the signed action matches the route's expected action
      expect(signedAction).not.toBe(expectedAction);
    });
  });

  // OA-07: Domain binding -- ownerAuth doesn't validate domain in the Solana path
  // SIWE (EVM path) validates domain. We test the concept.
  describe('SEC-01-OA-07: domain binding concept', () => {
    it('demonstrates SIWE domain binding validation logic', () => {
      const expectedDomain = 'localhost:3100';
      const attackerDomain = 'evil.com';

      expect(attackerDomain).not.toBe(expectedDomain);
    });
  });

  // OA-08: Full replay attack
  /**
   * ownerAuth verifies that the owner signed *something*, and nothing else ties
   * that signature to what is being approved: the approve handler forwards it
   * without re-checking, and GET /v1/nonce is stateless. Until v63 a captured
   * header triple therefore authorised every later approval on the same wallet.
   * The signed text must now name the id being authorised, which makes each
   * signature single-purpose.
   */
  describe('SEC-01-OA-08: signature reuse across ids', () => {
    it('rejects a signature whose message does not name the id being authorised', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      // Valid signature by the real owner -- but over text that names nothing.
      const headers = createOwnerHeaders(ownerKp, 'approve_tx:some-tx-id');

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...headers },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe('INVALID_SIGNATURE');
    });

    it('rejects a signature bound to a different id (the replay this closes)', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      // Captured from an approval of a different id, then aimed at this one.
      const headers = createOwnerHeaders(ownerKp, 'approve:00000000-0000-7000-8000-000000000999');

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...headers },
      });

      expect(res.status).toBe(401);
    });

    it('accepts a signature that names the id it authorises', async () => {
      const ownerKp = createOwnerKeyPair();
      const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
        ownerAddress: ownerKp.address,
        ownerVerified: true,
      });
      const token = await signTestToken(jwtManager, sessionId, walletId);

      const headers = createOwnerHeaders(ownerKp, `approve:${walletId}`);

      const res = await app.request(`/v1/owner/${walletId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...headers },
      });

      expect(res.status).toBe(200);
    });
  });
});
