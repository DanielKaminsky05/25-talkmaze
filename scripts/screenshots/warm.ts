/**
 * Pre-compile every route in a JSON list by navigating to it once.
 *
 * Next dev compiles routes lazily — the first request to /coach/calendar can
 * take 5-10s longer than subsequent ones because Turbopack is building the
 * route module. Hitting each route once before the screenshot loop runs
 * amortises that cost so every screenshot afterwards starts from a warm
 * route module.
 *
 * Usage:
 *   npm run screenshots:warm -- --routes=tests/screenshots/routes.json
 *
 * Route file is the same shape capture.ts uses for batch mode — only `role`
 * and `path` are needed; `ready`, `breakpoints`, etc. are ignored.
 */

import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Role = "parent" | "student" | "coach" | "admin";
type WarmEntry = { role: Role; path: string };

const APP_URL = process.env.SCREENSHOT_APP_URL ?? "http://localhost:3000";
const STATES_DIR =
  process.env.SCREENSHOT_STATES_DIR ??
  resolve(__dirname, "../../tests/screenshots/states");

function statePathFor(role: Role): string {
  const p = resolve(STATES_DIR, `${role}.json`);
  if (!existsSync(p)) {
    throw new Error(
      `missing storageState ${p}. Run npm run screenshots:setup first.`,
    );
  }
  return p;
}

async function main() {
  const args = process.argv.slice(2);
  const routesFlag = args.find((a) => a.startsWith("--routes="));
  if (!routesFlag) {
    console.error("usage: screenshots:warm -- --routes=path/to/routes.json");
    process.exit(2);
  }
  const routesPath = resolve(process.cwd(), routesFlag.split("=")[1]);
  const entries = JSON.parse(readFileSync(routesPath, "utf8")) as WarmEntry[];

  // Group by role so we open one context per role (storageState is per-role,
  // viewport doesn't matter for warming).
  const byRole = new Map<Role, WarmEntry[]>();
  for (const e of entries) {
    if (!byRole.has(e.role)) byRole.set(e.role, []);
    byRole.get(e.role)!.push(e);
  }

  console.log(`→ warming ${entries.length} routes across ${byRole.size} roles`);
  const browser = await chromium.launch();
  try {
    for (const [role, items] of byRole) {
      const ctx = await browser.newContext({
        storageState: statePathFor(role),
        viewport: { width: 1280, height: 800 },
      });
      const page = await ctx.newPage();
      try {
        for (const item of items) {
          const start = Date.now();
          try {
            await page.goto(`${APP_URL}${item.path}`, {
              waitUntil: "domcontentloaded",
              timeout: 30_000,
            });
            await page
              .waitForLoadState("networkidle", { timeout: 10_000 })
              .catch(() => {});
            console.log(`  ✓ ${role} ${item.path} (${Date.now() - start}ms)`);
          } catch (err) {
            console.warn(
              `  ! ${role} ${item.path} — ${(err as Error).message}`,
            );
          }
        }
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
