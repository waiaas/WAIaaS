/**
 * Built-in RPC defaults for 18 networks (9 mainnet + 9 testnet).
 *
 * These are public, free-tier RPC endpoints. They provide a working
 * out-of-the-box experience without any configuration. Users should
 * add their own premium RPC endpoints for production use.
 *
 * @module @waiaas/core/rpc
 */

/**
 * Built-in default RPC URLs for all supported networks.
 *
 * - **Mainnet (9):** solana-mainnet, ethereum-mainnet, arbitrum-mainnet,
 *   optimism-mainnet, base-mainnet, polygon-mainnet, hyperevm-mainnet,
 *   xrpl-mainnet
 * - **Testnet (9):** solana-devnet, solana-testnet, ethereum-sepolia,
 *   arbitrum-sepolia, optimism-sepolia, base-sepolia, polygon-amoy,
 *   hyperevm-testnet, xrpl-testnet, xrpl-devnet
 *
 * URLs are ordered by priority (index 0 = highest priority).
 * All URLs use https:// (or wss:// for XRPL) protocol.
 */
export const BUILT_IN_RPC_DEFAULTS: Readonly<Record<string, readonly string[]>> = {
  // ─── Mainnet (8 networks) ──────────────────────────────────────
  'solana-mainnet': [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana.drpc.org',
  ],
  'ethereum-mainnet': [
    'https://eth.drpc.org',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ],
  'arbitrum-mainnet': [
    'https://arbitrum.drpc.org',
    'https://arbitrum.publicnode.com',
  ],
  'optimism-mainnet': [
    'https://optimism.drpc.org',
    'https://mainnet.optimism.io',
    'https://optimism.publicnode.com',
  ],
  'base-mainnet': [
    'https://base.drpc.org',
    'https://base.publicnode.com',
  ],
  'polygon-mainnet': [
    'https://polygon.drpc.org',
    'https://polygon-rpc.com',
    'https://polygon.publicnode.com',
  ],
  'hyperevm-mainnet': [
    'https://rpc.hyperliquid.xyz/evm',
  ],
  'xrpl-mainnet': [
    'wss://xrplcluster.com',
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
  ],

  // ─── Testnet (9 networks) ─────────────────────────────────────
  'solana-devnet': [
    'https://api.devnet.solana.com',
    'https://rpc.ankr.com/solana_devnet',
  ],
  'solana-testnet': [
    'https://api.testnet.solana.com',
  ],
  // sepolia.drpc.org and rpc.sepolia.org were removed in 2026-08: the former
  // became a paid-plan-only chain (JSON-RPC error code 35), the latter 404s.
  'ethereum-sepolia': [
    'https://1rpc.io/sepolia',
    'https://0xrpc.io/sep',
    'https://ethereum-sepolia-rpc.publicnode.com',
  ],
  'arbitrum-sepolia': [
    'https://arbitrum-sepolia.drpc.org',
    'https://arbitrum-sepolia-rpc.publicnode.com',
  ],
  'optimism-sepolia': [
    'https://optimism-sepolia.drpc.org',
    'https://optimism-sepolia-rpc.publicnode.com',
  ],
  'base-sepolia': [
    'https://base-sepolia.drpc.org',
    'https://base-sepolia-rpc.publicnode.com',
  ],
  'polygon-amoy': [
    'https://polygon-amoy.drpc.org',
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy-bor-rpc.publicnode.com',
  ],
  'hyperevm-testnet': [
    'https://rpc.hyperliquid-testnet.xyz/evm',
  ],
  'xrpl-testnet': [
    'wss://s.altnet.rippletest.net:51233',
  ],
  'xrpl-devnet': [
    'wss://s.devnet.rippletest.net:51233',
  ],
} as const;
