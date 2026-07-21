/**
 * Additional branch coverage tests for SDK files.
 *
 * Targets:
 * - client.ts:317 — runCliSync non-zero exit code branch
 * - validation.ts:74 — explicit type:'TRANSFER' switch case
 * - http.ts:83 — unknown error re-throw in finally context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WAIaaSClient } from '../client.js';
import { validateSendToken } from '../validation.js';
import { HttpClient } from '../internal/http.js';
import { WAIaaSError } from '../error.js';

// ============================================================================
// validation.ts — explicit 'TRANSFER' type (line 74)
// ============================================================================

describe('validateSendToken — explicit TRANSFER type', () => {
  it('should pass with explicit type TRANSFER and valid params', () => {
    expect(() =>
      validateSendToken({ type: 'TRANSFER', to: 'addr', amount: '1000' }),
    ).not.toThrow();
  });

  it('should pass TRANSFER with humanAmount', () => {
    expect(() =>
      validateSendToken({ type: 'TRANSFER', to: 'addr', humanAmount: '1.5' }),
    ).not.toThrow();
  });

  it('should throw VALIDATION_ERROR for explicit TRANSFER missing to', () => {
    try {
      validateSendToken({ type: 'TRANSFER', amount: '1000' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WAIaaSError);
      expect((err as WAIaaSError).code).toBe('VALIDATION_ERROR');
      expect((err as WAIaaSError).message).toContain('"to"');
    }
  });

  it('should throw VALIDATION_ERROR for explicit TRANSFER missing amount', () => {
    try {
      validateSendToken({ type: 'TRANSFER', to: 'addr' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WAIaaSError);
      expect((err as WAIaaSError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('should validate memo for explicit TRANSFER type', () => {
    expect(() =>
      validateSendToken({ type: 'TRANSFER', to: 'addr', amount: '100', memo: 'note' }),
    ).not.toThrow();
  });

  it('should throw for long memo with explicit TRANSFER type', () => {
    try {
      validateSendToken({ type: 'TRANSFER', to: 'addr', amount: '100', memo: 'x'.repeat(257) });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WAIaaSError);
      expect((err as WAIaaSError).message).toContain('"memo"');
    }
  });
});

// ============================================================================
// client.ts — runCliSync non-zero exit code (line 317)
// ============================================================================

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}));

import { execSync, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const mockedExecSync = vi.mocked(execSync);
const mockedSpawn = vi.mocked(spawn);
const mockedAccess = vi.mocked(access);

describe('WAIaaSClient.connect() — runCliSync error path', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should propagate error when init command exits with non-zero code', async () => {
    // daemon not running
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // which waiaas fails → npx fallback
    mockedExecSync.mockImplementationOnce(() => { throw new Error('not found'); });

    // data dir does NOT exist → triggers init
    mockedAccess.mockRejectedValueOnce(new Error('ENOENT'));

    // spawn for init — exits with code 1 (failure)
    const initChild = {
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(1);
      }),
      stderr: {
        on: vi.fn((event: string, cb: (chunk: Buffer) => void) => {
          if (event === 'data') cb(Buffer.from('init failed'));
        }),
      },
    };
    mockedSpawn.mockReturnValueOnce(initChild as never);

    await expect(
      WAIaaSClient.connect({
        autoStart: true,
        dataDir: '/tmp/test-fail',
        startTimeoutMs: 5000,
      }),
    ).rejects.toThrow('exited with code 1');
  });

  it('should propagate error when quickset command exits with non-zero code', async () => {
    // daemon not running
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // which waiaas fails → npx fallback
    mockedExecSync.mockImplementationOnce(() => { throw new Error('not found'); });

    // data dir exists
    mockedAccess.mockResolvedValueOnce(undefined);

    // spawn for start (detached)
    const startChild = {
      unref: vi.fn(),
      on: vi.fn(),
      stderr: null,
    };
    mockedSpawn.mockReturnValueOnce(startChild as never);

    // readiness succeeds
    fetchSpy.mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));

    // token file does NOT exist → triggers quickset
    mockedAccess.mockRejectedValueOnce(new Error('ENOENT'));

    // spawn for quickset — exits with code 2 (failure)
    const quicksetChild = {
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') cb(2);
      }),
      stderr: {
        on: vi.fn((event: string, cb: (chunk: Buffer) => void) => {
          if (event === 'data') cb(Buffer.from('quickset failed'));
        }),
      },
    };
    mockedSpawn.mockReturnValueOnce(quicksetChild as never);

    await expect(
      WAIaaSClient.connect({
        autoStart: true,
        dataDir: '/tmp/test-fail-qs',
        startTimeoutMs: 5000,
      }),
    ).rejects.toThrow('exited with code 2');
  });
});

// ============================================================================
// client.ts — pmGetMarkets category param (line 1307)
// ============================================================================

describe('WAIaaSClient — pmGetMarkets category branch', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  function mockResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function createMockJwt(sessionId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sessionId, walletId: 'wallet-1' })).toString('base64url');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  }

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(mockResponse({ markets: [] }));
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pmGetMarkets passes category query param', async () => {
    const client = new WAIaaSClient({
      baseUrl: 'http://localhost:3100',
      sessionToken: createMockJwt('sess-1'),
    });
    await client.pmGetMarkets({ category: 'politics' });
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain('category=politics');
  });

  it('pmGetMarkets passes all three query params', async () => {
    const client = new WAIaaSClient({
      baseUrl: 'http://localhost:3100',
      sessionToken: createMockJwt('sess-1'),
    });
    await client.pmGetMarkets({ keyword: 'test', category: 'sports', limit: 5 });
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain('keyword=test');
    expect(url).toContain('category=sports');
    expect(url).toContain('limit=5');
  });

  // ============================================================================
  // client.ts — createCredential expiresAt branch (line 1407)
  // ============================================================================

  it('createCredential passes expiresAt when provided', async () => {
    const client = new WAIaaSClient({
      baseUrl: 'http://localhost:3100',
      masterPassword: 'test-pw',
    });
    fetchSpy.mockResolvedValue(mockResponse({
      id: 'c1', name: 'key', type: 'api_key', walletId: 'w1',
      expiresAt: 1700000000, createdAt: 1000, updatedAt: 1000,
    }));
    await client.createCredential('w1', {
      name: 'key',
      type: 'api_key',
      value: 'secret',
      expiresAt: 1700000000,
    });
    const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body['expiresAt']).toBe(1700000000);
  });

  // ============================================================================
  // client.ts — extractSessionId missing sessionId (line 1499)
  // ============================================================================

  it('throws INVALID_TOKEN when JWT payload has no sessionId', async () => {
    // Create a JWT-like token without sessionId in payload
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ walletId: 'w1' })).toString('base64url');
    const noSessionIdToken = `${header}.${payload}.sig`;

    const client = new WAIaaSClient({
      baseUrl: 'http://localhost:3100',
      sessionToken: noSessionIdToken,
    });

    await expect(client.renewSession()).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });
});

// ============================================================================
// http.ts — unknown error re-throw in finally context (line 83)
// ============================================================================

describe('HttpClient — non-standard error re-throw', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-throws a string error (non-Error object)', async () => {
    fetchSpy.mockRejectedValue('string error');
    const client = new HttpClient('http://localhost:3100', 5000);
    await expect(client.get('/test')).rejects.toBe('string error');
  });

  it('re-throws a number error', async () => {
    fetchSpy.mockRejectedValue(42);
    const client = new HttpClient('http://localhost:3100', 5000);
    await expect(client.get('/test')).rejects.toBe(42);
  });

  it('re-throws null error', async () => {
    fetchSpy.mockRejectedValue(null);
    const client = new HttpClient('http://localhost:3100', 5000);
    await expect(client.get('/test')).rejects.toBeNull();
  });

  it('re-throws an object that is not an Error instance', async () => {
    const errObj = { code: 'CUSTOM', msg: 'custom' };
    fetchSpy.mockRejectedValue(errObj);
    const client = new HttpClient('http://localhost:3100', 5000);
    await expect(client.get('/test')).rejects.toBe(errObj);
  });
});
