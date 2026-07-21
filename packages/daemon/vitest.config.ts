import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    // sodium-native guarded memory (mprotect) requires forks pool
    // because thread workers crash on mprotect_noaccess calls
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
      },
    },
    forceExit: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/**/index.ts',
        // Lifecycle orchestrators are integration-level code (daemon startup/shutdown/pipeline wiring).
        // They require a full daemon instance with real DB, keystore, adapters, etc.
        // Coverage for these files is verified via e2e tests, not unit tests.
        'src/lifecycle/daemon-startup.ts',
        'src/lifecycle/daemon-pipeline.ts',
        'src/lifecycle/daemon-shutdown.ts',
        'src/lifecycle/daemon.ts',
      ],
      thresholds: {
        branches: 81,
        functions: 95,
        lines: 90,
        statements: 90,
      },
    },
  },
});
