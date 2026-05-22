/**
 * Seed the local Supabase DB with one account per role, drive the real login
 * UI for each, and save Playwright storageState (cookies + localStorage) per
 * role to tests/screenshots/states/<role>.json.
 *
 * Output states are reusable across screenshot runs. They contain real session
 * tokens — never commit them. .gitignore covers tests/screenshots/states/*.json.
 *
 * Prereqs:
 *   - `supabase start` (local stack on default ports)
 *   - `npm run dev` running at http://localhost:3000 against the same local
 *     Supabase
 *   - .env.test sourced (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) — load via `dotenv -e .env.test`
 *
 * Run:
 *   npm run screenshots:setup
 *
 * Produces four states:
 *   parent.json   — parent profile active
 *   student.json  — student profile active + active subscription (so /student
 *                   isn't redirected to /payments)
 *   coach.json    — role 2
 *   admin.json    — role 3
 */

import { chromium, type Browser, type BrowserContext } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAccount,
  createParent,
  createStudent,
  createCoach,
  createPlan,
  createSubscription,
} from "../../tests/helpers/factories";
import { resetAll } from "../../tests/helpers/db";

const APP_URL = process.env.SCREENSHOT_APP_URL ?? "http://localhost:3000";
const OUT_DIR = resolve(__dirname, "../../tests/screenshots/states");

mkdirSync(OUT_DIR, { recursive: true });

async function login(
  ctx: BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    }),
    page.getByRole("button", { name: "Login", exact: true }).click(),
  ]);
  await page.close();
}

/**
 * Parent-family login lands on /profiles. We need to pick a profile so the
 * active_profile_* cookies get set. The cards are rendered by the profiles
 * page — selector logic uses the display name we seeded (Test Parent / Test
 * Student) so it stays stable as long as that page renders names.
 */
async function selectProfile(
  ctx: BrowserContext,
  displayName: string,
): Promise<void> {
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}/profiles`, { waitUntil: "networkidle" });
  // ProfileCard renders the profile name inside a <button type="submit"> that
  // submits the wrapping <form action={selectProfile}>.
  await page
    .getByRole("button", { name: new RegExp(displayName, "i") })
    .first()
    .click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/profiles"),
    { timeout: 20_000 },
  );
  await page.close();
}

async function captureRole(
  browser: Browser,
  fileName: string,
  setup: (ctx: BrowserContext) => Promise<void>,
): Promise<void> {
  const ctx = await browser.newContext();
  try {
    await setup(ctx);
    const target = resolve(OUT_DIR, fileName);
    await ctx.storageState({ path: target });
    console.log(`  ✓ saved ${fileName}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  console.log("→ resetting local Supabase DB + auth.users");
  await resetAll();

  console.log("→ seeding accounts");
  const parentAcct = await createAccount({ role: 1 });
  await createParent(parentAcct, { first_name: "Test", last_name: "Parent" });
  const student = await createStudent(parentAcct, {
    first_name: "Test",
    last_name: "Student",
  });
  const plan = await createPlan();
  await createSubscription(student, plan);

  const { account: coachAcct } = await createCoach();

  const adminAcct = await createAccount({ role: 3 });

  console.log("→ launching browser");
  const browser = await chromium.launch();
  try {
    console.log("→ capturing parent.json");
    await captureRole(browser, "parent.json", async (ctx) => {
      await login(ctx, parentAcct.email, parentAcct.password);
      await selectProfile(ctx, "Parent");
    });

    console.log("→ capturing student.json");
    await captureRole(browser, "student.json", async (ctx) => {
      await login(ctx, parentAcct.email, parentAcct.password);
      await selectProfile(ctx, "Student");
    });

    console.log("→ capturing coach.json");
    await captureRole(browser, "coach.json", async (ctx) => {
      await login(ctx, coachAcct.email, coachAcct.password);
    });

    console.log("→ capturing admin.json");
    await captureRole(browser, "admin.json", async (ctx) => {
      await login(ctx, adminAcct.email, adminAcct.password);
    });
  } finally {
    await browser.close();
  }

  console.log("\nDone. States written to tests/screenshots/states/");
  console.log("Seeded credentials (for manual debugging):");
  console.log(`  parent: ${parentAcct.email} / ${parentAcct.password}`);
  console.log(`  coach:  ${coachAcct.email} / ${coachAcct.password}`);
  console.log(`  admin:  ${adminAcct.email} / ${adminAcct.password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
