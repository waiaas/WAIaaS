/**
 * XLS-20 NFT adapter tests for RippleAdapter.
 *
 * Tests cover:
 * - NftStandardEnum accepts 'XLS-20'
 * - buildNftTransferTx creates NFTokenCreateOffer with correct fields
 * - transferNft full pipeline (build + sign + submit)
 * - approveNft throws INVALID_INSTRUCTION for XLS-20
 * - NFT URI hex decoding
 * - parseNftTokenId extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainError } from '@waiaas/core';
import { NftStandardEnum } from '@waiaas/core';
import type { NftTransferParams, NftApproveParams } from '@waiaas/core';

// ---- Hoisted mock setup ----

const { mockClient, mockWallet } = vi.hoisted(() => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    request: vi.fn(),
    autofill: vi.fn(),
  };

  const mockWallet = {
    address: 'rTestSenderAddr',
    sign: vi.fn().mockReturnValue({
      tx_blob: 'AABBCCDD',
      hash: 'DEADBEEF01',
    }),
  };

  return { mockClient, mockWallet };
});

vi.mock('xrpl', () => {
  const WalletCtor = vi.fn().mockImplementation((_pub: string, _priv: string, opts?: { masterAddress?: string }) => ({
    ...mockWallet,
    address: opts?.masterAddress ?? mockWallet.address,
  }));
  (WalletCtor as unknown as Record<string, unknown>).fromEntropy = vi.fn().mockReturnValue(mockWallet);
  const mod = {
    Client: vi.fn().mockImplementation(() => mockClient),
    Wallet: WalletCtor,
    ECDSA: { ed25519: 'ed25519', secp256k1: 'ecdsa-secp256k1' },
    isValidClassicAddress: vi.fn((addr: string) => typeof addr === 'string' && addr.startsWith('r')),
    isValidXAddress: vi.fn((addr: string) => typeof addr === 'string' && (addr.startsWith('X') || addr.startsWith('T')) && addr.length > 30),
    xAddressToClassicAddress: vi.fn((xAddr: string) => ({
      classicAddress: 'rDecodedFromXAddr',
      tag: xAddr.includes('WithTag') ? 99999 : false,
    })),
  };
  return { ...mod, default: mod };
});

vi.mock('ripple-keypairs', () => ({
  deriveAddress: vi.fn().mockReturnValue('rTestSenderAddr'),
  default: { deriveAddress: vi.fn().mockReturnValue('rTestSenderAddr') },
}));

// Import after mocks
import { RippleAdapter } from '../adapter.js';
import { decodeNftUri, parseNftTokenId } from '../nft-utils.js';

// ---- Test fixtures ----

const MOCK_SERVER_INFO = {
  result: {
    info: {
      validated_ledger: {
        seq: 12345,
        base_fee_xrp: 0.00001,
        reserve_base_xrp: 10,
        reserve_inc_xrp: 2,
      },
    },
  },
};

// 64-char hex: flags(4) + transferFee(4) + issuer(40) + taxon(8) + sequence(8)
const TEST_NFT_TOKEN_ID = '000800006203F49C21D5D6E022CB16DE3538F248662FC73C0000000000000001';
const TEST_SENDER = 'rTestSenderAddr';
const TEST_RECIPIENT = 'rRecipientAddr123';

const nftTransferRequest: NftTransferParams = {
  from: TEST_SENDER,
  to: TEST_RECIPIENT,
  token: {
    address: '',
    tokenId: TEST_NFT_TOKEN_ID,
    standard: 'XLS-20',
  },
  amount: 1n,
};

describe('NftStandardEnum', () => {
  it('accepts XLS-20 alongside existing standards', () => {
    expect(NftStandardEnum.parse('ERC-721')).toBe('ERC-721');
    expect(NftStandardEnum.parse('ERC-1155')).toBe('ERC-1155');
    expect(NftStandardEnum.parse('METAPLEX')).toBe('METAPLEX');
    expect(NftStandardEnum.parse('XLS-20')).toBe('XLS-20');
  });

  it('rejects invalid standards', () => {
    expect(() => NftStandardEnum.parse('INVALID')).toThrow();
  });
});

describe('RippleAdapter NFT methods', () => {
  let adapter: RippleAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    adapter = new RippleAdapter('xrpl-testnet' as any);

    // Setup server_info mock for connect
    mockClient.request.mockImplementation(async (req: { command: string }) => {
      if (req.command === 'server_info') return MOCK_SERVER_INFO;
      if (req.command === 'submit') {
        return {
          result: {
            engine_result: 'tesSUCCESS',
            engine_result_message: 'The transaction was applied.',
            tx_json: { hash: 'NFT_TX_HASH_001' },
          },
        };
      }
      return { result: {} };
    });

    await adapter.connect('wss://s.altnet.rippletest.net:51233');
  });

  describe('buildNftTransferTx', () => {
    it('creates NFTokenCreateOffer with correct fields', async () => {
      // Mock autofill to return the tx with sequence/fee/lastLedger
      mockClient.autofill.mockImplementation(async (tx: Record<string, unknown>) => ({
        ...tx,
        Sequence: 100,
        Fee: '12',
        LastLedgerSequence: 12400,
      }));

      const unsignedTx = await adapter.buildNftTransferTx(nftTransferRequest);

      // Verify returned UnsignedTransaction
      expect(unsignedTx.chain).toBe('ripple');
      expect(unsignedTx.estimatedFee).toBeGreaterThan(0n);

      // Deserialize and check the transaction
      const txJson = new TextDecoder().decode(unsignedTx.serialized);
      const txObj = JSON.parse(txJson);

      expect(txObj.TransactionType).toBe('NFTokenCreateOffer');
      expect(txObj.NFTokenID).toBe(TEST_NFT_TOKEN_ID);
      expect(txObj.Destination).toBe(TEST_RECIPIENT);
      expect(txObj.Amount).toBe('0');
      expect(txObj.Flags).toBe(1); // tfSellNFToken
      expect(txObj.Account).toBe(TEST_SENDER);
    });

    it('sets metadata.pendingAccept and nftTokenId', async () => {
      mockClient.autofill.mockImplementation(async (tx: Record<string, unknown>) => ({
        ...tx,
        Sequence: 101,
        Fee: '12',
        LastLedgerSequence: 12401,
      }));

      const unsignedTx = await adapter.buildNftTransferTx(nftTransferRequest);

      expect(unsignedTx.metadata.pendingAccept).toBe(true);
      expect(unsignedTx.metadata.nftTokenId).toBe(TEST_NFT_TOKEN_ID);
    });
  });

  describe('transferNft', () => {
    it('builds, signs, and submits NFTokenCreateOffer', async () => {
      mockClient.autofill.mockImplementation(async (tx: Record<string, unknown>) => ({
        ...tx,
        Sequence: 102,
        Fee: '12',
        LastLedgerSequence: 12402,
      }));

      const privateKey = new Uint8Array(32);
      const result = await adapter.transferNft(nftTransferRequest, privateKey);

      expect(result.txHash).toBe('NFT_TX_HASH_001');
      expect(result.status).toBe('submitted');
    });
  });

  describe('approveNft', () => {
    it('throws INVALID_INSTRUCTION for XLS-20', async () => {
      const request: NftApproveParams = {
        from: TEST_SENDER,
        spender: TEST_RECIPIENT,
        token: {
          address: '',
          tokenId: TEST_NFT_TOKEN_ID,
          standard: 'XLS-20',
        },
        approvalType: 'single',
      };

      await expect(adapter.approveNft(request)).rejects.toThrow(ChainError);
      try {
        await adapter.approveNft(request);
      } catch (err) {
        expect((err as ChainError).code).toBe('INVALID_INSTRUCTION');
      }
    });
  });
});

describe('NFT utility functions', () => {
  describe('decodeNftUri', () => {
    it('decodes hex-encoded ipfs:// URI', () => {
      // "ipfs://QmTest" in hex
      const hex = Buffer.from('ipfs://QmTest').toString('hex').toUpperCase();
      expect(decodeNftUri(hex)).toBe('ipfs://QmTest');
    });

    it('decodes hex-encoded https:// URI', () => {
      const hex = Buffer.from('https://example.com/nft/1').toString('hex').toUpperCase();
      expect(decodeNftUri(hex)).toBe('https://example.com/nft/1');
    });

    it('returns empty string for empty input', () => {
      expect(decodeNftUri('')).toBe('');
    });
  });

  describe('parseNftTokenId', () => {
    it('extracts fields from 64-char hex NFTokenID', () => {
      const parsed = parseNftTokenId(TEST_NFT_TOKEN_ID);

      expect(parsed.flags).toBe(0x0008);
      expect(parsed.transferFee).toBe(0x0000);
      expect(parsed.issuer).toBe('6203F49C21D5D6E022CB16DE3538F248662FC73C');
      expect(typeof parsed.taxon).toBe('number');
      expect(parsed.sequence).toBe(1);
    });

    it('throws for invalid NFTokenID length', () => {
      expect(() => parseNftTokenId('ABCD')).toThrow('Invalid NFTokenID');
      expect(() => parseNftTokenId('')).toThrow('Invalid NFTokenID');
    });

    it('throws for null/undefined NFTokenID', () => {
      expect(() => parseNftTokenId(null as unknown as string)).toThrow('Invalid NFTokenID');
      expect(() => parseNftTokenId(undefined as unknown as string)).toThrow('Invalid NFTokenID');
    });
  });
});
