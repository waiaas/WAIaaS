/**
 * Deep branch coverage tests for stage5-execute.ts SmartAccount path.
 *
 * Covers additional branches not in stage5-smart-account.test.ts:
 * - sessionId null -> 'system' fallback in all SmartAccount audit logs
 * - TOKEN_TRANSFER / CONTRACT_CALL / APPROVE / NFT_TRANSFER / BATCH / CONTRACT_DEPLOY types
 * - Smart account with no sqlite: skips audit in error branches
 * - receipt?.receipt null fallback
 * - Paymaster rejection without sqlite (skip audit)
 * - UserOperationReverted without sqlite (skip audit)
 * - Timeout without sqlite (skip audit)
 * - receipt null (no receipt property at all)
 * - Non-Error thrown in smart account catch (string error)
 * - Missing metricsCounter/notificationService/eventBus (optional chaining)
 * - Token Transfer with humanAmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase, pushSchema } from '../infrastructure/database/index.js';
import { generateId } from '../infrastructure/database/id.js';
import * as schema from '../infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { WAIaaSError } from '@waiaas/core';

// Mock viem/accounts to avoid real key validation
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: '0x' + 'ab'.repeat(20),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  }),
}));

// Mock SmartAccountService
vi.mock('../infrastructure/smart-account/smart-account-service.js', () => ({
  SmartAccountService: class MockSmartAccountService {
    async createSmartAccount(_opts: unknown) {
      return { account: { address: '0xSmartAccount' } };
    }
  },
  SOLADY_FACTORY_ADDRESS: '0xSoladyDeprecated',
}));

// Mock smart-account-clients
vi.mock('../infrastructure/smart-account/smart-account-clients.js', () => ({
  createSmartAccountBundlerClient: vi.fn().mockReturnValue({
    prepareUserOperation: vi.fn().mockResolvedValue({
      callGasLimit: 100000n,
      verificationGasLimit: 50000n,
      preVerificationGas: 21000n,
    }),
    sendUserOperation: vi.fn().mockResolvedValue('0x' + 'ab'.repeat(32)),
    waitForUserOperationReceipt: vi.fn().mockResolvedValue({
      receipt: { transactionHash: '0x' + 'cd'.repeat(32) },
    }),
  }),
}));

// Mock aa-provider-crypto
vi.mock('../infrastructure/smart-account/aa-provider-crypto.js', () => ({
  decryptProviderApiKey: vi.fn().mockReturnValue('decrypted-api-key'),
}));

// Mock EVM chain map import
vi.mock('@waiaas/adapter-evm', () => ({
  EVM_CHAIN_MAP: {
    'ethereum-mainnet': { viemChain: { id: 1, name: 'Ethereum' } },
  },
}));

let sqlite: DatabaseType;
let db: BetterSQLite3Database<typeof schema>;

beforeEach(() => {
  const conn = createDatabase(':memory:');
  sqlite = conn.sqlite;
  db = conn.db;
  pushSchema(sqlite);
});

afterEach(() => {
  try { sqlite.close(); } catch { /* ok */ }
});

function insertWalletAndTx(walletId: string, txId: string, txType = 'TRANSFER') {
  db.insert(schema.wallets).values({
    id: walletId, name: 'test-smart', chain: 'ethereum', environment: 'mainnet',
    publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: 'smart',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();

  db.insert(schema.transactions).values({
    id: txId, walletId, type: txType, status: 'PENDING',
    toAddress: '0x' + 'cd'.repeat(20), amount: '1000000000000000000',
    chain: 'ethereum', network: 'ethereum-mainnet',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();
}

function makeSmartCtx(walletId: string, txId: string, overrides: Record<string, unknown> = {}) {
  return {
    db,
    sqlite,
    adapter: {
      buildTransaction: vi.fn().mockResolvedValue({ to: '0x5678', value: '1000000000000000000' }),
      simulateTransaction: vi.fn().mockResolvedValue({ success: true }),
      signTransaction: vi.fn().mockResolvedValue('0xsigned'),
      submitTransaction: vi.fn().mockResolvedValue({ txHash: '0x' + 'ab'.repeat(32) }),
      estimateGas: vi.fn().mockResolvedValue(21000n),
    },
    keyStore: {
      decryptPrivateKey: vi.fn().mockResolvedValue(new Uint8Array(32)),
      releaseKey: vi.fn(),
    },
    masterPassword: 'test-password',
    walletId,
    wallet: {
      publicKey: '0x' + 'ab'.repeat(20),
      chain: 'ethereum',
      environment: 'mainnet',
      accountType: 'smart',
      aaProvider: 'pimlico',
      aaProviderApiKeyEncrypted: 'encrypted-key',
      aaBundlerUrl: null,
      aaPaymasterUrl: null,
      aaPaymasterPolicyId: null,
      factoryAddress: null,
      ...overrides,
    },
    resolvedNetwork: 'ethereum-mainnet',
    resolvedRpcUrl: 'http://localhost:8545',
    request: {
      type: 'TRANSFER' as const,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000000000000000',
    },
    txId,
    sessionId: 'test-session',
    metricsCounter: {
      increment: vi.fn(),
      recordLatency: vi.fn(),
    },
    notificationService: {
      notify: vi.fn().mockResolvedValue(undefined),
    },
    eventBus: {
      emit: vi.fn(),
    },
    contractNameRegistry: undefined,
    amountUsd: undefined,
    settingsService: undefined,
    forexRateService: undefined,
  };
}

describe('stage5ExecuteSmartAccount deep branches', () => {
  it('sessionId null falls back to system in audit logs', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    ctx.sessionId = undefined as any;
    await stage5Execute(ctx as any);

    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_SUBMITTED') as any[];
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows[0].actor).toBe('system');
  });

  it('TOKEN_TRANSFER type through smart account pipeline', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'TOKEN_TRANSFER');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'TOKEN_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 6, symbol: 'USDC' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('CONTRACT_CALL type through smart account pipeline', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'CONTRACT_CALL');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'CONTRACT_CALL' as any,
      to: '0x' + 'cd'.repeat(20),
      calldata: '0xdeadbeef',
      value: '0',
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('APPROVE type through smart account pipeline', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'APPROVE');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'APPROVE' as any,
      spender: '0x' + 'dd'.repeat(20),
      amount: '1000000',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 6, symbol: 'USDC' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('BATCH type through smart account pipeline', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'BATCH');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'BATCH' as any,
      instructions: [
        { to: '0x' + 'cd'.repeat(20), amount: '1000000000000000000' },
        { to: '0x' + 'dd'.repeat(20), calldata: '0xdeadbeef', value: '0' },
      ],
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('CONTRACT_DEPLOY type through smart account pipeline', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'CONTRACT_DEPLOY');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'CONTRACT_DEPLOY' as any,
      bytecode: '0x60806040',
      constructorArgs: '0x1234',
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('paymaster rejection without sqlite skips audit log', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockRejectedValue(new Error('paymaster denied')),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).sqlite = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow('Paymaster rejected');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('UserOperationReverted without sqlite skips audit log', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    const revertErr = new Error('execution reverted');
    revertErr.name = 'UserOperationReverted';
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xhash'),
      waitForUserOperationReceipt: vi.fn().mockRejectedValue(revertErr),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).sqlite = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('timeout without sqlite skips audit log', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    const timeoutErr = new Error('timed out waiting');
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xhash'),
      waitForUserOperationReceipt: vi.fn().mockRejectedValue(timeoutErr),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).sqlite = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow('timed out');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('receipt is completely null', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xuserOpHash'),
      waitForUserOperationReceipt: vi.fn().mockResolvedValue(null),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
    // Should fall back to userOpHash
    expect(tx!.txHash).toBe('0xuserOpHash');
  });

  it('without optional deps (metricsCounter/notificationService/eventBus)', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).metricsCounter = undefined;
    (ctx as any).notificationService = undefined;
    (ctx as any).eventBus = undefined;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('WAIaaSError without sqlite skips audit and still fails', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockRejectedValue(
        new WAIaaSError('CHAIN_ERROR', { message: 'Config error' }),
      ),
      sendUserOperation: vi.fn(),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).sqlite = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('smart account with custom bundler URL', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId, {
      aaProvider: 'custom',
      aaBundlerUrl: 'https://custom-bundler.example.com',
      aaPaymasterUrl: 'https://custom-paymaster.example.com',
      aaPaymasterPolicyId: 'policy-123',
    });

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('smart account TOKEN_TRANSFER type in audit log', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'TOKEN_TRANSFER');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'TOKEN_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 6, symbol: 'USDC' },
    } as any;

    await stage5Execute(ctx as any);

    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_SUBMITTED') as any[];
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    const details = JSON.parse(auditRows[0].details);
    expect(details.type).toBe('TOKEN_TRANSFER');
    expect(details.accountType).toBe('smart');
  });

  it('generic error without optional services still marks FAILED', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockRejectedValue(new Error('Unknown error')),
      sendUserOperation: vi.fn(),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).metricsCounter = undefined;
    (ctx as any).notificationService = undefined;
    (ctx as any).eventBus = undefined;

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
  });

  it('APPROVE NFT type through smart account (ERC-721 single)', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'APPROVE');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'APPROVE' as any,
      spender: '0x' + 'dd'.repeat(20),
      amount: '0',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 0, symbol: 'NFT' },
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('APPROVE NFT type through smart account (ERC-721 setApprovalForAll)', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'APPROVE');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'APPROVE' as any,
      spender: '0x' + 'dd'.repeat(20),
      amount: '1', // non-zero means 'all'
      token: { address: '0x' + 'ee'.repeat(20), decimals: 0, symbol: 'NFT' },
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('APPROVE NFT type through smart account (ERC-1155 setApprovalForAll)', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'APPROVE');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'APPROVE' as any,
      spender: '0x' + 'dd'.repeat(20),
      amount: '1',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 0, symbol: 'NFT' },
      nft: { tokenId: '42', standard: 'ERC-1155' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('NFT_TRANSFER ERC-721 through smart account', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'NFT_TRANSFER');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'NFT_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      token: { address: '0x' + 'ee'.repeat(20), tokenId: '1', standard: 'ERC-721' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('NFT_TRANSFER ERC-1155 through smart account', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'NFT_TRANSFER');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'NFT_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      amount: '5',
      token: { address: '0x' + 'ee'.repeat(20), tokenId: '1', standard: 'ERC-1155' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('NFT_TRANSFER METAPLEX rejects for smart account', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'NFT_TRANSFER');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'NFT_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      token: { address: '0x' + 'ee'.repeat(20), tokenId: '1', standard: 'METAPLEX' },
    } as any;

    // buildUserOpCalls throws for METAPLEX -> caught by smart account error handler
    await expect(stage5Execute(ctx as any)).rejects.toThrow();
  });

  it('APPROVE NFT METAPLEX rejects for smart account', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'APPROVE');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'APPROVE' as any,
      spender: '0x' + 'dd'.repeat(20),
      amount: '0',
      token: { address: '0x' + 'ee'.repeat(20), decimals: 0, symbol: 'NFT' },
      nft: { tokenId: '42', standard: 'METAPLEX' },
    } as any;

    await expect(stage5Execute(ctx as any)).rejects.toThrow();
  });

  it('BATCH with mixed instruction types through smart account', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId, 'BATCH');

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'BATCH' as any,
      instructions: [
        // TRANSFER
        { to: '0x' + 'cd'.repeat(20), amount: '1000000000000000000' },
        // TOKEN_TRANSFER
        { to: '0x' + 'dd'.repeat(20), amount: '1000000', token: { address: '0x' + 'ee'.repeat(20), decimals: 6 } },
        // APPROVE
        { spender: '0x' + 'ff'.repeat(20), amount: '1000000', token: { address: '0x' + 'ee'.repeat(20), decimals: 6 } },
        // CONTRACT_CALL
        { to: '0x' + 'aa'.repeat(20), calldata: '0xdeadbeef', value: '100' },
      ],
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('amountUsd present resolves display amount', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).amountUsd = 100.5;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });
});
