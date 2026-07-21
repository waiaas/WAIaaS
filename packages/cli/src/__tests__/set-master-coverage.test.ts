/**
 * CLI set-master.ts coverage tests.
 *
 * Tests setMasterCommand with mocked fetch, password prompt, and filesystem.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Mock password utils
vi.mock('../utils/password.js', () => ({
  resolvePassword: vi.fn().mockResolvedValue('current-password'),
  promptPassword: vi.fn()
    .mockResolvedValueOnce('newpass12345')  // new password
    .mockResolvedValueOnce('newpass12345'), // confirm
}));

describe('setMasterCommand', () => {
  const originalExit = process.exit;
  const exitMock = vi.fn() as unknown as (code?: number) => never;
  const consoleSpy = { log: vi.fn(), error: vi.fn(), warn: vi.fn() };
  let testDir: string;
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.exit = exitMock;
    vi.spyOn(console, 'log').mockImplementation(consoleSpy.log);
    vi.spyOn(console, 'error').mockImplementation(consoleSpy.error);
    vi.spyOn(console, 'warn').mockImplementation(consoleSpy.warn);
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    testDir = join(tmpdir(), `waiaas-setmaster-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });

    // Re-setup promptPassword mock for each test
    const { promptPassword } = await import('../utils/password.js');
    vi.mocked(promptPassword)
      .mockResolvedValueOnce('newpass12345')
      .mockResolvedValueOnce('newpass12345');
  });

  afterEach(() => {
    process.exit = originalExit;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('success: changes password and prints result', async () => {
    // Health check
    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response) // health
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ walletsReEncrypted: 2, settingsReEncrypted: 5 }),
      } as unknown as Response); // PUT password

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.log).toHaveBeenCalledWith('Master password changed successfully.');
    expect(consoleSpy.log).toHaveBeenCalledWith('  Wallets re-encrypted: 2');
  });

  it('health check failure: exits', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Daemon is not running'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('health check network error: exits', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Cannot connect'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('short password: exits', async () => {
    // Health check passes
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const { promptPassword: pp } = await import('../utils/password.js');
    vi.mocked(pp).mockReset();
    vi.mocked(pp).mockResolvedValueOnce('short');

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('at least 8'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('password mismatch: exits', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const { promptPassword: pp2 } = await import('../utils/password.js');
    vi.mocked(pp2).mockReset();
    vi.mocked(pp2)
      .mockResolvedValueOnce('password123')
      .mockResolvedValueOnce('different456');

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('do not match'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('API error: exits with error message', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response) // health
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Wrong current password' }),
      } as unknown as Response);

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Wrong current password'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('deletes recovery.key if it exists', async () => {
    const recoveryPath = join(testDir, 'recovery.key');
    writeFileSync(recoveryPath, 'test-key');
    expect(existsSync(recoveryPath)).toBe(true);

    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ walletsReEncrypted: 0, settingsReEncrypted: 0 }),
      } as unknown as Response);

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(existsSync(recoveryPath)).toBe(false);
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Recovery key deleted'));
  });

  it('network error on PUT: exits with error', async () => {
    const { promptPassword: pp } = await import('../utils/password.js');
    vi.mocked(pp).mockReset();
    vi.mocked(pp)
      .mockResolvedValueOnce('newpass12345')
      .mockResolvedValueOnce('newpass12345');

    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response) // health
      .mockRejectedValueOnce(new Error('Connection refused')); // PUT

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('recovery.key delete failure: warns when unlink fails', async () => {
    const { promptPassword: pp } = await import('../utils/password.js');
    vi.mocked(pp).mockReset();
    vi.mocked(pp)
      .mockResolvedValueOnce('newpass12345')
      .mockResolvedValueOnce('newpass12345');

    // Create recovery.key as a non-empty directory (unlinkSync will fail)
    const recoveryPath = join(testDir, 'recovery.key');
    mkdirSync(recoveryPath, { recursive: true });
    writeFileSync(join(recoveryPath, 'dummy'), 'x');

    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ walletsReEncrypted: 0, settingsReEncrypted: 0 }),
      } as unknown as Response);

    const { setMasterCommand } = await import('../commands/set-master.js');
    await setMasterCommand({ dataDir: testDir, password: 'current' });

    expect(consoleSpy.warn).toHaveBeenCalledWith('Warning: Could not delete recovery.key');
  });
});
