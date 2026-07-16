# WAIaaS Community Post Drafts

Ready-to-post drafts for developer communities. All posts are in English.

---

## 1. Hacker News -- Show HN

### Title

Show HN: WAIaaS -- Self-hosted wallet daemon for AI agents (MCP + REST)

### URL

https://waiaas.ai

### First Comment (by poster)

Hi HN,

I built WAIaaS because I kept seeing the same problem: AI agents that need to interact with blockchains are given direct access to private keys. This is a terrible security model. One prompt injection, one compromised npm package, one malicious skill file -- and funds are gone. Irreversibly.

WAIaaS is a self-hosted daemon that sits between the AI agent and the blockchain. The agent gets a session token, not the private key. Every transaction goes through a policy engine that checks spending limits, token whitelists, and contract restrictions before anything gets signed.

**What it does:**
- 42 MCP tools for Claude (and any MCP-compatible model)
- REST API + TypeScript SDK for custom integrations
- Multi-chain: all EVM chains + Solana
- DeFi: swap (Jupiter, 0x), bridge (LI.FI, Across), lend (Aave, Kamino), stake (Lido, Jito), perp (Drift, Hyperliquid)
- Policy engine: default-deny, spending limits, token/contract whitelists
- Owner approval: WalletConnect, hardware wallet (D'CENT), push notifications
- Admin Web UI for management

**Tech stack:** Node.js 22, Hono, SQLite (Drizzle ORM), sodium-native for crypto, viem for EVM, @solana/kit for Solana. Everything runs locally -- no cloud dependency.

**Quick start:**
```
npx @waiaas/cli init
npx @waiaas/cli start
```

Or Docker: `docker run -v waiaas-data:/data waiaas/daemon`

The architecture is a 6-stage transaction pipeline: session auth -> wallet resolution -> policy evaluation -> tx construction -> signing -> submission. The policy evaluation stage is the key security boundary.

It's MIT licensed, fully open source. I've been using it with Claude for DeFi operations and the MCP integration works well -- you can say "swap 50 USDC for ETH on Base" and Claude handles the tool calls.

Still working on: CoW Protocol integration for intent-based trading, Morpho lending support, and more comprehensive audit logging.

Would love feedback, especially on the security model and the MCP tool design.

GitHub: https://github.com/waiaas/WAIaaS

---

## 2. Reddit -- r/cryptocurrency

### Title

I built a self-hosted wallet daemon for AI agents -- open source, policy-enforced security

### Body

**The problem:** AI agents are increasingly managing crypto wallets, but the standard approach is terrifying -- give the agent the private key and hope for the best. Prompt injection attacks, malicious skill files, and compromised dependencies can all lead to instant, irreversible fund loss.

**The solution:** WAIaaS is a self-hosted wallet daemon that acts as a security layer between the AI agent and the blockchain. The agent never touches the private key. Instead, it authenticates with a session token and every transaction passes through a policy engine before signing.

**Key features:**
- Self-hosted daemon (your keys, your machine, no custodial risk)
- Policy engine: spending limits, token whitelists, contract whitelists, default-deny
- Multi-chain: Ethereum, Base, Arbitrum, Polygon, Solana, and more
- DeFi: swap, bridge, lend, stake, perpetual futures
- Owner approval: get a push notification before high-value transactions execute
- Kill switch: instant emergency shutdown
- Admin Web UI for real-time management

**Example use case:** I have Claude running as a DeFi agent. It can swap tokens on Jupiter (Solana) or 0x (EVM), check lending positions on Aave, and stake with Lido -- all through natural language. But it can't transfer more than $100 per transaction, can't interact with unapproved contracts, and I get a notification for anything above $50.

The agent thinks it has full wallet access. The policy engine knows better.

**Quick start:**
```
npx @waiaas/cli init
npx @waiaas/cli start
```

Open source (MIT), written in TypeScript. Works with Claude via MCP (42 tools) or any agent via REST API.

- GitHub: https://github.com/waiaas/WAIaaS
- Website: https://waiaas.ai
- npm: https://www.npmjs.com/package/@waiaas/cli

Happy to answer questions about the security model or architecture.

---

## 3. Reddit -- r/ClaudeAI (or r/MCP)

### Title

Open-source MCP server with 42 crypto wallet tools -- swap, bridge, lend, stake, NFT

### Body

I built an MCP server that gives Claude full crypto wallet capabilities: 42 tools covering wallet management, token transfers, DeFi operations, NFT trading, and more.

**What Claude can do with it:**
- Create and manage multi-chain wallets (EVM + Solana)
- Send tokens and native currency
- Swap tokens (Jupiter on Solana, 0x on EVM)
- Bridge assets cross-chain (LI.FI, Across Protocol)
- Lend/borrow on Aave V3 and Kamino
- Stake with Lido and Jito
- Trade perps on Drift and Hyperliquid
- Manage NFTs (ERC-721, ERC-1155, Metaplex)
- Place prediction market bets on Polymarket

**Security:** This isn't just "give Claude a private key." WAIaaS runs as a self-hosted daemon with a policy engine. Claude gets a session token, not the key. Every transaction is checked against spending limits, token whitelists, and contract restrictions. You can require owner approval for high-value transactions via WalletConnect or push notification.

**Setup (3 lines in claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "waiaas": {
      "command": "npx",
      "args": ["-y", "@waiaas/mcp"],
      "env": { "WAIAAS_URL": "http://localhost:3420" }
    }
  }
}
```

Run `npx @waiaas/cli init && npx @waiaas/cli start` first to set up the daemon.

Open source (MIT): https://github.com/waiaas/WAIaaS

The MCP integration feels natural -- you just ask Claude to "check my ETH balance" or "swap 50 USDC for ETH on Base" and it uses the right tools.

---

## 4. Reddit -- r/selfhosted

### Title

WAIaaS: Self-hosted wallet-as-a-service for AI agents (Docker + npm)

### Body

I've been building a self-hosted wallet daemon designed for AI agents to interact with blockchains securely. Sharing it here because self-hosting is core to the security model -- your keys never leave your machine.

**What it is:** A Node.js daemon that manages crypto wallets and exposes them via REST API and MCP (Model Context Protocol). AI agents authenticate with session tokens and every transaction goes through a configurable policy engine before signing.

**Self-hosted aspects:**
- All data stored locally (SQLite database, encrypted key storage)
- No cloud dependency -- communicates directly with blockchain RPC nodes
- Admin Web UI at localhost:3420
- Audit logs and monitoring built in
- Kill switch for emergency shutdown

**Docker:**
```bash
docker run -d \
  -v waiaas-data:/data \
  -p 3420:3420 \
  waiaas/daemon
```

**Or npm:**
```bash
npx @waiaas/cli init
npx @waiaas/cli start
```

**Supports:** Ethereum, Base, Arbitrum, Polygon, Solana, and all EVM-compatible chains. DeFi operations (swap, bridge, lend, stake), NFTs, smart accounts (ERC-4337).

The Admin UI gives you real-time control: wallet management, policy configuration (spending limits, token whitelists), session monitoring, and transaction history. Everything runs on your hardware.

MIT licensed: https://github.com/waiaas/WAIaaS
