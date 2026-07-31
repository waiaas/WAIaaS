# WAIaaS — Self-hosted Wallet-as-a-Service for AI Agents

A local daemon that gives AI agents secure, policy-controlled access to crypto wallets across EVM and Solana chains.

**Your keys, your machine, your rules.**

## Quick Start

```bash
docker run -d \
  --name waiaas \
  -p 127.0.0.1:3100:3100 \
  -v waiaas-data:/data \
  -e WAIAAS_AUTO_PROVISION=true \
  waiaas/daemon
```

Then open `http://localhost:3100/admin` to access the Admin UI.

## Docker Compose

```yaml
services:
  daemon:
    image: waiaas/daemon:latest
    ports:
      - "127.0.0.1:3100:3100"
    volumes:
      - waiaas-data:/data
    environment:
      - WAIAAS_AUTO_PROVISION=true
    restart: unless-stopped

volumes:
  waiaas-data:
```

```bash
docker compose up -d
```

## Features

- **Multi-Chain** — 8 EVM networks (Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB, HyperEVM) + Solana
- **13+ DeFi Protocols** — Swap, bridge, stake, lend, yield, perp, predict (Jupiter, 0x, LI.FI, Lido, Jito, Aave V3, Kamino, Pendle, Drift, Hyperliquid, Across, Polymarket, and more)
- **3-Layer Security** — Session auth (JWT) → time-delay & owner approval → monitoring & kill switch
- **MCP Built-in** — Model Context Protocol server for direct AI agent integration
- **Admin Web UI** — Dashboard, wallet management, policy configuration, audit logs
- **ERC-4337 Smart Account** — Account Abstraction with gas sponsorship
- **REST API + TypeScript SDK** — Full programmatic access
- **9 Transaction Types** — TRANSFER, TOKEN_TRANSFER, CONTRACT_CALL, APPROVE, BATCH, SIGN, X402_PAYMENT, NFT_TRANSFER, CONTRACT_DEPLOY

## Configuration

### Environment Variables

All config values can be set via environment variables using the `WAIAAS_{SECTION}_{KEY}` pattern:

| Variable | Description | Default |
|----------|-------------|---------|
| `WAIAAS_AUTO_PROVISION` | Auto-generate master password on first start | `false` |
| `WAIAAS_DAEMON_PORT` | Listening port | `3100` |
| `WAIAAS_DAEMON_HOSTNAME` | Bind address | `0.0.0.0` (in container) |
| `WAIAAS_DAEMON_LOG_LEVEL` | Log level (trace/debug/info/warn/error) | `info` |
| `WAIAAS_RPC_SOLANA_MAINNET` | Solana mainnet RPC URL | public endpoint |
| `WAIAAS_RPC_SOLANA_DEVNET` | Solana devnet RPC URL | public endpoint |
| `WAIAAS_RPC_EVM_ETHEREUM_MAINNET` | Ethereum mainnet RPC URL | — |
| `WAIAAS_SECURITY_MASTER_PASSWORD_HASH` | Pre-set Argon2id master password hash | — |
| `WAIAAS_SECURITY_SESSION_TTL` | Session lifetime in seconds | `86400` |

### Auto-Provision Mode

When `WAIAAS_AUTO_PROVISION=true` and no `config.toml` exists, the entrypoint automatically runs `waiaas init --auto-provision`. The generated master password is saved to `/data/recovery.key`.

Retrieve it after first start:

```bash
docker exec waiaas cat /data/recovery.key
```

> **Important:** Change the password with `waiaas set-master` and delete the recovery key for production use.

### Docker Secrets

For production deployments, use Docker secrets instead of environment variables:

```yaml
services:
  daemon:
    image: waiaas/daemon:latest
    secrets:
      - waiaas_master_password
    environment:
      - WAIAAS_MASTER_PASSWORD_FILE=/run/secrets/waiaas_master_password

secrets:
  waiaas_master_password:
    file: ./secrets/master_password.txt
```

## Image Details

| Property | Value |
|----------|-------|
| **Base image** | `node:22-slim` |
| **Runs as** | non-root user `waiaas` (UID 1001) |
| **Data volume** | `/data` (database, keystore, config) |
| **Exposed port** | 3100 |
| **Health check** | `curl -f http://localhost:3100/health` every 30s |
| **Watchtower** | Auto-update supported (`com.centurylinklabs.watchtower.enable=true`) |

## Data Volume

The `/data` volume contains all persistent state:

```
/data/
  config.toml          # Configuration
  recovery.key         # Auto-provision master password (delete after setup)
  data/
    waiaas.db          # SQLite database
  keystore/
    *.enc              # Encrypted private keys
  tokens/              # MCP session token files
  backups/             # Automatic backup archives
```

## Security Notes

- **Bind to localhost only** — The default `docker run` example binds to `127.0.0.1`. Never expose port 3100 to the public internet without a TLS reverse proxy.
- **Non-root execution** — The container runs as UID 1001, not root.
- **Encrypted keystore** — Private keys are encrypted at rest using sodium-native with Argon2id key derivation.
- **Default-deny policies** — Token transfers, contract calls, and spender approvals are denied unless explicitly allowed.

## Links

- [GitHub Repository](https://github.com/waiaas/WAIaaS)
- [Deployment Guide](https://github.com/waiaas/WAIaaS/blob/main/docs/deployment.md)
- [npm: @waiaas/cli](https://www.npmjs.com/package/@waiaas/cli)
- [npm: @waiaas/sdk](https://www.npmjs.com/package/@waiaas/sdk)

## License

MIT
