import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { resolve } from "path";

// Integration + contract test config.
// Requires: supabase start (local Docker stack).
// Run: npm run test:integration
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  test: {
    env,
    name: "integration",
    globals: true,
    environment: "node",
    include: [
      "tests/integration/**/*.test.ts",
      "tests/contract/**/*.test.ts",
    ],
    passWithNoTests: true,
    globalSetup: ["tests/setup/global-setup.ts"],
    setupFiles: [
      "tests/setup/test-setup.ts",
      "tests/setup/integration-mocks.ts",
    ],
    // Single worker so tests don't race on the same DB. fileParallelism: false
    // forces sequential file execution within that fork — otherwise files
    // interleave their beforeAll seeding and step on each other's DB state.
    // Parallelise later by giving each worker its own schema.
    pool: "forks",
    forks: { singleFork: true },
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@tests": resolve(__dirname, "tests"),
    },
  },
});
