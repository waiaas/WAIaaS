import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMasterPassword, mockLogout, mockResetInactivityTimer } = vi.hoisted(() => ({
  mockMasterPassword: { value: 'test-password' as string | null },
  mockLogout: vi.fn(),
  mockResetInactivityTimer: vi.fn(),
}));

vi.mock('../auth/store', () => ({
  masterPassword: mockMasterPassword,
  logout: mockLogout,
  resetInactivityTimer: mockResetInactivityTimer,
}));

import { createTypedClient, ApiError } from '../api/typed-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('typed-client', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let api: ReturnType<typeof createTypedClient>;

  beforeEach(() => {
    mockFetch = vi.fn();
    api = createTypedClient(mockFetch as typeof globalThis.fetch);
    mockMasterPassword.value = 'test-password';
    mockLogout.mockClear();
    mockResetInactivityTimer.mockClear();
  });

  it('Test 1: api.GET calls fetch with correct URL and method', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    const result = await api.GET('/v1/admin/status');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const req = mockFetch.mock.calls[0]![0] as Request;
    expect(req.url).toContain('/v1/admin/status');
    expect(req.method).toBe('GET');
    expect(result.data).toBeDefined();
  });

  it('Test 2: X-Master-Password header is included when masterPassword.value is set', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await api.GET('/v1/admin/status');

    const req = mockFetch.mock.calls[0]![0] as Request;
    expect(req.headers.get('X-Master-Password')).toBe('test-password');
  });

  it('Test 3: X-Master-Password header is absent when masterPassword.value is null', async () => {
    mockMasterPassword.value = null;
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await api.GET('/v1/admin/status');

    const req = mockFetch.mock.calls[0]![0] as Request;
    expect(req.headers.get('X-Master-Password')).toBeNull();
  });

  it('Test 4: 401 from /v1/admin/* path calls logout()', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'Auth failed' }, 401));

    await expect(api.GET('/v1/admin/status')).rejects.toThrow(ApiError);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('Test 5: 401 from non-admin path does NOT call logout()', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'Auth failed' }, 401));

    await expect(api.GET('/v1/wallets')).rejects.toThrow(ApiError);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('Test 6: 401 throws ApiError with status=401, code=UNAUTHORIZED', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'Auth failed' }, 401));

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.status).toBe(401);
      expect(apiErr.code).toBe('UNAUTHORIZED');
    }
  });

  it('Test 7: Network error produces ApiError with code=NETWORK_ERROR', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.code).toBe('NETWORK_ERROR');
    }
  });

  it('Test 8: Timeout error produces ApiError with code=TIMEOUT', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.code).toBe('TIMEOUT');
    }
  });

  it('Test 9: Non-ok response (500) parses JSON body and throws ApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ code: 'INTERNAL_ERROR', message: 'Server broke' }, 500),
    );

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.status).toBe(500);
      expect(apiErr.code).toBe('INTERNAL_ERROR');
      expect(apiErr.serverMessage).toBe('Server broke');
    }
  });

  it('Test 10: Successful response calls resetInactivityTimer()', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'running' }));

    await api.GET('/v1/admin/status');

    expect(mockResetInactivityTimer).toHaveBeenCalledTimes(1);
  });

  it('Test 11: Non-JSON error body falls back to UNKNOWN code', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.code).toBe('UNKNOWN');
      expect(apiErr.serverMessage).toBe('Unknown error');
    }
  });

  it('Test 12: JSON error body without code/message uses defaults', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: true }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    );

    try {
      await api.GET('/v1/admin/status');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.code).toBe('UNKNOWN');
      expect(apiErr.serverMessage).toBe('Unknown error');
    }
  });
});
