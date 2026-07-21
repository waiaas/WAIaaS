import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushwooshProvider } from '../providers/pushwoosh-provider.js';
import type { PushPayload } from '../providers/push-provider.js';

const DEFAULT_API_URL = 'https://api.pushwoosh.com/json/1.3/createMessage';

const mockPayload: PushPayload = {
  title: 'Sign Request',
  body: 'TRANSFER 1 SOL',
  data: { requestId: 'test-id' },
  category: 'sign_request',
  priority: 'high',
};

describe('PushwooshProvider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('sends push notification to Pushwoosh API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    const result = await provider.send(['device-1', 'device-2'], mockPayload);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);

    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(fetchCall[0]).toBe(DEFAULT_API_URL);
    const body = JSON.parse(fetchCall[1]!.body as string);
    expect(body.request.auth).toBe('test-token');
    expect(body.request.application).toBe('APP-123');
    expect(body.request.notifications[0].devices).toEqual(['device-1', 'device-2']);
  });

  it('uses custom api_url when provided', async () => {
    const customUrl = 'https://private.pushwoosh.com/json/1.3/createMessage';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: customUrl,
    });

    await provider.send(['device-1'], mockPayload);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(fetchCall[0]).toBe(customUrl);
  });

  it('returns empty result for empty token list', async () => {
    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    const result = await provider.send([], mockPayload);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('throws on auth error (no retry)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const provider = new PushwooshProvider({
      api_token: 'bad-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    await expect(provider.send(['device-1'], mockPayload)).rejects.toThrow('auth failed');
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it('throws non-retryable error on generic HTTP failure (e.g. 400)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    await expect(provider.send(['device-1'], mockPayload)).rejects.toThrow('Pushwoosh error: HTTP 400');
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it('throws on Pushwoosh API-level error (status_code != 200)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 400, status_message: 'Invalid application' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'BAD-APP',
      api_url: DEFAULT_API_URL,
    });

    await expect(provider.send(['device-1'], mockPayload)).rejects.toThrow('Pushwoosh API error: Invalid application');
  });

  it('retries on 500 server error and succeeds', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
      });
    globalThis.fetch = fetchMock;

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    const result = await provider.send(['device-1'], mockPayload);
    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('includes extra_fields in notification payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
      extra_fields: { link: '/waiaas', campaign: 'onboarding' },
    });

    await provider.send(['device-1'], mockPayload);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const body = JSON.parse(fetchCall[1]!.body as string);
    const notification = body.request.notifications[0];
    expect(notification.link).toBe('/waiaas');
    expect(notification.campaign).toBe('onboarding');
  });

  it('works without extra_fields (backwards compatible)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    await provider.send(['device-1'], mockPayload);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const body = JSON.parse(fetchCall[1]!.body as string);
    const notification = body.request.notifications[0];
    expect(notification.link).toBeUndefined();
    expect(notification.content).toBe('TRANSFER 1 SOL');
  });

  it('validates config checks token and code length', async () => {
    const valid = new PushwooshProvider({ api_token: 'tok', application_code: 'code', api_url: DEFAULT_API_URL });
    expect(await valid.validateConfig()).toBe(true);

    const invalid = new PushwooshProvider({ api_token: '', application_code: '', api_url: DEFAULT_API_URL });
    expect(await invalid.validateConfig()).toBe(false);
  });

  it('sets android priority to normal when payload priority is normal', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 200, status_message: 'OK' }),
    });

    const provider = new PushwooshProvider({
      api_token: 'test-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    const normalPayload: PushPayload = { ...mockPayload, priority: 'normal' };
    await provider.send(['device-1'], normalPayload);

    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const body = JSON.parse(fetchCall[1]!.body as string);
    const notification = body.request.notifications[0];
    expect(notification.android_root_params.priority).toBe('normal');
  });

  it('throws on 403 auth error (no retry)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    const provider = new PushwooshProvider({
      api_token: 'bad-token',
      application_code: 'APP-123',
      api_url: DEFAULT_API_URL,
    });

    await expect(provider.send(['device-1'], mockPayload)).rejects.toThrow('auth failed');
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });
});
