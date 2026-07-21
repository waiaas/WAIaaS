/**
 * Address utility tests for XRPL address handling and drops/XRP conversion.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock xrpl address validation functions
vi.mock('xrpl', () => {
  const mod = {
    isValidClassicAddress: vi.fn((addr: string) => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr)),
    isValidXAddress: vi.fn((addr: string) => /^[XT][1-9A-HJ-NP-Za-km-z]{46}$/.test(addr)),
    xAddressToClassicAddress: vi.fn((xAddr: string) => {
      if (xAddr.startsWith('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDW')) {
        return { classicAddress: 'rN7n3473SaZBCG4dFL83w7p1W9cgZw6XVD', tag: 12345 };
      }
      if (xAddr.startsWith('T7YL9jPJMZR6K7jPF7')) {
        return { classicAddress: 'rGWrZyQqhTp9Xu7G5iFQw', tag: false };
      }
      return { classicAddress: 'rUnknown', tag: false };
    }),
  };
  return { ...mod, default: mod };
});

import {
  isXAddress,
  decodeXAddress,
  isValidRippleAddress,
  dropsToXrp,
  xrpToDrops,
  XRP_DECIMALS,
  DROPS_PER_XRP,
} from '../address-utils.js';

describe('address-utils', () => {
  describe('constants', () => {
    it('XRP_DECIMALS is 6', () => {
      expect(XRP_DECIMALS).toBe(6);
    });

    it('DROPS_PER_XRP is 1000000n', () => {
      expect(DROPS_PER_XRP).toBe(1_000_000n);
    });
  });

  describe('isXAddress', () => {
    it('returns true for valid X-address (mainnet)', () => {
      // 47 char X-address pattern
      expect(isXAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWGGGGGGGGGGG')).toBe(true);
    });

    it('returns true for valid T-address (testnet)', () => {
      // Mock expects 47 chars: T + 46 base58 chars
      expect(isXAddress('T7YL9jPJMZR6K7jPF7GGGGGGGGGGGGGGGGGGGGGGGGGGGGa')).toBe(true);
    });

    it('returns false for r-address', () => {
      expect(isXAddress('rN7n3473SaZBCG4dFL83w7p1W9cgZw6XVD')).toBe(false);
    });

    it('returns false for invalid address', () => {
      expect(isXAddress('invalid')).toBe(false);
    });
  });

  describe('decodeXAddress', () => {
    it('decodes X-address to classic address and tag', () => {
      const result = decodeXAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDW');
      expect(result.classicAddress).toBe('rN7n3473SaZBCG4dFL83w7p1W9cgZw6XVD');
      expect(result.tag).toBe(12345);
    });

    it('decodes X-address without tag', () => {
      const result = decodeXAddress('T7YL9jPJMZR6K7jPF7');
      expect(result.tag).toBe(false);
    });
  });

  describe('isValidRippleAddress', () => {
    it('validates classic r-address', () => {
      expect(isValidRippleAddress('rN7n3473SaZBCG4dFL83w7p1W9cgZw6XVD')).toBe(true);
    });

    it('validates X-address', () => {
      expect(isValidRippleAddress('X7AcgcsBL6XDcUb289X4mJ8djcdyKaB5hJDWGGGGGGGGGGG')).toBe(true);
    });

    it('rejects invalid address', () => {
      expect(isValidRippleAddress('invalid')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidRippleAddress('')).toBe(false);
    });
  });

  describe('dropsToXrp', () => {
    it('converts 1000000 drops to 1 XRP', () => {
      expect(dropsToXrp(1_000_000n)).toBe('1');
    });

    it('converts 500000 drops to 0.5 XRP', () => {
      expect(dropsToXrp(500_000n)).toBe('0.5');
    });

    it('converts 1 drop to 0.000001 XRP', () => {
      expect(dropsToXrp(1n)).toBe('0.000001');
    });

    it('converts 0 drops to 0', () => {
      expect(dropsToXrp(0n)).toBe('0');
    });

    it('handles negative drops', () => {
      expect(dropsToXrp(-1_000_000n)).toBe('-1');
    });

    it('converts 1234567 drops correctly', () => {
      expect(dropsToXrp(1_234_567n)).toBe('1.234567');
    });

    it('strips trailing zeros from fractional part', () => {
      expect(dropsToXrp(1_500_000n)).toBe('1.5');
    });
  });

  describe('xrpToDrops', () => {
    it('converts 1 XRP to 1000000 drops', () => {
      expect(xrpToDrops('1')).toBe(1_000_000n);
    });

    it('converts 0.5 XRP to 500000 drops', () => {
      expect(xrpToDrops('0.5')).toBe(500_000n);
    });

    it('converts 0.000001 XRP to 1 drop', () => {
      expect(xrpToDrops('0.000001')).toBe(1n);
    });

    it('converts 0 XRP to 0 drops', () => {
      expect(xrpToDrops('0')).toBe(0n);
    });

    it('handles whitespace', () => {
      expect(xrpToDrops('  1  ')).toBe(1_000_000n);
    });

    it('throws on empty string', () => {
      expect(() => xrpToDrops('')).toThrow('Cannot convert empty string');
    });

    it('throws on invalid format', () => {
      expect(() => xrpToDrops('1.2.3')).toThrow('Invalid XRP value');
    });

    it('converts negative XRP value', () => {
      expect(xrpToDrops('-1')).toBe(-1_000_000n);
    });

    it('converts negative fractional XRP value', () => {
      expect(xrpToDrops('-0.5')).toBe(-500_000n);
    });

    it('handles missing whole part (starts with dot)', () => {
      expect(xrpToDrops('.5')).toBe(500_000n);
    });
  });

  describe('dropsToXrp -- negative fractional', () => {
    it('converts negative drops with fractional part', () => {
      expect(dropsToXrp(-500_000n)).toBe('-0.5');
    });

    it('converts negative drops with trailing zeros stripped', () => {
      expect(dropsToXrp(-1_500_000n)).toBe('-1.5');
    });
  });
});
