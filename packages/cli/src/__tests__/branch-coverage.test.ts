/**
 * Additional branch coverage tests for CLI commands.
 *
 * Targets uncovered branches identified in coverage report to meet 84% threshold.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'waiaas-branch-cov-'));
}

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => mockResponse(status, body),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ---------------------------------------------------------------------------
// status.ts branches
// ---------------------------------------------------------------------------

describe('statusCommand branches', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let tempDir: string;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    originalFetch = globalThis.fetch;
    tempDir = makeTmpDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolvePort: returns default when config.toml has invalid port (0)', async () => {
    // Write config.toml with invalid port
    writeFileSync(join(tempDir, 'config.toml'), 'port = 0\n', 'utf-8');
    // Write a PID file with current process PID (alive)
    writeFileSync(join(tempDir, 'daemon.pid'), String(process.pid), 'utf-8');
    // Mock fetch for health check
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { status: 'ok' }));

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(tempDir);

    // Should use default port 3100 and report running
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('running'));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      expect.stringContaining(':3100/health'),
    );
  });

  it('resolvePort: returns default when config.toml has port > 65535', async () => {
    writeFileSync(join(tempDir, 'config.toml'), 'port = 70000\n', 'utf-8');
    writeFileSync(join(tempDir, 'daemon.pid'), String(process.pid), 'utf-8');
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { status: 'ok' }));

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(tempDir);

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      expect.stringContaining(':3100/health'),
    );
  });

  it('resolvePort: returns default when config.toml is unreadable', async () => {
    // Write PID for current process (alive)
    writeFileSync(join(tempDir, 'daemon.pid'), String(process.pid), 'utf-8');
    // Create config.toml as a directory (causes read error)
    mkdirSync(join(tempDir, 'config.toml'), { recursive: true });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(200, { status: 'ok' }));

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(tempDir);

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      expect.stringContaining(':3100/health'),
    );
  });

  it('health check non-ok: reports "starting"', async () => {
    writeFileSync(join(tempDir, 'daemon.pid'), String(process.pid), 'utf-8');
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(503, {}));

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(tempDir);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('starting'));
  });

  it('stale PID file: cleans up and reports stopped', async () => {
    // PID that does not exist (99999999 -- extremely unlikely to be real)
    writeFileSync(join(tempDir, 'daemon.pid'), '99999999', 'utf-8');

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(tempDir);

    expect(logSpy).toHaveBeenCalledWith('Status: stopped (stale PID file)');
  });
});

// ---------------------------------------------------------------------------
// stop.ts branches
// ---------------------------------------------------------------------------

describe('stopCommand branches', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let tempDir: string;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    tempDir = makeTmpDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('stale PID file: cleans up and reports not running', async () => {
    writeFileSync(join(tempDir, 'daemon.pid'), '99999999', 'utf-8');

    const { stopCommand } = await import('../commands/stop.js');
    await stopCommand(tempDir);

    expect(logSpy).toHaveBeenCalledWith('Daemon is not running (stale PID file)');
  });
});

// ---------------------------------------------------------------------------
// mcp-setup.ts branches: printConfigPath win32
// ---------------------------------------------------------------------------

describe('mcpSetupCommand branches', () => {
  let mockStdout: ReturnType<typeof vi.spyOn>;
  let mockStderr: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;
  let originalPlatform: PropertyDescriptor | undefined;
  let tempDir: string;

  beforeEach(() => {
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('test-pw'),
    }));
    originalFetch = globalThis.fetch;
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    tempDir = makeTmpDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock('../utils/password.js');
    globalThis.fetch = originalFetch;
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('printConfigPath: win32 platform shows %APPDATA% path', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'W' }] }));
      if (u.includes('/v1/sessions')) return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({ dataDir: tempDir, masterPassword: 'test-pw' });

    expect(mockStdout).toHaveBeenCalledWith(
      expect.stringContaining('%APPDATA%\\Claude\\claude_desktop_config.json'),
    );
  });

  it('health check warning: daemon returns non-ok status', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(503, {}));
      if (u.includes('/v1/wallets')) return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'W' }] }));
      if (u.includes('/v1/sessions')) return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({ dataDir: tempDir, masterPassword: 'test-pw' });

    expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Warning: daemon returned 503'));
  });

  it('single wallet: session creation network error -> exit', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'W' }] }));
      if (u.includes('/v1/sessions')) return Promise.reject(new Error('network error'));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await expect(mcpSetupCommand({ dataDir: tempDir, masterPassword: 'test-pw' }))
      .rejects.toThrow('process.exit(1)');

    expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Failed to create session'));
  });

  it('wallet list failure for name lookup: continues without name', async () => {
    const fetchMock = vi.fn((url: string | URL, _init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        // When --wallet is specified, the name lookup call is made
        return Promise.reject(new Error('wallet list failed'));
      }
      if (u.includes('/v1/sessions')) {
        return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({ dataDir: tempDir, wallet: 'explicit-id', masterPassword: 'test-pw' });

    // Should succeed despite name lookup failure
    expect(mockStdout).toHaveBeenCalledWith('MCP session created successfully!');
  });

  it('fetchWallets: non-ok response exits', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) return Promise.resolve(mockResponse(403, { message: 'Forbidden' }));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await expect(mcpSetupCommand({ dataDir: tempDir, masterPassword: 'test-pw' }))
      .rejects.toThrow('process.exit(1)');

    expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('Failed to list wallets'));
  });

  it('--all mode: expiry date for non-zero expiresAt', async () => {
    let sessionCallCount = 0;
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'Alpha' }] }));
      }
      if (u.includes('/v1/sessions')) {
        sessionCallCount++;
        return Promise.resolve(mockResponse(200, {
          id: `s${sessionCallCount}`,
          token: `t${sessionCallCount}`,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({ dataDir: tempDir, all: true, masterPassword: 'test-pw' });

    // Should show ISO expiry date
    const calls = mockStdout.mock.calls.map((c: unknown[]) => String(c[0]));
    const expiryCall = calls.find((s: string) => s.includes('Expires at:'));
    expect(expiryCall).toBeDefined();
    // Should NOT show "Never (unlimited)"
    expect(calls.every((s: string) => !s.includes('Never (unlimited)'))).toBe(true);
  });

  it('single wallet: non-zero expiresAt shows expiry date', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'W' }] }));
      }
      if (u.includes('/v1/sessions')) {
        return Promise.resolve(mockResponse(200, {
          id: 's1', token: 't1',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({ dataDir: tempDir, masterPassword: 'test-pw' });

    const calls = mockStdout.mock.calls.map((c: unknown[]) => String(c[0]));
    const expiryCall = calls.find((s: string) => s.includes('Expires at:'));
    expect(expiryCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// notification-setup.ts branches
// ---------------------------------------------------------------------------

describe('notificationSetupCommand branches', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;
  let tempDir: string;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    originalFetch = globalThis.fetch;
    tempDir = makeTmpDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../utils/password.js');
    vi.doUnmock('../utils/prompt.js');
    globalThis.fetch = originalFetch;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('health check warning: daemon returns non-ok', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('bot-token'),
    }));
    vi.doMock('../utils/prompt.js', () => ({
      promptText: vi.fn().mockResolvedValue('12345'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(503, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({ password: 'pw', botToken: 'tok', chatId: 'cid' });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: daemon returned 503'));
  });

  it('PUT settings failure: exits with error', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) {
        return Promise.resolve(mockResponse(403, { message: 'Forbidden' }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await expect(notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Forbidden'));
  });

  it('PUT settings network failure: exits', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await expect(notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith('Error: Failed to connect to daemon.');
  });

  it('invalid locale: exits with error', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await expect(notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', locale: 'fr',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid locale 'fr'"));
  });

  it('empty chatId: exits with error', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));
    vi.doMock('../utils/prompt.js', () => ({
      promptText: vi.fn().mockResolvedValue(''),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await expect(notificationSetupCommand({
      password: 'pw', botToken: 'tok',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith('Error: Chat ID cannot be empty.');
  });

  it('test notification: --test sends test and displays results', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/notifications/test')) {
        return Promise.resolve(mockResponse(200, {
          results: [{ channel: 'telegram', success: true }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', test: true,
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test notification sent to telegram'));
  });

  it('test notification: failure shows error', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/notifications/test')) {
        return Promise.resolve(mockResponse(200, {
          results: [{ channel: 'telegram', success: false, error: 'Bot blocked' }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', test: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Bot blocked'));
  });

  it('test notification: network error shows error gracefully', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/notifications/test')) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', test: true,
    });

    expect(errorSpy).toHaveBeenCalledWith('Error: Failed to send test notification.');
  });

  it('test notification: non-ok response shows error', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/notifications/test')) {
        return Promise.resolve(mockResponse(500, { message: 'Internal error' }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', test: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Test notification failed'));
  });

  it('test notification: result with no error field shows "unknown error"', async () => {
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
      promptPassword: vi.fn().mockResolvedValue('tok'),
    }));

    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/settings')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/admin/notifications/test')) {
        return Promise.resolve(mockResponse(200, {
          results: [{ channel: 'telegram', success: false }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    globalThis.fetch = fetchMock;

    const { notificationSetupCommand } = await import('../commands/notification-setup.js');
    await notificationSetupCommand({
      password: 'pw', botToken: 'tok', chatId: 'cid', test: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('unknown error'));
  });
});


// ---------------------------------------------------------------------------
// wallet.ts branches
// ---------------------------------------------------------------------------

describe('walletCreateCommand branches', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('pw'),
    }));
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock('../utils/password.js');
    globalThis.fetch = originalFetch;
  });

  it('--all: creates wallets for all supported chains', async () => {
    const createCalls: string[] = [];
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string) as { chain: string; name: string };
        createCalls.push(body.chain);
        return Promise.resolve(mockResponse(201, {
          id: `w-${body.chain}`,
          name: body.name,
          chain: body.chain,
          environment: 'mainnet',
          publicKey: `pk-${body.chain}`,
        }));
      }
      if (u.includes('/networks')) {
        return Promise.resolve(mockResponse(200, {
          availableNetworks: [{ network: 'mainnet' }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      all: true,
    });

    expect(createCalls).toContain('solana');
    expect(createCalls).toContain('ethereum');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Created wallet'));
  });

  it('--chain + --all: exits with error', async () => {
    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
      all: true,
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--chain and --all cannot be used'));
  });

  it('no --chain and no --all: exits with error', async () => {
    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Specify --chain'));
  });

  it('unsupported chain: exits with error', async () => {
    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'bitcoin',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported chain'));
  });

  it('daemon not running: network error exits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Daemon is not running'));
  });

  it('409 conflict: reuses existing wallet', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve(mockResponse(409, { message: 'Already exists' }));
      }
      if (u.endsWith('/v1/wallets') && (!init?.method || init?.method === 'GET')) {
        return Promise.resolve(mockResponse(200, {
          wallets: [{
            id: 'existing-w',
            name: 'solana-mainnet',
            chain: 'solana',
            environment: 'mainnet',
            publicKey: 'pk123',
          }],
        }));
      }
      if (u.includes('/networks')) {
        return Promise.resolve(mockResponse(200, {
          availableNetworks: [{ network: 'mainnet' }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Reusing existing wallet'));
  });

  it('409 conflict: list wallets fails -> exits', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve(mockResponse(409, {}));
      }
      if (u.endsWith('/v1/wallets')) {
        return Promise.resolve(mockResponse(500, {}));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to list wallets'));
  });

  it('409 conflict: wallet not found in list -> exits', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve(mockResponse(409, {}));
      }
      if (u.endsWith('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, { wallets: [] }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('reported as existing but not found'));
  });

  it('non-ok non-409: exits with error message', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve({
          ...mockResponse(500, null),
          json: () => Promise.resolve({ message: 'Internal server error' }),
        });
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to create solana wallet'));
  });

  it('non-ok non-409: json parse fails, falls back to statusText', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          json: () => Promise.reject(new Error('not json')),
          headers: new Headers(),
        } as unknown as Response);
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await expect(walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'solana',
    })).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Server Error'));
  });

  it('smart account: displays signerKey and deployed in create summary', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve(mockResponse(201, {
          id: 'w-smart',
          name: 'evm-mainnet',
          chain: 'ethereum',
          environment: 'mainnet',
          publicKey: '0xabc',
          accountType: 'smart',
          signerKey: '0xsigner',
          deployed: true,
        }));
      }
      if (u.includes('/networks')) {
        return Promise.resolve(mockResponse(200, {
          availableNetworks: [{ network: 'mainnet' }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'ethereum',
      accountType: 'smart',
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Account Type:     smart'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Signer Key:       0xsigner'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Deployed:         yes'));
  });

  it('smart account: null signerKey displays --', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        return Promise.resolve(mockResponse(201, {
          id: 'w-smart',
          name: 'evm-mainnet',
          chain: 'ethereum',
          environment: 'mainnet',
          publicKey: '0xabc',
          accountType: 'smart',
          signerKey: null,
          deployed: false,
        }));
      }
      if (u.includes('/networks')) {
        return Promise.resolve(mockResponse(200, {
          availableNetworks: [{ network: 'mainnet' }],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'ethereum',
      accountType: 'smart',
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Signer Key:       --'));
  });

  it('ethereum chain: name defaults to evm-mainnet', async () => {
    let capturedName: string | undefined;
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/v1/wallets') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string) as { name: string };
        capturedName = body.name;
        return Promise.resolve(mockResponse(201, {
          id: 'w1', name: body.name, chain: 'ethereum',
          environment: 'mainnet', publicKey: '0x1',
        }));
      }
      if (u.includes('/networks')) {
        return Promise.resolve(mockResponse(200, { availableNetworks: [{ network: 'mainnet' }] }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { walletCreateCommand } = await import('../commands/wallet.js');
    await walletCreateCommand({
      baseUrl: 'http://127.0.0.1:3100',
      password: 'pw',
      chain: 'ethereum',
    });

    expect(capturedName).toBe('evm-mainnet');
  });
});

// ---------------------------------------------------------------------------
// mcp-setup.ts extra branches: maxRenewals, absoluteLifetime, wallet without name
// ---------------------------------------------------------------------------

describe('mcpSetupCommand extra branches', () => {
  let mockStdout: ReturnType<typeof vi.spyOn>;
  let mockStderr: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;
  let originalPlatform: PropertyDescriptor | undefined;
  let tempDir: string;

  beforeEach(() => {
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    vi.doMock('../utils/password.js', () => ({
      resolvePassword: vi.fn().mockResolvedValue('test-pw'),
    }));
    originalFetch = globalThis.fetch;
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    tempDir = makeTmpDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock('../utils/password.js');
    globalThis.fetch = originalFetch;
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('--maxRenewals and --absoluteLifetime passed correctly', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, { items: [{ id: 'w1', name: 'W' }] }));
      }
      if (u.includes('/v1/sessions')) {
        const body = JSON.parse(init?.body as string) as Record<string, unknown>;
        expect(body['maxRenewals']).toBe(5);
        expect(body['absoluteLifetime']).toBe(86400);
        return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({
      dataDir: tempDir,
      masterPassword: 'test-pw',
      maxRenewals: 5,
      absoluteLifetime: 86400,
    });

    expect(mockStdout).toHaveBeenCalledWith('MCP session created successfully!');
  });

  it('multiple wallets without name: shows id only', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, {
          items: [
            { id: 'wallet-1' },  // no name
            { id: 'wallet-2' },  // no name
          ],
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    }));

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await expect(mcpSetupCommand({
      dataDir: tempDir,
      masterPassword: 'test-pw',
    })).rejects.toThrow('process.exit(1)');

    // Should list wallets without names (no parenthesized name)
    expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('wallet-1'));
    expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('wallet-2'));
  });

  it('--wallet with explicit id: looks up wallet name', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, {
          items: [{ id: 'w-found', name: 'Found Wallet' }],
        }));
      }
      if (u.includes('/v1/sessions')) {
        return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({
      dataDir: tempDir,
      wallet: 'w-found',
      masterPassword: 'test-pw',
    });

    // The config snippet should include the wallet name
    const jsonCalls = mockStdout.mock.calls.filter((c: unknown[]) => String(c[0]).includes('"mcpServers"'));
    expect(jsonCalls.length).toBe(1);
    const config = JSON.parse(String(jsonCalls[0]![0])) as { mcpServers: Record<string, { env: Record<string, string> }> };
    const entry = config.mcpServers['waiaas-found-wallet'];
    expect(entry).toBeDefined();
    expect(entry.env['WAIAAS_WALLET_NAME']).toBe('Found Wallet');
  });

  it('--wallet with id not in list: walletName is undefined', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, {
          items: [{ id: 'other-wallet', name: 'Other' }],
        }));
      }
      if (u.includes('/v1/sessions')) {
        return Promise.resolve(mockResponse(200, { id: 's1', token: 't', expiresAt: 0 }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({
      dataDir: tempDir,
      wallet: 'unknown-wallet',
      masterPassword: 'test-pw',
    });

    // Config key should be based on wallet ID (no name found)
    const jsonCalls = mockStdout.mock.calls.filter((c: unknown[]) => String(c[0]).includes('"mcpServers"'));
    const config = JSON.parse(String(jsonCalls[0]![0])) as { mcpServers: Record<string, { env: Record<string, string> }> };
    const entry = config.mcpServers['waiaas-unknown-wallet'];
    expect(entry).toBeDefined();
    // WAIAAS_WALLET_NAME should NOT be set
    expect(entry.env['WAIAAS_WALLET_NAME']).toBeUndefined();
  });

  it('--all with wallet that has no name: shows wallet id in log', async () => {
    let sessionCalls = 0;
    const fetchMock = vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, {
          items: [{ id: 'w1' }],  // no name
        }));
      }
      if (u.includes('/v1/sessions')) {
        sessionCalls++;
        return Promise.resolve(mockResponse(200, {
          id: `s${sessionCalls}`, token: `t${sessionCalls}`, expiresAt: 0,
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({
      dataDir: tempDir,
      all: true,
      masterPassword: 'test-pw',
    });

    // When name is undefined, should use wallet ID in log
    expect(mockStdout).toHaveBeenCalledWith(expect.stringContaining('MCP session created for w1!'));
  });

  it('--all with maxRenewals and absoluteLifetime passes them', async () => {
    let sessionCalls = 0;
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/health')) return Promise.resolve(mockResponse(200, {}));
      if (u.includes('/v1/wallets')) {
        return Promise.resolve(mockResponse(200, {
          items: [{ id: 'w1', name: 'A' }],
        }));
      }
      if (u.includes('/v1/sessions')) {
        sessionCalls++;
        const body = JSON.parse(init?.body as string) as Record<string, unknown>;
        expect(body['maxRenewals']).toBe(10);
        expect(body['absoluteLifetime']).toBe(172800);
        return Promise.resolve(mockResponse(200, {
          id: `s${sessionCalls}`, token: `t${sessionCalls}`, expiresAt: 0,
        }));
      }
      return Promise.reject(new Error(`Unexpected: ${u}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { mcpSetupCommand } = await import('../commands/mcp-setup.js');
    await mcpSetupCommand({
      dataDir: tempDir,
      all: true,
      masterPassword: 'test-pw',
      maxRenewals: 10,
      absoluteLifetime: 172800,
    });

    expect(sessionCalls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// update-notify.ts branches (missing version/latestVersion)
// ---------------------------------------------------------------------------

describe('update-notify branches', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    originalFetch = globalThis.fetch;
    originalEnv = process.env['WAIAAS_NO_UPDATE_NOTIFY'];
    delete process.env['WAIAAS_NO_UPDATE_NOTIFY'];
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env['WAIAAS_NO_UPDATE_NOTIFY'] = originalEnv;
    } else {
      delete process.env['WAIAAS_NO_UPDATE_NOTIFY'];
    }
  });

  it('renders "unknown" when version and latestVersion are null', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'waiaas-notify-'));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        updateAvailable: true,
        version: null,
        latestVersion: null,
      }),
    });

    const { checkAndNotifyUpdate } = await import('../utils/update-notify.js');
    await checkAndNotifyUpdate({ dataDir });

    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('unknown');
    expect(output).toContain('unknown');

    rmSync(dataDir, { recursive: true, force: true });
  });

  it('renders "unknown" when version fields are missing', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'waiaas-notify-'));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        updateAvailable: true,
        // version and latestVersion are undefined
      }),
    });

    const { checkAndNotifyUpdate } = await import('../utils/update-notify.js');
    await checkAndNotifyUpdate({ dataDir });

    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(output).toContain('unknown');

    rmSync(dataDir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// backup.ts branches: health check non-ok (not thrown)
// ---------------------------------------------------------------------------

describe('backupCommand branches', () => {
  let _logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    _logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('health check returns non-ok: exits with daemon unreachable error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { backupCommand } = await import('../commands/backup.js');
    await expect(backupCommand({ password: 'pw' })).rejects.toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot reach WAIaaS daemon'));
  });

  it('backup API non-ok non-401: json parse fails, shows Unknown error', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true }) // health
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

    const { backupCommand } = await import('../commands/backup.js');
    await expect(backupCommand({ password: 'pw' })).rejects.toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));
  });
});
