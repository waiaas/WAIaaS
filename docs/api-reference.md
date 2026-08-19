---
title: "API Reference"
description: "WAIaaS REST API reference: authentication, endpoint categories, request/response schemas, and error codes."
date: "2026-02-10"
section: "docs"
slug: "api-reference"
category: "Technical"
---
# API Reference

WAIaaS exposes a REST API on `http://127.0.0.1:3100`. All endpoints are defined using OpenAPI 3.0 decorators and the daemon serves the full specification at runtime.

> **Note:** This document provides an overview of authentication, endpoint categories, and error codes. For complete request/response schemas, parameter details, and examples, use the **OpenAPI specification** served by the daemon.

## Base URL

```
http://127.0.0.1:3100
```

The daemon binds to `127.0.0.1` (localhost only) by default. Do not expose it directly to the public internet.

## Authentication

WAIaaS uses three authentication methods, each scoped to a different actor:

### masterAuth (System Administrator)

**Header:** `X-Master-Password: <your-master-password>`

Used for system administration: creating wallets, managing sessions, configuring policies, Admin API operations. The master password is hashed with Argon2id.

```bash
curl -X POST http://127.0.0.1:3100/v1/wallets \
  -H "Content-Type: application/json" \
  -H "X-Master-Password: my-secret-password" \
  -d '{"name": "my-wallet", "chain": "solana", "environment": "mainnet"}'
```

### sessionAuth (AI Agent)

**Header:** `Authorization: Bearer wai_sess_<jwt-token>`

Used by AI agents and SDKs for wallet queries, transaction submission, and session-scoped operations. Session tokens are JWTs issued via `POST /v1/sessions` and scoped to a specific wallet.

```bash
curl http://127.0.0.1:3100/v1/wallet/balance \
  -H "Authorization: Bearer wai_sess_eyJhbGciOiJIUzI1NiJ9..."
```

### ownerAuth (Fund Owner)

**Headers:** `X-Owner-Signature: <signature>` + `X-Owner-Message: <message>` + `X-Owner-Address: <address>`

Used by the fund owner (human) for high-value transaction approval, kill switch recovery, and owner verification. Supports SIWS (Sign-In with Solana) and SIWE (Sign-In with Ethereum) signature schemes.

All three headers are required; a request missing any of them is rejected with `INVALID_SIGNATURE`. The signed message must also name the id being authorised, so one signature cannot be reused to approve a different transaction (`security.owner_message_binding`).

```bash
curl -X POST http://127.0.0.1:3100/v1/transactions/<tx-id>/approve \
  -H "X-Owner-Signature: <ed25519-or-secp256k1-signature>" \
  -H "X-Owner-Message: Approve <tx-id>" \
  -H "X-Owner-Address: <owner-address>"
```

## OpenAPI Specification

The daemon serves a complete OpenAPI 3.0 JSON specification at runtime:

| Endpoint | Description |
|----------|-------------|
| `GET /doc` | OpenAPI 3.0 JSON spec |
| `GET /reference` | Scalar API reference UI |

```bash
# Download the spec
curl http://127.0.0.1:3100/doc -o openapi.json

# View interactive documentation
open http://127.0.0.1:3100/reference
```

The spec includes all request/response schemas, parameter definitions, and example payloads. All route definitions use `@hono/zod-openapi` decorators, which means the OpenAPI spec is always in sync with the actual implementation.

## Endpoint Summary

### System (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check (version, uptime, schema version) |
| GET | `/doc` | None | OpenAPI 3.0 JSON specification |
| GET | `/reference` | None | Scalar API reference UI |
| GET | `/v1/nonce` | None | Get ownerAuth nonce for signature construction |
| GET | `/v1/skills/{name}` | None | Get API skill file content |

### Wallets (masterAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/wallets` | masterAuth | Create a new wallet |
| GET | `/v1/wallets` | masterAuth | List all wallets |
| GET | `/v1/wallets/{id}` | masterAuth | Get wallet details (incl. ownerState) |
| PUT | `/v1/wallets/{id}` | masterAuth | Update wallet name |
| DELETE | `/v1/wallets/{id}` | masterAuth | Terminate wallet (cascading cleanup) |
| PUT | `/v1/wallets/{id}/owner` | masterAuth | Set/change owner address |
| POST | `/v1/wallets/{id}/owner/verify` | ownerAuth | Verify owner (GRACE -> LOCKED) |
| PUT | `/v1/wallets/{id}/default-network` | masterAuth | Update wallet default network |
| GET | `/v1/wallets/{id}/networks` | masterAuth | List available networks |
| POST | `/v1/wallets/{id}/withdraw` | ownerAuth | Withdraw all assets to owner address |

### Wallet (sessionAuth -- Session-Scoped)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/wallet/address` | sessionAuth | Get wallet address |
| GET | `/v1/wallet/balance` | sessionAuth | Get wallet balance (with display currency) |
| GET | `/v1/wallet/assets` | sessionAuth | Get all assets (native + tokens) |
| PUT | `/v1/wallet/default-network` | sessionAuth | Change default network |

### Sessions (masterAuth / sessionAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/sessions` | masterAuth | Create session + JWT issuance |
| GET | `/v1/sessions` | masterAuth | List active sessions |
| DELETE | `/v1/sessions/{id}` | masterAuth | Revoke a session |
| PUT | `/v1/sessions/{id}/renew` | sessionAuth | Renew session token (5 safety checks) |

### Transactions (sessionAuth / ownerAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/transactions/send` | sessionAuth | Send transaction (6-stage pipeline) |
| POST | `/v1/transactions/sign` | sessionAuth | Sign external unsigned transaction |
| GET | `/v1/transactions` | sessionAuth | List transactions (cursor pagination) |
| GET | `/v1/transactions/pending` | sessionAuth | List pending/queued transactions |
| GET | `/v1/transactions/{id}` | sessionAuth | Get transaction details |
| POST | `/v1/transactions/{id}/approve` | ownerAuth | Approve pending transaction |
| POST | `/v1/transactions/{id}/reject` | ownerAuth | Reject pending transaction |
| POST | `/v1/transactions/{id}/cancel` | sessionAuth | Cancel delayed transaction |

**Transaction Types** (discriminatedUnion by `type` field):

| Type | Description |
|------|-------------|
| `TRANSFER` | Native token transfer (SOL, ETH) |
| `TOKEN_TRANSFER` | SPL / ERC-20 token transfer |
| `CONTRACT_CALL` | Arbitrary smart contract call |
| `APPROVE` | Token approval (allowance) |
| `BATCH` | Multiple instructions in one transaction |

### Policies (masterAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/policies` | masterAuth | Create a new policy |
| GET | `/v1/policies` | masterAuth | List policies (optional walletId filter) |
| PUT | `/v1/policies/{id}` | masterAuth | Update a policy |
| DELETE | `/v1/policies/{id}` | masterAuth | Delete a policy |

**Policy Types:** SPENDING_LIMIT, WHITELIST, ALLOWED_TOKENS, CONTRACT_WHITELIST, APPROVED_SPENDERS, RATE_LIMIT, TIME_WINDOW, GAS_LIMIT, AUTOSTOP, X402_ALLOWED_DOMAINS, CUMULATIVE_SPENDING_LIMIT, DISPLAY_CURRENCY.

### Tokens (masterAuth / sessionAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/tokens` | sessionAuth | List tokens for a network |
| POST | `/v1/tokens` | masterAuth | Add custom token to registry |
| DELETE | `/v1/tokens` | masterAuth | Remove custom token from registry |

### Actions (sessionAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/actions/providers` | sessionAuth | List action providers and their actions |
| POST | `/v1/actions/{provider}/{action}` | sessionAuth | Execute an action (DeFi protocol) |

### x402 Payments (sessionAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/x402/fetch` | sessionAuth | Fetch URL with x402 auto-payment |

### WalletConnect (masterAuth / sessionAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/wallets/{id}/wc/pair` | masterAuth | Create WC pairing + QR code |
| GET | `/v1/wallets/{id}/wc/session` | masterAuth | Get WC session info |
| DELETE | `/v1/wallets/{id}/wc/session` | masterAuth | Disconnect WC session |
| GET | `/v1/wallets/{id}/wc/pair/status` | masterAuth | Poll pairing progress |
| POST | `/v1/wallet/wc/pair` | sessionAuth | Create WC pairing (session-scoped) |
| GET | `/v1/wallet/wc/session` | sessionAuth | Get WC session info (session-scoped) |
| DELETE | `/v1/wallet/wc/session` | sessionAuth | Disconnect WC session (session-scoped) |
| GET | `/v1/wallet/wc/pair/status` | sessionAuth | Poll pairing status (session-scoped) |

### MCP Token Provisioning (masterAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/mcp/tokens` | masterAuth | Create MCP session token + config snippet |

### Admin (masterAuth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/admin/status` | masterAuth | Daemon health/uptime/version |
| POST | `/v1/admin/kill-switch` | masterAuth | Activate kill switch |
| GET | `/v1/admin/kill-switch` | None | Get kill switch state |
| POST | `/v1/admin/recover` | masterAuth | Deactivate kill switch (dual-auth) |
| POST | `/v1/admin/shutdown` | masterAuth | Graceful daemon shutdown |
| POST | `/v1/admin/rotate-secret` | masterAuth | Rotate JWT secret |
| GET | `/v1/admin/notifications/status` | masterAuth | Notification channel status |
| POST | `/v1/admin/notifications/test` | masterAuth | Send test notification |
| GET | `/v1/admin/notifications/log` | masterAuth | Query notification logs |
| GET | `/v1/admin/settings` | masterAuth | Get all runtime settings |
| PUT | `/v1/admin/settings` | masterAuth | Update runtime settings |
| POST | `/v1/admin/settings/test-rpc` | masterAuth | Test RPC connectivity |
| GET | `/v1/admin/oracle-status` | masterAuth | Oracle cache/validation status |
| GET | `/v1/admin/api-keys` | masterAuth | List Action Provider API key status |
| PUT | `/v1/admin/api-keys/{provider}` | masterAuth | Set/update API key |
| DELETE | `/v1/admin/api-keys/{provider}` | masterAuth | Delete API key |
| GET | `/v1/admin/forex/rates` | masterAuth | Forex exchange rates |
| GET | `/v1/admin/telegram-users` | masterAuth | List Telegram bot users |
| PUT | `/v1/admin/telegram-users/{chatId}` | masterAuth | Update Telegram user role |
| DELETE | `/v1/admin/telegram-users/{chatId}` | masterAuth | Delete Telegram user |

## Error Codes

All errors follow a consistent JSON format:

```json
{
  "error": {
    "code": "WALLET_NOT_FOUND",
    "message": "Wallet 'abc-123' not found",
    "domain": "WALLET",
    "retryable": false
  }
}
```

### Common Error Codes

| Code | HTTP | Domain | Description |
|------|------|--------|-------------|
| `INVALID_MASTER_PASSWORD` | 401 | AUTH | Invalid master password |
| `INVALID_TOKEN` | 401 | AUTH | Invalid authentication token |
| `TOKEN_EXPIRED` | 401 | AUTH | Authentication token has expired |
| `INVALID_SIGNATURE` | 401 | AUTH | Invalid cryptographic signature |
| `SYSTEM_LOCKED` | 503 | AUTH | System is locked (kill switch) |
| `WALLET_NOT_FOUND` | 404 | WALLET | Wallet not found |
| `WALLET_TERMINATED` | 410 | WALLET | Wallet has been terminated |
| `SESSION_NOT_FOUND` | 404 | SESSION | Session not found |
| `SESSION_LIMIT_EXCEEDED` | 403 | SESSION | Maximum session limit exceeded |
| `TX_NOT_FOUND` | 404 | TX | Transaction not found |
| `INSUFFICIENT_BALANCE` | 400 | TX | Insufficient balance |
| `CHAIN_ERROR` | 502 | TX | Blockchain RPC error (retryable) |
| `SIMULATION_FAILED` | 422 | TX | Transaction simulation failed |
| `POLICY_DENIED` | 403 | POLICY | Transaction denied by policy |
| `POLICY_NOT_FOUND` | 404 | POLICY | Policy not found |
| `WHITELIST_DENIED` | 403 | POLICY | Address not in whitelist |
| `RATE_LIMIT_EXCEEDED` | 429 | POLICY | Rate limit exceeded (retryable) |
| `KILL_SWITCH_ACTIVE` | 409 | SYSTEM | Kill switch is active |
| `ACTION_NOT_FOUND` | 404 | ACTION | Action provider/action not found |
| `API_KEY_REQUIRED` | 403 | ACTION | API key required for provider |

The daemon defines 83 error codes across 11 domains (AUTH, SESSION, TX, POLICY, OWNER, SYSTEM, WALLET, WITHDRAW, ACTION, ADMIN, X402). For the complete list, consult the OpenAPI specification at `GET /doc`.

## SDKs

### TypeScript SDK

```bash
npm install @waiaas/sdk
```

Zero external dependencies. Provides typed methods for all session-scoped endpoints.

```typescript
import { WAIaaSClient } from '@waiaas/sdk';

const client = new WAIaaSClient({
  baseUrl: 'http://127.0.0.1:3100',
  sessionToken: 'wai_sess_...',
});

const balance = await client.getBalance();
const tx = await client.sendToken({ to: '...', amount: '0.5' });
```

See: [@waiaas/sdk on npm](https://www.npmjs.com/package/@waiaas/sdk)

### Python SDK

```bash
pip install waiaas
```

Built on httpx + Pydantic v2 with async/await support.

```python
from waiaas import WAIaaSClient

async with WAIaaSClient("http://127.0.0.1:3100", "wai_sess_...") as client:
    balance = await client.get_balance()
    tx = await client.send_token("recipient...", "0.5")
```

See: [python-sdk/README.md](../python-sdk/README.md)

### MCP (Model Context Protocol)

The MCP server exposes WAIaaS as tools for AI agents (Claude, etc.):

```bash
waiaas mcp setup  # Automatic Claude Desktop configuration
```

**Tools:** `send_token`, `get_balance`, `get_address`, `list_transactions`, `get_transaction`, `get_nonce`, plus dynamic Action Provider tools.

**Resources:** `waiaas://wallet/balance`, `waiaas://wallet/address`, `waiaas://system/status`.

See: [@waiaas/mcp on npm](https://www.npmjs.com/package/@waiaas/mcp)

## Related

- [Architecture](/docs/architecture/) - System architecture and pipeline overview
- [Agent Self-Setup Guide](/blog/agent-self-setup/) - Using the API for automated setup
- [Agent Skills Integration Guide](/blog/agent-skills-integration/) - Teaching agents to use the API via skills
