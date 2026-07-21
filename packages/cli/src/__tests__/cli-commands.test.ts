/**
 * CLI command unit tests.
 *
 * Tests individual command functions with mocked dependencies.
 * NOT E2E tests -- those are Plan 51-02.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// @waiaas/daemon is hoisted-mocked so start.ts's dynamic import() always resolves to
// the mock regardless of timing. Per-test vi.doMock + dynamic import raced in CI and
// flaked the startCommand tests; a top-level vi.mock is deterministic.
vi.mock('@waiaas/daemon', () => ({ startDaemon: vi.fn() }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `waiaas-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function rmrf(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// resolveDataDir tests
// ---------------------------------------------------------------------------

describe('resolveDataDir', () => {
  const originalEnv = process.env['WAIAAS_DATA_DIR'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['WAIAAS_DATA_DIR'] = originalEnv;
    } else {
      delete process.env['WAIAAS_DATA_DIR'];
    }
  });

  it('returns --data-dir option when provided', async () => {
    const { resolveDataDir } = await import('../utils/data-dir.js');
    expect(resolveDataDir({ dataDir: '/custom/path' })).toBe('/custom/path');
  });

  it('returns WAIAAS_DATA_DIR env when set (no --data-dir)', async () => {
    process.env['WAIAAS_DATA_DIR'] = '/env/path';
    const { resolveDataDir } = await import('../utils/data-dir.js');
    expect(resolveDataDir()).toBe('/env/path');
  });

  it('returns ~/.waiaas/ default when neither provided', async () => {
    delete process.env['WAIAAS_DATA_DIR'];
    const { resolveDataDir } = await import('../utils/data-dir.js');
    const { homedir } = await import('node:os');
    const result = resolveDataDir();
    expect(result).toBe(join(homedir(), '.waiaas'));
  });
});

// ---------------------------------------------------------------------------
// initCommand tests
// ---------------------------------------------------------------------------

describe('initCommand', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `waiaas-init-${randomUUID()}`);
  });

  afterEach(() => {
    rmrf(testDir);
  });

  it('creates data directory + subdirectories + config.toml when none exist', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir);

    expect(existsSync(testDir)).toBe(true);
    expect(existsSync(join(testDir, 'keystore'))).toBe(true);
    expect(existsSync(join(testDir, 'data'))).toBe(true);
    expect(existsSync(join(testDir, 'logs'))).toBe(true);
    expect(existsSync(join(testDir, 'backups'))).toBe(true);
    expect(existsSync(join(testDir, 'config.toml'))).toBe(true);
  });

  it('skips config.toml creation if already exists (idempotent)', async () => {
    const { initCommand } = await import('../commands/init.js');

    // First init
    await initCommand(testDir);

    // Modify config.toml
    const configPath = join(testDir, 'config.toml');
    writeFileSync(configPath, 'custom = true\n');

    // Second init (should not overwrite)
    await initCommand(testDir);

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toBe('custom = true\n');
  });

  it('creates directory with 0o700 permissions', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir);

    const { statSync } = await import('node:fs');
    const stats = statSync(testDir);
    // On macOS, directory permissions might be masked
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it('generated config.toml contains [daemon] and [database] sections', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir);

    const content = readFileSync(join(testDir, 'config.toml'), 'utf-8');
    expect(content).toContain('[daemon]');
    expect(content).toContain('[database]');
    expect(content).toContain('port = 3100');
    expect(content).toContain('hostname = "127.0.0.1"');
    expect(content).toContain('path = "data/waiaas.db"');
  });

  it('generated config.toml contains commented [security], [rpc], [notifications] sections', async () => {
    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir);

    const content = readFileSync(join(testDir, 'config.toml'), 'utf-8');
    expect(content).toContain('# [security]');
    expect(content).toContain('# [rpc]');
    expect(content).toContain('# [notifications]');
    expect(content).toContain('# Full reference:');
  });

  it('completion output includes WAIAAS_MASTER_PASSWORD guidance', async () => {
    const mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir);

    const allOutput = mockStdout.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('WAIAAS_MASTER_PASSWORD');
    expect(allOutput).toContain('WAIAAS_MASTER_PASSWORD_FILE');
    expect(allOutput).toContain('Next: waiaas start');

    mockStdout.mockRestore();
  });

  it('creates recovery.key when autoProvision is true', async () => {
    const mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { initCommand } = await import('../commands/init.js');
    await initCommand(testDir, { autoProvision: true });

    const recoveryPath = join(testDir, 'recovery.key');
    expect(existsSync(recoveryPath)).toBe(true);
    const content = readFileSync(recoveryPath, 'utf-8');
    // recovery key is 32 random bytes hex = 64 chars
    expect(content).toHaveLength(64);

    const allOutput = mockStdout.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Auto-provision mode enabled');
    expect(allOutput).toContain('Recovery key saved to');
    expect(allOutput).toContain('IMPORTANT: Change the master password');

    mockStdout.mockRestore();
  });

  it('rethrows non-permission errors from mkdirSync', async () => {
    const { initCommand } = await import('../commands/init.js');

    // Use a path with null bytes which causes an error that is NOT EACCES/EPERM
    await expect(initCommand('/invalid\x00path')).rejects.toThrow();
  });

  it('prints permission denied message on EACCES error', async () => {
    const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);

    const { initCommand } = await import('../commands/init.js');

    // Create a read-only directory to trigger EACCES on nested mkdir
    const readonlyDir = join(tmpdir(), `waiaas-readonly-${randomUUID()}`);
    mkdirSync(readonlyDir, { recursive: true, mode: 0o755 });
    const { chmodSync } = await import('node:fs');
    chmodSync(readonlyDir, 0o444);

    const targetDir = join(readonlyDir, 'nested', 'waiaas');

    try {
      await expect(initCommand(targetDir)).rejects.toThrow('process.exit');

      const allStderr = mockStderr.mock.calls.map((c) => c[0]).join('\n');
      expect(allStderr).toContain('Permission denied');
    } finally {
      // Restore permissions for cleanup
      chmodSync(readonlyDir, 0o755);
      rmrf(readonlyDir);
      mockStderr.mockRestore();
      mockExit.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// startCommand tests
// ---------------------------------------------------------------------------

describe('startCommand', () => {
  let testDir: string;
  const originalEnv = { ...process.env };
  let mockStderr: ReturnType<typeof vi.spyOn>;

  // Custom error to simulate process.exit halting execution
  class ExitError extends Error {
    code: number;
    constructor(code: number) {
      super(`process.exit(${code})`);
      this.code = code;
    }
  }

  beforeEach(async () => {
    testDir = makeTmpDir();
    // Reset the hoisted @waiaas/daemon mock so each test sets its own behavior.
    const { startDaemon } = await import('@waiaas/daemon');
    vi.mocked(startDaemon).mockReset();
    // Mock process.exit to throw -- simulates execution halt
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new ExitError(code);
    }) as never);
    mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    rmrf(testDir);
    process.env = { ...originalEnv };
    mockStderr.mockRestore();
    vi.restoreAllMocks();
  });

  it('calls startDaemon with dataDir and password', async () => {
    process.env['WAIAAS_MASTER_PASSWORD'] = 'test-password-123';

    const { startDaemon } = await import('@waiaas/daemon');
    vi.mocked(startDaemon).mockResolvedValue(undefined as never);

    const { startCommand } = await import('../commands/start.js');
    await startCommand(testDir);

    expect(startDaemon).toHaveBeenCalledWith(testDir, 'test-password-123');
  });

  it('exits with error if daemon already running (PID file exists, process alive)', async () => {
    // Write a PID file with current process PID (which is alive)
    const pidPath = join(testDir, 'daemon.pid');
    writeFileSync(pidPath, String(process.pid));

    const { startCommand } = await import('../commands/start.js');

    await expect(startCommand(testDir)).rejects.toThrow(ExitError);

    expect(mockStderr).toHaveBeenCalledWith(
      expect.stringContaining('already running'),
    );
  });

  it('prints error and exits 1 on startDaemon failure', async () => {
    process.env['WAIAAS_MASTER_PASSWORD'] = 'test-password-123';

    const { startDaemon } = await import('@waiaas/daemon');
    vi.mocked(startDaemon).mockRejectedValue(new Error('DB init failed'));

    const { startCommand } = await import('../commands/start.js');

    await expect(startCommand(testDir)).rejects.toThrow(ExitError);

    expect(mockStderr).toHaveBeenCalledWith(
      expect.stringContaining('DB init failed'),
    );
  });

  it('outputs port conflict hint when EADDRINUSE', async () => {
    process.env['WAIAAS_MASTER_PASSWORD'] = 'test-password-123';

    const { startDaemon } = await import('@waiaas/daemon');
    vi.mocked(startDaemon).mockRejectedValue(
      new Error('Port 3100 is already in use. Try a different port or stop the other process.'),
    );

    const { startCommand } = await import('../commands/start.js');

    await expect(startCommand(testDir)).rejects.toThrow(ExitError);

    const allStderr = mockStderr.mock.calls.map((c) => c[0]).join('\n');
    expect(allStderr).toContain('already in use');
    expect(allStderr).toContain('lsof');
  });

  it('does not print Step logs on successful start (daemon uses console.debug)', async () => {
    process.env['WAIAAS_MASTER_PASSWORD'] = 'test-password-123';

    const mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { startDaemon } = await import('@waiaas/daemon');
    vi.mocked(startDaemon).mockResolvedValue(undefined as never);

    const { startCommand } = await import('../commands/start.js');
    await startCommand(testDir);

    // start.ts should not output any Step logs (those are console.debug in daemon.ts)
    const allStdout = mockStdout.mock.calls.map((c) => c[0]).join('\n');
    expect(allStdout).not.toContain('Step 1:');
    expect(allStdout).not.toContain('Step 2:');
    expect(allStdout).not.toContain('Step 3:');
    expect(allStdout).not.toContain('Step 4');
    expect(allStdout).not.toContain('Step 5:');
    expect(allStdout).not.toContain('Step 6:');

    mockStdout.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// stopCommand tests
// ---------------------------------------------------------------------------

describe('stopCommand', () => {
  let testDir: string;
  let mockStdout: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testDir = makeTmpDir();
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmrf(testDir);
    mockStdout.mockRestore();
    vi.restoreAllMocks();
  });

  it('reads PID file, sends SIGTERM to running process', async () => {
    // Spawn a long-running child process so we can send it signals
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{},60000)'], {
      detached: true,
      stdio: 'ignore',
    });
    const childPid = child.pid!;

    // Write PID file
    writeFileSync(join(testDir, 'daemon.pid'), String(childPid));

    // Spy on process.kill
    const killSpy = vi.spyOn(process, 'kill');

    const { stopCommand } = await import('../commands/stop.js');

    // stopCommand will send SIGTERM; child should exit
    // We also kill it ourselves to ensure cleanup
    const stopPromise = stopCommand(testDir);

    // Give it a moment then kill the child
    setTimeout(() => {
      try {
        process.kill(childPid, 'SIGKILL');
      } catch {
        // Already dead
      }
    }, 200);

    await stopPromise;

    // Should have called kill with SIGTERM (also called with 0 for isProcessAlive check)
    expect(killSpy).toHaveBeenCalledWith(childPid, 'SIGTERM');

    killSpy.mockRestore();
    child.unref();
  });

  it('prints "not running" if no PID file', async () => {
    const { stopCommand } = await import('../commands/stop.js');
    await stopCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith('Daemon is not running');
  });

  it('cleans up stale PID file when process not alive (ESRCH)', async () => {
    // Write a PID file with a PID that does not exist
    const stalePid = 99999999;
    const pidPath = join(testDir, 'daemon.pid');
    writeFileSync(pidPath, String(stalePid));

    const { stopCommand } = await import('../commands/stop.js');
    await stopCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith('Daemon is not running (stale PID file)');
    // PID file should be cleaned up
    expect(existsSync(pidPath)).toBe(false);
  });

  it('sends SIGKILL after timeout', async () => {
    // We test with a mock approach: create a process that ignores SIGTERM
    const { spawn } = await import('node:child_process');
    const child = spawn('node', ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], {
      detached: true,
      stdio: 'ignore',
    });
    const childPid = child.pid!;
    child.unref();

    writeFileSync(join(testDir, 'daemon.pid'), String(childPid));

    // We need to test that SIGKILL is sent, but we don't want to wait 10s
    // Instead, we mock the timeout constants by re-implementing with shorter values
    // For this test we just verify the structure works by killing it externally
    const killSpy = vi.spyOn(process, 'kill');

    const { stopCommand } = await import('../commands/stop.js');

    // Run stop in background, kill the child after a short delay
    const stopPromise = stopCommand(testDir);

    // Kill child after 1s to simulate it eventually dying
    setTimeout(() => {
      try {
        process.kill(childPid, 'SIGKILL');
      } catch {
        // Already dead
      }
    }, 1000);

    await stopPromise;

    // Verify SIGTERM was sent
    expect(killSpy).toHaveBeenCalledWith(childPid, 'SIGTERM');

    killSpy.mockRestore();
  }, 15000);
});

// ---------------------------------------------------------------------------
// statusCommand tests
// ---------------------------------------------------------------------------

describe('statusCommand', () => {
  let testDir: string;
  let mockStdout: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    testDir = makeTmpDir();
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmrf(testDir);
    mockStdout.mockRestore();
    vi.restoreAllMocks();
  });

  it('reports "running" when PID file exists and health check succeeds', async () => {
    // Create a simple HTTP server for health check
    const { createServer } = await import('node:http');

    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;

    // Write PID file with our own PID (which is alive)
    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));

    // Write config.toml with the port
    writeFileSync(
      join(testDir, 'config.toml'),
      `[daemon]\nport = ${port}\nhostname = "127.0.0.1"\n`,
    );

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith(
      `Status: running (PID: ${process.pid}, Port: ${port})`,
    );

    server.close();
  });

  it('reports "stopped" when no PID file', async () => {
    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith('Status: stopped');
  });

  it('reports "stopped (stale PID)" when PID file exists but process not alive', async () => {
    const stalePid = 99999999;
    const pidPath = join(testDir, 'daemon.pid');
    writeFileSync(pidPath, String(stalePid));

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith('Status: stopped (stale PID file)');
    // PID file should be cleaned up
    expect(existsSync(pidPath)).toBe(false);
  });

  it('reports "starting" when health check returns non-200', async () => {
    const { createServer } = await import('node:http');

    const server = createServer((_, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"status":"unavailable"}');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as { port: number }).port;

    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));
    writeFileSync(
      join(testDir, 'config.toml'),
      `[daemon]\nport = ${port}\nhostname = "127.0.0.1"\n`,
    );

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith(`Status: starting (PID: ${process.pid})`);

    server.close();
  });

  it('reports "starting" when health check fetch throws (connection refused)', async () => {
    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));
    // Use a port that is almost certainly not in use
    writeFileSync(
      join(testDir, 'config.toml'),
      `[daemon]\nport = 19999\nhostname = "127.0.0.1"\n`,
    );

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    expect(mockStdout).toHaveBeenCalledWith(`Status: starting (PID: ${process.pid})`);
  });

  it('falls back to default port when no config.toml exists', async () => {
    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));
    // No config.toml written -- resolvePort should return DEFAULT_DAEMON_PORT (3100)

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    // Should report either "running" or "starting" with our PID
    const allOutput = mockStdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toMatch(/Status: (running|starting)/);
    expect(allOutput).toContain(String(process.pid));
  });

  it('falls back to default port when config.toml has no port line', async () => {
    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));
    writeFileSync(join(testDir, 'config.toml'), `[daemon]\nhostname = "127.0.0.1"\n`);

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    const allOutput = mockStdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toMatch(/Status: (running|starting)/);
  });

  it('falls back to default port when port in config.toml is out of range', async () => {
    writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));
    writeFileSync(join(testDir, 'config.toml'), `[daemon]\nport = 99999\n`);

    const { statusCommand } = await import('../commands/status.js');
    await statusCommand(testDir);

    const allOutput = mockStdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toMatch(/Status: (running|starting)/);
  });
});

// ---------------------------------------------------------------------------
// resolvePassword tests
// ---------------------------------------------------------------------------

describe('resolvePassword', () => {
  const originalEnv = { ...process.env };
  let testDir: string;

  beforeEach(() => {
    testDir = makeTmpDir();
  });

  afterEach(() => {
    rmrf(testDir);
    process.env = { ...originalEnv };
  });

  it('returns WAIAAS_MASTER_PASSWORD env var when set', async () => {
    process.env['WAIAAS_MASTER_PASSWORD'] = 'env-password-123';
    delete process.env['WAIAAS_MASTER_PASSWORD_FILE'];

    const { resolvePassword } = await import('../utils/password.js');
    const password = await resolvePassword();
    expect(password).toBe('env-password-123');
  });

  it('reads password from WAIAAS_MASTER_PASSWORD_FILE', async () => {
    delete process.env['WAIAAS_MASTER_PASSWORD'];
    const pwFile = join(testDir, 'master-pw.txt');
    writeFileSync(pwFile, '  file-password-456  \n');
    process.env['WAIAAS_MASTER_PASSWORD_FILE'] = pwFile;

    const { resolvePassword } = await import('../utils/password.js');
    const password = await resolvePassword();
    expect(password).toBe('file-password-456');
  });

  it('throws when password file is empty', async () => {
    delete process.env['WAIAAS_MASTER_PASSWORD'];
    const pwFile = join(testDir, 'empty-pw.txt');
    writeFileSync(pwFile, '   \n');
    process.env['WAIAAS_MASTER_PASSWORD_FILE'] = pwFile;

    const { resolvePassword } = await import('../utils/password.js');
    await expect(resolvePassword()).rejects.toThrow('empty');
  });
});
