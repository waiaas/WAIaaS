# @waiaas/sdk

TypeScript SDK for WAIaaS (Wallet-as-a-Service for AI Agents).

## Install

```bash
npm install @waiaas/sdk
```

## Quick Start

```typescript
import { WAIaaSClient } from '@waiaas/sdk';

const client = new WAIaaSClient({
  baseUrl: 'http://127.0.0.1:3100',
  sessionToken: process.env.WAIAAS_SESSION_TOKEN,
});

// Check balance
const balance = await client.getBalance();
console.log(`${balance.balance} ${balance.symbol}`);

// Send native token
const tx = await client.sendToken({
  to: 'recipient-address...',
  amount: '0.1',
});
console.log(`Transaction: ${tx.id}`);
```

## API Methods

| Method | Description |
|--------|-------------|
| `getBalance()` | Get wallet native token balance |
| `getAddress()` | Get wallet address |
| `getAssets()` | Get all token balances |
| `sendToken()` | Send native or token transfer |
| `getTransaction()` | Get transaction by ID |
| `listTransactions()` | List transaction history |
| `signTransaction()` | Sign arbitrary transaction |
| `x402Fetch()` | HTTP fetch with automatic 402 payment |

## Requirements

- Node.js >= 22.0.0
- A running WAIaaS daemon with a session token

## Documentation

Full documentation: [github.com/waiaas/WAIaaS](https://github.com/waiaas/WAIaaS)

## License

MIT
