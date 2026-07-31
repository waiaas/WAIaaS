# WAIaaS Simple Agent Example

A minimal AI agent that demonstrates the core [WAIaaS](https://github.com/waiaas/WAIaaS) SDK workflow: **check balance, conditionally send tokens, and wait for confirmation**.

Use this example as a starting point for building your own AI agent with wallet capabilities.

## Prerequisites

- **Node.js >= 22** (uses `--env-file` flag, no dotenv dependency)
- **WAIaaS daemon** running at `http://localhost:3100`
- A wallet created and a **session token** issued via `POST /v1/sessions`

> See the main [README](../../README.md) for daemon setup and session creation.

## Setup

### From the monorepo (development)

```bash
# Install all monorepo dependencies (from repo root)
pnpm install

# Navigate to the example
cd examples/simple-agent

# Copy the environment template
cp .env.example .env

# Edit .env with your session token and recipient address
```

### Standalone (outside the monorepo)

```bash
mkdir my-agent && cd my-agent
npm init -y

# Install the SDK from npm
npm install @waiaas/sdk

# Copy src/index.ts from this example and adapt as needed
# Update the import if using CommonJS or a different module system
```

> **Note:** In the monorepo, `@waiaas/sdk` uses `workspace:*` to link the
> local package. For standalone usage, replace `"workspace:*"` in
> `package.json` with the published version (e.g., `"^2.5.0"`).

## Run

```bash
# Build TypeScript first
npx tsc

# Run with Node.js 22 --env-file flag (loads .env automatically)
node --env-file=.env dist/index.js

# Or run directly with tsx (no build step needed)
npx tsx --env-file=.env src/index.ts
```

## What It Does

The agent executes a 3-step workflow:

1. **Check Balance** -- Queries the wallet's native token balance via `client.getBalance()`.
2. **Conditional Send** -- If the balance exceeds `MIN_BALANCE_THRESHOLD` (in base units like lamports or wei), sends `SEND_AMOUNT` of the native token to `RECIPIENT_ADDRESS` using `client.sendToken()`.
3. **Wait for Confirmation** -- Polls `client.getTransaction()` every second until the transaction reaches `COMPLETED` or `FAILED` status (60-second timeout).

```
[Agent] Connecting to WAIaaS daemon at http://localhost:3100...
[Agent] Checking wallet balance...
[Agent] Balance: 1.5 SOL (solana/devnet)
[Agent] Balance meets threshold. Proceeding with transfer...
[Agent] Sending 0.001 SOL to 7xKX...
[Agent] Transaction submitted: tx_01234... (status: PENDING)
[Agent] Waiting for confirmation...
...
[Agent] Transaction COMPLETED!
[Agent]   Hash: 5xYZ...
[Agent]   Amount: 0.001
[Agent]   To: 7xKX...
```

## Customization

| Variable | Description | Default |
|----------|-------------|---------|
| `WAIAAS_BASE_URL` | WAIaaS daemon URL | `http://localhost:3100` |
| `WAIAAS_SESSION_TOKEN` | Session bearer token (from `POST /v1/sessions`) | *(required)* |
| `MIN_BALANCE_THRESHOLD` | Minimum balance in base units (lamports/wei) to proceed | `1000000` |
| `RECIPIENT_ADDRESS` | Destination wallet address | *(required)* |
| `SEND_AMOUNT` | Amount to send in human-readable units (e.g., SOL, ETH) | `0.001` |

## Error Handling

The agent handles two types of errors:

- **`WAIaaSError`** -- API errors from the daemon. Includes `code`, `message`, and optional `hint` for debugging.
- **General errors** -- Network failures, timeouts, etc. Logged with full stack trace.

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `new WAIaaSClient({ baseUrl, sessionToken })` | Initialize the SDK client |
| `client.getBalance()` | Query native token balance |
| `client.sendToken({ type, to, amount })` | Submit a token transfer |
| `client.getTransaction(id)` | Poll transaction status |

## License

MIT
