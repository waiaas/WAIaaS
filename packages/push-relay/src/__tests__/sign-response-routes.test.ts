import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { Hono } from 'hono';
import { DeviceRegistry } from '../registry/device-registry.js';
import { createSignResponseRoutes } from '../relay/sign-response-routes.js';
import type { IPushProvider } from '../providers/push-provider.js';

const API_KEY = 'test-api-key';

function makeMockProvider(): IPushProvider {
  return {
    name: 'mock',
    send: vi.fn().mockResolvedValue({ sent: 1, failed: 0, invalidTokens: [] }),
    validateConfig: vi.fn().mockResolvedValue(true),
  };
}

let registry: DeviceRegistry;
let tmpDir: string;
let app: Hono;
let mockProvider: IPushProvider;

beforeEach(() => {
  tmpDir = join(tmpdir(), `push-relay-sign-resp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
  registry = new DeviceRegistry(join(tmpDir, 'test.db'));
  mockProvider = makeMockProvider();
  app = new Hono();
  const routes = createSignResponseRoutes({ registry, provider: mockProvider, apiKey: API_KEY });
  app.route('/', routes);
});

afterEach(() => {
  registry.close();
  rmSync(tmpDir, { recursive: true });
});

describe('POST /v1/sign-response', () => {
  const validBody = {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    action: 'approve',
    signature: '0xdeadbeef1234567890abcdef',
    signerAddress: 'So1addr1',
  };

  it('stores a valid approve response in DB', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; requestId: string };
    expect(body.status).toBe('stored');
    expect(body.requestId).toBe(validBody.requestId);

    // Verify stored in DB
    const stored = registry.getSignResponse(validBody.requestId);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe('1');
    expect(parsed.action).toBe('approve');
    expect(parsed.signature).toBe(validBody.signature);
  });

  it('stores a reject response without signature', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'reject',
        signerAddress: 'So1addr1',
      }),
    });

    expect(res.status).toBe(200);
    const stored = registry.getSignResponse('550e8400-e29b-41d4-a716-446655440000');
    const parsed = JSON.parse(stored!);
    expect(parsed.action).toBe('reject');
    expect(parsed.signature).toBeUndefined();
  });

  it('requires API key', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(401);
  });

  it('accepts valid API key', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(200);
  });

  it('returns 400 for missing requestId', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ action: 'approve', signerAddress: 'x' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid action', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ ...validBody, action: 'invalid' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for non-UUID requestId', async () => {
    const res = await app.request('/v1/sign-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ ...validBody, requestId: 'not-a-uuid' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /v1/sign-response/:requestId', () => {
  it('returns stored response immediately if found', async () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440000';
    const signResponse = { version: '1', requestId, action: 'approve', signerAddress: 'addr1', signedAt: new Date().toISOString() };
    registry.saveSignResponse(requestId, JSON.stringify(signResponse), 300);

    const res = await app.request(`/v1/sign-response/${requestId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { requestId: string; action: string };
    expect(body.requestId).toBe(requestId);
    expect(body.action).toBe('approve');
  });

  it('returns 204 after timeout if not found', async () => {
    const res = await app.request('/v1/sign-response/550e8400-e29b-41d4-a716-446655440000?timeout=1');
    expect(res.status).toBe(204);
  }, 10000);

  it('deletes response after retrieval (one-time read)', async () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440001';
    registry.saveSignResponse(requestId, '{"action":"approve"}', 300);

    const res1 = await app.request(`/v1/sign-response/${requestId}`);
    expect(res1.status).toBe(200);

    // Second retrieval should not find it
    const stored = registry.getSignResponse(requestId);
    expect(stored).toBeNull();
  });
});

describe('GET /v1/sign-response/:requestId (polling)', () => {
  it('returns response found during polling (not immediately)', async () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440099';

    // Store the response after a short delay (simulating async store)
    setTimeout(() => {
      registry.saveSignResponse(requestId, JSON.stringify({
        version: '1', requestId, action: 'reject', signerAddress: 'addr2', signedAt: new Date().toISOString(),
      }), 300);
    }, 500);

    const res = await app.request(`/v1/sign-response/${requestId}?timeout=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { action: string };
    expect(body.action).toBe('reject');
  }, 10000);
});

describe('POST /v1/push', () => {
  it('sends push to registered device (no API key needed)', async () => {
    registry.register('dcent', 'push-token-123', 'ios');
    const device = registry.getByPushToken('push-token-123')!;
    const subToken = device.subscriptionToken!;

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'sign_request',
        payload: { title: 'Sign', body: 'Sign this TX', requestId: 'req-1' },
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; sent: number };
    expect(body.status).toBe('sent');
    expect(body.sent).toBe(1);
    expect(mockProvider.send).toHaveBeenCalledOnce();
  });

  it('returns 404 for unknown subscription token', async () => {
    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: 'nonexistent',
        category: 'notification',
        payload: { title: 'Test', body: 'Test body' },
      }),
    });

    expect(res.status).toBe(404);
  });

  it('returns 400 for missing fields', async () => {
    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionToken: 'abc' }),
    });

    expect(res.status).toBe(400);
  });

  it('removes invalid tokens reported by provider', async () => {
    registry.register('dcent', 'bad-push-token', 'ios');
    const device = registry.getByPushToken('bad-push-token')!;
    const subToken = device.subscriptionToken!;

    // Mock provider returning the token as invalid
    vi.mocked(mockProvider.send).mockResolvedValueOnce({
      sent: 0,
      failed: 1,
      invalidTokens: ['bad-push-token'],
    });

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'sign_request',
        payload: { title: 'Sign', body: 'Sign this TX', requestId: 'req-2' },
      }),
    });

    expect(res.status).toBe(200);
    // The invalid token should have been removed from registry
    expect(registry.getByPushToken('bad-push-token')).toBeNull();
  });

  it('sends with normal priority for notification category', async () => {
    registry.register('dcent', 'notif-token', 'android');
    const device = registry.getByPushToken('notif-token')!;
    const subToken = device.subscriptionToken!;

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'notification',
        payload: { title: 'Info', body: 'General notification' },
      }),
    });

    expect(res.status).toBe(200);
    // Verify the provider was called with normal priority
    const sendCall = vi.mocked(mockProvider.send).mock.calls[0]!;
    expect(sendCall[1].priority).toBe('normal');
  });

  it('does not require API key (credential is subscriptionToken)', async () => {
    // Should get 404 (token not found), not 401 (unauthorized)
    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: 'nonexistent-token',
        category: 'notification',
        payload: { title: 'Test' },
      }),
    });

    expect(res.status).toBe(404);
  });

  it('uses fallback title from category when payload.title is absent', async () => {
    registry.register('dcent', 'fallback-token', 'ios');
    const device = registry.getByPushToken('fallback-token')!;
    const subToken = device.subscriptionToken!;

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'notification',
        payload: { requestId: 'req-3' },
      }),
    });

    expect(res.status).toBe(200);
    const sendCall = vi.mocked(mockProvider.send).mock.calls[0]!;
    expect(sendCall[1].title).toBe('notification');
    expect(sendCall[1].body).toBe('WAIaaS notification');
  });

  it('uses sign_request fallback body when category is sign_request and body is absent', async () => {
    registry.register('dcent', 'sign-fallback-token', 'ios');
    const device = registry.getByPushToken('sign-fallback-token')!;
    const subToken = device.subscriptionToken!;

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'sign_request',
        payload: { requestId: 'req-4' },
      }),
    });

    expect(res.status).toBe(200);
    const sendCall = vi.mocked(mockProvider.send).mock.calls[0]!;
    expect(sendCall[1].body).toBe('Transaction approval required');
  });

  it('applies transformer when provided', async () => {
    registry.close();
    // Reopen registry with a fresh DB for this test
    registry = new DeviceRegistry(join(tmpDir, 'test2.db'));
    const transformerApp = new Hono();
    const transformedRoutes = createSignResponseRoutes({
      registry,
      provider: mockProvider,
      apiKey: API_KEY,
      transformer: {
        transform: (payload) => ({
          ...payload,
          title: `[Transformed] ${payload.title}`,
        }),
      },
    });
    transformerApp.route('/', transformedRoutes);

    registry.register('dcent', 'transform-token', 'ios');
    const device = registry.getByPushToken('transform-token')!;
    const subToken = device.subscriptionToken!;

    const res = await transformerApp.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'sign_request',
        payload: { title: 'Sign TX', body: 'Please sign', requestId: 'req-5' },
      }),
    });

    expect(res.status).toBe(200);
    const sendCall = vi.mocked(mockProvider.send).mock.calls[0]!;
    expect(sendCall[1].title).toBe('[Transformed] Sign TX');
  });

  it('serializes non-string payload values as JSON in data', async () => {
    registry.register('dcent', 'json-token', 'ios');
    const device = registry.getByPushToken('json-token')!;
    const subToken = device.subscriptionToken!;

    const res = await app.request('/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionToken: subToken,
        category: 'notification',
        payload: { title: 'Test', body: 'Body', nested: { key: 'value' }, num: 42 },
      }),
    });

    expect(res.status).toBe(200);
    const sendCall = vi.mocked(mockProvider.send).mock.calls[0]!;
    expect(sendCall[1].data.nested).toBe('{"key":"value"}');
    expect(sendCall[1].data.num).toBe('42');
    expect(sendCall[1].data.title).toBe('Test');
  });
});

describe('GET /v1/sign-response/:requestId (timeout parsing)', () => {
  it('clamps timeout above 120 to 120 (returns immediate when response exists)', async () => {
    // Verifies the Math.min(x, 120) branch by sending timeout=999
    // Response is pre-stored so it returns immediately without waiting
    const requestId = '550e8400-e29b-41d4-a716-446655440002';
    registry.saveSignResponse(requestId, JSON.stringify({ action: 'approve' }), 300);
    const res = await app.request(`/v1/sign-response/${requestId}?timeout=999`);
    expect(res.status).toBe(200);
  });

  it('handles NaN timeout by falling back to 30 (returns immediate when response exists)', async () => {
    // parseInt('abc', 10) => NaN, NaN || 30 => 30
    const requestId = '550e8400-e29b-41d4-a716-446655440003';
    registry.saveSignResponse(requestId, JSON.stringify({ action: 'approve' }), 300);
    const res = await app.request(`/v1/sign-response/${requestId}?timeout=abc`);
    expect(res.status).toBe(200);
  });

  it('uses default timeout when no timeout param is given (returns immediate when response exists)', async () => {
    // timeoutParam is undefined => '' || '30' => '30'
    const requestId = '550e8400-e29b-41d4-a716-446655440004';
    registry.saveSignResponse(requestId, JSON.stringify({ action: 'approve' }), 300);
    const res = await app.request(`/v1/sign-response/${requestId}`);
    expect(res.status).toBe(200);
  });
});
