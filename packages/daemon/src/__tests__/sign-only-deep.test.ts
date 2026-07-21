/**
 * Deep branch coverage tests for sign-only.ts mapOperationToParam.
 *
 * Covers all switch branches: NATIVE_TRANSFER, TOKEN_TRANSFER,
 * CONTRACT_CALL, APPROVE, UNKNOWN/default.
 */

import { describe, it, expect } from 'vitest';
import { mapOperationToParam } from '../pipeline/sign-only.js';
import type { ParsedOperation } from '@waiaas/core';

describe('mapOperationToParam', () => {
  it('NATIVE_TRANSFER maps to TRANSFER', () => {
    const op: ParsedOperation = { type: 'NATIVE_TRANSFER', to: '0xABC', amount: 1000n };
    const param = mapOperationToParam(op, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('TRANSFER');
    expect(param.amount).toBe('1000');
    expect(param.toAddress).toBe('0xABC');
    expect(param.chain).toBe('ethereum');
    expect(param.network).toBe('ethereum-mainnet');
  });

  it('NATIVE_TRANSFER with no amount/to', () => {
    const op: ParsedOperation = { type: 'NATIVE_TRANSFER' };
    const param = mapOperationToParam(op, 'ethereum');
    expect(param.amount).toBe('0');
    expect(param.toAddress).toBe('');
  });

  it('TOKEN_TRANSFER maps correctly', () => {
    const op: ParsedOperation = { type: 'TOKEN_TRANSFER', to: '0xABC', amount: 5000n, token: '0xUSDC' };
    const param = mapOperationToParam(op, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('TOKEN_TRANSFER');
    expect(param.tokenAddress).toBe('0xUSDC');
    expect(param.amount).toBe('5000');
    expect(param.assetId).toBeUndefined();
  });

  it('TOKEN_TRANSFER with no amount/to', () => {
    const op: ParsedOperation = { type: 'TOKEN_TRANSFER', token: '0xTKN' };
    const param = mapOperationToParam(op, 'solana');
    expect(param.amount).toBe('0');
    expect(param.toAddress).toBe('');
  });

  it('CONTRACT_CALL maps correctly', () => {
    const op: ParsedOperation = { type: 'CONTRACT_CALL', to: '0xContract', method: '0xa9059cbb' };
    const param = mapOperationToParam(op, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('CONTRACT_CALL');
    expect(param.contractAddress).toBe('0xContract');
    expect(param.selector).toBe('0xa9059cbb');
    expect(param.amount).toBe('0');
  });

  it('CONTRACT_CALL with programId (Solana)', () => {
    const op: ParsedOperation = { type: 'CONTRACT_CALL', programId: 'TokenProgram111' };
    const param = mapOperationToParam(op, 'solana');
    expect(param.toAddress).toBe('TokenProgram111');
    expect(param.contractAddress).toBe('TokenProgram111');
  });

  it('CONTRACT_CALL with no to/programId', () => {
    const op: ParsedOperation = { type: 'CONTRACT_CALL' };
    const param = mapOperationToParam(op, 'ethereum');
    expect(param.toAddress).toBe('');
  });

  it('APPROVE maps correctly', () => {
    const op: ParsedOperation = { type: 'APPROVE', to: '0xSpender', amount: 1000000n };
    const param = mapOperationToParam(op, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('APPROVE');
    expect(param.spenderAddress).toBe('0xSpender');
    expect(param.approveAmount).toBe('1000000');
  });

  it('APPROVE with no amount', () => {
    const op: ParsedOperation = { type: 'APPROVE', to: '0xSpender' };
    const param = mapOperationToParam(op, 'ethereum');
    expect(param.approveAmount).toBe('0');
  });

  it('UNKNOWN maps to CONTRACT_CALL', () => {
    const op: ParsedOperation = { type: 'UNKNOWN', to: '0xUnknown', method: 'doThing' };
    const param = mapOperationToParam(op, 'ethereum', 'ethereum-mainnet');
    expect(param.type).toBe('CONTRACT_CALL');
    expect(param.contractAddress).toBe('0xUnknown');
    expect(param.selector).toBe('doThing');
  });

  it('default/fallback maps to CONTRACT_CALL', () => {
    const op = { type: 'SOME_FUTURE_TYPE' } as unknown as ParsedOperation;
    const param = mapOperationToParam(op, 'ethereum');
    expect(param.type).toBe('CONTRACT_CALL');
  });
});
