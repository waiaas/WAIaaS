import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FcmProvider } from '../providers/fcm-provider.js';
import type { PushPayload } from '../providers/push-provider.js';

// Mock fs.readFileSync
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

// Mock crypto.createSign
vi.mock('node:crypto', () => ({
  createSign: vi.fn(() => ({
    update: vi.fn(),
    sign: vi.fn(() => 'mock-signature'),
  })),
}));

import { readFileSync } from 'node:fs';

const VALID_SERVICE_KEY = JSON.stringify({
  client_email: 'test@project.iam.gserviceaccount.com',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----',
  token_uri: 'https://oauth2.googleapis.com/token',
});

const mockPayload: PushPayload = {
  title: 'Sign Request',
  body: 'Please approve tx',
  data: { type: 'sign_request', payload: '{}' },
  category: 'sign_request',
  priority: 'high',
};

describe('FcmProvider', () => {
  let provider: FcmProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(readFileSync).mockReturnValue(VALID_SERVICE_KEY);
    provider = new FcmProvider({
      project_id: 'test-project',
      service_account_key_path: '/path/to/key.json',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('has name "fcm"', () => {
    expect(provider.name).toBe('fcm');
  });

  describe('validateConfig', () => {
    it('returns true for valid service account key', async () => {
      expect(await provider.validateConfig()).toBe(true);
    });

    it('returns false when file read fails', async () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(await provider.validateConfig()).toBe(false);
    });

    it('returns false when key is missing fields', async () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ client_email: 'test@example.com' }));
      expect(await provider.validateConfig()).toBe(false);
    });
  });

  describe('send', () => {
    it('returns zero counts for empty tokens', async () => {
      const result = await provider.send([], mockPayload);
      expect(result).toEqual({ sent: 0, failed: 0, invalidTokens: [] });
    });

    it('sends push to single token successfully', async () => {
      // Mock token endpoint
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response('{}', { status: 200 }),
        );

      const result = await provider.send(['token1'], mockPayload);
      expect(result).toEqual({ sent: 1, failed: 0, invalidTokens: [] });

      // Verify FCM v1 API call
      const fcmCall = fetchSpy.mock.calls[1]!;
      expect(fcmCall[0]).toContain('fcm.googleapis.com/v1/projects/test-project/messages:send');
      const reqInit = fcmCall[1] as RequestInit;
      const body = JSON.parse(reqInit.body as string) as { message: { android: { priority: string } } };
      expect(body.message.android.priority).toBe('HIGH');
    });

    it('sends push with normal priority', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response('{}', { status: 200 }),
        );

      const normalPayload: PushPayload = { ...mockPayload, priority: 'normal' };
      await provider.send(['token1'], normalPayload);

      const fcmCall = vi.mocked(globalThis.fetch).mock.calls[1]!;
      const body = JSON.parse((fcmCall[1] as RequestInit).body as string) as {
        message: { android: { priority: string }; apns: { headers: { 'apns-priority': string } } };
      };
      expect(body.message.android.priority).toBe('NORMAL');
      expect(body.message.apns.headers['apns-priority']).toBe('5');
    });

    it('sends push to multiple tokens and counts results', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const result = await provider.send(['t1', 't2', 't3'], mockPayload);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('detects invalid tokens from 404 response', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { status: 'NOT_FOUND' } }), { status: 404 }),
        );

      const result = await provider.send(['good-token', 'bad-token'], mockPayload);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.invalidTokens).toEqual(['bad-token']);
    });

    it('detects UNREGISTERED tokens', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { status: 'UNREGISTERED' } }), { status: 400 }),
        );

      const result = await provider.send(['unregistered-token'], mockPayload);
      expect(result.failed).toBe(1);
      expect(result.invalidTokens).toEqual(['unregistered-token']);
    });

    it('handles auth errors (401/403) without retry', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 401 }));

      const result = await provider.send(['token1'], mockPayload);
      expect(result.failed).toBe(1);
      expect(result.invalidTokens).toEqual([]);
    });

    it('handles retryable server errors (500+)', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        // First attempt: 503 (retryable) — should retry
        .mockResolvedValueOnce(new Response('{}', { status: 503 }))
        // Second attempt: success
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      // Advance timers for retry delay
      const sendPromise = provider.send(['token1'], mockPayload);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await sendPromise;
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('handles non-retryable errors', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 400 }));

      const result = await provider.send(['token1'], mockPayload);
      expect(result.failed).toBe(1);
    });

    it('caches access token', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'cached-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await provider.send(['t1'], mockPayload);
      await provider.send(['t2'], mockPayload);

      // Only 1 token request + 2 FCM send = 3 total
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('throws on token acquisition failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );

      await expect(provider.send(['token1'], mockPayload)).rejects.toThrow(
        'Failed to get FCM access token',
      );
    });

    it('handles non-Error thrown objects in send', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'mock-token' }), { status: 200 }),
        )
        .mockRejectedValueOnce('string-error');

      const result = await provider.send(['token1'], mockPayload);
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
      // Non-Error thrown value should not be treated as invalid token
      expect(result.invalidTokens).toEqual([]);
    });
  });
});
