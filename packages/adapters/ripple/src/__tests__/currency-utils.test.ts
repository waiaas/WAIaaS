/**
 * Currency utilities tests for XRPL Trust Line tokens.
 *
 * Tests cover:
 * - isValidCurrencyCode: 3-char ISO and 40-char hex validation
 * - normalizeCurrencyCode: uppercase normalization
 * - parseTrustLineToken: "{currency}.{issuer}" parsing
 * - iouToSmallestUnit / smallestUnitToIou: decimal <-> bigint conversion
 */

import { describe, it, expect } from 'vitest';
import {
  IOU_DECIMALS,
  isValidCurrencyCode,
  normalizeCurrencyCode,
  parseTrustLineToken,
  iouToSmallestUnit,
  smallestUnitToIou,
} from '../currency-utils.js';

describe('isValidCurrencyCode', () => {
  it('accepts 3-char ISO codes', () => {
    expect(isValidCurrencyCode('USD')).toBe(true);
    expect(isValidCurrencyCode('EUR')).toBe(true);
    expect(isValidCurrencyCode('BTC')).toBe(true);
  });

  it('accepts 40-char hex codes', () => {
    expect(isValidCurrencyCode('0158415500000000000000000000000000000000')).toBe(true);
    expect(isValidCurrencyCode('AABBCCDDEE00112233445566778899AABBCCDDEE')).toBe(true);
  });

  it('rejects "XRP" (reserved for native)', () => {
    expect(isValidCurrencyCode('XRP')).toBe(false);
    expect(isValidCurrencyCode('xrp')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCurrencyCode('')).toBe(false);
  });

  it('rejects 2-char codes', () => {
    expect(isValidCurrencyCode('US')).toBe(false);
  });

  it('rejects 4-char non-hex codes', () => {
    expect(isValidCurrencyCode('USDT')).toBe(false);
  });

  it('rejects 39-char and 41-char hex codes', () => {
    expect(isValidCurrencyCode('015841550000000000000000000000000000000')).toBe(false); // 39 chars
    expect(isValidCurrencyCode('01584155000000000000000000000000000000000')).toBe(false); // 41 chars
  });

  it('rejects numeric 3-char codes', () => {
    expect(isValidCurrencyCode('123')).toBe(false);
  });
});

describe('normalizeCurrencyCode', () => {
  it('uppercases 3-char codes', () => {
    expect(normalizeCurrencyCode('usd')).toBe('USD');
    expect(normalizeCurrencyCode('Eur')).toBe('EUR');
  });

  it('uppercases 40-char hex codes', () => {
    expect(normalizeCurrencyCode('aabbccddee00112233445566778899aabbccddee')).toBe(
      'AABBCCDDEE00112233445566778899AABBCCDDEE',
    );
  });

  it('passes through already-uppercase codes', () => {
    expect(normalizeCurrencyCode('USD')).toBe('USD');
  });
});

describe('parseTrustLineToken', () => {
  it('parses "USD.rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"', () => {
    const result = parseTrustLineToken('USD.rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh');
    expect(result.currency).toBe('USD');
    expect(result.issuer).toBe('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh');
  });

  it('parses 40-char hex currency with issuer', () => {
    const hex = '0158415500000000000000000000000000000000';
    const result = parseTrustLineToken(`${hex}.rIssuerAddr`);
    expect(result.currency).toBe(hex.toUpperCase());
    expect(result.issuer).toBe('rIssuerAddr');
  });

  it('normalizes currency to uppercase', () => {
    const result = parseTrustLineToken('usd.rIssuer');
    expect(result.currency).toBe('USD');
  });

  it('throws for invalid format (no dot)', () => {
    expect(() => parseTrustLineToken('invalid')).toThrow();
  });

  it('throws for empty currency', () => {
    expect(() => parseTrustLineToken('.rIssuer')).toThrow();
  });

  it('throws for empty issuer', () => {
    expect(() => parseTrustLineToken('USD.')).toThrow();
  });

  it('throws for empty string', () => {
    expect(() => parseTrustLineToken('')).toThrow();
  });
});

describe('iouToSmallestUnit', () => {
  it('converts "100.5" with 15 decimals', () => {
    expect(iouToSmallestUnit('100.5', 15)).toBe(100_500_000_000_000_000n);
  });

  it('converts "0.000000000000001" with 15 decimals to 1n', () => {
    expect(iouToSmallestUnit('0.000000000000001', 15)).toBe(1n);
  });

  it('converts whole number "100"', () => {
    expect(iouToSmallestUnit('100', 15)).toBe(100_000_000_000_000_000n);
  });

  it('converts "0" to 0n', () => {
    expect(iouToSmallestUnit('0', 15)).toBe(0n);
  });

  it('handles negative values', () => {
    expect(iouToSmallestUnit('-100.5', 15)).toBe(-100_500_000_000_000_000n);
  });

  it('handles empty string as 0n', () => {
    expect(iouToSmallestUnit('', 15)).toBe(0n);
  });
});

describe('smallestUnitToIou', () => {
  it('converts 100_500_000_000_000_000n to "100.5"', () => {
    expect(smallestUnitToIou(100_500_000_000_000_000n, 15)).toBe('100.5');
  });

  it('converts 1n to "0.000000000000001"', () => {
    expect(smallestUnitToIou(1n, 15)).toBe('0.000000000000001');
  });

  it('converts 0n to "0"', () => {
    expect(smallestUnitToIou(0n, 15)).toBe('0');
  });

  it('handles negative values', () => {
    expect(smallestUnitToIou(-100_500_000_000_000_000n, 15)).toBe('-100.5');
  });

  it('strips trailing zeros', () => {
    expect(smallestUnitToIou(100_000_000_000_000_000n, 15)).toBe('100');
  });
});

describe('iouToSmallestUnit / smallestUnitToIou roundtrip', () => {
  it('roundtrips "100.5"', () => {
    const value = '100.5';
    expect(smallestUnitToIou(iouToSmallestUnit(value, 15), 15)).toBe(value);
  });

  it('roundtrips "0.000000000000001"', () => {
    const value = '0.000000000000001';
    expect(smallestUnitToIou(iouToSmallestUnit(value, 15), 15)).toBe(value);
  });

  it('roundtrips "1234.567890123456"', () => {
    const value = '1234.56789012345';
    expect(smallestUnitToIou(iouToSmallestUnit(value, 15), 15)).toBe(value);
  });

  it('roundtrips negative "-50.25"', () => {
    const value = '-50.25';
    expect(smallestUnitToIou(iouToSmallestUnit(value, 15), 15)).toBe(value);
  });
});

describe('iouToSmallestUnit edge cases', () => {
  it('handles value starting with dot (no whole part)', () => {
    expect(iouToSmallestUnit('.5', 15)).toBe(500_000_000_000_000n);
  });

  it('throws on multiple dots', () => {
    expect(() => iouToSmallestUnit('1.2.3', 15)).toThrow();
  });

  it('handles whitespace-only as 0n', () => {
    expect(iouToSmallestUnit('   ', 15)).toBe(0n);
  });
});

describe('smallestUnitToIou edge cases', () => {
  it('handles negative whole number without fractional part', () => {
    expect(smallestUnitToIou(-100_000_000_000_000_000n, 15)).toBe('-100');
  });
});

describe('IOU_DECIMALS', () => {
  it('is 15', () => {
    expect(IOU_DECIMALS).toBe(15);
  });
});
