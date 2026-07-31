# @waiaas/cli

Command-line interface for WAIaaS (Wallet-as-a-Service for AI Agents).

## Install

```bash
npm install -g @waiaas/cli
```

## Quick Start

```bash
waiaas init                        # Create data directory + config
waiaas start                       # Start daemon
waiaas quickset --mode testnet     # Create wallets + MCP sessions
```

## Commands

| Command | Description |
|---------|-------------|
| `waiaas init` | Initialize data directory and config.toml |
| `waiaas start` | Start the wallet daemon |
| `waiaas quickset` | Create wallets and MCP sessions in one step |
| `waiaas mcp setup` | Configure MCP server for Claude Desktop |
| `waiaas --help` | Show all available commands |

## Requirements

- Node.js >= 22.0.0

## Documentation

Full documentation: [github.com/waiaas/WAIaaS](https://github.com/waiaas/WAIaaS)

## License

MIT
