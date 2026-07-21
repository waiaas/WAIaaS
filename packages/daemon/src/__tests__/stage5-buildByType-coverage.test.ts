/**
 * Coverage tests for stage5-execute.ts buildByType and buildUserOpCalls.
 *
 * Targets uncovered branches:
 * - buildByType: all 7 transaction types + default error
 * - buildUserOpCalls: all 7 types including BATCH sub-instruction classification
 * - NFT approval routing (single vs all, ERC-721 vs ERC-1155)
 * - CONTRACT_DEPLOY type
 * - BATCH instruction classification (spender, token, calldata, programId, default transfer)
 */

import { describe, it, expect, vi } from 'vitest';
import { buildByType, buildUserOpCalls, ERC721_USEROP_ABI, ERC1155_USEROP_ABI } from '../pipeline/stage5-execute.js';
import type { IChainAdapter, UnsignedTransaction } from '@waiaas/core';

// ---------------------------------------------------------------------------
// Mock adapter
// ---------------------------------------------------------------------------

function mockAdapter(): IChainAdapter {
  const unsignedTx: UnsignedTransaction = {
    chain: 'solana', serialized: new Uint8Array(128), estimatedFee: 5000n, metadata: {},
  };
  return {
    chain: 'solana' as const,
    network: 'devnet' as const,
    buildTransaction: vi.fn().mockResolvedValue(unsignedTx),
    buildTokenTransfer: vi.fn().mockResolvedValue(unsignedTx),
    buildContractCall: vi.fn().mockResolvedValue(unsignedTx),
    buildApprove: vi.fn().mockResolvedValue(unsignedTx),
    buildBatch: vi.fn().mockResolvedValue(unsignedTx),
    buildNftTransferTx: vi.fn().mockResolvedValue(unsignedTx),
    approveNft: vi.fn().mockResolvedValue(unsignedTx),
  } as unknown as IChainAdapter;
}

// ---------------------------------------------------------------------------
// buildByType tests
// ---------------------------------------------------------------------------

describe('buildByType', () => {
  it('routes TRANSFER to buildTransaction', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, { type: 'TRANSFER', to: 'addr1', amount: '1000' } as any, 'pubkey1');
    expect(adapter.buildTransaction).toHaveBeenCalled();
  });

  it('routes legacy request (no type) to buildTransaction', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, { to: 'addr1', amount: '1000' } as any, 'pubkey1');
    expect(adapter.buildTransaction).toHaveBeenCalled();
  });

  it('routes TOKEN_TRANSFER to buildTokenTransfer', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'TOKEN_TRANSFER', to: 'addr1', amount: '1000',
      token: { address: 'tkn1', decimals: 6, symbol: 'USDC' },
    } as any, 'pubkey1');
    expect(adapter.buildTokenTransfer).toHaveBeenCalled();
  });

  it('routes CONTRACT_CALL to buildContractCall', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'CONTRACT_CALL', to: 'addr1', calldata: '0x1234',
    } as any, 'pubkey1');
    expect(adapter.buildContractCall).toHaveBeenCalled();
  });

  it('routes CONTRACT_CALL with preInstructions', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'CONTRACT_CALL', to: 'addr1', calldata: '0x1234',
      preInstructions: [
        { programId: 'prog1', data: Buffer.from('test').toString('base64'), accounts: [] },
      ],
    } as any, 'pubkey1');
    expect(adapter.buildContractCall).toHaveBeenCalled();
  });

  it('routes APPROVE to buildApprove', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'APPROVE', spender: 'spender1',
      token: { address: 'tkn1', decimals: 6, symbol: 'USDC' },
      amount: '1000',
    } as any, 'pubkey1');
    expect(adapter.buildApprove).toHaveBeenCalled();
  });

  it('routes APPROVE with nft single approval to approveNft', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'APPROVE', spender: 'spender1',
      token: { address: 'nft-collection' },
      amount: '0', // single approval
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any, 'pubkey1');
    expect((adapter as any).approveNft).toHaveBeenCalledWith(expect.objectContaining({
      approvalType: 'single',
    }));
  });

  it('routes APPROVE with nft setApprovalForAll to approveNft', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'APPROVE', spender: 'spender1',
      token: { address: 'nft-collection' },
      amount: '1', // all approval
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any, 'pubkey1');
    expect((adapter as any).approveNft).toHaveBeenCalledWith(expect.objectContaining({
      approvalType: 'all',
    }));
  });

  it('routes NFT_TRANSFER to buildNftTransferTx', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'NFT_TRANSFER', to: 'recipient',
      token: { address: 'nft-mint', tokenId: '1', standard: 'metaplex' },
    } as any, 'pubkey1');
    expect((adapter as any).buildNftTransferTx).toHaveBeenCalled();
  });

  it('routes NFT_TRANSFER with explicit amount', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'NFT_TRANSFER', to: 'recipient', amount: '5',
      token: { address: 'nft-addr', tokenId: '1', standard: 'ERC-1155' },
    } as any, 'pubkey1');
    expect((adapter as any).buildNftTransferTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5n,
    }));
  });

  it('routes CONTRACT_DEPLOY to buildContractCall', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000',
    } as any, 'pubkey1');
    expect(adapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      to: '',
      calldata: '0x6000',
    }));
  });

  it('routes CONTRACT_DEPLOY with constructorArgs', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000', constructorArgs: '0x1234',
    } as any, 'pubkey1');
    expect(adapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      calldata: '0x60001234',
    }));
  });

  it('routes CONTRACT_DEPLOY with value', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000', value: '1000',
    } as any, 'pubkey1');
    expect(adapter.buildContractCall).toHaveBeenCalledWith(expect.objectContaining({
      value: 1000n,
    }));
  });

  it('routes BATCH to buildBatch', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'BATCH', instructions: [
        { to: 'addr1', amount: '100' },
        { to: 'addr2', amount: '200', token: { address: 'tkn', decimals: 6, symbol: 'USDC' } },
      ],
    } as any, 'pubkey1');
    expect(adapter.buildBatch).toHaveBeenCalled();
  });

  it('routes BATCH with spender instruction', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'BATCH', instructions: [
        { spender: 'sp1', token: { address: 'tkn', decimals: 6, symbol: 'USDC' }, amount: '100' },
      ],
    } as any, 'pubkey1');
    expect(adapter.buildBatch).toHaveBeenCalled();
  });

  it('routes BATCH with calldata instruction', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'BATCH', instructions: [
        { to: 'addr1', calldata: '0x1234', value: '500' },
      ],
    } as any, 'pubkey1');
    expect(adapter.buildBatch).toHaveBeenCalled();
  });

  it('routes BATCH with programId instruction', async () => {
    const adapter = mockAdapter();
    await buildByType(adapter, {
      type: 'BATCH', instructions: [
        { to: 'addr1', programId: 'prog1', instructionData: Buffer.from('data').toString('base64'), accounts: [] },
      ],
    } as any, 'pubkey1');
    expect(adapter.buildBatch).toHaveBeenCalled();
  });

  it('throws for unknown type', async () => {
    const adapter = mockAdapter();
    await expect(buildByType(adapter, { type: 'UNKNOWN' } as any, 'pubkey1'))
      .rejects.toThrow('Unknown transaction type');
  });
});

// ---------------------------------------------------------------------------
// buildUserOpCalls tests
// ---------------------------------------------------------------------------

describe('buildUserOpCalls', () => {
  it('converts TRANSFER to single call', () => {
    const calls = buildUserOpCalls({ type: 'TRANSFER', to: '0x1234', amount: '1000' } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe('0x1234');
    expect(calls[0].value).toBe(1000n);
    expect(calls[0].data).toBe('0x');
  });

  it('converts TOKEN_TRANSFER to ERC-20 transfer call', () => {
    const calls = buildUserOpCalls({
      type: 'TOKEN_TRANSFER',
      to: '0x000000000000000000000000000000000000dEaD',
      amount: '1000000',
      token: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(calls[0].value).toBe(0n);
    expect(calls[0].data.length).toBeGreaterThan(10); // encoded function data
  });

  it('converts CONTRACT_CALL to call with calldata', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_CALL', to: '0xcontract', calldata: '0xdeadbeef', value: '500',
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe('0xcontract');
    expect(calls[0].value).toBe(500n);
    expect(calls[0].data).toBe('0xdeadbeef');
  });

  it('converts CONTRACT_CALL without value defaults to 0', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_CALL', to: '0xcontract', calldata: '0x1234',
    } as any);
    expect(calls[0].value).toBe(0n);
  });

  it('converts CONTRACT_CALL without calldata defaults to 0x', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_CALL', to: '0xcontract',
    } as any);
    expect(calls[0].data).toBe('0x');
  });

  it('converts APPROVE to ERC-20 approve call', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    const tokenAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const calls = buildUserOpCalls({
      type: 'APPROVE', spender, amount: '1000',
      token: { address: tokenAddr, decimals: 6, symbol: 'USDC' },
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(tokenAddr);
    expect(calls[0].value).toBe(0n);
  });

  it('converts APPROVE with ERC-721 single NFT to approve call', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const calls = buildUserOpCalls({
      type: 'APPROVE', spender, amount: '0',
      token: { address: nftAddr },
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(nftAddr);
  });

  it('converts APPROVE with ERC-721 all NFTs to setApprovalForAll', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const calls = buildUserOpCalls({
      type: 'APPROVE', spender, amount: '1',
      token: { address: nftAddr },
      nft: { tokenId: '42', standard: 'ERC-721' },
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(nftAddr);
  });

  it('converts APPROVE with ERC-1155 all to setApprovalForAll', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const calls = buildUserOpCalls({
      type: 'APPROVE', spender, amount: '1',
      token: { address: nftAddr },
      nft: { tokenId: '42', standard: 'ERC-1155' },
    } as any);
    expect(calls.length).toBe(1);
  });

  it('throws for APPROVE with METAPLEX NFT', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    expect(() => buildUserOpCalls({
      type: 'APPROVE', spender, amount: '0',
      token: { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' },
      nft: { tokenId: '42', standard: 'METAPLEX' },
    } as any)).toThrow('METAPLEX');
  });

  it('converts BATCH with mixed instructions', () => {
    const addr1 = '0x000000000000000000000000000000000000dEaD';
    const addr2 = '0x0000000000000000000000000000000000000001';
    const tokenAddr = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const contractAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const spenderAddr = '0x0000000000000000000000000000000000000002';
    const calls = buildUserOpCalls({
      type: 'BATCH', instructions: [
        { to: addr1, amount: '100' }, // transfer
        { to: addr2, amount: '200', token: { address: tokenAddr } }, // token transfer
        { spender: spenderAddr, token: { address: tokenAddr }, amount: '300' }, // approve
        { to: contractAddr, calldata: '0xabcd0000', value: '50' }, // contract call
      ],
    } as any);
    expect(calls.length).toBe(4);
    // Transfer instruction
    expect(calls[0].value).toBe(100n);
    expect(calls[0].data).toBe('0x');
    // Token transfer
    expect(calls[1].to).toBe(tokenAddr);
    // Approve
    expect(calls[2].to).toBe(tokenAddr);
    // Contract call
    expect(calls[3].to).toBe(contractAddr);
    expect(calls[3].value).toBe(50n);
  });

  it('handles legacy request (no type) as TRANSFER', () => {
    const calls = buildUserOpCalls({ to: '0x000000000000000000000000000000000000dEaD', amount: '500' } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].value).toBe(500n);
  });

  it('converts NFT_TRANSFER ERC-721 to safeTransferFrom call', () => {
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const to = '0x000000000000000000000000000000000000dEaD';
    const walletAddr = '0x0000000000000000000000000000000000000001';
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER', to,
      token: { address: nftAddr, tokenId: '42', standard: 'ERC-721' },
    } as any, walletAddr);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(nftAddr);
    expect(calls[0].value).toBe(0n);
  });

  it('converts NFT_TRANSFER ERC-1155 to safeTransferFrom call', () => {
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const to = '0x000000000000000000000000000000000000dEaD';
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER', to,
      token: { address: nftAddr, tokenId: '1', standard: 'ERC-1155' },
      amount: '5',
    } as any, '0x0000000000000000000000000000000000000001');
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(nftAddr);
  });

  it('converts NFT_TRANSFER ERC-1155 without amount defaults to 1', () => {
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const to = '0x000000000000000000000000000000000000dEaD';
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER', to,
      token: { address: nftAddr, tokenId: '1', standard: 'ERC-1155' },
    } as any);
    expect(calls.length).toBe(1);
  });

  it('throws for NFT_TRANSFER METAPLEX', () => {
    expect(() => buildUserOpCalls({
      type: 'NFT_TRANSFER', to: '0x000000000000000000000000000000000000dEaD',
      token: { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', tokenId: '1', standard: 'METAPLEX' },
    } as any)).toThrow('METAPLEX');
  });

  it('converts CONTRACT_DEPLOY to deployment call', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000600060006000',
    } as any);
    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe('0x');
    expect(calls[0].value).toBe(0n);
    expect(calls[0].data).toBe('0x6000600060006000');
  });

  it('converts CONTRACT_DEPLOY with constructorArgs', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000', constructorArgs: '0x1234',
    } as any);
    expect(calls[0].data).toBe('0x60001234');
  });

  it('converts CONTRACT_DEPLOY with value', () => {
    const calls = buildUserOpCalls({
      type: 'CONTRACT_DEPLOY', bytecode: '0x6000', value: '500',
    } as any);
    expect(calls[0].value).toBe(500n);
  });

  it('throws for unknown type in buildUserOpCalls', () => {
    expect(() => buildUserOpCalls({ type: 'UNKNOWN' } as any)).toThrow('Unknown transaction type');
  });

  it('converts BATCH with calldata instruction without value', () => {
    const calls = buildUserOpCalls({
      type: 'BATCH', instructions: [
        { to: '0x000000000000000000000000000000000000dEaD', calldata: '0x1234' },
      ],
    } as any);
    expect(calls[0].value).toBe(0n);
    expect(calls[0].data).toBe('0x1234');
  });

  it('converts BATCH with calldata instruction with empty calldata', () => {
    const calls = buildUserOpCalls({
      type: 'BATCH', instructions: [
        { to: '0x000000000000000000000000000000000000dEaD', calldata: '' },
      ],
    } as any);
    expect(calls[0].data).toBe('0x');
  });

  it('converts NFT_TRANSFER without walletAddress uses zero address', () => {
    const nftAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const calls = buildUserOpCalls({
      type: 'NFT_TRANSFER',
      to: '0x000000000000000000000000000000000000dEaD',
      token: { address: nftAddr, tokenId: '42', standard: 'ERC-721' },
    } as any);
    // Should use default zero address
    expect(calls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ABI constant tests
// ---------------------------------------------------------------------------

describe('ERC721_USEROP_ABI', () => {
  it('has safeTransferFrom, approve, and setApprovalForAll', () => {
    const names = ERC721_USEROP_ABI.map(fn => fn.name);
    expect(names).toContain('safeTransferFrom');
    expect(names).toContain('approve');
    expect(names).toContain('setApprovalForAll');
  });
});

describe('ERC1155_USEROP_ABI', () => {
  it('has safeTransferFrom and setApprovalForAll', () => {
    const names = ERC1155_USEROP_ABI.map(fn => fn.name);
    expect(names).toContain('safeTransferFrom');
    expect(names).toContain('setApprovalForAll');
  });
});
