# WAIaaS Submission Kit

External directory registration materials and platform-specific submission checklists.

---

## 1. Project Overview

- **Name:** WAIaaS (Wallet-as-a-Service for AI Agents)
- **One-liner:** Self-hosted wallet daemon that lets AI agents execute blockchain transactions with policy-enforced security
- **Website:** https://waiaas.ai
- **GitHub:** https://github.com/waiaas/WAIaaS
- **npm:** https://www.npmjs.com/package/@waiaas/cli
- **Docker:** https://hub.docker.com/u/waiaas
- **License:** MIT
- **Language:** TypeScript (Node.js)
- **MCP Server:** @waiaas/mcp (42 tools)

---

## 2. Description Templates

### Short (50 words)

WAIaaS is a self-hosted wallet daemon for AI agents. It provides 42 MCP tools and a REST API for autonomous blockchain transactions on EVM and Solana chains, secured by a policy engine with spending limits, token whitelists, and owner approval workflows. Open source, MIT licensed.

### Medium (150 words)

WAIaaS (Wallet-as-a-Service for AI Agents) is an open-source, self-hosted wallet daemon that gives AI agents secure, autonomous access to blockchain transactions. Instead of handing private keys to agents, WAIaaS provides a policy-enforced API layer with session-based authentication.

Key capabilities include 42 MCP tools for Claude and other AI assistants, a comprehensive REST API with TypeScript SDK, multi-chain support (all EVM chains plus Solana), DeFi protocol integrations (swap, bridge, lend, stake, perpetual futures), NFT operations, and an Admin Web UI for real-time management.

Security is built on a 3-layer defense-in-depth architecture: session authentication with JWT tokens, a policy engine enforcing spending limits and token whitelists, and monitoring with kill switch. Owner approval workflows support WalletConnect, D'CENT hardware wallets, Ntfy push, and Telegram.

Install with `npx @waiaas/cli init` or `docker run waiaas/daemon`.

### Long (300 words)

WAIaaS (Wallet-as-a-Service for AI Agents) solves the fundamental security problem of AI agents accessing crypto wallets. When an AI agent holds a private key directly, any prompt injection, skill file trojan, or supply chain compromise can drain funds instantly. WAIaaS eliminates this risk by running as a separate self-hosted daemon that holds keys in encrypted storage and enforces security policies on every transaction.

The daemon provides 42 MCP tools for seamless integration with Claude and other MCP-compatible AI models. Agents interact with wallets through natural conversation — "swap 100 USDC for ETH on Base" — while the policy engine ensures every transaction stays within configured guardrails: token whitelists, per-transaction and cumulative spending limits, contract whitelists, and gas limits. Default-deny policies block all transactions unless explicitly allowed.

Multi-chain support covers all EVM-compatible blockchains (Ethereum, Base, Arbitrum, Polygon, Optimism, and more) plus Solana. DeFi integrations include Jupiter and 0x for token swaps, LI.FI and Across Protocol for cross-chain bridges, Aave V3 and Kamino for lending, Lido and Jito for liquid staking, Drift and Hyperliquid for perpetual futures, and Pendle for yield trading. NFT support covers ERC-721, ERC-1155, and Metaplex standards.

The 3-layer security architecture provides defense in depth: (1) Session-based auth with JWT tokens and configurable TTL, (2) Time-delayed owner approval via WalletConnect, D'CENT hardware wallet, Ntfy, or Telegram, (3) Real-time balance monitoring with emergency kill switch. An Admin Web UI provides complete management including wallet creation, policy configuration, session monitoring, and audit logs.

WAIaaS is fully open source (MIT license), self-hosted (no custodial risk), and ships as npm packages, CLI, and Docker images. It supports Smart Account (ERC-4337) operations, ERC-8004 trustless agent verification, and x402 HTTP payments.

---

## 3. Categories & Tags

### Primary Categories
- AI Agent Tools
- Crypto Wallets
- Developer Tools
- Blockchain Infrastructure
- MCP Servers

### Tags
AI wallet, MCP, wallet-as-a-service, self-hosted, crypto, DeFi, blockchain, AI agent, autonomous transactions, policy engine, Claude, Model Context Protocol, EVM, Solana, token swap, cross-chain bridge, lending, staking, NFT, smart account, ERC-4337

### Target Audiences
- AI developers building autonomous agents
- Crypto developers needing wallet infrastructure
- MCP users extending Claude with blockchain access
- Claude Desktop users wanting crypto capabilities
- Self-hosted software enthusiasts
- DeFi automation developers

---

## 4. Key Features

- **Self-hosted daemon** — No custodial risk; keys never leave your machine
- **42 MCP tools** — Native integration with Claude and MCP-compatible AI agents
- **REST API + TypeScript SDK** — For custom applications and non-MCP agents
- **6-stage transaction pipeline** — Intent to execution with policy checks at every stage
- **Policy engine** — Token whitelists, spending limits, contract whitelists, gas limits (default-deny)
- **Multi-chain** — All EVM chains (Ethereum, Base, Arbitrum, Polygon, ...) + Solana
- **DeFi suite** — Swap (Jupiter, 0x, DCent), Bridge (LI.FI, Across), Lend (Aave, Kamino), Stake (Lido, Jito), Perp (Drift, Hyperliquid), Yield (Pendle)
- **NFT support** — ERC-721, ERC-1155, Metaplex
- **Session-based auth** — JWT with configurable TTL, SIWE/SIWS owner auth
- **Owner approval workflows** — WalletConnect, D'CENT hardware wallet, Ntfy push, Telegram bot
- **Admin Web UI** — Real-time wallet management, policy configuration, audit logs
- **Smart Account (ERC-4337)** — Account abstraction with UserOp build/sign API
- **Kill switch** — Instant emergency shutdown
- **Prediction markets** — Polymarket integration
- **x402 payments** — HTTP payment protocol for agent micropayments

---

## 5. Platform-Specific Submission Checklists

### 5a. Product Hunt

- [ ] Title: "WAIaaS — Self-hosted wallet daemon for AI agents"
- [ ] Tagline: "Let AI agents execute crypto transactions safely with policy-enforced security"
- [ ] Description: Use Medium template (150 words)
- [ ] Screenshots: Admin UI dashboard, MCP tool list, policy configuration
- [ ] Demo video/GIF: Claude executing a swap via MCP
- [ ] Maker comment: Drafted (see COMMUNITY_POSTS.md)
- [ ] Category: Developer Tools, AI, Crypto
- [ ] Launch day: TBD

### 5b. AlternativeTo

- [ ] Category: Cryptocurrency Wallets
- [ ] Alternative to: MetaMask, Coinbase Wallet (for AI agent use cases)
- [ ] Tags: AI, wallet, self-hosted, open-source, MCP
- [ ] Description: Use Short template (50 words)
- [ ] URL submitted

### 5c. There's an AI for That

- [ ] Category: Developer Tools > Crypto
- [ ] Description: Use Short template (50 words)
- [ ] URL: https://waiaas.ai
- [ ] GitHub link included

### 5d. AI Tool Directories (futuretools.io, toolify.ai)

- [ ] Category: AI Agent Tools
- [ ] Description: Use Medium template (150 words)
- [ ] Key features: 5 bullet points from Key Features section
- [ ] Pricing: Free / Open Source
- [ ] URL submitted

### 5e. Awesome MCP Servers (GitHub)

- [ ] Target repo: github.com/punkpeye/awesome-mcp-servers (or similar)
- [ ] One-line entry: "**WAIaaS** — Self-hosted wallet daemon with 42 MCP tools for crypto transactions (swap, bridge, lend, stake, NFT) on EVM + Solana. Policy engine with spending limits and token whitelists."
- [ ] Category: Finance / Crypto
- [ ] PR drafted

### 5f. MCP Directories

#### mcp.so
- [ ] Server name: @waiaas/mcp
- [ ] Tool count: 42
- [ ] Category: Crypto / Finance
- [ ] Description: Use Short template
- [ ] README link: https://github.com/waiaas/WAIaaS

#### glama.ai/mcp
- [ ] Server name: @waiaas/mcp
- [ ] Tool count: 42
- [ ] Category: Finance
- [ ] Description: Use Short template
- [ ] npm link: https://www.npmjs.com/package/@waiaas/mcp

### 5g. npm / Docker Hub

- [ ] npm @waiaas/cli: Description and keywords up-to-date
- [ ] npm @waiaas/mcp: Description and keywords up-to-date
- [ ] npm @waiaas/sdk: Description and keywords up-to-date
- [ ] Docker waiaas/daemon: Description up-to-date
- [ ] Docker waiaas/push-relay: Description up-to-date

---

## 6. MCP Directory Info (Latest)

### Server Details
- **Package:** @waiaas/mcp
- **Transport:** stdio
- **Protocol:** MCP (Model Context Protocol)
- **Tool count:** 42
- **Supported models:** Claude, any MCP-compatible model
- **Install:** `npx -y @waiaas/mcp` (in claude_desktop_config.json)

### Key Tools by Category

| Category | Tools | Examples |
|---|---|---|
| Session | 2 | create_session, check_session |
| Wallet | 5 | list_wallets, create_wallet, get_balance, connect_info |
| Transfer | 3 | send_transaction, send_token, send_nft |
| DeFi | 12 | swap, bridge, lend_supply, stake, perp_open |
| Signing | 3 | sign_message, approve_token, call_contract |
| Policy | 2 | list_policies, create_policy |
| Query | 5 | get_token_balances, get_transaction_history, yield_positions |

### claude_desktop_config.json Example

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

### Supported Chains
- **EVM:** Ethereum, Base, Arbitrum, Polygon, Optimism, Avalanche, BNB Chain, and all EVM-compatible
- **Solana:** Mainnet, Devnet

### DeFi Protocol Coverage
- **Swap:** Jupiter (Solana), 0x (EVM), DCent Aggregator
- **Bridge:** LI.FI, Across Protocol
- **Lend:** Aave V3 (EVM), Kamino (Solana)
- **Stake:** Lido (EVM), Jito (Solana)
- **Perp:** Drift (Solana), Hyperliquid (EVM)
- **Yield:** Pendle (EVM)
- **Prediction:** Polymarket (Polygon)

---

## 7. Social Media Assets

### One-liners (for tweets, bios, etc.)

- "Self-hosted wallet daemon for AI agents. 42 MCP tools. Policy-enforced security."
- "Let AI agents execute crypto transactions safely. Open source, self-hosted."
- "The missing wallet infrastructure for autonomous AI agents."

### Hashtags
#AIWallet #MCP #WalletAsAService #DeFi #AIAgents #OpenSource #SelfHosted #Crypto #Blockchain #Claude

---

## 8. Desktop App Distribution Channels

### Download Page
- **URL:** https://waiaas.ai/download/
- **Features:** OS auto-detection (macOS/Windows/Linux), GitHub Releases API integration, 5-min TTL cache, fallback direct link
- **Formats:** .dmg (macOS), .msi (Windows), .AppImage/.deb (Linux)
- **Also shows:** npm and Docker alternative installation methods

### GitHub Releases
- **URL:** https://github.com/waiaas/WAIaaS/releases
- **Tag pattern:** `desktop-v*` (e.g., `desktop-v0.1.0`)
- **Artifacts:** Platform-specific installers + Ed25519 signatures for auto-update
- **CI:** `.github/workflows/desktop-release.yml` builds and publishes on tag push

### Installation Guide
- **URL:** https://waiaas.ai/docs/desktop-installation/
- **Covers:** macOS Gatekeeper bypass (14 and Sequoia 15+), Windows SmartScreen, Linux permissions, Setup Wizard 5-step, auto-update
