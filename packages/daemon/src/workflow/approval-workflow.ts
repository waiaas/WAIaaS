/**
 * ApprovalWorkflow - APPROVAL tier owner sign-off management.
 *
 * Manages APPROVAL tier transactions through their approval lifecycle:
 * - requestApproval: creates pending_approvals record, sets tx QUEUED
 * - approve: owner signs off, sets tx EXECUTING
 * - reject: owner rejects, sets tx CANCELLED
 * - processExpiredApprovals: batch-expire timed-out approvals
 *
 * Timeout resolution follows 3-level priority:
 * 1. Policy-specific approval_timeout (from rules)
 * 2. Config policy_defaults_approval_timeout (global config)
 * 3. 3600s hardcoded fallback
 *
 * Uses BEGIN IMMEDIATE for atomic approve/reject/expire to prevent
 * concurrent race conditions.
 *
 * @see docs/33-time-lock-approval-mechanism.md
 */

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import { WAIaaSError } from '@waiaas/core';
import { generateId } from '../infrastructure/database/id.js';
import type * as schema from '../infrastructure/database/schema.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hardcoded fallback approval timeout in seconds */
const DEFAULT_APPROVAL_TIMEOUT = 3600;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalWorkflowDeps {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: SQLiteDatabase;
  config: {
    policy_defaults_approval_timeout: number;
  };
  onApproved?: (txId: string) => void;
}

interface RequestApprovalOptions {
  policyTimeoutSeconds?: number;
  /** Approval signature type: SIWE (default) or EIP712. */
  approvalType?: 'SIWE' | 'EIP712';
  /** JSON-serialized EIP-712 typed data payload (only for EIP712). */
  typedDataJson?: string;
}

interface RequestApprovalResult {
  approvalId: string;
  expiresAt: number;
}

interface ApproveResult {
  txId: string;
  approvedAt: number;
}

interface RejectResult {
  txId: string;
  rejectedAt: number;
}

interface PendingApprovalRow {
  id: string;
  tx_id: string;
  expires_at: number;
  approved_at: number | null;
  rejected_at: number | null;
}

// ---------------------------------------------------------------------------
// ApprovalWorkflow
// ---------------------------------------------------------------------------

export class ApprovalWorkflow {
  private readonly sqlite: SQLiteDatabase;
  private readonly config: { policy_defaults_approval_timeout: number };
  private readonly onApproved?: (txId: string) => void;

  constructor(deps: ApprovalWorkflowDeps) {
    this.sqlite = deps.sqlite;
    this.config = deps.config; // #444: store reference for hot-reload support
    this.onApproved = deps.onApproved;
  }

  /** Resolve configTimeout from live config reference (hot-reload safe). */
  private get configTimeout(): number {
    return this.config.policy_defaults_approval_timeout;
  }

  // -------------------------------------------------------------------------
  // requestApproval
  // -------------------------------------------------------------------------

  /**
   * Create a pending approval for an APPROVAL tier transaction.
   *
   * Sets the transaction status to QUEUED and creates a pending_approvals
   * record with an expiration time based on the 3-level timeout priority.
   *
   * @param txId - The transaction ID
   * @param options - Optional policy-specific timeout
   * @returns The approval ID and expiration timestamp
   */
  requestApproval(txId: string, options?: RequestApprovalOptions): RequestApprovalResult {
    const approvalId = generateId();
    const now = Math.floor(Date.now() / 1000);
    const timeout = this.resolveTimeout(options?.policyTimeoutSeconds);
    const expiresAt = now + timeout;
    const approvalType = options?.approvalType ?? 'SIWE';
    const typedDataJson = options?.typedDataJson ?? null;

    const txn = this.sqlite.transaction(() => {
      // Set transaction status to QUEUED
      this.sqlite
        .prepare('UPDATE transactions SET status = ? WHERE id = ?')
        .run('QUEUED', txId);

      // Create pending_approvals record (v40: includes approval_type + typed_data_json)
      this.sqlite
        .prepare(
          `INSERT INTO pending_approvals (id, tx_id, required_by, expires_at, approval_type, typed_data_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(approvalId, txId, now, expiresAt, approvalType, typedDataJson, now);
    });

    txn.immediate();

    return { approvalId, expiresAt };
  }

  // -------------------------------------------------------------------------
  // getApprovalInfo
  // -------------------------------------------------------------------------

  /**
   * Get approval type and typed data for a pending approval.
   *
   * Used by WcSigningBridge (to choose signing method) and approve endpoint
   * (to verify EIP-712 vs SIWE signatures).
   *
   * @param txId - The transaction ID
   * @returns Approval info or undefined if not found
   */
  getApprovalInfo(txId: string): { approvalType: string; typedDataJson: string | null } | undefined {
    const row = this.sqlite
      .prepare(
        `SELECT approval_type, typed_data_json
         FROM pending_approvals
         WHERE tx_id = ? AND approved_at IS NULL AND rejected_at IS NULL`,
      )
      .get(txId) as { approval_type: string; typed_data_json: string | null } | undefined;

    if (!row) return undefined;

    return {
      approvalType: row.approval_type,
      typedDataJson: row.typed_data_json,
    };
  }

  // -------------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------------

  /**
   * Approve a pending APPROVAL transaction with owner signature.
   *
   * Atomically validates the approval, sets approvedAt + ownerSignature,
   * transitions the transaction to EXECUTING, and clears reserved_amount.
   *
   * @param txId - The transaction ID
   * @param ownerSignature - The owner's cryptographic signature
   * @returns The transaction ID and approval timestamp
   * @throws WAIaaSError APPROVAL_NOT_FOUND if no pending approval exists
   * @throws WAIaaSError APPROVAL_TIMEOUT if the approval has expired
   */
  approve(txId: string, ownerSignature: string, ownerMessage?: string): ApproveResult {
    const txn = this.sqlite.transaction(() => {
      // Find pending approval
      const approval = this.sqlite
        .prepare(
          `SELECT id, tx_id, expires_at, approved_at, rejected_at
           FROM pending_approvals
           WHERE tx_id = ? AND approved_at IS NULL AND rejected_at IS NULL`,
        )
        .get(txId) as PendingApprovalRow | undefined;

      if (!approval) {
        throw new WAIaaSError('APPROVAL_NOT_FOUND');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (approval.expires_at <= now) {
        throw new WAIaaSError('APPROVAL_TIMEOUT');
      }

      // Set approvedAt + ownerSignature
      this.sqlite
        .prepare(
          'UPDATE pending_approvals SET approved_at = ?, owner_signature = ?, owner_message = ? WHERE id = ?',
        )
        .run(now, ownerSignature, ownerMessage ?? null, approval.id);

      // Transition transaction to EXECUTING and clear reserved_amount + reserved_amount_usd
      this.sqlite
        .prepare(
          'UPDATE transactions SET status = ?, reserved_amount = NULL, reserved_amount_usd = NULL WHERE id = ?',
        )
        .run('EXECUTING', txId);

      return { txId, approvedAt: now };
    });

    const result = txn.immediate();

    // Resume pipeline after successful approval (fix #246)
    this.onApproved?.(txId);

    return result;
  }

  // -------------------------------------------------------------------------
  // reject
  // -------------------------------------------------------------------------

  /**
   * Reject a pending APPROVAL transaction.
   *
   * Atomically sets rejectedAt, transitions the transaction to CANCELLED,
   * and clears reserved_amount.
   *
   * @param txId - The transaction ID
   * @returns The transaction ID and rejection timestamp
   * @throws WAIaaSError APPROVAL_NOT_FOUND if no pending approval exists
   */
  reject(txId: string, ownerSignature?: string, ownerMessage?: string): RejectResult {
    const txn = this.sqlite.transaction(() => {
      // Find pending approval
      const approval = this.sqlite
        .prepare(
          `SELECT id, tx_id, expires_at, approved_at, rejected_at
           FROM pending_approvals
           WHERE tx_id = ? AND approved_at IS NULL AND rejected_at IS NULL`,
        )
        .get(txId) as PendingApprovalRow | undefined;

      if (!approval) {
        throw new WAIaaSError('APPROVAL_NOT_FOUND');
      }

      const now = Math.floor(Date.now() / 1000);

      // Set rejectedAt
      // Record what the owner signed for a rejection too: refusing is a decision
      // that needs the same audit trail as consenting.
      this.sqlite
        .prepare(
          'UPDATE pending_approvals SET rejected_at = ?, owner_signature = ?, owner_message = ? WHERE id = ?',
        )
        .run(now, ownerSignature ?? null, ownerMessage ?? null, approval.id);

      // Transition transaction to CANCELLED and clear reserved_amount + reserved_amount_usd
      this.sqlite
        .prepare(
          'UPDATE transactions SET status = ?, reserved_amount = NULL, reserved_amount_usd = NULL WHERE id = ?',
        )
        .run('CANCELLED', txId);

      return { txId, rejectedAt: now };
    });

    return txn.immediate();
  }

  // -------------------------------------------------------------------------
  // processExpiredApprovals
  // -------------------------------------------------------------------------

  /**
   * Batch-expire pending approvals that have exceeded their timeout.
   *
   * For each expired approval: sets the transaction status to EXPIRED and
   * clears reserved_amount. Does NOT set rejectedAt (expired != rejected).
   *
   * @param now - Current Unix epoch seconds
   * @returns Count of expired approvals
   */
  processExpiredApprovals(now: number): number {
    const txn = this.sqlite.transaction(() => {
      // Find expired approvals
      const expired = this.sqlite
        .prepare(
          `SELECT id, tx_id
           FROM pending_approvals
           WHERE expires_at <= ? AND approved_at IS NULL AND rejected_at IS NULL`,
        )
        .all(now) as Array<{ id: string; tx_id: string }>;

      if (expired.length === 0) {
        return 0;
      }

      // Batch update: set transaction EXPIRED + clear reserved_amount + reserved_amount_usd
      const updateTx = this.sqlite.prepare(
        'UPDATE transactions SET status = ?, reserved_amount = NULL, reserved_amount_usd = NULL WHERE id = ?',
      );

      for (const row of expired) {
        updateTx.run('EXPIRED', row.tx_id);
      }

      // Note: We intentionally do NOT set rejectedAt on the approval records.
      // Expired != rejected. The approval simply timed out.

      return expired.length;
    });

    return txn.immediate();
  }

  // -------------------------------------------------------------------------
  // Private: Timeout resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve approval timeout with 3-level priority:
   * 1. Policy-specific timeout (from options)
   * 2. Config timeout (policy_defaults_approval_timeout)
   * 3. 3600 hardcoded fallback
   */
  private resolveTimeout(policyTimeoutSeconds?: number): number {
    if (policyTimeoutSeconds !== undefined && policyTimeoutSeconds > 0) {
      return policyTimeoutSeconds;
    }
    if (this.configTimeout !== undefined && this.configTimeout > 0) {
      return this.configTimeout;
    }
    return DEFAULT_APPROVAL_TIMEOUT;
  }
}
