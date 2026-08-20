/**
 * Nonce route: GET /v1/nonce.
 *
 * Returns a random nonce for ownerAuth signature construction.
 * This endpoint is public (no auth required).
 *
 * The nonce is stateless -- nothing is stored or consumed server-side, so it does
 * not by itself prevent replay. What does is the `action:id` token that ownerAuth
 * requires inside the signed message; clients fold the nonce in alongside it so
 * two authorisations of the same id are not byte-identical.
 *
 * @see docs/52-auth-redesign.md
 */

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { randomBytes } from 'node:crypto';
import { NonceResponseSchema, openApiValidationHook } from './openapi-schemas.js';

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

const nonceRoute = createRoute({
  method: 'get',
  path: '/nonce',
  tags: ['Auth'],
  summary: 'Get ownerAuth nonce',
  responses: {
    200: {
      description: 'Nonce for signature construction',
      content: { 'application/json': { schema: NonceResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create nonce route sub-router.
 *
 * GET /nonce -> returns random 32-byte hex nonce with 5-minute expiry
 */
export function nonceRoutes(): OpenAPIHono {
  const router = new OpenAPIHono({ defaultHook: openApiValidationHook });

  router.openapi(nonceRoute, (c) => {
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 min

    return c.json({ nonce, expiresAt }, 200);
  });

  return router;
}
