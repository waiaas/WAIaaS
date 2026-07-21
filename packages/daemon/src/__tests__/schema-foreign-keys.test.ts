/**
 * Tests that verify Drizzle schema foreign key reference callbacks are callable.
 *
 * v8 coverage tracks arrow functions inside .references(() => ...) as separate
 * functions. This test triggers those callbacks by calling getTableConfig()
 * and invoking fk.reference() on each foreign key definition.
 */

import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import {
  sessionWallets,
  transactions,
  policies,
  pendingApprovals,
  wcSessions,
  incomingTransactions,
  incomingTxCursors,
  defiPositions,
  webhookLogs,
  agentIdentities,
  walletCredentials,
} from '../infrastructure/database/schema.js';

describe('Schema foreign key references', () => {
  it('sessionWallets has FK to sessions and wallets', () => {
    const config = getTableConfig(sessionWallets);
    expect(config.foreignKeys.length).toBe(2);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('transactions has FKs to wallets, sessions, and self-referencing parentId', () => {
    const config = getTableConfig(transactions);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(3);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('policies has FK to wallets', () => {
    const config = getTableConfig(policies);
    const fks = config.foreignKeys;
    expect(fks.length).toBeGreaterThanOrEqual(1);
    for (const fk of fks) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('pendingApprovals has FK to transactions', () => {
    const config = getTableConfig(pendingApprovals);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('wcSessions has FK to wallets', () => {
    const config = getTableConfig(wcSessions);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('incomingTransactions has FK to wallets', () => {
    const config = getTableConfig(incomingTransactions);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('incomingTxCursors has FK to wallets', () => {
    const config = getTableConfig(incomingTxCursors);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('defiPositions has FK to wallets', () => {
    const config = getTableConfig(defiPositions);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('webhookLogs has FK to webhooks', () => {
    const config = getTableConfig(webhookLogs);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('agentIdentities has FK to wallets', () => {
    const config = getTableConfig(agentIdentities);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });

  it('walletCredentials has FK to wallets', () => {
    const config = getTableConfig(walletCredentials);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignColumns.length).toBeGreaterThan(0);
    }
  });
});
