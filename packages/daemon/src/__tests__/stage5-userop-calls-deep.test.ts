/**
 * Deep branch coverage tests for buildUserOpCalls in stage5-execute.ts.
 *
 * Covers branches:
 * - CONTRACT_CALL without calldata (falls back to '0x')
 * - CONTRACT_CALL with value
 * - BATCH with calldata instruction that has value
 * - BATCH with token transfer instruction
 * - NFT_TRANSFER without walletAddress (zero address fallback)
 * - NFT_TRANSFER with amount for ERC-1155
 * - CONTRACT_DEPLOY with constructorArgs
 * - CONTRACT_DEPLOY without constructorArgs
 * - Unknown type for UserOp
 * - APPROVE with NFT ERC-1155 standard
 * - Legacy request without type field
 */

import { describe, it, expect } from 'vitest';
import { buildUserOpCalls } from '../pipeline/stage5-execute.js';
import { WAIaaSError } from '@waiaas/core';

describe('buildUserOpCalls deep branches', () => {
  it('TRANSFER: basic native transfer', () => {
    const calls = buildUserOpCalls({
      type: 'TRANSFER',
      to: '0x1234567890123456789012345678901234567890',
      amount: '1000000000000000000',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.value).toBe(1000000000000000000n);
    expect(calls[0]!.data).toBe('0x');
  });

  it('CONTRACT_CALL without calldata defaults to 0x', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_CALL',
      to: '0x1234567890123456789012345678901234567890',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.data).toBe('0x');
    expect(calls[0]!.value).toBe(0n);
  });

  it('CONTRACT_CALL with value', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_CALL',
      to: '0x1234567890123456789012345678901234567890',
      calldata: '0xdeadbeef',
      value: '500',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.value).toBe(500n);
  });

  it('CONTRACT_DEPLOY with constructorArgs', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_DEPLOY',
      bytecode: '0x60806040',
      constructorArgs: '0x00000001',
      value: '100',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.data).toBe('0x6080604000000001');
    expect(calls[0]!.value).toBe(100n);
  });

  it('CONTRACT_DEPLOY without constructorArgs', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_DEPLOY',
      bytecode: '0x60806040',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.data).toBe('0x60806040');
    expect(calls[0]!.value).toBe(0n);
  });

  it('NFT_TRANSFER without walletAddress uses zero address', () => {
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER',
      to: '0x1234567890123456789012345678901234567890',
      token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', tokenId: '42', standard: 'ERC-721' },
    } as any);

    expect(calls).toHaveLength(1);
    // encoded safeTransferFrom should include the zero address as 'from'
    expect(calls[0]!.data).toBeTruthy();
    expect(calls[0]!.value).toBe(0n);
  });

  it('NFT_TRANSFER ERC-1155 with amount', () => {
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER',
      to: '0x1234567890123456789012345678901234567890',
      amount: '10',
      token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', tokenId: '5', standard: 'ERC-1155' },
    } as any, '0x' + 'ab'.repeat(20));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.value).toBe(0n);
  });

  it('NFT_TRANSFER ERC-1155 without amount defaults to 1', () => {
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER',
      to: '0x1234567890123456789012345678901234567890',
      token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', tokenId: '5', standard: 'ERC-1155' },
    } as any, '0x' + 'ab'.repeat(20));

    expect(calls).toHaveLength(1);
  });

  it('APPROVE NFT ERC-1155 setApprovalForAll', () => {
    const calls = buildUserOpCalls({
      type: 'APPROVE',
      spender: '0x1234567890123456789012345678901234567890',
      amount: '1',
      token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', decimals: 0, symbol: 'NFT' },
      nft: { tokenId: '42', standard: 'ERC-1155' },
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.value).toBe(0n);
  });

  it('unknown type throws WAIaaSError', () => {
    expect(() => {
      buildUserOpCalls({ type: 'UNKNOWN_TYPE' } as any);
    }).toThrow(WAIaaSError);
  });

  it('legacy request without type defaults to TRANSFER', () => {
    const calls = buildUserOpCalls({
      to: '0x1234567890123456789012345678901234567890',
      amount: '1000',
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.value).toBe(1000n);
    expect(calls[0]!.data).toBe('0x');
  });

  it('BATCH with all instruction sub-types', () => {
    const calls = buildUserOpCalls({
      type: 'BATCH',
      instructions: [
        // APPROVE (has 'spender')
        { spender: '0x1234567890123456789012345678901234567890', amount: '100', token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD', decimals: 6 } },
        // TOKEN_TRANSFER (has 'token')
        { to: '0x1234567890123456789012345678901234567890', amount: '200', token: { address: '0xAABBCCDDEEFF00112233445566778899AABBCCDD' } },
        // CONTRACT_CALL (has 'calldata')
        { to: '0x1234567890123456789012345678901234567890', calldata: '0xabcdef', value: '50' },
        // CONTRACT_CALL without value
        { to: '0x1234567890123456789012345678901234567890', calldata: '0xabcdef' },
        // TRANSFER (default)
        { to: '0x1234567890123456789012345678901234567890', amount: '300' },
      ],
    } as any);

    expect(calls).toHaveLength(5);
    // APPROVE
    expect(calls[0]!.value).toBe(0n);
    // TOKEN_TRANSFER
    expect(calls[1]!.value).toBe(0n);
    // CONTRACT_CALL with value
    expect(calls[2]!.value).toBe(50n);
    // CONTRACT_CALL without value
    expect(calls[3]!.value).toBe(0n);
    // TRANSFER
    expect(calls[4]!.value).toBe(300n);
  });

  it('BATCH calldata instruction without calldata content defaults to 0x', () => {
    const calls = buildUserOpCalls({
      type: 'BATCH',
      instructions: [
        { to: '0x1234567890123456789012345678901234567890', calldata: '' },
      ],
    } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.data).toBe('0x');
  });
});
