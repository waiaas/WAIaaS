import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WAIaaSOwnerClient } from '../owner-client.js';
import { WAIaaSError } from '../error.js';

/**
 * Helper to create a mock Response.
 */
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('WAIaaSOwnerClient', () => {
  const mockOwnerAddress = 'OwnerPubKey123';
  const mockNonce = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockNonceResponse = { nonce: mockNonce, expiresAt: 1707100000 };

  let fetchSpy: ReturnType<typeof vi.fn>;
  let mockSignMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    mockSignMessage = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createClient(opts?: { masterPassword?: string }) {
    return new WAIaaSOwnerClient({
      baseUrl: 'http://localhost:3000',
      ownerAddress: mockOwnerAddress,
      signMessage: mockSignMessage,
      masterPassword: opts?.masterPassword,
      retryOptions: { maxRetries: 0 }, // disable retry for unit tests
    });
  }

  /**
   * Helper: set up fetch to return nonce on first call, then the given response.
   */
  function setupNonceAndResponse(responseBody: unknown, status = 200) {
    fetchSpy
      .mockResolvedValueOnce(mockResponse(mockNonceResponse)) // GET /v1/nonce
      .mockResolvedValueOnce(mockResponse(responseBody, status)); // actual API call
  }

  // =========================================================================
  // ownerAuth Flow
  // =========================================================================

  describe('ownerAuth flow', () => {
    it('should fetch nonce from GET /v1/nonce before making API call', async () => {
      const client = createClient();
      setupNonceAndResponse({ id: 'tx-1', status: 'EXECUTING', approvedAt: 1707000000 });

      await client.approve('tx-1');

      // First call should be GET /v1/nonce
      const nonceUrl = fetchSpy.mock.calls[0]![0] as string;
      expect(nonceUrl).toBe('http://localhost:3000/v1/nonce');
      const nonceOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
      expect(nonceOpts.method).toBe('GET');
    });

    it('should send correct X-Owner-Address, X-Owner-Message, X-Owner-Signature headers', async () => {
      const client = createClient();
      setupNonceAndResponse({ id: 'tx-1', status: 'EXECUTING', approvedAt: 1707000000 });

      await client.approve('tx-1');

      // Second call (approve) should have ownerAuth headers
      const approveOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      const headers = approveOpts.headers as Record<string, string>;

      expect(headers['X-Owner-Address']).toBe(mockOwnerAddress);
      expect(headers['X-Owner-Signature']).toBeDefined();

      // The daemon rejects a signature that does not name what it authorises.
      // Asserting only "message === nonce" is what let that break unnoticed:
      // these tests mock fetch, so nothing here reaches the real check.
      expect(headers['X-Owner-Message']).toContain('approve:tx-1');
      expect(headers['X-Owner-Message']).toContain(mockNonce);
    });

    it('binds reject to the reject action, not approve', async () => {
      const client = createClient();
      setupNonceAndResponse({ id: 'tx-1', status: 'CANCELLED', rejectedAt: 1707000000 });

      await client.reject('tx-1');

      const rejectOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      const headers = rejectOpts.headers as Record<string, string>;

      // A reject signature must not be usable at /approve, so the token differs.
      expect(headers['X-Owner-Message']).toContain('reject:tx-1');
      expect(headers['X-Owner-Message']).not.toContain('approve:tx-1');
    });

    it('signs the exact bytes it sends', async () => {
      const client = createClient();
      setupNonceAndResponse({ id: 'tx-9', status: 'EXECUTING', approvedAt: 1707000000 });

      await client.approve('tx-9');

      const approveOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      const headers = approveOpts.headers as Record<string, string>;
      const signed = new TextDecoder().decode(mockSignMessage.mock.calls[0]![0] as Uint8Array);

      // Signature verification happens over the decoded header, so a mismatch
      // between what is signed and what is sent is an instant 401.
      expect(signed).toBe(headers['X-Owner-Message']);
    });

    it('should sign the nonce message and encode signature as base64', async () => {
      const client = createClient();
      setupNonceAndResponse({ id: 'tx-1', status: 'EXECUTING', approvedAt: 1707000000 });

      await client.approve('tx-1');

      // signMessage should have been called with the nonce encoded as Uint8Array
      expect(mockSignMessage).toHaveBeenCalledTimes(1);
      const signedMessage = mockSignMessage.mock.calls[0]![0] as Uint8Array;
      const decoded = new TextDecoder().decode(signedMessage);
      expect(decoded).toContain(mockNonce);
      expect(decoded).toContain('approve:tx-1');

      // Verify signature is base64-encoded
      const approveOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      const headers = approveOpts.headers as Record<string, string>;
      const sig = headers['X-Owner-Signature']!;
      // base64 of Uint8Array([1,2,3,4,5]) = 'AQIDBAU='
      expect(sig).toBe(Buffer.from(new Uint8Array([1, 2, 3, 4, 5])).toString('base64'));
    });
  });

  // =========================================================================
  // approve
  // =========================================================================

  describe('approve', () => {
    it('should call POST /v1/transactions/:id/approve with ownerAuth', async () => {
      const client = createClient();
      const expected = { id: 'tx-abc', status: 'EXECUTING', approvedAt: 1707000000 };
      setupNonceAndResponse(expected);

      const result = await client.approve('tx-abc');

      expect(result).toEqual(expected);
      const approveUrl = fetchSpy.mock.calls[1]![0] as string;
      expect(approveUrl).toBe('http://localhost:3000/v1/transactions/tx-abc/approve');
      const approveOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      expect(approveOpts.method).toBe('POST');
    });

    it('should return ApproveResponse with id, status, approvedAt', async () => {
      const client = createClient();
      const expected = { id: 'tx-xyz', status: 'EXECUTING', approvedAt: 1707050000 };
      setupNonceAndResponse(expected);

      const result = await client.approve('tx-xyz');

      expect(result.id).toBe('tx-xyz');
      expect(result.status).toBe('EXECUTING');
      expect(result.approvedAt).toBe(1707050000);
    });
  });

  // =========================================================================
  // reject
  // =========================================================================

  describe('reject', () => {
    it('should call POST /v1/transactions/:id/reject with ownerAuth', async () => {
      const client = createClient();
      const expected = { id: 'tx-rej', status: 'CANCELLED', rejectedAt: 1707000000 };
      setupNonceAndResponse(expected);

      const result = await client.reject('tx-rej');

      expect(result).toEqual(expected);
      const rejectUrl = fetchSpy.mock.calls[1]![0] as string;
      expect(rejectUrl).toBe('http://localhost:3000/v1/transactions/tx-rej/reject');
      const rejectOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      expect(rejectOpts.method).toBe('POST');
    });

    it('should return RejectResponse with id, status, rejectedAt', async () => {
      const client = createClient();
      const expected = { id: 'tx-rej2', status: 'CANCELLED', rejectedAt: 1707060000 };
      setupNonceAndResponse(expected);

      const result = await client.reject('tx-rej2');

      expect(result.id).toBe('tx-rej2');
      expect(result.status).toBe('CANCELLED');
      expect(result.rejectedAt).toBe(1707060000);
    });
  });

  // =========================================================================
  // activateKillSwitch
  // =========================================================================

  describe('activateKillSwitch', () => {
    it('should call POST /v1/admin/kill-switch with ownerAuth headers', async () => {
      const client = createClient();
      const expected = { state: 'ACTIVATED' as const, activatedAt: 1707000000 };
      setupNonceAndResponse(expected);

      const result = await client.activateKillSwitch();

      expect(result).toEqual(expected);
      const ksUrl = fetchSpy.mock.calls[1]![0] as string;
      expect(ksUrl).toBe('http://localhost:3000/v1/admin/kill-switch');
      const ksOpts = fetchSpy.mock.calls[1]![1] as RequestInit;
      expect(ksOpts.method).toBe('POST');

      // Should have ownerAuth headers
      const headers = ksOpts.headers as Record<string, string>;
      expect(headers['X-Owner-Address']).toBe(mockOwnerAddress);
    });

    it('should return KillSwitchActivateResponse', async () => {
      const client = createClient();
      setupNonceAndResponse({ state: 'ACTIVATED', activatedAt: 1707070000 });

      const result = await client.activateKillSwitch();
      expect(result.state).toBe('ACTIVATED');
      expect(result.activatedAt).toBe(1707070000);
    });
  });

  // =========================================================================
  // getKillSwitchStatus
  // =========================================================================

  describe('getKillSwitchStatus', () => {
    it('should call GET /v1/admin/kill-switch (no auth required)', async () => {
      const client = createClient();
      const expected = { state: 'NORMAL', activatedAt: null, activatedBy: null };
      fetchSpy.mockResolvedValue(mockResponse(expected));

      const result = await client.getKillSwitchStatus();

      expect(result).toEqual(expected);
      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('http://localhost:3000/v1/admin/kill-switch');
      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      expect(opts.method).toBe('GET');
      // No ownerAuth headers needed -- only 1 fetch call (no nonce fetch)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // recover
  // =========================================================================

  describe('recover', () => {
    it('should call POST /v1/admin/recover with X-Master-Password header', async () => {
      const client = createClient({ masterPassword: 'my-master-pass' });
      const expected = { state: 'NORMAL' as const, recoveredAt: 1707080000 };
      fetchSpy.mockResolvedValue(mockResponse(expected));

      const result = await client.recover();

      expect(result).toEqual(expected);
      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('http://localhost:3000/v1/admin/recover');
      const opts = fetchSpy.mock.calls[0]![1] as RequestInit;
      expect(opts.method).toBe('POST');

      // Should have master auth header
      const headers = opts.headers as Record<string, string>;
      expect(headers['X-Master-Password']).toBe('my-master-pass');
    });

    it('should throw NO_MASTER_PASSWORD when masterPassword not set', async () => {
      const client = createClient(); // no masterPassword

      const err = await client.recover().catch((e: unknown) => e) as WAIaaSError;
      expect(err).toBeInstanceOf(WAIaaSError);
      expect(err.code).toBe('NO_MASTER_PASSWORD');
      expect(err.status).toBe(0);
      expect(err.retryable).toBe(false);
      // fetch should NOT have been called
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should strip trailing slash from baseUrl', async () => {
      const client = new WAIaaSOwnerClient({
        baseUrl: 'http://localhost:3000/',
        ownerAddress: mockOwnerAddress,
        signMessage: mockSignMessage,
        retryOptions: { maxRetries: 0 },
      });

      const expected = { state: 'NORMAL', activatedAt: null, activatedBy: null };
      fetchSpy.mockResolvedValue(mockResponse(expected));

      await client.getKillSwitchStatus();

      const url = fetchSpy.mock.calls[0]![0] as string;
      expect(url).toBe('http://localhost:3000/v1/admin/kill-switch');
      expect(url).not.toContain('//v1');
    });
  });
});
