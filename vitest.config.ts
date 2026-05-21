import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Unit test config — no DB, no network, runs on every save.
// For integration + contract tests use: npm run test:integration
export default defineConfig({
  test: {
    name: "unit",
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
    setupFiles: ["tests/setup/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/utils/**"],
      exclude: ["src/services/supabase/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
