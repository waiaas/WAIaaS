import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
      },
    },
    forceExit: true,
    // Heavy SDK modules (@solana/web3, kamino) can take several seconds to load under
    // CI fork contention; the 5s default timed out provider-registration/coverage tests
    // that pass in ~0.4s locally. Raise timeouts to absorb CI cold-load variance.
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        branches: 85,
        functions: 97,
        lines: 97,
        statements: 97,
      },
    },
  },
});
