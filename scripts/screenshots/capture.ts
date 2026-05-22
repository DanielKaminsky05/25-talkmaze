/**
 * Capture screenshots of one route at all five responsive-spec breakpoints
 * using a pre-seeded storageState (see setup-states.ts).
 *
 * Usage (CLI):
 *   npm run screenshots:page -- --role=student --path=/student
 *   npm run screenshots:page -- --role=coach   --path=/coach/calendar --ready=".fc-view-harness"
 *
 * Usage (programmatic, e.g. from an agent):
 *   import { screenshotPage } from "./capture";
 *   await screenshotPage({ role: "coach", path: "/coach", ready: "main" });
 *
 * Output: tests/screenshots/output/<role>/<sanitized-path>/<breakpoint>.png
 *
 * Prereqs:
 *   - `npm run screenshots:setup` already produced the storageState JSON files.
 *   - `npm run dev` running at http://localhost:3000 (or set SCREENSHOT_APP_URL).
 */

import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type Role = "parent" | "student" | "coach" | "admin";

export const BREAKPOINTS = [
  { name: "mobile-sm", width: 375 },
  { name: "mobile-lg", width: 640 },
  { name: "tablet", width: 768 },
  { name: "laptop", width: 1024 },
  { name: "desktop", width: 1440 },
] as const;

const APP_URL = process.env.SCREENSHOT_APP_URL ?? "http://localhost:3000";
const STATES_DIR = resolve(__dirname, "../../tests/screenshots/states");
const OUTPUT_DIR = resolve(__dirname, "../../tests/screenshots/output");

export interface ScreenshotOptions {
  role: Role;
  /** Route to screenshot, e.g. "/coach/calendar" or "/student". */
  path: string;
  /**
   * CSS selector that signals "page is ready" after hydration. Used in
   * addition to network-idle. Optional but strongly recommended for pages
   * with calendars, rich-text editors, or async data. Examples:
   *   - "main"              — generic, waits for app shell
   *   - ".fc-view-harness"  — FullCalendar's root after mount
   *   - "[data-ready=true]" — explicit opt-in marker
   */
  ready?: string;
  /** Optional override for screenshot output dir. */
  outDir?: string;
  /** Extra delay (ms) after readiness signals fire. Cap on flake. Default 250. */
  settleMs?: number;
}

function sanitize(routePath: string): string {
  return routePath.replace(/^\//, "").replace(/[\/?#]/g, "_") || "root";
}

async function waitForReady(
  page: Page,
  ready: string | undefined,
  settleMs: number,
): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
    // Some pages keep long-poll websockets open; networkidle never fires.
    // Falling through to the readiness selector / settle delay is the right
    // call — don't fail the screenshot over it.
  });
  if (ready) {
    await page.waitForSelector(ready, { state: "visible", timeout: 10_000 });
  }
  await page.waitForTimeout(settleMs);
}

export async function screenshotPage(opts: ScreenshotOptions): Promise<string[]> {
  const { role, path: routePath, ready, settleMs = 250 } = opts;

  const statePath = resolve(STATES_DIR, `${role}.json`);
  if (!existsSync(statePath)) {
    throw new Error(
      `screenshotPage: missing storageState ${statePath}. Run npm run screenshots:setup first.`,
    );
  }

  const outDir = opts.outDir ?? resolve(OUTPUT_DIR, role, sanitize(routePath));
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const written: string[] = [];
  try {
    for (const bp of BREAKPOINTS) {
      const ctx = await browser.newContext({
        storageState: statePath,
        viewport: { width: bp.width, height: 800 },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      try {
        const url = `${APP_URL}${routePath}`;
        const res = await page.goto(url, { waitUntil: "commit" });
        const finalUrl = page.url();
        if (!finalUrl.includes(routePath)) {
          console.warn(
            `  ! ${bp.name}: redirected ${routePath} → ${new URL(finalUrl).pathname} ` +
              `(check role/state — middleware bounced this request)`,
          );
        }
        if (res && res.status() >= 400) {
          console.warn(`  ! ${bp.name}: HTTP ${res.status()} at ${url}`);
        }

        await waitForReady(page, ready, settleMs);

        const out = resolve(outDir, `${bp.name}.png`);
        await page.screenshot({ path: out, fullPage: true });
        written.push(out);
        console.log(`  ✓ ${bp.name} (${bp.width}px) → ${out}`);
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  return written;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(): ScreenshotOptions {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const hit = args.find((a) => a.startsWith(`${flag}=`));
    return hit?.split("=").slice(1).join("=");
  };
  const role = get("--role") as Role | undefined;
  const routePath = get("--path");
  const ready = get("--ready");
  if (!role || !routePath) {
    console.error(
      "usage: screenshots:page -- --role=<parent|student|coach|admin> --path=/some/route [--ready=<selector>]",
    );
    process.exit(2);
  }
  return { role, path: routePath, ready };
}

const isCli =
  typeof require !== "undefined" && require.main === module;
if (isCli) {
  const opts = parseArgs();
  console.log(`→ ${opts.role} ${opts.path}`);
  screenshotPage(opts).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
