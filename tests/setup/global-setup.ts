import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// globalSetup runs before the vitest environment — test.env is NOT applied yet.
// Load .env.test manually by parsing it as a dotenv file.
function loadEnvTest() {
  const envPath = join(process.cwd(), ".env.test");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.warn("globalSetup: could not read .env.test — using existing process.env");
  }
}

export async function setup() {
  loadEnvTest();

  // 1. Reset the public schema.
  // Note: supabase db reset does NOT clear auth.users (GoTrue's schema).
  // We delete auth users explicitly in step 2.
  execSync("npx supabase db reset --no-seed", {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  // 2. Clear all auth users so email collisions can't happen across runs.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test",
    );
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.warn("globalSetup: could not list auth users:", error.message);
  } else {
    await Promise.all(data.users.map((u) => adminClient.auth.admin.deleteUser(u.id)));
    if (data.users.length > 0) {
      console.log(`globalSetup: deleted ${data.users.length} auth user(s) from previous runs`);
    }
  }
}

export async function teardown() {
  // Local Supabase persists for dev speed. CI tears it down when the job ends.
}
