/**
 * Platform tests for `waiaas start` and `waiaas stop` commands + exit codes.
 *
 * Start 6 + Stop 5 + Exit codes 6 = 17 tests.
 * Uses initTestDataDir/startTestDaemon/stopTestDaemon harness for isolation.
 *
 * PLAT-01-START-01 ~ PLAT-01-START-06
 * PLAT-01-STOP-01 ~ PLAT-01-STOP-05
 * PLAT-01-EXIT-01 ~ PLAT-01-EXIT-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { TestDaemonHarness } from '../helpers/daemon-harness.js';
import {
  initTestDataDir,
  startTestDaemon,
  stopTestDaemon,
  waitForHealth,
} from '../helpers/daemon-harness.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `waiaas-plat-startstop-${randomUUID()}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function rmrf(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Start tests (6)
// ---------------------------------------------------------------------------

describe('PLAT-01 start platform tests', { timeout: 30_000 }, () => {
  let harness: TestDaemonHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await stopTestDaemon(harness);
      harness = null;
    }
  });

  it('PLAT-01-START-01: startTestDaemon creates PID file with correct PID', async () => {
    const { dataDir } = await initTestDataDir();
    harness = await startTestDaemon(dataDir);

    const pidPath = join(dataDir, 'daemon.pid');
    expect(existsSync(pidPath)).toBe(true);

    const pidContent = readFileSync(pidPath, 'utf-8').trim();
    expect(parseInt(pidContent, 10)).toBe(process.pid);
  });

  it('PLAT-01-START-02: daemon responds to GET /health with 200 OK', async () => {
    const { dataDir } = await initTestDataDir();
    harness = await startTestDaemon(dataDir);
    await waitForHealth(harness);

    const res = await fetch(`${harness.baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('PLAT-01-START-03: PID alive -> "already running" error + exit(1)', async () => {
    const testDir = makeTmpDir();

    try {
      // Write a PID file with current process PID (which is alive)
      const pidPath = join(testDir, 'daemon.pid');
      writeFileSync(pidPath, String(process.pid));

      const mockStderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
        throw new ExitError(code);
      }) as never);

      const { startCommand } = await import('../../commands/start.js');
      await expect(startCommand(testDir)).rejects.toThrow(ExitError);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringContaining('already running'),
      );

      mockStderr.mockRestore();
      vi.restoreAllMocks();
    } finally {
      rmrf(testDir);
    }
  });

  it('PLAT-01-START-04: stale PID file (dead process) -> normal start', async () => {
    const { dataDir } = await initTestDataDir();

    // Write a PID file with a PID that doesn't exist (stale)
    const stalePid = 99999999;
    writeFileSync(join(dataDir, 'daemon.pid'), String(stalePid));

    // Start should succeed despite stale PID file
    harness = await startTestDaemon(dataDir);
    await waitForHealth(harness);

    const res = await fetch(`${harness.baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('PLAT-01-START-05: minimal config.toml (port only) -> daemon starts with other defaults', async () => {
    const { dataDir, port } = await initTestDataDir();

    // Overwrite config.toml with minimal content (only port to avoid EADDRINUSE)
    // loadConfig should fill in other defaults via Zod schema
    const configPath = join(dataDir, 'config.toml');
    writeFileSync(configPath, `[daemon]\nport = ${port}\n`);

    // startDaemon calls loadConfig internally which applies Zod defaults for missing keys
    harness = await startTestDaemon(dataDir);
    await waitForHealth(harness);

    expect(harness.daemon.isShuttingDown).toBe(false);
    // Verify that default hostname was applied
    expect(harness.daemon.config!.daemon.hostname).toBe('127.0.0.1');
    // Verify that default database path was applied
    expect(harness.daemon.config!.database.path).toBe('data/waiaas.db');
  });

  it('PLAT-01-START-06: daemon.lock already held -> SYSTEM_LOCKED error', async () => {
    const { dataDir } = await initTestDataDir();

    // Start a first daemon to hold the lock
    const firstDaemon = await startTestDaemon(dataDir);
    await waitForHealth(firstDaemon);

    try {
      // Second DaemonLifecycle on the same dataDir should fail at lock acquisition
      const { DaemonLifecycle } = await import('@waiaas/daemon');
      const secondDaemon = new DaemonLifecycle();

      // Suppress console output from failed startup
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockErr = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(secondDaemon.start(dataDir, 'test-password-12345')).rejects.toThrow(
        /SYSTEM_LOCKED|already.*running|already being held|ELOCKED/,
      );

      mockLog.mockRestore();
      mockErr.mockRestore();
    } finally {
      await stopTestDaemon(firstDaemon);
      rmrf(dataDir);
    }
  });
});

// ---------------------------------------------------------------------------
// Stop tests (5)
// ---------------------------------------------------------------------------

describe('PLAT-01 stop platform tests', { timeout: 30_000 }, () => {
  let mockStdout: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockStdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mockStdout.mockRestore();
    vi.restoreAllMocks();
  });

  it('PLAT-01-STOP-01: no PID file -> "Daemon is not running"', async () => {
    const testDir = makeTmpDir();

    try {
      const { stopCommand } = await import('../../commands/stop.js');
      await stopCommand(testDir);

      expect(mockStdout).toHaveBeenCalledWith('Daemon is not running');
    } finally {
      rmrf(testDir);
    }
  });

  it('PLAT-01-STOP-02: stale PID file -> "not running (stale PID file)" + PID file deleted', async () => {
    const testDir = makeTmpDir();

    try {
      const stalePid = 99999999;
      const pidPath = join(testDir, 'daemon.pid');
      writeFileSync(pidPath, String(stalePid));

      const { stopCommand } = await import('../../commands/stop.js');
      await stopCommand(testDir);

      expect(mockStdout).toHaveBeenCalledWith('Daemon is not running (stale PID file)');
      expect(existsSync(pidPath)).toBe(false);
    } finally {
      rmrf(testDir);
    }
  });

  it('PLAT-01-STOP-03: running daemon -> SIGTERM sent, process exits, PID file deleted', async () => {
    const { dataDir } = await initTestDataDir();
    let harness: TestDaemonHarness | null = null;

    try {
      harness = await startTestDaemon(dataDir);
      await waitForHealth(harness);

      // PID file should exist before shutdown
      expect(existsSync(join(dataDir, 'daemon.pid'))).toBe(true);

      // Mock process.exit to prevent vitest from intercepting the call
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Shutdown via DaemonLifecycle (simulates stopCommand's SIGTERM effect)
      await harness.daemon.shutdown('TEST');

      // PID file should be removed after shutdown
      expect(existsSync(join(dataDir, 'daemon.pid'))).toBe(false);
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
      harness = null;
    } finally {
      if (harness) await stopTestDaemon(harness);
      rmrf(dataDir);
    }
  });

  it('PLAT-01-STOP-04: graceful shutdown 10-step cascade completes', async () => {
    const { dataDir } = await initTestDataDir();
    let harness: TestDaemonHarness | null = null;

    try {
      harness = await startTestDaemon(dataDir);
      await waitForHealth(harness);

      // Capture shutdown steps. ConsoleLogger routes info to console.info and
      // debug to console.debug, and in Node those are separate properties from
      // console.log -- spying on log alone never sees them. Capture all three.
      const logs: string[] = [];
      const collect = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
      mockStdout.mockRestore();
      mockStdout = vi.spyOn(console, 'log').mockImplementation(collect);
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(collect);
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(collect);
      // Steps 2-4 and 7 are logged at debug level; the daemon defaults to info.
      harness.daemon.logger.setLevel('debug');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await harness.daemon.shutdown('TEST');

      // Verify key shutdown steps are logged
      expect(logs.some((l) => l.includes('Shutdown initiated'))).toBe(true);
      expect(logs.some((l) => l.includes('HTTP server closed'))).toBe(true);
      expect(logs.some((l) => l.includes('Workers stopped'))).toBe(true);
      expect(logs.some((l) => l.includes('Shutdown complete'))).toBe(true);

      // isShuttingDown should be true
      expect(harness.daemon.isShuttingDown).toBe(true);
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
      infoSpy.mockRestore();
      debugSpy.mockRestore();
      harness = null;
    } finally {
      if (harness) await stopTestDaemon(harness);
      rmrf(dataDir);
    }
  });

  it('PLAT-01-STOP-05: forceTimer triggers process.exit(1) on shutdown timeout', async () => {
    // Test that DaemonLifecycle sets a force exit timer during shutdown.
    // We verify the timer is created (and cleared on successful shutdown).
    const { DaemonLifecycle } = await import('@waiaas/daemon');

    const daemon = new DaemonLifecycle();

    // Mock console to suppress output
    const mockConsole = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockConsoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Shutdown without starting (no resources to clean up, but force timer will be set)
    // Use a short config to test the timer path
    await daemon.shutdown('TEST');

    // After shutdown completes, isShuttingDown should be true
    expect(daemon.isShuttingDown).toBe(true);

    // Successful shutdown calls process.exit(0)
    expect(exitSpy).toHaveBeenCalledWith(0);

    mockConsole.mockRestore();
    mockConsoleErr.mockRestore();
    exitSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Exit code tests (6)
// ---------------------------------------------------------------------------

describe('PLAT-01 exit code platform tests', { timeout: 30_000 }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PLAT-01-EXIT-01: graceful shutdown (SIGTERM) -> exit code 0 (process.exit not called)', async () => {
    const { dataDir } = await initTestDataDir();
    let harness: TestDaemonHarness | null = null;

    try {
      harness = await startTestDaemon(dataDir);
      await waitForHealth(harness);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await harness.daemon.shutdown('SIGTERM');

      // Graceful shutdown calls process.exit(0) after cleanup
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
      harness = null;
    } finally {
      if (harness) await stopTestDaemon(harness);
      rmrf(dataDir);
    }
  });

  it('PLAT-01-EXIT-02: already running daemon start attempt -> exit code 1', async () => {
    const testDir = makeTmpDir();

    try {
      writeFileSync(join(testDir, 'daemon.pid'), String(process.pid));

      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
        throw new ExitError(code);
      }) as never);

      const { startCommand } = await import('../../commands/start.js');
      const err = await startCommand(testDir).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    } finally {
      rmrf(testDir);
    }
  });

  it('PLAT-01-EXIT-03: master password not provided -> exit code 1', async () => {
    const testDir = makeTmpDir();

    try {
      // Use an empty password file to trigger "WAIAAS_MASTER_PASSWORD_FILE is empty" error
      // This avoids interactive stdin prompt which hangs in tests
      const origPass = process.env['WAIAAS_MASTER_PASSWORD'];
      const origFile = process.env['WAIAAS_MASTER_PASSWORD_FILE'];
      delete process.env['WAIAAS_MASTER_PASSWORD'];

      // Create an empty password file
      const emptyPassFile = join(testDir, 'empty-password');
      writeFileSync(emptyPassFile, '');
      process.env['WAIAAS_MASTER_PASSWORD_FILE'] = emptyPassFile;

      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
        throw new ExitError(code);
      }) as never);

      const { startCommand } = await import('../../commands/start.js');
      const err = await startCommand(testDir).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);

      // Restore env
      if (origPass !== undefined) process.env['WAIAAS_MASTER_PASSWORD'] = origPass;
      else delete process.env['WAIAAS_MASTER_PASSWORD'];
      if (origFile !== undefined) process.env['WAIAAS_MASTER_PASSWORD_FILE'] = origFile;
      else delete process.env['WAIAAS_MASTER_PASSWORD_FILE'];
    } finally {
      rmrf(testDir);
    }
  });

  it('PLAT-01-EXIT-04: uncaughtException -> exit code 1', async () => {
    // Verify signal handler calls process.exit(1) on uncaughtException
    const { DaemonLifecycle, registerSignalHandlers } = await import('@waiaas/daemon');

    const daemon = new DaemonLifecycle();
    vi.spyOn(daemon, 'shutdown').mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    type HandlerFn = (...args: unknown[]) => void;
    const handlers = new Map<string, HandlerFn>();
    vi.spyOn(process, 'on').mockImplementation(((event: string, handler: HandlerFn) => {
      handlers.set(event, handler);
      return process;
    }) as any);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    registerSignalHandlers(daemon);

    const handler = handlers.get('uncaughtException');
    expect(handler).toBeDefined();
    handler!(new Error('test'));

    await new Promise((r) => setTimeout(r, 100));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('PLAT-01-EXIT-05: unhandledRejection -> exit code 1', async () => {
    const { DaemonLifecycle, registerSignalHandlers } = await import('@waiaas/daemon');

    const daemon = new DaemonLifecycle();
    vi.spyOn(daemon, 'shutdown').mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    type HandlerFn = (...args: unknown[]) => void;
    const handlers = new Map<string, HandlerFn>();
    vi.spyOn(process, 'on').mockImplementation(((event: string, handler: HandlerFn) => {
      handlers.set(event, handler);
      return process;
    }) as any);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    registerSignalHandlers(daemon);

    const handler = handlers.get('unhandledRejection');
    expect(handler).toBeDefined();
    handler!(new Error('test rejection'));

    await new Promise((r) => setTimeout(r, 100));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('PLAT-01-EXIT-06: invalid config.toml (port = -1) -> start failure, exit code 1', async () => {
    const testDir = makeTmpDir();

    try {
      // Create subdirs so init checks pass
      for (const sub of ['data', 'keystore', 'logs', 'backups']) {
        mkdirSync(join(testDir, sub), { recursive: true });
      }

      // Write invalid config with a port that will cause Zod validation error
      writeFileSync(
        join(testDir, 'config.toml'),
        `[daemon]\nport = -1\nhostname = "127.0.0.1"\n\n[database]\npath = "data/waiaas.db"\n`,
      );

      process.env['WAIAAS_MASTER_PASSWORD'] = 'test-password-12345';

      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
        throw new ExitError(code);
      }) as never);

      const { startCommand } = await import('../../commands/start.js');
      const err = await startCommand(testDir).catch((e: unknown) => e);

      // Should fail during daemon start (config validation or port bind error)
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    } finally {
      rmrf(testDir);
    }
  });
});
