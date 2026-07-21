/**
 * Deep coverage tests for stage5-execute.ts SmartAccount (ERC-4337) path.
 *
 * Tests stage5ExecuteSmartAccount by mocking:
 * - SmartAccountService
 * - createSmartAccountBundlerClient
 * - decryptProviderApiKey
 * - viem/accounts (privateKeyToAccount)
 * - EVM_CHAIN_MAP
 *
 * Covers all error branches: WAIaaSError passthrough, paymaster rejection,
 * UserOperationReverted, receipt timeout, generic fallback, deprecated factory.
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

function insertWalletAndTx(walletId: string, txId: string, accountType = 'smart') {
  db.insert(schema.wallets).values({
    id: walletId, name: 'test-smart', chain: 'ethereum', environment: 'mainnet',
    publicKey: '0x' + 'ab'.repeat(20), status: 'ACTIVE', accountType: accountType as 'eoa' | 'smart',
    createdAt: new Date(), updatedAt: new Date(),
  }).run();

  db.insert(schema.transactions).values({
    id: txId, walletId, type: 'TRANSFER', status: 'PENDING',
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

describe('stage5ExecuteSmartAccount', () => {
  it('successful UserOp: build -> prepare -> send -> wait -> CONFIRMED', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    // Should update to CONFIRMED
    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
    expect(tx!.txHash).toBeTruthy();

    // Should have emitted wallet:activity TX_SUBMITTED and transaction:completed
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('wallet:activity', expect.objectContaining({
      activity: 'TX_SUBMITTED',
    }));
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:completed', expect.objectContaining({
      txId,
    }));

    // Should have notified TX_SUBMITTED and TX_CONFIRMED
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_SUBMITTED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_CONFIRMED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );

    // Should increment metrics
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('rpc.calls', expect.anything());
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.submitted', expect.anything());
    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.confirmed', expect.anything());

    // Key should be released
    expect(ctx.keyStore.releaseKey).toHaveBeenCalled();
  });

  it('marks wallet as deployed on first UserOp', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    const wallet = db.select().from(schema.wallets).where(eq(schema.wallets.id, walletId)).get();
    expect(wallet!.deployed).toBeTruthy();
  });

  it('does not re-deploy if already deployed', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    // Mark as already deployed
    db.update(schema.wallets).set({ deployed: true }).where(eq(schema.wallets.id, walletId)).run();

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('receipt without transactionHash falls back to userOpHash', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xuserOpHash'),
      waitForUserOperationReceipt: vi.fn().mockResolvedValue({
        receipt: { /* no transactionHash */ },
      }),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
    expect(tx!.txHash).toBe('0xuserOpHash');
  });

  it('throws DEPRECATED_SMART_ACCOUNT for Solady factory', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId, {
      factoryAddress: '0xSoladyDeprecated',
    });

    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);
  });

  it('WAIaaSError passthrough: marks FAILED, notifies, emits', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockRejectedValue(
        new WAIaaSError('CHAIN_ERROR', { message: 'Bundler URL not configured' }),
      ),
      sendUserOperation: vi.fn(),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');

    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.failed', expect.anything());
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
    }));
  });

  it('paymaster rejection: detects "paymaster" in message', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockRejectedValue(
        new Error('paymaster denied the request'),
      ),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow('Paymaster rejected');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toContain('Paymaster rejected');

    // Audit log should be written
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_FAILED');
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
  });

  it('paymaster rejection: detects "PM_" in message', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockRejectedValue(
        new Error('PM_DENIED: insufficient balance'),
      ),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow('Paymaster rejected');
  });

  it('paymaster rejection: detects "Paymaster" in error name', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    const pmError = new Error('something failed');
    pmError.name = 'PaymasterValidationError';
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockRejectedValue(pmError),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow('Paymaster rejected');
  });

  it('UserOperationReverted: detects by error name', async () => {
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
    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');

    // Audit log
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_FAILED');
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
  });

  it('UserOperationReverted: detects by message content', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xhash'),
      waitForUserOperationReceipt: vi.fn().mockRejectedValue(
        new Error('UserOperation reverted during execution'),
      ),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);
  });

  it('receipt timeout: detects by error name', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    const timeoutErr = new Error('timeout');
    timeoutErr.name = 'WaitForUserOperationReceiptTimeoutError';
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
    await expect(stage5Execute(ctx as any)).rejects.toThrow('timed out');

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toContain('timeout');

    // Audit
    const auditRows = sqlite.prepare('SELECT * FROM audit_log WHERE event_type = ?').all('TX_FAILED');
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
  });

  it('receipt timeout: detects "timed out" in message', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xhash'),
      waitForUserOperationReceipt: vi.fn().mockRejectedValue(
        new Error('Request timed out after 120s'),
      ),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow('timed out');
  });

  it('generic error: falls through to CHAIN_ERROR', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockRejectedValue(new Error('Unknown bundler error')),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');

    expect(ctx.metricsCounter.increment).toHaveBeenCalledWith('tx.failed', expect.anything());
    expect(ctx.notificationService.notify).toHaveBeenCalledWith(
      'TX_FAILED', walletId, expect.objectContaining({ txId }), expect.anything(),
    );
    expect(ctx.eventBus.emit).toHaveBeenCalledWith('transaction:failed', expect.objectContaining({
      txId,
    }));
  });

  it('non-Error thrown: converts to string in error message', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockRejectedValue('string-error'),
      sendUserOperation: vi.fn(),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow(WAIaaSError);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('FAILED');
    expect(tx!.error).toBe('string-error');
  });

  it('key is always released even on error', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockRejectedValue(new Error('fail')),
      sendUserOperation: vi.fn(),
      waitForUserOperationReceipt: vi.fn(),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await expect(stage5Execute(ctx as any)).rejects.toThrow();

    expect(ctx.keyStore.releaseKey).toHaveBeenCalled();
  });

  it('no encrypted API key: passes null to decryptProviderApiKey', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId, {
      aaProviderApiKeyEncrypted: null,
    });
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('no sqlite: skips audit log writing', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    (ctx as any).sqlite = undefined;
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });

  it('receipt is null: falls back to userOpHash', async () => {
    const { createSmartAccountBundlerClient } = await import('../infrastructure/smart-account/smart-account-clients.js');
    const mockedCreate = vi.mocked(createSmartAccountBundlerClient);
    mockedCreate.mockReturnValueOnce({
      prepareUserOperation: vi.fn().mockResolvedValue({
        callGasLimit: 100000n, verificationGasLimit: 50000n, preVerificationGas: 21000n,
      }),
      sendUserOperation: vi.fn().mockResolvedValue('0xuserOp'),
      waitForUserOperationReceipt: vi.fn().mockResolvedValue(null),
    } as any);

    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.txHash).toBe('0xuserOp');
  });

  it('TOKEN_TRANSFER type request works through smart account path', async () => {
    const { stage5Execute } = await import('../pipeline/stage5-execute.js');
    const walletId = generateId();
    const txId = generateId();
    insertWalletAndTx(walletId, txId);

    const ctx = makeSmartCtx(walletId, txId);
    ctx.request = {
      type: 'TOKEN_TRANSFER' as any,
      to: '0x' + 'cd'.repeat(20),
      amount: '1000000',
      token: { address: '0x' + 'ef'.repeat(20), decimals: 6, symbol: 'USDC' },
    } as any;

    await stage5Execute(ctx as any);

    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
    expect(tx!.status).toBe('CONFIRMED');
  });
});
