/**
 * Admin Stats unit tests: InMemoryCounter + AdminStatsService.
 *
 * @see packages/daemon/src/infrastructure/metrics/in-memory-counter.ts
 * @see packages/daemon/src/services/admin-stats-service.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryCounter } from '../infrastructure/metrics/in-memory-counter.js';
import { AdminStatsService } from '../services/admin-stats-service.js';
import { AdminStatsResponseSchema } from '@waiaas/core';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import type { Database as DatabaseType } from 'better-sqlite3';

// ---------------------------------------------------------------------------
// InMemoryCounter tests
// ---------------------------------------------------------------------------

describe('InMemoryCounter', () => {
  it('increment 3x -> getCount returns 3', () => {
    const counter = new InMemoryCounter();
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.calls', { network: 'solana-mainnet' });

    expect(counter.getCount('rpc.calls', { network: 'solana-mainnet' })).toBe(3);
  });

  it('recordLatency 3x -> getAvgLatency returns average', () => {
    const counter = new InMemoryCounter();
    counter.recordLatency('rpc.latency', 100, { network: 'solana-mainnet' });
    counter.recordLatency('rpc.latency', 200, { network: 'solana-mainnet' });
    counter.recordLatency('rpc.latency', 300, { network: 'solana-mainnet' });

    expect(counter.getAvgLatency('rpc.latency', { network: 'solana-mainnet' })).toBe(200);
  });

  it('snapshot returns full state', () => {
    const counter = new InMemoryCounter();
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.recordLatency('rpc.latency', 100, { network: 'solana-mainnet' });

    const snap = counter.snapshot();
    expect(snap.counters['rpc.calls|network=solana-mainnet']).toBe(1);
    expect(snap.latencies['rpc.latency|network=solana-mainnet']).toEqual({
      count: 1,
      totalMs: 100,
      avgMs: 100,
    });
  });

  it('reset clears all counters', () => {
    const counter = new InMemoryCounter();
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.recordLatency('rpc.latency', 100, { network: 'solana-mainnet' });

    counter.reset();

    expect(counter.getCount('rpc.calls', { network: 'solana-mainnet' })).toBe(0);
    expect(counter.getAvgLatency('rpc.latency', { network: 'solana-mainnet' })).toBe(0);
    const snap = counter.snapshot();
    expect(Object.keys(snap.counters)).toHaveLength(0);
  });

  it('labels isolate counters -- different network returns 0', () => {
    const counter = new InMemoryCounter();
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.calls', { network: 'solana-mainnet' });

    expect(counter.getCount('rpc.calls', { network: 'solana-mainnet' })).toBe(2);
    expect(counter.getCount('rpc.calls', { network: 'ethereum-mainnet' })).toBe(0);
  });

  it('getCountsByPrefix returns matching entries', () => {
    const counter = new InMemoryCounter();
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.calls', { network: 'ethereum-mainnet' });
    counter.increment('tx.submitted');

    const result = counter.getCountsByPrefix('rpc.calls');
    expect(result.size).toBe(2);
  });

  it('getAvgLatency returns 0 for unknown key', () => {
    const counter = new InMemoryCounter();
    expect(counter.getAvgLatency('nonexistent')).toBe(0);
  });

  it('increment without labels works', () => {
    const counter = new InMemoryCounter();
    counter.increment('total');
    counter.increment('total');
    expect(counter.getCount('total')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// AdminStatsService tests
// ---------------------------------------------------------------------------

describe('AdminStatsService', () => {
  let sqlite: DatabaseType;
  let counter: InMemoryCounter;

  beforeEach(() => {
    const conn = createDatabase(':memory:');
    pushSchema(conn.sqlite);
    sqlite = conn.sqlite;
    counter = new InMemoryCounter();

    // Insert some test data
    const now = Math.floor(Date.now() / 1000);

    // Wallets
    sqlite.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('w1', 'Wallet 1', 'solana', 'testnet', 'pk1', 'ACTIVE', now, now);
    sqlite.prepare(
      'INSERT INTO wallets (id, name, chain, environment, public_key, status, created_at, updated_at, owner_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('w2', 'Wallet 2', 'ethereum', 'testnet', 'pk2', 'ACTIVE', now, now, '0xabc');

    // Sessions
    sqlite.prepare(
      'INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run('s1', 'hash1', now + 3600, now + 86400, now);
    sqlite.prepare(
      'INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('s2', 'hash2', now + 3600, now + 86400, now - 100, now);

    // Transactions
    sqlite.prepare(
      'INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('tx1', 'w1', 'solana', 'TRANSFER', 'CONFIRMED', now, 'solana-mainnet');
    sqlite.prepare(
      'INSERT INTO transactions (id, wallet_id, chain, type, status, created_at, network) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('tx2', 'w1', 'solana', 'TOKEN_TRANSFER', 'FAILED', now, 'solana-mainnet');
  });

  afterEach(() => {
    try { sqlite.close(); } catch { /* ok */ }
  });

  it('getStats() returns valid AdminStatsResponse with all 7 categories', () => {
    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      startTime: Math.floor(Date.now() / 1000) - 100,
      version: '2.9.0',
    });

    const stats = service.getStats();

    // Validate against Zod schema
    const result = AdminStatsResponseSchema.safeParse(stats);
    expect(result.success).toBe(true);

    // Check specific values
    expect(stats.transactions.total).toBe(2);
    expect(stats.transactions.byStatus.CONFIRMED).toBe(1);
    expect(stats.transactions.byStatus.FAILED).toBe(1);
    expect(stats.transactions.byType.TRANSFER).toBe(1);

    expect(stats.wallets.total).toBe(2);
    expect(stats.wallets.withOwner).toBe(1);

    expect(stats.sessions.total).toBe(2);
    expect(stats.sessions.active).toBe(1);

    expect(stats.system.version).toBe('2.9.0');
    expect(stats.system.schemaVersion).toBe(63);
    expect(stats.system.nodeVersion).toBe(process.version);
  });

  it('cache -- second call within 60s returns same object', () => {
    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      startTime: Math.floor(Date.now() / 1000),
      version: '2.9.0',
    });

    const stats1 = service.getStats();
    const stats2 = service.getStats();

    // Same reference (cached)
    expect(stats1).toBe(stats2);
  });

  it('invalidateCache() forces refresh on next getStats()', () => {
    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      startTime: Math.floor(Date.now() / 1000),
      version: '2.9.0',
    });

    const stats1 = service.getStats();
    service.invalidateCache();
    const stats2 = service.getStats();

    // Different reference (cache was invalidated)
    expect(stats1).not.toBe(stats2);
    // But same data
    expect(stats1.transactions.total).toBe(stats2.transactions.total);
  });

  it('counts unlimited sessions (expires_at=0) as active', () => {
    const now = Math.floor(Date.now() / 1000);
    // Add unlimited session (expires_at=0)
    sqlite.prepare(
      'INSERT INTO sessions (id, token_hash, expires_at, absolute_expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run('s-unlimited', 'hash-ul', 0, 0, now);

    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      startTime: now,
      version: '2.9.0',
    });

    const stats = service.getStats();
    // s1 (active, future expiry) + s-unlimited (active, never expires) = 2 active
    // s2 is revoked so not active
    expect(stats.sessions.active).toBe(2);
    expect(stats.sessions.total).toBe(3);
  });

  it('includes RPC metrics from InMemoryCounter', () => {
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.calls', { network: 'solana-mainnet' });
    counter.increment('rpc.errors', { network: 'solana-mainnet' });
    counter.recordLatency('rpc.latency', 100, { network: 'solana-mainnet' });

    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      startTime: Math.floor(Date.now() / 1000),
      version: '2.9.0',
    });

    const stats = service.getStats();
    expect(stats.rpc.byNetwork).toHaveLength(1);
    expect(stats.rpc.byNetwork[0].network).toBe('solana-mainnet');
    expect(stats.rpc.byNetwork[0].calls).toBe(2);
    expect(stats.rpc.byNetwork[0].errors).toBe(1);
  });

  it('includes AutoStop status from service', () => {
    const mockAutoStop = {
      getStatus: () => ({
        enabled: true,
        config: {},
        rules: {
          consecutiveFailures: { trackedWallets: 0 },
          unusualActivity: { trackedWallets: 0 },
          idleTimeout: { trackedSessions: 0 },
        },
      }),
      registry: {
        getRules: () => [
          {
            id: 'consecutive_failures',
            displayName: 'Consecutive Failures',
            enabled: true,
            getStatus: () => ({ trackedCount: 0, config: {}, state: {} }),
          },
        ],
      },
    };

    const service = new AdminStatsService({
      sqlite,
      metricsCounter: counter,
      autoStopService: mockAutoStop as any,
      startTime: Math.floor(Date.now() / 1000),
      version: '2.9.0',
    });

    const stats = service.getStats();
    expect(stats.autostop.enabled).toBe(true);
    expect(stats.autostop.rules).toHaveLength(1);
    expect(stats.autostop.rules[0].id).toBe('consecutive_failures');
  });
});
