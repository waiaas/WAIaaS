/**
 * Owner auth middleware: verifies signature from owner wallet.
 *
 * Protects owner-only actions (transaction approval, KS recovery).
 * The owner signs a message with their wallet, and this middleware verifies
 * the signature against the registered owner_address on the agent.
 *
 * Headers required:
 *   - X-Owner-Signature: signature (base64 Ed25519 for Solana, 0x hex for EVM)
 *   - X-Owner-Message: the signed message (UTF-8 for Solana, EIP-4361 for EVM)
 *   - X-Owner-Address: the owner's wallet address (base58 for Solana, 0x for EVM)
 *
 * v1.2: Solana Ed25519.
 * v1.4.1: EVM SIWE (EIP-4361 + EIP-191) via verifySIWE.
 *
 * Chain branching: agent.chain determines verification path:
 *   - solana  -> Ed25519 detached signature verification (sodium-native)
 *   - ethereum -> SIWE (EIP-4361 + EIP-191) verification (viem)
 *
 * Factory pattern: createOwnerAuth(deps) returns middleware.
 *
 * @see docs/52-auth-redesign.md
 */

import { createMiddleware } from 'hono/factory';
import { createRequire } from 'node:module';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { WAIaaSError } from '@waiaas/core';
import type * as schema from '../../infrastructure/database/schema.js';
import { wallets, transactions } from '../../infrastructure/database/schema.js';
import { verifySIWE } from './siwe-verify.js';
import { decodeBase58 } from './address-validation.js';

type SodiumNative = typeof import('sodium-native');

const require = createRequire(import.meta.url);

function loadSodium(): SodiumNative {
  return require('sodium-native') as SodiumNative;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OwnerAuthDeps {
  db: BetterSQLite3Database<typeof schema>;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function createOwnerAuth(deps: OwnerAuthDeps) {
  return createMiddleware(async (c, next) => {
    const signature = c.req.header('X-Owner-Signature');
    const message = c.req.header('X-Owner-Message');
    const ownerAddress = c.req.header('X-Owner-Address');
    const messageEncoding = c.req.header('X-Owner-Message-Encoding');

    if (!signature || !message || !ownerAddress) {
      throw new WAIaaSError('INVALID_SIGNATURE', {
        message: 'X-Owner-Signature, X-Owner-Message, and X-Owner-Address headers are required',
      });
    }

    // Reject unknown encodings rather than silently falling back: a typo would
    // otherwise surface only as a signature mismatch, which is unreadable.
    if (messageEncoding !== undefined && messageEncoding !== 'base64' && messageEncoding !== 'utf8') {
      throw new WAIaaSError('INVALID_SIGNATURE', {
        message: `Unsupported X-Owner-Message-Encoding '${messageEncoding}'. Use 'base64', 'utf8', or omit the header.`,
      });
    }

    // Look up wallet to verify owner_address match.
    // Use wallet ID from route param (/v1/wallets/:id/* routes).
    // For transaction routes (/v1/transactions/:id/approve|reject),
    // :id is the transaction ID -- look up the transaction to get walletId.
    const paramId = c.req.param('id');
    if (!paramId) {
      throw new WAIaaSError('WALLET_NOT_FOUND', {
        message: 'Wallet ID required for owner authentication',
      });
    }

    // Try direct wallet lookup first
    let wallet = deps.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, paramId))
      .get();

    // If not found as wallet, try as transaction ID (approve/reject routes)
    if (!wallet) {
      const tx = deps.db
        .select({ walletId: transactions.walletId })
        .from(transactions)
        .where(eq(transactions.id, paramId))
        .get();

      if (tx) {
        wallet = deps.db
          .select()
          .from(wallets)
          .where(eq(wallets.id, tx.walletId))
          .get();
      }
    }

    if (!wallet) {
      throw new WAIaaSError('WALLET_NOT_FOUND');
    }
    if (!wallet.ownerAddress) {
      throw new WAIaaSError('OWNER_NOT_CONNECTED', {
        message: 'No owner address registered for this wallet',
      });
    }
    if (wallet.ownerAddress !== ownerAddress) {
      throw new WAIaaSError('INVALID_SIGNATURE', {
        message: 'Owner address does not match wallet owner',
      });
    }

    // Branch verification by chain type
    if (wallet.chain === 'ethereum') {
      // EVM SIWE verification (EIP-4361 + EIP-191)
      // For SIWE: X-Owner-Message is base64-encoded EIP-4361 message (multi-line messages
      // cannot be sent as raw HTTP header values), X-Owner-Signature is 0x-prefixed hex.
      // X-Owner-Message-Encoding is not consulted here -- SIWE messages are always
      // multi-line, so base64 is the only representation that survives a header.
      const decodedMessage = Buffer.from(message, 'base64').toString('utf8');
      const result = await verifySIWE({
        message: decodedMessage,
        signature, // already hex 0x-prefixed from header
        expectedAddress: ownerAddress,
      });

      if (!result.valid) {
        throw new WAIaaSError('INVALID_SIGNATURE', {
          message: result.error ?? 'SIWE signature verification failed',
        });
      }
    } else {
      // Solana Ed25519 verification (existing logic)
      // X-Owner-Signature is base64-encoded Ed25519 detached signature
      try {
        const sodium = loadSodium();

        const signatureBytes = Buffer.from(signature, 'base64');

        // HTTP header values are latin1 and cannot carry newlines, so a prompt the
        // owner actually reads in the wallet popup (Korean text, multiple lines)
        // cannot be sent raw. Opt in with X-Owner-Message-Encoding: base64; omitting
        // the header keeps the original raw-UTF8 behaviour for existing clients.
        const messageBytes = messageEncoding === 'base64'
          ? Buffer.from(message, 'base64')
          : Buffer.from(message, 'utf8');

        if (messageEncoding === 'base64' && messageBytes.length === 0) {
          throw new WAIaaSError('INVALID_SIGNATURE', {
            message: 'X-Owner-Message is declared base64 but decodes to an empty message',
          });
        }

        const publicKeyBytes = decodeBase58(ownerAddress);

        // Validate key length
        if (publicKeyBytes.length !== sodium.crypto_sign_PUBLICKEYBYTES) {
          throw new WAIaaSError('INVALID_SIGNATURE', {
            message: `Invalid public key length: expected ${String(sodium.crypto_sign_PUBLICKEYBYTES)}, got ${String(publicKeyBytes.length)}`,
          });
        }

        // Validate signature length
        if (signatureBytes.length !== sodium.crypto_sign_BYTES) {
          throw new WAIaaSError('INVALID_SIGNATURE', {
            message: `Invalid signature length: expected ${String(sodium.crypto_sign_BYTES)}, got ${String(signatureBytes.length)}`,
          });
        }

        const valid = sodium.crypto_sign_verify_detached(signatureBytes, messageBytes, publicKeyBytes);
        if (!valid) {
          throw new WAIaaSError('INVALID_SIGNATURE', {
            message: 'Ed25519 signature verification failed',
          });
        }
      } catch (err) {
        if (err instanceof WAIaaSError) throw err;
        throw new WAIaaSError('INVALID_SIGNATURE', {
          message: 'Signature verification failed',
          cause: err instanceof Error ? err : undefined,
        });
      }
    }

    c.set('ownerAddress', ownerAddress);
    await next();
  });
}
