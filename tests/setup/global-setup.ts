import { execSync } from "child_process";

// Runs once before the entire integration suite.
// Requires `supabase start` to have been run already (locally or in CI).
// In CI the GitHub Actions workflow calls `supabase start` before this.
export async function setup() {
  try {
    // Reset DB to a clean migration state (no seed data).
    // --no-seed keeps it empty; factories.ts provides test-specific rows.
    execSync("supabase db reset --no-seed", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch (e) {
    throw new Error(
      "Could not reset Supabase DB. Make sure `supabase start` is running.\n" +
        String(e),
    );
  }
}

export async function teardown() {
  // Nothing needed — local Supabase persists between runs for dev speed.
  // CI tears it down when the job ends.
}
