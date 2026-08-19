---
name: "WAIaaS Transactions"
description: "All 6 transaction types (TRANSFER, TOKEN_TRANSFER, CONTRACT_CALL, APPROVE, BATCH, NFT_TRANSFER) with lifecycle management"
category: "api"
tags: [wallet, blockchain, solana, ethereum, ripple, xrp, xrpl, transactions, waiass]
version: "2.6.0-rc"
dispatch:
  kind: "tool"
  allowedCommands: ["curl"]
---

# WAIaaS Transactions

Complete reference for all 6 transaction types, lifecycle management, and policy interaction. All endpoints use base URL `http://localhost:3100`. Transaction endpoints require **sessionAuth** (`Authorization: Bearer <token>`) unless noted otherwise.

> AI agents must NEVER request the master password. Use only your session token.

## Permissions

### Agent (sessionAuth)
- Send all 6 transaction types via `POST /v1/transactions/send`
- Sign raw transactions via `POST /v1/transactions/sign`
- Query transaction status and history
- Renew session tokens

### Owner (ownerAuth -- SIWS/SIWE)
- Approve pending transactions via `POST /v1/transactions/{id}/approve`
- Reject pending transactions via `POST /v1/transactions/{id}/reject`

**Prerequisite:** Policy types (ALLOWED_TOKENS, CONTRACT_WHITELIST, APPROVED_SPENDERS) must be configured by admin before agents can use TOKEN_TRANSFER, CONTRACT_CALL, and APPROVE transaction types.

## 1. Overview

WAIaaS uses a **discriminatedUnion 6-type** system for transactions. The `type` field in the request body determines which transaction variant to execute:

| Type | Description | Policy Prerequisite |
|------|-------------|---------------------|
| `TRANSFER` | Native token transfer (SOL/ETH) | None required |
| `TOKEN_TRANSFER` | SPL/ERC-20 token transfer | ALLOWED_TOKENS policy |
| `CONTRACT_CALL` | Arbitrary contract invocation | CONTRACT_WHITELIST policy |
| `APPROVE` | Token spending approval | APPROVED_SPENDERS policy |
| `BATCH` | Multiple instructions (Solana only) | Depends on instruction types |
| `NFT_TRANSFER` | ERC-721/ERC-1155/Metaplex NFT transfer | None (CONTRACT_WHITELIST optional) |
| `X402_PAYMENT` | x402 auto-payment (USDC) | X402_ALLOWED_DOMAINS policy |

All transaction types use `POST /v1/transactions/send` with the appropriate `type` field.

All transaction types accept a `network` parameter to specify the target network for the transaction. Required for EVM wallets; auto-resolved for Solana wallets. Must be valid for the wallet's environment.

## Amount Units

All `amount` fields in transaction requests use **smallest-unit** values (wei for ETH, lamports for SOL). Alternatively, use `humanAmount` for **human-readable** values -- the server converts using token decimals.

### Preferred: humanAmount (human-readable)

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TRANSFER",
    "to": "0xRecipient...",
    "humanAmount": "1.5"
  }'
```

This sends **1.5 ETH**. The server converts to `1500000000000000000` wei automatically.

For TOKEN_TRANSFER, the server uses the token's `decimals` to convert:

```json
{
  "type": "TOKEN_TRANSFER",
  "to": "0xRecipient...",
  "humanAmount": "100",
  "token": { "address": "0xUSDC...", "decimals": 6, "symbol": "USDC" }
}
```

### Alternative: amount (smallest unit)

```json
{
  "type": "TRANSFER",
  "to": "0xRecipient...",
  "amount": "1500000000000000000"
}
```

This is the same 1.5 ETH, specified in wei.

### XOR Rule

`amount` and `humanAmount` are **mutually exclusive**. Providing both returns a 400 error.

| Field | Format | Example (1.5 ETH) |
|-------|--------|-------------------|
| `amount` | Smallest unit digit string | `"1500000000000000000"` |
| `humanAmount` | Human-readable decimal string | `"1.5"` |

### CLOB Exception

Hyperliquid, Drift, and Polymarket use exchange-native units (not smallest units). `humanAmount` is not supported for these providers -- use `amount` with the exchange-native value.

## 2. Type 1: TRANSFER (Native SOL/ETH)

Transfer native tokens to a recipient address. No policy prerequisite -- subject to SPENDING_LIMIT if configured. DCent Exchange uses TRANSFER to send funds to the exchange service's payInAddress for cross-chain swaps.

### Request

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TRANSFER",
    "to": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
    "amount": "100000000",
    "memo": "payment for service"
  }'
```

Parameters:
- `type` (required): `"TRANSFER"`
- `to` (required): recipient address (base58 for Solana, 0x-hex for EVM)
- `amount` (required): string of digits in smallest unit (lamports for SOL, wei for ETH)
- `memo` (optional): string, max 256 characters
- `network`: target network for this transaction. Required for EVM wallets; auto-resolved for Solana. Must be valid for the wallet's environment.

### Response (201)

```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "status": "PENDING"
}
```

### Amount Conversion

| Chain | Unit | Example |
|-------|------|---------|
| Solana | lamports (10^-9 SOL) | `"1000000000"` = 1 SOL |
| Ethereum | wei (10^-18 ETH) | `"1000000000000000000"` = 1 ETH |

## 3. Type 2: TOKEN_TRANSFER (SPL/ERC-20)

Transfer SPL tokens (Solana) or ERC-20 tokens (Ethereum) to a recipient.

### Prerequisite

The token must be whitelisted via an **ALLOWED_TOKENS** policy for the wallet. Without this policy, TOKEN_TRANSFER requests are denied. Policy setup is an admin task -- see docs/admin-manual/policy-management.md.

### Request

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TOKEN_TRANSFER",
    "to": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
    "amount": "5000000",
    "token": {
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "decimals": 6,
      "symbol": "USDC"
    },
    "memo": "USDC payment"
  }'
```

Parameters:
- `type` (required): `"TOKEN_TRANSFER"`
- `to` (required): recipient address
- `amount` (required): string of digits in token's smallest unit (based on `token.decimals`)
- `token` (required): token metadata object
  - `address` (required): mint address (SPL) or contract address (ERC-20)
  - `decimals` (required): integer, 0-18
  - `symbol` (required): string, 1-10 characters
  - `assetId` (recommended): CAIP-19 asset identifier (e.g., `"eip155:1/erc20:0xa0b8..."`). When provided alone (without address/decimals/symbol), the daemon auto-resolves from the token registry.
- `memo` (optional): string, max 256 characters
- `network`: target network (e.g., `"ethereum-mainnet"` or CAIP-2 `"eip155:1"`). Required for EVM wallets; auto-resolved for Solana. Auto-inferred from `assetId` when omitted. Must be valid for the wallet's environment.

## 4. Type 3: CONTRACT_CALL (Arbitrary Contract)

Invoke an arbitrary smart contract. Supports both EVM and Solana program calls.

### Prerequisite

The contract address must be whitelisted via a **CONTRACT_WHITELIST** policy. Default-deny: without this policy, all CONTRACT_CALL requests are rejected. Policy setup is an admin task -- see docs/admin-manual/policy-management.md.

### EVM Contract Call

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "CONTRACT_CALL",
    "to": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "calldata": "0x095ea7b3000000000000000000000000spenderaddress0000000000000000000000000000000000000000000000000000000000000001",
    "abi": [{"name": "approve", "type": "function", "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "outputs": [{"name": "", "type": "bool"}]}],
    "value": "0"
  }'
```

EVM-specific parameters:
- `type` (required): `"CONTRACT_CALL"`
- `to` (required): contract address (0x-hex)
- `calldata` (optional): hex-encoded calldata (e.g., `"0x095ea7b3..."`)
- `abi` (optional): JSON ABI fragment array for the function being called
- `value` (optional): native token value to send with call, string of digits in wei
- `network`: target network for this transaction. Required for EVM wallets; auto-resolved for Solana. Must be valid for the wallet's environment.

### Solana Program Call

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "CONTRACT_CALL",
    "to": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "instructionData": "base64encodeddata==",
    "accounts": [
      {"pubkey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", "isSigner": true, "isWritable": true},
      {"pubkey": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde", "isSigner": false, "isWritable": true}
    ]
  }'
```

Solana-specific parameters:
- `programId` (optional): program address
- `instructionData` (optional): base64-encoded instruction data
- `accounts` (optional): array of account metas
  - `pubkey`: account public key
  - `isSigner`: boolean
  - `isWritable`: boolean
- `network`: target network for this transaction. Required for EVM wallets; auto-resolved for Solana. Must be valid for the wallet's environment.

## 5. Type 4: APPROVE (Token Spending Approval)

Approve a spender address to spend tokens on behalf of the wallet. ERC-20 `approve()` on EVM, SPL `delegate` on Solana.

### Prerequisite

The spender must be whitelisted via an **APPROVED_SPENDERS** policy. Policy setup is an admin task -- see docs/admin-manual/policy-management.md.

### Request

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "APPROVE",
    "spender": "0xDEFiRouterAddress",
    "token": {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "decimals": 6,
      "symbol": "USDC"
    },
    "amount": "1000000000"
  }'
```

Parameters:
- `type` (required): `"APPROVE"`
- `spender` (required): address allowed to spend tokens
- `token` (required): token metadata object
  - `address` (required): token contract/mint address
  - `decimals` (required): integer, 0-18
  - `symbol` (required): string, 1-10 characters
  - `assetId` (recommended): CAIP-19 asset identifier. When provided alone (without address/decimals/symbol), the daemon auto-resolves from the token registry.
- `amount` (required): string of digits, max approval amount in token's smallest unit
- `network`: target network (e.g., `"ethereum-mainnet"` or CAIP-2 `"eip155:1"`). Required for EVM wallets; auto-resolved for Solana. Auto-inferred from `assetId` when omitted. Must be valid for the wallet's environment.

## 6. Type 5: BATCH (Multiple Instructions)

Execute multiple instructions in a single transaction. **Solana only** -- EVM returns `BATCH_NOT_SUPPORTED` error. DCent DEX Swap uses BATCH with approve + swap txdata for ERC-20 sell orders (resolved internally by the action provider, not user-facing BATCH).

### Request

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "BATCH",
    "instructions": [
      {
        "to": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
        "amount": "50000000"
      },
      {
        "to": "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
        "amount": "25000000"
      }
    ]
  }'
```

Parameters:
- `type` (required): `"BATCH"`
- `instructions` (required): array of 2-20 instruction objects. Each instruction follows the schema of TRANSFER, TOKEN_TRANSFER, CONTRACT_CALL, or APPROVE (without the `type` field)
- `network`: target network for this transaction. Required for EVM wallets; auto-resolved for Solana. Must be valid for the wallet's environment.

Batch instruction examples:

**Native transfers:**
```json
{"to": "address1", "amount": "1000000"}
```

**Token transfers:**
```json
{"to": "address2", "amount": "500000", "token": {"address": "mint", "decimals": 6, "symbol": "USDC"}}
```

**Contract calls:**
```json
{"to": "programId", "programId": "...", "instructionData": "...", "accounts": [...]}
```

Constraints:
- Minimum 2 instructions, maximum 20 instructions
- Solana only -- EVM wallets return error `BATCH_NOT_SUPPORTED`
- Each instruction is subject to its own policy checks

## 6.5. Type 6: NFT_TRANSFER (ERC-721/ERC-1155/Metaplex)

Transfer an NFT to a recipient address. Supports ERC-721 and ERC-1155 on EVM chains, and Metaplex on Solana. Default tier: **APPROVAL** (owner must approve unless tier overridden via settings).

### Request

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "NFT_TRANSFER",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    "token": {
      "address": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      "tokenId": "42",
      "standard": "erc721"
    },
    "network": "ethereum-mainnet"
  }'
```

Parameters:
- `type` (required): `"NFT_TRANSFER"`
- `to` (required): recipient address
- `token` (required): NFT token info
  - `address` (required): contract address (EVM) or mint address (Solana)
  - `tokenId` (required): token ID within the contract. Use `"0"` for Solana Metaplex.
  - `standard` (required): `"erc721"`, `"erc1155"`, or `"metaplex"`
- `network` (required): target network
- `amount` (optional): amount to transfer (default: `"1"`). Relevant for ERC-1155 multi-copy NFTs.
- `walletId` (optional): target wallet ID for multi-wallet sessions

### Policies

- **RATE_LIMIT**: `nft_count` counter limits NFT transfers per period
- **CONTRACT_WHITELIST**: NFT contract must be whitelisted when policy is configured

### APPROVE Type Extension for NFTs

The APPROVE transaction type supports an optional `nft` field for NFT-specific approvals:

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "APPROVE",
    "to": "0xMarketplaceAddress",
    "token": { "address": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" },
    "nft": { "tokenId": "42", "standard": "erc721" },
    "network": "ethereum-mainnet",
    "amount": "0"
  }'
```

- `amount: "0"` triggers single NFT approve (`approve(spender, tokenId)`)
- `amount != "0"` triggers collection-wide approve (`setApprovalForAll` for ERC-721/1155, `delegate` for Solana)

For full NFT documentation including query, metadata, and MCP/SDK methods, see **nft.skill.md**.

## 7. Transaction Lifecycle

### Status Flow

```
PENDING -> QUEUED -> CONFIRMED
                  -> FAILED
       -> CANCELLED
```

| Status | Description |
|--------|-------------|
| `PENDING` | Submitted, awaiting pipeline processing |
| `QUEUED` | Passed validation and policy, waiting for execution or delay/approval |
| `CONFIRMED` | Successfully confirmed on-chain |
| `FAILED` | Execution or confirmation failed |
| `CANCELLED` | Cancelled by wallet session or rejected by owner |

### X402_PAYMENT Lifecycle

x402 payments follow a simplified lifecycle:

```
PENDING -> CONFIRMED  (payment accepted by resource server)
        -> FAILED     (payment rejected or server error)
        -> CANCELLED  (policy denied before payment)
```

x402 payments are synchronous -- the API call blocks until the payment flow completes. There is no QUEUED state. DELAY tier waits within the HTTP request timeout; APPROVAL tier is immediately rejected.

### Tier Flow (Policy-Based)

The policy engine assigns a tier to each transaction based on configured policies:

| Tier | Behavior |
|------|----------|
| `INSTANT` | Execute immediately, no waiting |
| `NOTIFY` | Execute immediately, send notification to owner |
| `DELAY` | Hold for configurable cooldown period before execution |
| `APPROVAL` | Require explicit owner approval before execution |

### Transaction Query Endpoints

#### GET /v1/transactions/{id} -- Get Transaction Detail (sessionAuth)

```bash
curl -s http://localhost:3100/v1/transactions/01958f3c-9999-7000-8000-abcdef999999 \
  -H 'Authorization: Bearer wai_sess_eyJ...'
```

Response (200):
```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "walletId": "01958f3a-1234-7000-8000-abcdef123456",
  "type": "TRANSFER",
  "status": "CONFIRMED",
  "tier": "INSTANT",
  "chain": "solana",
  "network": "solana-devnet",
  "toAddress": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
  "amount": "100000000",
  "txHash": "5UfDaGz1ycBqAbW2RuVmuT8JcpBBbP2BdAfSLKXjzRYc",
  "error": null,
  "createdAt": 1707000001
}
```

#### GET /v1/transactions -- List Transactions (sessionAuth)

Cursor-based pagination for the wallet's transactions.

```bash
curl -s 'http://localhost:3100/v1/transactions?limit=20' \
  -H 'Authorization: Bearer wai_sess_eyJ...'
```

Query parameters:
- `limit` (optional): 1-100 (default: 20)
- `cursor` (optional): UUID for pagination (from previous response's `cursor` field)

Response (200):
```json
{
  "items": [
    {
      "id": "01958f3c-9999-7000-8000-abcdef999999",
      "walletId": "01958f3a-1234-7000-8000-abcdef123456",
      "type": "TRANSFER",
      "status": "CONFIRMED",
      "tier": "INSTANT",
      "chain": "solana",
      "network": "solana-devnet",
      "toAddress": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
      "amount": "100000000",
      "txHash": "5UfDaGz1ycBqAbW2RuVmuT8JcpBBbP2BdAfSLKXjzRYc",
      "error": null,
      "createdAt": 1707000001
    }
  ],
  "cursor": null,
  "hasMore": false
}
```

#### GET /v1/transactions/pending -- List Pending Transactions (sessionAuth)

Returns only PENDING and QUEUED transactions for the wallet.

```bash
curl -s http://localhost:3100/v1/transactions/pending \
  -H 'Authorization: Bearer wai_sess_eyJ...'
```

Response (200):
```json
{
  "items": []
}
```

### Transaction Action Endpoints

#### POST /v1/transactions/{id}/cancel -- Cancel Transaction (sessionAuth)

Cancel a delayed or pending transaction. Only works for transactions in QUEUED status with DELAY tier.

```bash
curl -s -X POST http://localhost:3100/v1/transactions/01958f3c-9999-7000-8000-abcdef999999/cancel \
  -H 'Authorization: Bearer wai_sess_eyJ...'
```

Response (200):
```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "status": "CANCELLED"
}
```

#### POST /v1/transactions/{id}/approve -- Approve Transaction (ownerAuth)

Owner approves a pending-approval transaction. Requires **ownerAuth**: the owner signs the approval prompt and sends the signature, the prompt, and the owner address together.

| Header | Required | Value |
|---|---|---|
| `X-Owner-Signature` | yes | Solana: base64 Ed25519 detached signature. EVM: `0x`-prefixed hex |
| `X-Owner-Message` | yes | The exact text that was signed |
| `X-Owner-Address` | yes | Must match the wallet's registered owner |
| `X-Owner-Message-Encoding` | no | `base64` or `utf8`. Omit for `utf8` |

**The signed message must contain an `action:id` token.** ownerAuth otherwise only proves the owner signed something, not that they agreed to *this*: one captured signature would approve every later pending approval on the wallet, and because `/approve` and `/reject` share the same id, a signature made to refuse a transaction could be replayed to approve it.

| Endpoint | Required token |
|---|---|
| `POST /v1/transactions/{id}/approve` | `approve:{id}` |
| `POST /v1/transactions/{id}/reject` | `reject:{id}` |
| `POST /v1/wallets/{id}/owner/verify` | `verify:{id}` |

The token can sit anywhere in the message, so the prompt a person reads can be in any language and the token rides along with it. Matching is case-insensitive. A message without the token is rejected with `INVALID_SIGNATURE`, and the error names the exact token expected. For SIWE the token goes in the `statement` field. Operators can turn this off with `security.owner_message_binding=false` to accept unbound signatures from older clients.

`X-Owner-Message-Encoding: base64` lets the signed prompt contain non-ASCII text and line breaks, which a raw header value cannot carry. Use it whenever the prompt is something a person reads in their wallet popup. EVM/SIWE messages are always base64 regardless of this header, since they are multi-line by definition.

```bash
# ASCII prompt (encoding header omitted)
curl -s -X POST http://localhost:3100/v1/transactions/01958f3c-9999-7000-8000-abcdef999999/approve \
  -H 'X-Owner-Signature: <base64-ed25519-signature>' \
  -H 'X-Owner-Message: approve:01958f3c-9999-7000-8000-abcdef999999 -- 5 USDC' \
  -H 'X-Owner-Address: <owner-address>'

# Human-readable prompt with non-ASCII text or newlines
curl -s -X POST http://localhost:3100/v1/transactions/01958f3c-9999-7000-8000-abcdef999999/approve \
  -H 'X-Owner-Signature: <base64-ed25519-signature>' \
  -H "X-Owner-Message: $(printf '금액: 5 USDC\napprove:01958f3c-9999-7000-8000-abcdef999999' | base64 | tr -d '\n')" \
  -H 'X-Owner-Message-Encoding: base64' \
  -H 'X-Owner-Address: <owner-address>'
```

The signature must be made over the **decoded** bytes, not the base64 string.

`| tr -d '\n'` is not optional. GNU coreutils `base64` wraps at 76 columns and `$(...)` strips only trailing newlines, so any prompt over 57 bytes ends up with a line break inside the header value and the request is rejected before it reaches the daemon. macOS/BSD `base64` does not wrap, which is why this only shows up on Linux. (`base64 -w0` does the same job but is GNU-only.)

Response (200):
```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "status": "EXECUTING",
  "approvedAt": 1707000100
}
```

#### POST /v1/transactions/{id}/reject -- Reject Transaction (ownerAuth)

Owner rejects a pending-approval transaction. Requires **ownerAuth**.

```bash
curl -s -X POST http://localhost:3100/v1/transactions/01958f3c-9999-7000-8000-abcdef999999/reject \
  -H 'X-Owner-Signature: <base64-ed25519-signature>' \
  -H 'X-Owner-Message: reject:01958f3c-9999-7000-8000-abcdef999999' \
  -H 'X-Owner-Address: <owner-address>'
```

Same headers as approve, including the optional `X-Owner-Message-Encoding: base64`.

Response (200):
```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "status": "CANCELLED",
  "rejectedAt": 1707000100
}
```

## 8. Policy Interaction

Policies control what transactions are allowed and how they are processed. Key policy types affecting transactions:

| Policy Type | Affects | Behavior |
|-------------|---------|----------|
| `SPENDING_LIMIT` | TRANSFER, TOKEN_TRANSFER | Max spend per period (daily/weekly/monthly) |
| `WHITELIST` | All types | Allowed recipient addresses |
| `RATE_LIMIT` | All types | Max transactions per period |
| `TIME_RESTRICTION` | All types | Allowed time windows |
| `ALLOWED_TOKENS` | TOKEN_TRANSFER | Required: whitelist token mints/contracts |
| `CONTRACT_WHITELIST` | CONTRACT_CALL | Required: whitelist contract addresses |
| `METHOD_WHITELIST` | CONTRACT_CALL | Whitelist specific contract methods |
| `APPROVED_SPENDERS` | APPROVE | Required: whitelist spender addresses |
| `APPROVE_AMOUNT_LIMIT` | APPROVE | Max approval amount |
| `APPROVE_TIER_OVERRIDE` | APPROVE | Override tier for approvals |
| `ALLOWED_NETWORKS` | All types | Restrict which networks a wallet can use |

**Default-deny principle**: ALLOWED_TOKENS, CONTRACT_WHITELIST, and APPROVED_SPENDERS must be explicitly configured. Without them, the corresponding transaction types are rejected.

### Tier Assignment

Policies can assign transaction tiers that determine the execution flow:
- No special policy -> `INSTANT` (execute immediately)
- SPENDING_LIMIT exceeded -> `DELAY` (cooldown) or `APPROVAL` (owner must approve)
- Large amounts -> `NOTIFY` (execute + alert owner)

## 9. Error Reference

| Code | HTTP | Description | Recovery |
|------|------|-------------|----------|
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds in wallet | Fund the wallet with more tokens |
| `POLICY_VIOLATION` | 403 | Transaction blocked by policy | Check policies with GET /v1/policies, adjust or remove blocking policy |
| `CHAIN_ERROR` | 502 | Blockchain RPC failure | Retry after a short delay; check RPC endpoint health |
| `TX_NOT_FOUND` | 404 | Transaction ID does not exist | Verify the transaction ID |
| `ACTION_VALIDATION_FAILED` | 400 | Request body validation failed | Check required fields and types |
| `WALLET_NOT_FOUND` | 404 | Wallet ID does not exist | Verify wallet exists with GET /v1/wallets |
| `BATCH_NOT_SUPPORTED` | 400 | BATCH type used on EVM wallet | Use individual transactions for EVM chains |
| `CONTRACT_NOT_WHITELISTED` | 403 | Contract address not in whitelist | Add contract to CONTRACT_WHITELIST policy |
| `TOKEN_NOT_ALLOWED` | 403 | Token not in allowed list | Add token to ALLOWED_TOKENS policy |
| `SPENDER_NOT_APPROVED` | 403 | Spender not in approved list | Add spender to APPROVED_SPENDERS policy |
| `ENVIRONMENT_NETWORK_MISMATCH` | 400 | Specified network does not belong to wallet's environment | Use a network valid for the wallet's environment |
| `ABI_ENCODING_FAILED` | 400 | Function not found in ABI, or argument type mismatch | Verify ABI fragment contains the function and arguments match expected types |
| `X402_DISABLED` | 403 | x402 payments disabled | Enable in config.toml |
| `X402_DOMAIN_NOT_ALLOWED` | 403 | Domain not in allowed list | Add to X402_ALLOWED_DOMAINS policy |
| `X402_SSRF_BLOCKED` | 403 | URL targets private network | Use public HTTPS URL |
| `X402_UNSUPPORTED_SCHEME` | 400 | No compatible payment scheme | Server must support EIP-3009 or SPL |
| `X402_PAYMENT_REJECTED` | 402 | Payment rejected by server | Check amount and balance |
| `X402_DELAY_TIMEOUT` | 408 | Delay exceeds request timeout | Adjust timeout or limits |
| `X402_APPROVAL_REQUIRED` | 403 | Amount requires owner approval | Lower amount or adjust tiers |
| `X402_SERVER_ERROR` | 502 | Server error after payment | Retry later |

## 10. Display Currency

All transaction query endpoints accept an optional `display_currency` query parameter to convert USD amounts to a preferred fiat currency.

### Supported Endpoints

| Endpoint | Parameter | Response Fields |
|----------|-----------|-----------------|
| `GET /v1/transactions` | `?display_currency=KRW` | `items[].displayAmount`, `items[].displayCurrency` |
| `GET /v1/transactions/{id}` | `?display_currency=KRW` | `displayAmount`, `displayCurrency` |

If `display_currency` is omitted, the server's configured display currency (Admin Settings > Display Currency) is used. If the server setting is USD, no conversion is applied.

### Example

```bash
curl -s 'http://localhost:3100/v1/transactions?display_currency=KRW&limit=5' \
  -H 'Authorization: Bearer wai_sess_eyJ...'
```

Response includes converted amounts:
```json
{
  "items": [
    {
      "id": "01958f3c-9999-7000-8000-abcdef999999",
      "amount": "1000000000",
      "displayAmount": "\u2248\u20A9725,000",
      "displayCurrency": "KRW",
      "..."
    }
  ]
}
```

### MCP Tools

The following MCP tools support an optional `display_currency` parameter:
- `get_transaction` -- includes `displayAmount` in response
- `list_transactions` -- includes `displayAmount` per transaction item

## 11. Sign External Transaction (sign-only)

Sign an externally built unsigned transaction after policy evaluation. The signed transaction is returned without being submitted to the blockchain.

### POST /v1/transactions/sign

**Auth:** sessionAuth (Bearer token)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transaction | string | Yes | Unsigned transaction (base64 for Solana, 0x-hex for EVM) |
| network | string | No | Target network. Required for EVM wallets; auto-resolved for Solana. |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Transaction record ID |
| signedTransaction | string | Signed transaction bytes (same encoding as input) |
| txHash | string/null | Transaction hash (null if not computable before submission) |
| operations | array | Parsed operations from the unsigned tx |
| policyResult | object | `{ tier: string }` - policy evaluation tier |

**Operations object:**

| Field | Type | Description |
|-------|------|-------------|
| type | string | NATIVE_TRANSFER, TOKEN_TRANSFER, CONTRACT_CALL, APPROVE, UNKNOWN |
| to | string/null | Destination address |
| amount | string/null | Amount in smallest unit |
| token | string/null | Token address (for TOKEN_TRANSFER/APPROVE) |

**Example (Solana):**

```bash
curl -s -X POST http://localhost:3100/v1/transactions/sign \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "transaction": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhbG9uZQ=="
  }'
```

**Example (EVM):**

```bash
curl -s -X POST http://localhost:3100/v1/transactions/sign \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "transaction": "0x02f86c0180843b9aca00850ba43b7400825208940x...",
    "network": "polygon-mainnet"
  }'
```

**Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_TRANSACTION` | 400 | Raw transaction parsing failed |
| `WALLET_NOT_SIGNER` | 400 | Wallet is not a signer in the transaction |
| `CHAIN_ID_MISMATCH` | 400 | Transaction chain ID doesn't match network |
| `POLICY_DENIED` | 403 | Policy evaluation denied one or more operations |
| `UNSUPPORTED_TX_TYPE` | 400 | Transaction type not supported |

**SDK Usage:**
- TypeScript: `await client.signTransaction({ transaction: '...', network: 'polygon-mainnet' })`
- Python: `await client.sign_transaction('...', network='polygon-mainnet')`
- MCP tool: `sign_transaction` with `transaction` + optional `network`

**Notes:**
- DELAY/APPROVAL tier transactions are immediately rejected (incompatible with synchronous API)
- Signed results are recorded in the transactions table with type='SIGN', status='SIGNED'
- Amounts are accumulated in reserved_amount to prevent double-spending against SPENDING_LIMIT

## 11.5. Sign Message (personal_sign / EIP-712 signTypedData)

Sign a raw message or EIP-712 structured data. Returns the signature without submitting anything on-chain. EIP-712 signTypedData is EVM-only.

### POST /v1/transactions/sign-message

**Auth:** sessionAuth (Bearer token)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Conditional | Message to sign (hex 0x-prefixed or UTF-8). Required when signType is "personal". |
| signType | string | No | "personal" (default) or "typedData" |
| typedData | object | Conditional | EIP-712 typed data structure. Required when signType is "typedData". |
| network | string | No | Target network (optional) |
| walletId | string | No | Target wallet ID (auto-resolved for single wallet sessions) |

**typedData Object:**

| Field | Type | Description |
|-------|------|-------------|
| domain | object | EIP-712 domain separator (name, version, chainId, verifyingContract, salt -- all optional) |
| types | object | Struct type definitions (record of arrays of {name, type}) |
| primaryType | string | Primary type to sign |
| message | object | The structured message to sign |

**Response (200):**

```json
{
  "id": "01958f3c-9999-7000-8000-abcdef999999",
  "signature": "0x...",
  "signType": "personal"
}
```

**Example (personal_sign):**

```bash
curl -s -X POST http://localhost:3100/v1/transactions/sign-message \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "message": "Hello, World!"
  }'
```

**Example (EIP-712 signTypedData):**

```bash
curl -s -X POST http://localhost:3100/v1/transactions/sign-message \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "signType": "typedData",
    "typedData": {
      "domain": {
        "name": "MyDApp",
        "version": "1",
        "chainId": 1,
        "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
      },
      "types": {
        "Order": [
          {"name": "maker", "type": "address"},
          {"name": "amount", "type": "uint256"}
        ]
      },
      "primaryType": "Order",
      "message": {
        "maker": "0xabcdef1234567890abcdef1234567890abcdef12",
        "amount": "1000000"
      }
    }
  }'
```

**Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `ACTION_VALIDATION_FAILED` | 400 | Missing message/typedData, or signType "typedData" on Solana wallet |
| `WALLET_NOT_FOUND` | 404 | Wallet does not exist |
| `CHAIN_ERROR` | 500 | Signing failed |

**MCP Tool:** `sign_message` with parameters `message`, `sign_type`, `typed_data`, `network`, `wallet_id`

**Notes:**
- signType defaults to "personal" when omitted (backward compatible)
- EIP-712 signTypedData is EVM-only. Solana wallets return 400 error.
- No policy evaluation (message signing has no on-chain impact)
- Results are recorded in transactions table with type='SIGN', status='SIGNED'

## 12. Encode Calldata (EVM Utility)

Encode an EVM function call into hex calldata. This utility helps construct the `calldata` parameter for `CONTRACT_CALL` transactions without needing an ABI encoding library.

### POST /v1/utils/encode-calldata

**Auth:** sessionAuth (Bearer token)

**Request:**

```bash
curl -s -X POST http://localhost:3100/v1/utils/encode-calldata \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "abi": [
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
      }
    ],
    "functionName": "transfer",
    "args": ["0xRecipientAddress", "1000000"]
  }'
```

**Response (200):**

```json
{
  "calldata": "0xa9059cbb000000000000000000000000recipientaddress0000000000000000000000000000000000000000000000000000000000000f4240",
  "selector": "0xa9059cbb",
  "functionName": "transfer"
}
```

**Errors:**
- `400 ABI_ENCODING_FAILED` -- Function not found in ABI, or argument type mismatch.

**Usage with CONTRACT_CALL:**
1. Encode calldata: `POST /v1/utils/encode-calldata`
2. Send contract call: `POST /v1/transactions/send` with `type: "CONTRACT_CALL"`, `to: contractAddress`, `calldata: encodedHex`

**SDK:**
- TypeScript: `client.encodeCalldata({ abi, functionName, args })`
- Python: `await client.encode_calldata(abi, function_name, args)`

**MCP Tool:** `encode_calldata` with parameters `abi`, `functionName`, `args`

## 13. CAIP Standard Identifiers (CAIP-2 / CAIP-19)

### CAIP-2: Network Input

All `network` parameters accept CAIP-2 chain identifiers alongside plain strings:

| Plain String | CAIP-2 | Chain |
|---|---|---|
| `ethereum-mainnet` | `eip155:1` | Ethereum |
| `polygon-mainnet` | `eip155:137` | Polygon |
| `arbitrum-mainnet` | `eip155:42161` | Arbitrum |
| `base-mainnet` | `eip155:8453` | Base |
| `optimism-mainnet` | `eip155:10` | Optimism |
| `solana-mainnet` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | Solana |
| `ethereum-sepolia` | `eip155:11155111` | Sepolia |
| `solana-devnet` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | Solana Devnet |

Example: `?network=eip155:1` is equivalent to `?network=ethereum-mainnet`.

### CAIP-19: Asset Identification

WAIaaS supports [CAIP-19](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md) standard asset identifiers for cross-chain token identification. The `assetId` field can be used in token objects in TOKEN_TRANSFER and APPROVE requests.

### Format

```
{CAIP-2 chain ID}/{asset namespace}:{asset reference}
```

### Examples by Chain

| Chain | Type | assetId | Description |
|-------|------|---------|-------------|
| Ethereum | ERC-20 | `eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` | USDC on Ethereum Mainnet |
| Polygon | ERC-20 | `eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359` | USDC on Polygon |
| Solana | SPL | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | USDC on Solana Mainnet |
| Ethereum | Native | `eip155:1/slip44:60` | ETH (native) |
| Solana | Native | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501` | SOL (native) |
| Polygon | Native | `eip155:137/slip44:966` | POL (native) |

**Important:** EVM addresses in CAIP-19 must be **lowercase** (not checksummed).

### Usage in TOKEN_TRANSFER

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TOKEN_TRANSFER",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    "amount": "5000000",
    "token": {
      "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "decimals": 6,
      "symbol": "USDC",
      "assetId": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    }
  }'
```

### Usage in APPROVE

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "APPROVE",
    "spender": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    "token": {
      "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "decimals": 6,
      "symbol": "USDC",
      "assetId": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    },
    "amount": "1000000000"
  }'
```

### Cross-Validation

When both `address` and `assetId` are provided, the daemon extracts the address from the CAIP-19 URI and validates it matches `token.address` (case-insensitive for EVM). If they don't match, the request is rejected with `ACTION_VALIDATION_FAILED`.

### Backward Compatibility

`assetId` is fully optional. Existing requests without `assetId` continue to work unchanged. You can gradually adopt CAIP-19 identifiers without breaking existing integrations.

### assetId-Only Pattern (Recommended for Registered Tokens)

When a token is registered in the daemon's token registry, you can omit `address`, `decimals`, and `symbol` entirely:

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TOKEN_TRANSFER",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    "humanAmount": "100",
    "token": {
      "assetId": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    },
    "network": "eip155:1"
  }'
```

- `token.address`, `token.decimals`, `token.symbol` are auto-resolved from the token registry
- `network` can be omitted -- it is auto-inferred from the CAIP-2 prefix in `assetId`
- For unregistered tokens: provide `assetId` + `decimals` + `symbol` (address is extracted from assetId)

### Response CAIP Fields

All responses now include CAIP identifiers:
- `chainId`: CAIP-2 chain identifier (e.g., `"eip155:1"`)
- `assetId`: CAIP-19 asset identifier (e.g., `"eip155:1/erc20:0xa0b..."`)

These fields are additive -- existing `network`, `chain`, `address` fields are preserved.

## 14. Gas Conditional Execution

Defer transaction execution until gas prices drop below specified thresholds. Supported on all transaction types except SIGN (sign-only is synchronous).

### gasCondition Parameter

Add an optional `gasCondition` object to any transaction request:

| Field | Type | Description |
|-------|------|-------------|
| `maxGasPrice` | string | Max total gas price in wei (EVM: baseFee + priorityFee) |
| `maxPriorityFee` | string | Max priority fee in wei (EVM) or micro-lamports (Solana computeUnitPrice) |
| `timeout` | number | Max wait time in seconds (60-86400, default from Admin Settings) |

At least one of `maxGasPrice` or `maxPriorityFee` is required.

### Status Flow

```
PENDING -> GAS_WAITING -> PENDING -> CONFIRMED
                       -> CANCELLED (timeout)
```

When gas conditions are met, the transaction resumes from Stage 4 (execution). If the timeout expires, the transaction is cancelled with `TX_CANCELLED` notification.

### REST API Example

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TRANSFER",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    "amount": "1000000000000000000",
    "gasCondition": {
      "maxGasPrice": "20000000000",
      "maxPriorityFee": "1000000000",
      "timeout": 3600
    }
  }'
```

### MCP Tool Example

MCP tools use snake_case parameters:

```json
{
  "tool": "send_token",
  "arguments": {
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    "amount": "1000000000000000000",
    "gas_condition": {
      "max_gas_price": "20000000000",
      "max_priority_fee": "1000000000",
      "timeout": 3600
    }
  }
}
```

### TypeScript SDK Example

```typescript
await client.sendToken({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16',
  amount: '1000000000000000000',
  gasCondition: {
    maxGasPrice: '20000000000',
    maxPriorityFee: '1000000000',
    timeout: 3600,
  },
});
```

### Python SDK Example

```python
await client.send_token(
    to="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD16",
    amount="1000000000000000000",
    gas_condition={
        "maxGasPrice": "20000000000",
        "maxPriorityFee": "1000000000",
        "timeout": 3600,
    },
)
```

### Admin Settings

Gas condition behavior is configured via Admin Settings (runtime-adjustable):

| Key | Default | Description |
|-----|---------|-------------|
| `gas_condition.enabled` | `true` | Enable/disable gas conditional execution |
| `gas_condition.poll_interval_sec` | `10` | Gas price polling interval (seconds) |
| `gas_condition.default_timeout_sec` | `3600` | Default timeout when not specified |
| `gas_condition.max_timeout_sec` | `86400` | Maximum allowed timeout |
| `gas_condition.max_pending_count` | `50` | Max concurrent GAS_WAITING transactions |

### Notes

- SIGN type is not supported (sign-only pipeline is synchronous)
- Policy evaluation occurs before gas waiting -- policy violations are rejected immediately
- Nonce is assigned at execution time, not at gas-waiting entry
- GAS_WAITING transactions are visible in `GET /v1/transactions/pending`

## 15. Transaction Simulation (Dry-Run)

Simulate a transaction without executing it. Returns policy evaluation result, estimated fees, balance changes, and warnings. No side effects -- no DB writes, no signing, no submission.

### POST /v1/transactions/simulate

**Auth:** sessionAuth (Bearer token)

**Request Body:** Same as `POST /v1/transactions/send` (all 5 transaction types supported).

```bash
curl -s -X POST http://localhost:3100/v1/transactions/simulate \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TRANSFER",
    "to": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
    "amount": "100000000"
  }'
```

**Response (200):**

```json
{
  "success": true,
  "policy": {
    "tier": "INSTANT",
    "allowed": true
  },
  "fee": {
    "estimatedFee": "6000",
    "feeSymbol": "SOL",
    "feeDecimals": 9,
    "feeUsd": 0.0012
  },
  "balanceChanges": [
    {"asset": "SOL", "before": "1000000000", "after": "899994000", "delta": "-100006000"}
  ],
  "warnings": [],
  "simulation": {
    "simulated": true,
    "gasUsed": "5000"
  },
  "meta": {
    "chain": "solana",
    "network": "solana-devnet",
    "fromAddress": "7xKXtg...",
    "toAddress": "9aE476sH...",
    "simulatedAt": "2026-03-03T12:00:00.000Z"
  }
}
```

**Key Fields:**

| Field | Description |
|-------|-------------|
| `success` | `true` if transaction would succeed; `false` if policy denied |
| `policy.tier` | Assigned tier (INSTANT, NOTIFY, DELAY, APPROVAL) |
| `policy.allowed` | Whether policy allows the transaction |
| `policy.reason` | Denial reason when `allowed=false` |
| `fee.estimatedFee` | Estimated fee with 20% safety margin, in smallest unit |
| `balanceChanges` | Array of asset balance changes (before/after/delta) |
| `warnings` | Array of warning objects with code and message |

**Warning Codes:**

| Code | Description |
|------|-------------|
| `INSUFFICIENT_BALANCE` | Not enough native balance for amount |
| `INSUFFICIENT_BALANCE_WITH_FEE` | Balance insufficient when including fees |
| `INSUFFICIENT_TOKEN_BALANCE` | Not enough token balance |
| `HIGH_FEE_RATIO` | Fee exceeds 10% of transaction amount |
| `APPROVAL_REQUIRED` | Owner approval required (APPROVAL tier) |
| `DELAY_APPLIED` | Cooldown delay will be applied |
| `DOWNGRADED_NO_OWNER` | APPROVAL downgraded to DELAY (no owner registered) |
| `CUMULATIVE_LIMIT_WARNING` | Approaching cumulative spending limit |
| `ORACLE_PRICE_UNAVAILABLE` | Price oracle data not available |
| `SIMULATION_FAILED` | On-chain simulation returned an error |
| `LOW_BALANCE_AFTER_TX` | Balance will be very low after transaction |
| `NONCE_GAP_DETECTED` | Nonce gap detected (EVM) |

**Policy Denied Response (200 with success=false):**

```json
{
  "success": false,
  "policy": {
    "tier": "INSTANT",
    "allowed": false,
    "reason": "Token not in ALLOWED_TOKENS list"
  },
  "fee": null,
  "balanceChanges": [],
  "warnings": [],
  "simulation": null,
  "meta": {
    "chain": "solana",
    "network": "solana-devnet",
    "fromAddress": "7xKXtg...",
    "toAddress": "9aE476sH...",
    "simulatedAt": "2026-03-03T12:00:00.000Z"
  }
}
```

### SDK Usage

```typescript
const result = await client.simulate({
  to: '9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde',
  amount: '100000000',
});
if (result.success) {
  console.log('Tier:', result.policy.tier);
  console.log('Fee:', result.fee?.estimatedFee);
} else {
  console.log('Denied:', result.policy.reason);
}
```

### MCP Tool

`simulate_transaction` -- Simulate a transaction without executing it.

Parameters: Same as `send_token` (to, amount, type, token, calldata, abi, value, programId, instructionData, accounts, spender, instructions, network, wallet_id, gas_condition).

```json
{
  "tool": "simulate_transaction",
  "arguments": {
    "to": "9aE476sH92Vz7DMPyq5WLPkrKWivxeuTKEFKd2sZZcde",
    "amount": "100000000"
  }
}
```

### Notes

- Policy denied returns HTTP 200 with `success=false` (not an HTTP error)
- gasCondition is accepted for request compatibility but ignored by simulation
- No DB writes, no signing, no notifications, no events
- Fee includes 20% safety margin: `(estimatedGas * 120) / 100`

## 12. UserOp Build/Sign API (Smart Account)

For Smart Account wallets in **Lite mode** (no bundler provider), the UserOp API allows building and signing ERC-4337 UserOperations without requiring a bundler. The platform fills gas/paymaster fields externally and submits to a bundler of its choice.

### POST /v1/wallets/{id}/userop/build

Build an unsigned UserOperation from a standard TransactionRequest.

**Request:**
```json
{
  "request": { "type": "TRANSFER", "to": "0x...", "amount": "1000000000000000000" },
  "network": "ethereum-sepolia"
}
```

**Response:**
```json
{
  "sender": "0x...",
  "nonce": "0x0",
  "callData": "0x...",
  "factory": "0x..." ,
  "factoryData": "0x...",
  "entryPoint": "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  "buildId": "uuid"
}
```

`factory`/`factoryData` are `null` for already-deployed accounts. The platform must fill gas fields (`callGasLimit`, `verificationGasLimit`, `preVerificationGas`, `maxFeePerGas`, `maxPriorityFeePerGas`) and optional paymaster fields before signing.

### POST /v1/wallets/{id}/userop/sign

Sign a completed UserOperation (platform must fill gas and paymaster fields first).

**Request:**
```json
{
  "buildId": "uuid",
  "userOperation": {
    "sender": "0x...", "nonce": "0x0", "callData": "0x...",
    "callGasLimit": "0x...", "verificationGasLimit": "0x...",
    "preVerificationGas": "0x...", "maxFeePerGas": "0x...",
    "maxPriorityFeePerGas": "0x...", "signature": "0x"
  }
}
```

**Response:**
```json
{
  "signedUserOperation": { "sender": "0x...", "signature": "0x..." },
  "txId": "uuid"
}
```

**Error codes:**
- `EXPIRED_BUILD` (400): Build data TTL (10 min) expired
- `BUILD_NOT_FOUND` (404): Invalid buildId
- `BUILD_ALREADY_USED` (409): Build already signed
- `CALLDATA_MISMATCH` (400): callData differs from build time
- `SENDER_MISMATCH` (400): sender does not match wallet address

### MCP Tools

- `build_userop`: Build unsigned UserOp (wallet_id, type, to, amount, network, ...)
- `sign_userop`: Sign completed UserOp (wallet_id, build_id, sender, nonce, call_data, gas fields, ...)

### SDK Methods

```typescript
const build = await client.buildUserOp('wallet-id', {
  request: { type: 'TRANSFER', to: '0x...', amount: '1000000000000000000' },
  network: 'ethereum-sepolia',
});
// Platform fills gas/paymaster fields...
const signed = await client.signUserOp('wallet-id', {
  buildId: build.buildId,
  userOperation: { ...build, callGasLimit: '0x...', ... },
});
```

## Hyperliquid Perp Trading

Hyperliquid perpetual futures trading via the action provider pipeline. Requires `actions.hyperliquid_enabled=true` in Admin Settings.

> AI agents must NEVER request the master password. Use only your session token.

### Action Endpoints (through pipeline)

Actions go through the standard `/v1/actions/hyperliquid_perp/{action}` route with policy evaluation.

```bash
# Open a market long position (10x leverage, 1 ETH)
curl -X POST http://localhost:3100/v1/actions/hyperliquid_perp/hl_open_position \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"ETH","side":"LONG","size":"1","leverage":10,"order_type":"MARKET"}'

# Place a limit buy order
curl -X POST http://localhost:3100/v1/actions/hyperliquid_perp/hl_place_order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"ETH","side":"BUY","size":"0.5","price":"2000","order_type":"LIMIT","time_in_force":"GTC"}'

# Set stop-loss (trigger order)
curl -X POST http://localhost:3100/v1/actions/hyperliquid_perp/hl_place_order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"ETH","side":"SELL","size":"1","price":"1800","order_type":"STOP","trigger_price":"1810","time_in_force":"GTC","reduce_only":true}'

# Close a position
curl -X POST http://localhost:3100/v1/actions/hyperliquid_perp/hl_close_position \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"ETH"}'

# Set leverage for a market
curl -X POST http://localhost:3100/v1/actions/hyperliquid_perp/hl_set_leverage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"ETH","leverage":5,"is_cross":true}'
```

### Query Endpoints (no pipeline, direct)

```bash
# Get positions
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/positions \
  -H "Authorization: Bearer $TOKEN"

# Get open orders
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/orders \
  -H "Authorization: Bearer $TOKEN"

# Get account state (balances, margins)
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/account \
  -H "Authorization: Bearer $TOKEN"

# Get trade history
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/fills?limit=50 \
  -H "Authorization: Bearer $TOKEN"

# Get market list (no wallet needed)
curl http://localhost:3100/v1/hyperliquid/markets \
  -H "Authorization: Bearer $TOKEN"

# Get funding rates
curl http://localhost:3100/v1/hyperliquid/funding-rates?market=ETH \
  -H "Authorization: Bearer $TOKEN"
```

### MCP Tools

Action tools (7, auto-registered via provider):
- `hl_open_position`: Open a perp position (market/limit)
- `hl_close_position`: Close a perp position
- `hl_place_order`: Place an order (limit/stop/take-profit)
- `hl_cancel_order`: Cancel an open order
- `hl_set_leverage`: Set leverage for a market
- `hl_set_margin_mode`: Set margin mode (cross/isolated)
- `hl_transfer_usdc`: Transfer USDC between spot and perp

Query tools (6, manually registered):
- `waiaas_hl_get_positions`: Get perp positions
- `waiaas_hl_get_open_orders`: Get open orders
- `waiaas_hl_get_markets`: Get market list
- `waiaas_hl_get_funding_rates`: Get funding rate history
- `waiaas_hl_get_account_state`: Get account state
- `waiaas_hl_get_trade_history`: Get trade history (fills)

### SDK Methods

```typescript
// Action methods (through pipeline)
await client.hlOpenPosition('wallet-id', { market: 'ETH', side: 'LONG', size: '1', leverage: 10 });
await client.hlClosePosition('wallet-id', { market: 'ETH' });
await client.hlPlaceOrder('wallet-id', { market: 'ETH', side: 'BUY', size: '0.5', price: '2000', order_type: 'LIMIT' });
await client.hlCancelOrder('wallet-id', { market: 'ETH', oid: 12345 });
await client.hlSetLeverage('wallet-id', { market: 'ETH', leverage: 5, is_cross: true });

// Query methods (direct)
const positions = await client.hlGetPositions('wallet-id');
const orders = await client.hlGetOpenOrders('wallet-id');
const markets = await client.hlGetMarkets();
const rates = await client.hlGetFundingRates('ETH');
const account = await client.hlGetAccountState('wallet-id');
const fills = await client.hlGetTradeHistory('wallet-id', 50);
```

## Hyperliquid Spot Trading

Hyperliquid spot market trading via the action provider pipeline. Requires `actions.hyperliquid_enabled=true` in Admin Settings.

> AI agents must NEVER request the master password. Use only your session token.

### Action Endpoints (through pipeline)

Actions go through the standard `/v1/actions/hyperliquid_spot/{action}` route with policy evaluation.

```bash
# Buy 100 HYPE at market price
curl -X POST http://localhost:3100/v1/actions/hyperliquid_spot/hl_spot_buy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"HYPE/USDC","size":"100","orderType":"MARKET"}'

# Place a limit buy order for HYPE at $24.50
curl -X POST http://localhost:3100/v1/actions/hyperliquid_spot/hl_spot_buy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"HYPE/USDC","size":"100","price":"24.5","orderType":"LIMIT","tif":"GTC"}'

# Sell 50 HYPE at market price
curl -X POST http://localhost:3100/v1/actions/hyperliquid_spot/hl_spot_sell \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"HYPE/USDC","size":"50","orderType":"MARKET"}'

# Cancel a specific spot order
curl -X POST http://localhost:3100/v1/actions/hyperliquid_spot/hl_spot_cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"HYPE/USDC","oid":12345}'

# Cancel all spot orders for a market
curl -X POST http://localhost:3100/v1/actions/hyperliquid_spot/hl_spot_cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","market":"HYPE/USDC"}'
```

### Query Endpoints (no pipeline, direct)

```bash
# Get spot token balances
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/spot/balances \
  -H "Authorization: Bearer $TOKEN"

# Get spot market list
curl http://localhost:3100/v1/hyperliquid/spot/markets \
  -H "Authorization: Bearer $TOKEN"
```

### MCP Tools

Action tools (3, auto-registered via provider):
- `hl_spot_buy`: Buy tokens on Hyperliquid spot (market/limit)
- `hl_spot_sell`: Sell tokens on Hyperliquid spot (market/limit)
- `hl_spot_cancel`: Cancel spot orders (single or all for a market)

Query tools (2, manually registered):
- `waiaas_hl_get_spot_balances`: Get spot token balances
- `waiaas_hl_get_spot_markets`: Get spot market list

### SDK Methods

```typescript
// Action methods (through pipeline)
await client.hlSpotBuy('wallet-id', { market: 'HYPE/USDC', size: '100', orderType: 'MARKET' });
await client.hlSpotSell('wallet-id', { market: 'HYPE/USDC', size: '50', orderType: 'MARKET' });
await client.hlSpotCancel('wallet-id', { market: 'HYPE/USDC', oid: 12345 });

// Query methods (direct)
const spotBalances = await client.hlGetSpotBalances('wallet-id');
const spotMarkets = await client.hlGetSpotMarkets();
```

## Hyperliquid Sub-account Management

Hyperliquid sub-account management for isolating funds per strategy. Requires `actions.hyperliquid_enabled=true` in Admin Settings.

> AI agents must NEVER request the master password. Use only your session token.

### Action Endpoints (through pipeline)

Actions go through the standard `/v1/actions/hyperliquid_sub/{action}` route with policy evaluation.

```bash
# Create a new sub-account
curl -X POST http://localhost:3100/v1/actions/hyperliquid_sub/hl_create_sub_account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","name":"Trend Following"}'

# Transfer USDC: master -> sub-account
curl -X POST http://localhost:3100/v1/actions/hyperliquid_sub/hl_sub_transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","subAccount":"0xSub...","amount":"1000","isDeposit":true}'

# Transfer USDC: sub-account -> master
curl -X POST http://localhost:3100/v1/actions/hyperliquid_sub/hl_sub_transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wallet_id":"wid","subAccount":"0xSub...","amount":"500","isDeposit":false}'
```

### Query Endpoints (no pipeline, direct)

```bash
# List sub-accounts
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/sub-accounts \
  -H "Authorization: Bearer $TOKEN"

# Get sub-account positions
curl http://localhost:3100/v1/wallets/$WID/hyperliquid/sub-accounts/0xSub.../positions \
  -H "Authorization: Bearer $TOKEN"
```

### MCP Tools

Action tools (2, auto-registered via provider):
- `hl_create_sub_account`: Create a new Hyperliquid sub-account
- `hl_sub_transfer`: Transfer USDC between master and sub-account

Query tools (2, manually registered):
- `waiaas_hl_list_sub_accounts`: List sub-accounts for a wallet
- `waiaas_hl_get_sub_positions`: Get positions for a sub-account

### SDK Methods

```typescript
// Action methods (through pipeline)
await client.hlCreateSubAccount('wallet-id', { name: 'Trend Following' });
await client.hlSubTransfer('wallet-id', { subAccount: '0xSub...', amount: '1000', isDeposit: true });

// Query methods (direct)
const subAccounts = await client.hlListSubAccounts('wallet-id');
const positions = await client.hlGetSubPositions('wallet-id', '0xSubAddress');
```

---

## Off-chain Actions (External Action Framework)

Beyond the 6-type on-chain transaction system, WAIaaS supports **off-chain actions** via the External Action framework. Off-chain actions use two additional action kinds:

| Kind | Description | Pipeline |
|------|-------------|----------|
| `signedData` | Off-chain data signing (CLOB orders, typed data) | credential -> policy -> DB -> sign -> track |
| `signedHttp` | HTTP request signing (API auth, RFC 9421) | credential -> policy -> sign -> execute -> track |

**Key points:**
- Off-chain actions use the **same endpoint**: `POST /v1/actions/:provider/:action`. The daemon automatically detects the resolved action kind and routes to the correct pipeline.
- On-chain transactions use the 6-type `discriminatedUnion` system (TRANSFER, TOKEN_TRANSFER, etc.) and go through the 6-stage pipeline.
- Off-chain actions bypass the on-chain pipeline entirely -- no gas estimation, no broadcast, no blockchain confirmation.
- Off-chain action history is queried separately: `GET /v1/wallets/:id/actions` (not `/v1/transactions`).

### Off-chain Action Query

```bash
# List off-chain actions with venue/status filter
curl -s "http://localhost:3100/v1/wallets/<wallet-id>/actions?venue=polymarket&status=FILLED" \
  -H 'Authorization: Bearer <token>'
```

For full off-chain action documentation, see **external-actions.skill.md**.

## 16. Ripple (XRPL) Transactions

### TRANSFER -- Native XRP Transfer

Send native XRP. Amount is in drops (1 XRP = 1,000,000 drops) when using `amount`, or human-readable when using `humanAmount`.

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TRANSFER",
    "to": "rDestinationAddress",
    "humanAmount": "10.5",
    "memo": "12345"
  }'
```

- `memo`: Destination Tag as numeric string (e.g., `"12345"`) or JSON (`{"destinationTag":12345}`)
- X-address format auto-decoded (e.g., `X7gJ5...` decoded to r-address + tag)

### TOKEN_TRANSFER -- Trust Line IOU Transfer

Send Trust Line (IOU) tokens. Requires the recipient to have an established Trust Line with the issuer.

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "TOKEN_TRANSFER",
    "to": "rRecipientAddress",
    "humanAmount": "100",
    "token": {
      "address": "USD.rIssuerAddress",
      "decimals": 15,
      "symbol": "USD"
    }
  }'
```

- Token address format: `{currency}.{issuer}` (e.g., `USD.rIssuerAddress`)
- 3-char currency codes (e.g., `USD`) or 40-char hex currency codes supported
- IOU_DECIMALS = 15 for Trust Line precision

### APPROVE -- Trust Line Setup (TrustSet)

Set up a Trust Line to an issuer. Maps to XRPL `TrustSet` transaction with `tfSetNoRipple` flag.

```bash
curl -s -X POST http://localhost:3100/v1/transactions/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wai_sess_eyJ...' \
  -d '{
    "type": "APPROVE",
    "spender": "rIssuerAddress",
    "token": {
      "address": "USD.rIssuerAddress",
      "decimals": 15,
      "symbol": "USD"
    },
    "humanAmount": "1000000"
  }'
```

- `spender`: The issuer address
- `amount`/`humanAmount`: Credit limit for the Trust Line

### Unsupported Types on Ripple

The following transaction types return explicit errors on ripple wallets:
- **CONTRACT_CALL**: XRPL has no smart contracts
- **BATCH**: XRPL does not support batch transactions
- **CONTRACT_DEPLOY**: XRPL has no smart contracts

### Ripple Fee and Confirmation

- **Fees**: Typically 12 drops (~0.000012 XRP), 120% safety margin applied automatically
- **Confirmation**: Validated ledger-based (ledger closes every ~3.5-4 seconds)
- **Reserve**: Minimum 10 XRP base reserve + 2 XRP per owned object
