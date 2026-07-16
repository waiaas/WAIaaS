---
title: "MCP Wallet: How AI Agents Access Crypto via Model Context Protocol"
description: "MCP wallets let AI agents like Claude interact with blockchains through the Model Context Protocol. Learn how MCP wallet tools work and how to set one up."
date: "2026-03-17"
section: "blog"
slug: "mcp-wallet"
category: "SEO Landing"
keywords: "MCP wallet, Model Context Protocol wallet, Claude wallet, AI agent MCP, MCP tools crypto"
---

# MCP Wallet: How AI Agents Access Crypto via Model Context Protocol

The Model Context Protocol (MCP) is changing how AI agents interact with external systems. Instead of screen-scraping, API hacking, or custom integrations, MCP provides a standardized way for AI models to discover and use tools. When those tools include wallet operations, you get an **MCP wallet** — an AI agent's native interface to the blockchain.

This guide explains what an MCP wallet is, how it works, what operations it supports, and how to set one up with WAIaaS.

---

## What Is an MCP Wallet?

An MCP wallet is a wallet system that exposes blockchain operations as MCP tools. AI agents — like Claude, or any MCP-compatible model — can discover these tools at runtime and use them to:

- Create and manage crypto wallets
- Send native currency and tokens
- Execute DeFi operations (swap, bridge, lend, stake)
- Trade NFTs
- Sign arbitrary messages
- Query balances and transaction history

The key insight is that MCP wallets let AI agents interact with blockchains **through a protocol they already understand**. There's no need for custom API clients, SDKs, or integration code. The agent discovers the wallet tools via MCP and uses them natively.

### MCP in 30 Seconds

MCP (Model Context Protocol) is an open standard developed by Anthropic that defines how AI models connect to external tools and data sources. An MCP server exposes "tools" (functions the AI can call) and "resources" (data the AI can read). The AI model discovers available tools at startup and can invoke them during conversation.

For wallets, this means an AI agent can see tools like `send_transaction`, `swap`, `bridge`, and `list_wallets` — and use them as naturally as it uses any other capability.

---

## How MCP Wallet Tools Work

WAIaaS provides **42 MCP tools** organized by function. Here's how the tool flow works:

### Session Management

Before any wallet operation, the agent creates a session:

```
Tool: create_session
Input: { password: "***" }
Output: { sessionToken: "eyJ...", expiresAt: "..." }
```

The session token authenticates all subsequent tool calls. Sessions have configurable TTL and the agent can renew them as needed.

### Wallet Discovery

The agent discovers available wallets:

```
Tool: list_wallets
Output: [
  { id: "w_abc123", name: "trading-bot", chains: ["evm", "solana"] },
  { id: "w_def456", name: "defi-agent", chains: ["evm"] }
]
```

### Transaction Execution

The agent executes operations using purpose-built tools:

```
Tool: send_transaction
Input: {
  walletId: "w_abc123",
  to: "0x1234...",
  value: "0.1",
  chainId: 8453
}
Output: { txHash: "0xabcd...", status: "confirmed" }
```

### DeFi Operations

DeFi tools follow the same pattern — the agent describes the intent and the wallet handles the complexity:

```
Tool: swap
Input: {
  walletId: "w_abc123",
  fromToken: "USDC",
  toToken: "ETH",
  amount: "100",
  chainId: 8453
}
Output: { txHash: "0x...", amountOut: "0.032", route: "0x DEX" }
```

All tools go through the same 6-stage transaction pipeline with policy enforcement. The MCP layer is an interface — the security model is identical to REST API access.

---

## MCP vs REST API

WAIaaS supports both MCP and REST API access. Here's when to use each:

| Feature | MCP | REST API |
|---|---|---|
| **Best for** | AI agents (Claude, etc.) | Custom applications, scripts |
| **Discovery** | Automatic tool discovery | Manual endpoint knowledge |
| **Authentication** | Session via MCP tool | Bearer token in header |
| **Transport** | stdio (local process) | HTTP (local or network) |
| **Integration effort** | Zero code (config only) | SDK or HTTP client needed |
| **Tool count** | 42 tools | Equivalent REST endpoints |
| **Real-time** | Tool invocation | Request/response |
| **Multi-agent** | Session per agent | Token per agent |

**Choose MCP when** your agent is an MCP-compatible model (Claude, etc.) and you want zero-code integration.

**Choose REST API when** you're building a custom application, using a non-MCP agent, or need network-accessible wallet operations.

Both interfaces share the same wallet daemon, policy engine, and security model. Switching between them does not affect security.

---

## Supported Operations

The 42 MCP tools cover the full spectrum of wallet operations:

### Core Wallet
- `create_session` / `check_session` — Authentication
- `list_wallets` / `get_wallet` / `create_wallet` — Wallet management
- `get_balance` / `get_token_balances` — Balance queries
- `connect_info` — Agent self-discovery (capabilities, networks, policies)

### Transfers
- `send_transaction` — Native currency transfers
- `send_token` — ERC-20 / SPL token transfers
- `send_nft` — NFT transfers (ERC-721, ERC-1155, Metaplex)

### DeFi
- `swap` — Token swaps (Jupiter on Solana, 0x on EVM, DCent aggregator)
- `bridge` — Cross-chain bridges (LI.FI, Across Protocol)
- `lend_supply` / `lend_borrow` / `lend_repay` / `lend_withdraw` — Lending (Aave V3, Kamino)
- `stake` / `unstake` — Liquid staking (Lido, Jito)
- `perp_open` / `perp_close` / `perp_positions` — Perpetual futures (Drift, Hyperliquid)
- `yield_positions` — DeFi position dashboard

### Governance and Signing
- `sign_message` — Arbitrary message signing
- `approve_token` — ERC-20 token approvals
- `call_contract` — Generic smart contract calls

### Policies and Admin
- `list_policies` / `create_policy` — Policy management
- `list_sessions` — Session management
- `get_transaction_history` — Transaction logs

---

## Setting Up an MCP Wallet with WAIaaS

Getting an MCP wallet running takes three steps:

### Step 1: Install WAIaaS

```bash
# Using npm
npx @waiaas/cli init
npx @waiaas/cli start

# Or using Docker
docker run -d -v waiaas-data:/data -p 3420:3420 waiaas/daemon
```

### Step 2: Create a Wallet

Access the Admin Web UI at `http://localhost:3420` or use the CLI:

```bash
# Set master password on first run
# Then create a wallet through Admin UI or API
```

### Step 3: Configure Claude Desktop

Add WAIaaS to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "waiaas": {
      "command": "npx",
      "args": ["-y", "@waiaas/mcp"],
      "env": {
        "WAIAAS_URL": "http://localhost:3420"
      }
    }
  }
}
```

Restart Claude Desktop. The 42 wallet tools are now available. Claude can create sessions, list wallets, send transactions, execute DeFi operations, and manage policies — all through natural conversation.

### Example Conversation

> **You:** "Swap 50 USDC for ETH on Base using my trading wallet."
>
> **Claude:** *Uses `create_session` to authenticate, `list_wallets` to find the trading wallet, then `swap` to execute the trade. Returns the transaction hash and amount received.*

---

## Frequently Asked Questions

<details>
<summary>What is MCP?</summary>

MCP (Model Context Protocol) is an open standard created by Anthropic that defines how AI models connect to external tools and data sources. It provides a standardized way for AI agents to discover available tools, understand their parameters, and invoke them. MCP uses a client-server architecture where the AI model is the client and tool providers are servers. WAIaaS is an MCP server that exposes 42 crypto wallet tools.
</details>

<details>
<summary>Can Claude use a crypto wallet?</summary>

Yes. Claude can use a crypto wallet through MCP (Model Context Protocol). When you configure WAIaaS as an MCP server in Claude Desktop, Claude gets access to 42 wallet tools for creating wallets, sending transactions, swapping tokens, bridging assets, lending, staking, and more. Claude interacts with the wallet through natural conversation — you can say "send 0.1 ETH to this address" and Claude handles the tool calls. All transactions go through a policy engine for security.
</details>

<details>
<summary>Is MCP wallet secure?</summary>

Yes. The MCP layer is a transport interface — it doesn't change the security model. All MCP tool calls go through the same 6-stage transaction pipeline as REST API calls, including session authentication and policy engine evaluation. The agent authenticates with a session token (not the private key), and every transaction is checked against spending limits, token whitelists, and contract restrictions. MCP communication runs over stdio (local process), so there's no network exposure.
</details>

<details>
<summary>What blockchains does MCP wallet support?</summary>

WAIaaS MCP wallet supports all EVM-compatible blockchains (Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, BNB Chain, and more) plus Solana. For DeFi operations, specific protocol support includes: Jupiter and DCent swap on Solana, 0x swap on EVM, LI.FI and Across Protocol for cross-chain bridges, Aave V3 lending on EVM, Kamino lending on Solana, Lido staking on EVM, Jito staking on Solana, Drift perps on Solana, and Hyperliquid perps/spot on EVM.
</details>

<details>
<summary>How do I add MCP wallet to Claude Desktop?</summary>

Add this to your `claude_desktop_config.json` file (typically located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%/Claude/claude_desktop_config.json` on Windows): add a `"waiaas"` entry under `"mcpServers"` with command `"npx"`, args `["-y", "@waiaas/mcp"]`, and env `WAIAAS_URL` pointing to your daemon (default `http://localhost:3420`). Restart Claude Desktop, and the 42 wallet tools will be available.
</details>

<details>
<summary>Can other AI models use MCP wallet?</summary>

Yes. Any AI model or application that implements the MCP client protocol can use WAIaaS wallet tools. While Claude has native MCP support, other MCP-compatible models and frameworks can also connect. Additionally, WAIaaS provides a full REST API and a TypeScript SDK (@waiaas/sdk) for non-MCP integrations, so any AI agent — regardless of framework — can access wallet operations.
</details>

---

## Resources

- **Documentation**: [Architecture](/docs/architecture/) | [Security Model](/docs/security-model/) | [API Reference](/docs/api-reference/)
- **GitHub**: [github.com/waiaas/WAIaaS](https://github.com/waiaas/WAIaaS)
- **npm**: [@waiaas/cli](https://www.npmjs.com/package/@waiaas/cli) | [@waiaas/mcp](https://www.npmjs.com/package/@waiaas/mcp) | [@waiaas/sdk](https://www.npmjs.com/package/@waiaas/sdk)
- **Docker**: [waiaas/daemon](https://hub.docker.com/r/waiaas/daemon)

---

## Related

- [What Is an AI Wallet?](/blog/what-is-ai-wallet/) — Complete guide to AI wallets, how they work, and their security model.
- [Claude Code Integration Guide](/blog/claude-code-integration/) — Step-by-step guide for integrating WAIaaS with Claude Code.
- [Architecture Overview](/docs/architecture/) — Technical deep-dive into the 6-stage transaction pipeline and policy engine.
