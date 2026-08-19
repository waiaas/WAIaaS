/**
 * Owner auth middleware: verifies signature from owner wallet.
 *
 * Protects owner-only actions (transaction approval, KS recovery).
 * The owner signs a message with their wallet, and this middleware verifies
 * the signature against the registered owner_address on the agent.
 *
 * Headers required:
 *   - X-Owner-Signature: signature (base64 Ed25519 for Solana, 0x hex for EVM)
 *   - X-Owner-Message: the signed message (Solana: raw UTF-8, or base64 when
 *       X-Owner-Message-Encoding is base64; EVM: base64-encoded EIP-4361)
 *   - X-Owner-Address: the owner's wallet address (base58 for Solana, 0x for EVM)
 *
 * Optional:
 *   - X-Owner-Message-Encoding: base64 | utf8 -- Solana only. The EVM path is
 *       always base64 (SIWE messages are multi-line) and does not consult it.
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

declare module 'hono' {
  interface ContextVariableMap {
    /** Owner address proven by the verified signature. */
    ownerAddress: string;
    /** The decoded text the owner signed, persisted so approvals stay verifiable. */
    ownerMessage: string;
  }
}

export interface OwnerAuthDeps {
  db: BetterSQLite3Database<typeof schema>;
  /**
   * Reads security.owner_message_binding. Optional for backward compatibility:
   * when absent the binding check stays on, since the safe default is to require it.
   */
  settingsService?: { get(key: string): string };
}

/**
 * Decode a message the caller declared as base64, rejecting anything that is not.
 *
 * Buffer.from(x, 'base64') silently drops out-of-alphabet characters instead of
 * failing, so raw text like 'Approve purchase 5 USDC' decodes to 15 unrelated
 * bytes and only input with no base64 character at all reaches zero length.
 * Without a round-trip check a mis-declared message would sail through to the
 * signature check and come back as an unreadable mismatch -- the same failure
 * mode this middleware refuses to accept for the encoding name itself.
 */
function decodeDeclaredBase64(value: string): Buffer {
  const decoded = Buffer.from(value, 'base64');
  // Pad before comparing so valid-but-unpadded input ('aGk') still passes.
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');

  if (decoded.length === 0 || decoded.toString('base64') !== padded) {
    throw new WAIaaSError('INVALID_SIGNATURE', {
      message:
        'X-Owner-Message is declared base64 but is not valid standard base64. Send base64 of ' +
        'the exact bytes that were signed, or omit X-Owner-Message-Encoding to send raw UTF-8.',
    });
  }

  return decoded;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function createOwnerAuth(deps: OwnerAuthDeps) {
  return createMiddleware(async (c, next) => {
    const signature = c.req.header('X-Owner-Signature');
    const message = c.req.header('X-Owner-Message');
    const ownerAddress = c.req.header('X-Owner-Address');
    // Normalise before comparing: a header that is present but blank arrives as
    // '' rather than undefined, which would otherwise be reported as an
    // unsupported encoding. 'utf-8' is the IANA spelling of Node's 'utf8'.
    const declaredEncoding = c.req.header('X-Owner-Message-Encoding')?.trim().toLowerCase() || undefined;
    const messageEncoding = declaredEncoding === 'utf-8' ? 'utf8' : declaredEncoding;

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

    // Captured by whichever branch runs, then checked for the id binding below.
    let signedText = '';

    // Branch verification by chain type
    if (wallet.chain === 'ethereum') {
      // EVM SIWE verification (EIP-4361 + EIP-191)
      // For SIWE: X-Owner-Message is base64-encoded EIP-4361 message (multi-line messages
      // cannot be sent as raw HTTP header values), X-Owner-Signature is 0x-prefixed hex.
      // X-Owner-Message-Encoding is not consulted here -- SIWE messages are always
      // multi-line, so base64 is the only representation that survives a header.
      const decodedMessage = Buffer.from(message, 'base64').toString('utf8');
      signedText = decodedMessage;
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
          ? decodeDeclaredBase64(message)
          : Buffer.from(message, 'utf8');
        signedText = messageBytes.toString('utf8');

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

    // A valid signature alone says "the owner signed something", not "the owner
    // agreed to this". Nothing else ties the two together: the approve handler
    // forwards the signature without re-checking it, and GET /v1/nonce is
    // stateless, so one captured header triple would otherwise authorise every
    // later PENDING_APPROVAL on this wallet. Requiring the signed text to name
    // the id being authorised makes each signature single-purpose.
    if (deps.settingsService?.get('security.owner_message_binding') !== 'false'
      && !signedText.includes(paramId)) {
      throw new WAIaaSError('INVALID_SIGNATURE', {
        message:
          `Signed message must reference the id being authorised ('${paramId}'). ` +
          'Include it in the text the owner signs, or set security.owner_message_binding=false ' +
          'to accept unbound signatures.',
      });
    }

    c.set('ownerAddress', ownerAddress);
    // Handlers persist this so an approval can be re-verified later. The decoded
    // text is what was signed; the raw header may be base64 of it.
    c.set('ownerMessage', signedText);
    await next();
  });
}
