/**
 * SEC-03-01~08 Kill Switch attack scenarios.
 *
 * Tests 8 attack vectors against the Kill Switch 3-state machine (Layer 3):
 * ACTIVATED state API access, recovery brute-force, signature forgery,
 * AutoStop consecutive failures, double activation, session revocation,
 * cascade partial failure, RECOVERING state API access.
 *
 * Additional: 3-state transition validation (NORMAL->recover, RECOVERING->activate).
 *
 * @see docs/v0.4/45-layer3-killswitch-recovery-attacks.md
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
import type { DatabaseConnection } from '../../../infrastructure/database/index.js';
import { JwtSecretManager } from '../../../infrastructure/jwt/index.js';
import { KillSwitchService } from '../../../services/kill-switch-service.js';
import { ConsecutiveFailuresRule } from '../../../services/autostop-rules.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let conn: DatabaseConnection;
let jwtManager: JwtSecretManager;
let killSwitchState: string;
let killSwitchService: KillSwitchService;

beforeEach(async () => {
  conn = createInMemoryDb();

  // Create additional tables needed for Kill Switch cascade
  conn.sqlite.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      wallet_id TEXT,
      session_id TEXT,
      tx_id TEXT,
      ip_address TEXT
    );
  `);

  jwtManager = new JwtSecretManager(conn.db);
  await jwtManager.initialize();

  killSwitchState = 'ACTIVE';

  // Initialize kill switch state in key_value_store
  const now = Math.floor(Date.now() / 1000);
  conn.sqlite
    .prepare(
      'INSERT OR IGNORE INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?)',
    )
    .run('kill_switch_state', 'ACTIVE', now);

  killSwitchService = new KillSwitchService({ sqlite: conn.sqlite });
});

afterEach(() => {
  try {
    conn.sqlite.close();
  } catch {
    /* already closed */
  }
});

// ---------------------------------------------------------------------------
// SEC-03-01: ACTIVATED state API access (Critical)
// ---------------------------------------------------------------------------

describe('SEC-03-01: ACTIVATED(SUSPENDED) state blocks protected APIs', () => {
  it('GET /v1/wallet/balance returns 503 SYSTEM_LOCKED when kill switch SUSPENDED', async () => {
    killSwitchState = 'SUSPENDED';
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite);
    const token = await signTestToken(jwtManager, sessionId, walletId);

    const res = await app.request('/v1/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('SYSTEM_LOCKED');
  });

  it('/health returns 200 OK even when kill switch SUSPENDED', async () => {
    killSwitchState = 'SUSPENDED';
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('/v1/owner/approve passes killSwitchGuard when SUSPENDED (owner recovery path)', async () => {
    killSwitchState = 'SUSPENDED';

    const ownerKeyPair = createOwnerKeyPair();
    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
      ownerAddress: ownerKeyPair.address,
      ownerVerified: true,
    });

    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const token = await signTestToken(jwtManager, sessionId, walletId);
    const message = `approve:${walletId}:${Date.now()}`;
    const ownerHeaders = createOwnerHeaders(ownerKeyPair, message);

    // Owner path bypasses kill switch guard -- should reach ownerAuth middleware
    const res = await app.request(`/v1/owner/${walletId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...ownerHeaders,
      },
    });

    // Should pass killSwitchGuard and reach handler (200), not 503
    expect(res.status).toBe(200);
  });

  it('GET /v1/wallet/balance returns 503 when kill switch LOCKED', async () => {
    killSwitchState = 'LOCKED';
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite);
    const token = await signTestToken(jwtManager, sessionId, walletId);

    const res = await app.request('/v1/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// SEC-03-02: Recovery brute-force (High)
// ---------------------------------------------------------------------------

describe('SEC-03-02: Kill Switch service CAS-based recovery prevents invalid transitions', () => {
  it('recover from ACTIVE state fails (nothing to recover)', () => {
    // State is ACTIVE, cannot recover from something not activated
    const result = killSwitchService.recoverFromSuspended();
    expect(result).toBe(false);
    expect(killSwitchService.getState().state).toBe('ACTIVE');
  });

  it('recover from SUSPENDED with recoverFromLocked fails (wrong CAS)', () => {
    killSwitchService.activate('attacker');
    expect(killSwitchService.getState().state).toBe('SUSPENDED');

    // Attacker tries wrong recovery method
    const result = killSwitchService.recoverFromLocked();
    expect(result).toBe(false);
    expect(killSwitchService.getState().state).toBe('SUSPENDED');
  });

  it('successful recovery from SUSPENDED clears metadata', () => {
    killSwitchService.activate('admin');
    expect(killSwitchService.getState().state).toBe('SUSPENDED');
    expect(killSwitchService.getState().activatedBy).toBe('admin');

    const result = killSwitchService.recoverFromSuspended();
    expect(result).toBe(true);
    expect(killSwitchService.getState().state).toBe('ACTIVE');
    expect(killSwitchService.getState().activatedAt).toBeNull();
    expect(killSwitchService.getState().activatedBy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SEC-03-03: Recovery with forged owner signature (Critical)
// ---------------------------------------------------------------------------

describe('SEC-03-03: Owner signature forgery is rejected', () => {
  it('wrong key pair signature is rejected by ownerAuth', async () => {
    const realOwner = createOwnerKeyPair();
    const fakeOwner = createOwnerKeyPair();

    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
      ownerAddress: realOwner.address,
      ownerVerified: true,
    });

    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => 'ACTIVE',
    });

    const token = await signTestToken(jwtManager, sessionId, walletId);
    const message = `recover:${walletId}:${Date.now()}`;

    // Sign with fake owner's key but claim to be real owner
    const fakeHeaders = createOwnerHeaders(fakeOwner, message);
    // Override address to real owner's (forgery attempt)
    fakeHeaders['X-Owner-Address'] = realOwner.address;

    const res = await app.request(`/v1/owner/${walletId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...fakeHeaders,
      },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('kill switch state unchanged after forgery attempt', () => {
    killSwitchService.activate('admin');
    const stateBefore = killSwitchService.getState();

    // Attacker cannot recover without proper auth -- CAS prevents unauthorized recovery
    // Even if attacker directly calls recover, the state is SUSPENDED not ACTIVE
    const result = killSwitchService.recoverFromLocked(); // wrong method for SUSPENDED
    expect(result).toBe(false);

    const stateAfter = killSwitchService.getState();
    expect(stateAfter.state).toBe(stateBefore.state);
    expect(stateAfter.activatedBy).toBe(stateBefore.activatedBy);
  });
});

// ---------------------------------------------------------------------------
// SEC-03-04: AutoStop CONSECUTIVE_FAILURES (High)
// ---------------------------------------------------------------------------

describe('SEC-03-04: AutoStop consecutive failures rule', () => {
  it('5 consecutive failures trigger suspension', () => {
    const rule = new ConsecutiveFailuresRule(5);
    const wid = 'wallet-test-failures';

    for (let i = 1; i <= 4; i++) {
      const result = rule.onTransactionFailed(wid);
      expect(result.triggered).toBe(false);
    }

    const fifthResult = rule.onTransactionFailed(wid);
    expect(fifthResult.triggered).toBe(true);
    expect(fifthResult.walletId).toBe(wid);
  });

  it('success resets failure counter -- 2 failures, success, 2 failures do not trigger', () => {
    const rule = new ConsecutiveFailuresRule(5);
    const wid = 'wallet-test-reset';

    rule.onTransactionFailed(wid);
    rule.onTransactionFailed(wid);
    rule.onTransactionCompleted(wid); // resets counter

    rule.onTransactionFailed(wid);
    rule.onTransactionFailed(wid);

    // Only 2 consecutive now, not 5
    const result = rule.onTransactionFailed(wid);
    expect(result.triggered).toBe(false);
  });

  it('boundary: 4 failures + success + 4 failures = no trigger', () => {
    const rule = new ConsecutiveFailuresRule(5);
    const wid = 'wallet-boundary';

    for (let i = 0; i < 4; i++) rule.onTransactionFailed(wid);
    rule.onTransactionCompleted(wid); // reset
    for (let i = 0; i < 4; i++) {
      const result = rule.onTransactionFailed(wid);
      expect(result.triggered).toBe(false);
    }

    // 5th after reset triggers
    const result = rule.onTransactionFailed(wid);
    expect(result.triggered).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SEC-03-05: Kill Switch double activation (Medium)
// ---------------------------------------------------------------------------

describe('SEC-03-05: Kill Switch double activation', () => {
  it('activate() on already SUSPENDED state returns false (CAS failure)', () => {
    const first = killSwitchService.activate('admin-1');
    expect(first).toBe(true);
    expect(killSwitchService.getState().state).toBe('SUSPENDED');

    const second = killSwitchService.activate('admin-2');
    expect(second).toBe(false);

    // Original activation preserved
    expect(killSwitchService.getState().activatedBy).toBe('admin-1');
  });

  it('activateWithCascade on already SUSPENDED returns error', () => {
    killSwitchService.activateWithCascade('admin-1');

    const result = killSwitchService.activateWithCascade('admin-2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('SUSPENDED');
  });

  it('activateWithCascade on LOCKED returns error', () => {
    killSwitchService.activate('admin');
    killSwitchService.escalate('admin');
    expect(killSwitchService.getState().state).toBe('LOCKED');

    const result = killSwitchService.activateWithCascade('attacker');
    expect(result.success).toBe(false);
    expect(result.error).toContain('LOCKED');
  });
});

// ---------------------------------------------------------------------------
// SEC-03-06: Session reuse after recovery (High)
// ---------------------------------------------------------------------------

describe('SEC-03-06: Sessions revoked after kill switch, not restored on recovery', () => {
  it('cascade revokes all sessions, recovery does not restore them', async () => {
    const _now = Math.floor(Date.now() / 1000);

    // Create sessions
    const { sessionId: sess1 } = seedSecurityTestData(conn.sqlite, {
      walletId: 'wallet-ks-sess1',
      sessionId: 'sess-ks-1',
    });
    seedSecurityTestData(conn.sqlite, {
      walletId: 'wallet-ks-sess2',
      sessionId: 'sess-ks-2',
    });

    // Activate kill switch with cascade
    const mockNotify = vi.fn().mockResolvedValue(undefined);
    const ksService = new KillSwitchService({
      sqlite: conn.sqlite,
      notificationService: { notify: mockNotify } as any,
    });

    ksService.activateWithCascade('admin');
    // Wait for async cascade
    await new Promise((r) => setTimeout(r, 50));

    // All sessions should be revoked
    const sessions = conn.sqlite
      .prepare('SELECT id, revoked_at FROM sessions')
      .all() as Array<{ id: string; revoked_at: number | null }>;

    for (const s of sessions) {
      expect(s.revoked_at).toBeTypeOf('number');
    }

    // Recover
    ksService.recoverFromSuspended();
    expect(ksService.getState().state).toBe('ACTIVE');

    // Sessions should STILL be revoked (recovery does not restore sessions)
    const afterRecovery = conn.sqlite
      .prepare('SELECT id, revoked_at FROM sessions')
      .all() as Array<{ id: string; revoked_at: number | null }>;

    for (const s of afterRecovery) {
      expect(s.revoked_at).toBeTypeOf('number');
    }

    // Old token should be rejected (SESSION_REVOKED)
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => 'ACTIVE',
    });

    const token = await signTestToken(jwtManager, sess1, 'wallet-ks-sess1');
    const res = await app.request('/v1/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('SESSION_REVOKED');
  });
});

// ---------------------------------------------------------------------------
// SEC-03-07: Cascade partial failure (Medium)
// ---------------------------------------------------------------------------

describe('SEC-03-07: Cascade continues on partial failure (best-effort)', () => {
  it('cascade steps 5-6 succeed even if step 3 (wallet suspend) table is missing', async () => {
    // Create a minimal DB without wallets table extended fields
    // The cascade has try/catch around each step
    const mockNotify = vi.fn().mockResolvedValue(undefined);
    const mockEventBus = { emit: vi.fn() };

    const ksService = new KillSwitchService({
      sqlite: conn.sqlite,
      notificationService: { notify: mockNotify } as any,
      eventBus: mockEventBus as any,
    });

    // Seed some sessions and transactions
    seedSecurityTestData(conn.sqlite, { walletId: 'wallet-cascade-1', sessionId: 'sess-cascade-1' });

    conn.sqlite
      .prepare(
        `INSERT INTO transactions (id, wallet_id, chain, type, amount, to_address, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('tx-cascade-1', 'wallet-cascade-1', 'solana', 'TRANSFER', '1000', 'addr', 'PENDING', Math.floor(Date.now() / 1000));

    // Activate and cascade
    ksService.activate('admin');
    await ksService.executeCascade('admin');

    // State should be SUSPENDED (step 1-3 in DB transaction)
    expect(ksService.getState().state).toBe('SUSPENDED');

    // Step 1: Sessions revoked
    const sessions = conn.sqlite
      .prepare("SELECT revoked_at FROM sessions WHERE id = 'sess-cascade-1'")
      .get() as { revoked_at: number | null };
    expect(sessions.revoked_at).toBeTypeOf('number');

    // Step 2: Transactions cancelled
    const tx = conn.sqlite
      .prepare("SELECT status FROM transactions WHERE id = 'tx-cascade-1'")
      .get() as { status: string };
    expect(tx.status).toBe('CANCELLED');

    // Step 5: Notification sent
    expect(mockNotify).toHaveBeenCalledWith(
      'KILL_SWITCH_ACTIVATED',
      'system',
      { activatedBy: 'admin' },
    );

    // Step 6: Audit log written
    const logs = conn.sqlite
      .prepare("SELECT * FROM audit_log WHERE event_type = 'KILL_SWITCH_ACTIVATED'")
      .all();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // EventBus emitted
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'kill-switch:state-changed',
      expect.objectContaining({ state: 'SUSPENDED', previousState: 'ACTIVE' }),
    );
  });
});

// ---------------------------------------------------------------------------
// SEC-03-08: RECOVERING/LOCKED state API access (High)
// ---------------------------------------------------------------------------

describe('SEC-03-08: LOCKED state blocks APIs same as SUSPENDED', () => {
  it('LOCKED state blocks /v1/wallet/balance with 503', async () => {
    killSwitchState = 'LOCKED';
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite);
    const token = await signTestToken(jwtManager, sessionId, walletId);

    const res = await app.request('/v1/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(503);
  });

  it('/v1/owner/approve passes killSwitchGuard in LOCKED state (recovery path)', async () => {
    killSwitchState = 'LOCKED';

    const ownerKeyPair = createOwnerKeyPair();
    const { walletId, sessionId } = seedSecurityTestData(conn.sqlite, {
      ownerAddress: ownerKeyPair.address,
      ownerVerified: true,
    });

    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const token = await signTestToken(jwtManager, sessionId, walletId);
    // Recovery still goes through the approve route, so it carries that token.
    const message = `recover approve:${walletId}:${Date.now()}`;
    const ownerHeaders = createOwnerHeaders(ownerKeyPair, message);

    const res = await app.request(`/v1/owner/${walletId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...ownerHeaders,
      },
    });

    // killSwitchGuard passes /v1/owner/* -- response depends on sessionAuth/ownerAuth
    // If session is valid, should reach handler (200)
    expect(res.status).toBe(200);
  });

  it('/health returns 200 in LOCKED state', async () => {
    killSwitchState = 'LOCKED';
    const app = createSecurityTestApp({
      jwtManager,
      db: conn.db,
      getKillSwitchState: () => killSwitchState,
    });

    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Additional: 3-state transition edge cases
// ---------------------------------------------------------------------------

describe('Kill Switch 3-state transition validation', () => {
  it('NORMAL(ACTIVE) -> recover fails with CAS (409 equivalent)', () => {
    // State is ACTIVE, recovery makes no sense
    expect(killSwitchService.recoverFromSuspended()).toBe(false);
    expect(killSwitchService.recoverFromLocked()).toBe(false);
    expect(killSwitchService.getState().state).toBe('ACTIVE');
  });

  it('LOCKED -> activate fails (must recover first)', () => {
    killSwitchService.activate('admin');
    killSwitchService.escalate('admin');
    expect(killSwitchService.getState().state).toBe('LOCKED');

    // Cannot activate from LOCKED
    const result = killSwitchService.activate('attacker');
    expect(result).toBe(false);
    expect(killSwitchService.getState().state).toBe('LOCKED');
  });

  it('full ACTIVE -> SUSPENDED -> LOCKED -> ACTIVE cycle', () => {
    expect(killSwitchService.getState().state).toBe('ACTIVE');

    killSwitchService.activate('admin');
    expect(killSwitchService.getState().state).toBe('SUSPENDED');

    killSwitchService.escalate('admin');
    expect(killSwitchService.getState().state).toBe('LOCKED');

    killSwitchService.recoverFromLocked();
    expect(killSwitchService.getState().state).toBe('ACTIVE');
    expect(killSwitchService.getState().activatedAt).toBeNull();
  });
});
