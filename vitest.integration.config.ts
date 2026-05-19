import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Integration + contract test config.
// Requires: supabase start (local Docker stack).
// Run: npm run test:integration
export default defineConfig({
  test: {
    name: "integration",
    globals: true,
    environment: "node",
    include: [
      "tests/integration/**/*.test.ts",
      "tests/contract/**/*.test.ts",
    ],
    passWithNoTests: true,
    globalSetup: ["tests/setup/global-setup.ts"],
    setupFiles: ["tests/setup/test-setup.ts"],
    // Single worker so tests don't race on the same DB.
    // Parallelise later by giving each worker its own schema.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
