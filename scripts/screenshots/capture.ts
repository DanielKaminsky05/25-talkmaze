/**
 * Capture screenshots of one or many routes at the responsive-spec breakpoints,
 * using pre-seeded storageStates (see setup-states.ts).
 *
 * Three usage modes:
 *
 * 1. Single route (CLI):
 *    npm run screenshots:page -- --role=coach --path=/coach/calendar --ready=.fc-view-harness
 *    Optional: --breakpoints=mobile-sm,mobile-lg     (default: all five)
 *
 * 2. Batch (CLI):
 *    npm run screenshots:batch -- --routes=path/to/routes.json
 *    routes.json shape: [{ role, path, ready?, breakpoints?, settleMs? }, ...]
 *    Reuses ONE browser process across the whole batch (much faster than
 *    invoking screenshots:page N times).
 *
 * 3. Programmatic:
 *    import { screenshotPage, screenshotPages } from "./capture";
 *    await screenshotPages([{ role: "coach", path: "/coach" }, ...]);
 *
 * Output: tests/screenshots/output/<role>/<sanitized-path>/<breakpoint>.png
 *
 * Prereqs:
 *   - `npm run screenshots:setup` has produced the storageState JSON files.
 *   - `npm run screenshots:dev` is running at http://localhost:3000.
 */

import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type Role = "parent" | "student" | "coach" | "admin";

export const BREAKPOINTS = [
  { name: "mobile-sm", width: 375 },
  { name: "mobile-lg", width: 640 },
  { name: "tablet", width: 768 },
  { name: "laptop", width: 1024 },
  { name: "desktop", width: 1440 },
] as const;

export type BreakpointName = (typeof BREAKPOINTS)[number]["name"];

const APP_URL = process.env.SCREENSHOT_APP_URL ?? "http://localhost:3000";
// SCREENSHOT_STATES_DIR lets a worktree-based agent point at the main
// worktree's seeded states (storageState files are gitignored, so a fresh
// worktree won't have them).
const STATES_DIR =
  process.env.SCREENSHOT_STATES_DIR ??
  resolve(__dirname, "../../tests/screenshots/states");
const OUTPUT_DIR = resolve(__dirname, "../../tests/screenshots/output");

export interface ScreenshotOptions {
  role: Role;
  /** Route to screenshot, e.g. "/coach/calendar" or "/student". */
  path: string;
  /**
   * CSS selector that signals "page is ready" after hydration. Used in
   * addition to network-idle. Examples:
   *   - "body"              — generic, ~always present after hydration
   *   - ".fc-view-harness"  — FullCalendar root after mount
   *   - ".ProseMirror"      — Tiptap editor root
   */
  ready?: string;
  /** Subset of breakpoint names to capture. Default: all five. */
  breakpoints?: BreakpointName[];
  /** Override for screenshot output dir. */
  outDir?: string;
  /** Extra delay (ms) after readiness signals fire. Default 250. */
  settleMs?: number;
}

function sanitize(routePath: string): string {
  return routePath.replace(/^\//, "").replace(/[\/?#]/g, "_") || "root";
}

function resolveBreakpoints(names: BreakpointName[] | undefined) {
  if (!names || names.length === 0) return BREAKPOINTS.slice();
  const lookup = new Map(BREAKPOINTS.map((b) => [b.name, b]));
  const out = [];
  for (const n of names) {
    const bp = lookup.get(n);
    if (!bp) {
      throw new Error(
        `unknown breakpoint "${n}". Valid: ${BREAKPOINTS.map((b) => b.name).join(", ")}`,
      );
    }
    out.push(bp);
  }
  return out;
}

function statePathFor(role: Role): string {
  const p = resolve(STATES_DIR, `${role}.json`);
  if (!existsSync(p)) {
    throw new Error(
      `missing storageState ${p}. Run npm run screenshots:setup first.`,
    );
  }
  return p;
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

/**
 * Capture one route on an already-open page. Shared between single and batch
 * modes — the caller manages the browser/context lifecycle so batch mode can
 * reuse them.
 */
async function captureRoute(
  page: Page,
  opts: ScreenshotOptions,
  bpName: BreakpointName,
): Promise<string> {
  const { role, path: routePath, ready, settleMs = 250 } = opts;
  const outDir = opts.outDir ?? resolve(OUTPUT_DIR, role, sanitize(routePath));
  mkdirSync(outDir, { recursive: true });

  const url = `${APP_URL}${routePath}`;
  const res = await page.goto(url, { waitUntil: "commit" });
  const finalUrl = page.url();
  if (!finalUrl.includes(routePath)) {
    console.warn(
      `  ! ${bpName}: redirected ${routePath} → ${new URL(finalUrl).pathname} ` +
        `(check role/state — middleware bounced this request)`,
    );
  }
  if (res && res.status() >= 400) {
    console.warn(`  ! ${bpName}: HTTP ${res.status()} at ${url}`);
  }

  await waitForReady(page, ready, settleMs);

  const out = resolve(outDir, `${bpName}.png`);
  await page.screenshot({ path: out, fullPage: true });
  return out;
}

export async function screenshotPage(opts: ScreenshotOptions): Promise<string[]> {
  const browser = await chromium.launch();
  try {
    return await screenshotOnBrowser(browser, opts);
  } finally {
    await browser.close();
  }
}

/**
 * Reuses an existing browser. One context per breakpoint (viewport is set at
 * context creation), one page per context.
 */
async function screenshotOnBrowser(
  browser: Browser,
  opts: ScreenshotOptions,
): Promise<string[]> {
  const statePath = statePathFor(opts.role);
  const breakpoints = resolveBreakpoints(opts.breakpoints);
  const written: string[] = [];

  for (const bp of breakpoints) {
    const ctx = await browser.newContext({
      storageState: statePath,
      viewport: { width: bp.width, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    try {
      const out = await captureRoute(page, opts, bp.name);
      written.push(out);
      console.log(`  ✓ ${bp.name} (${bp.width}px) → ${out}`);
    } finally {
      await ctx.close();
    }
  }
  return written;
}

/**
 * Batch mode: ONE browser process for the whole batch. ~3s saved per route
 * vs. invoking screenshotPage individually, which adds up fast.
 */
export async function screenshotPages(
  routes: ScreenshotOptions[],
): Promise<Record<string, string[]>> {
  const browser = await chromium.launch();
  const out: Record<string, string[]> = {};
  try {
    for (const r of routes) {
      const key = `${r.role}:${r.path}`;
      console.log(`→ ${key}`);
      out[key] = await screenshotOnBrowser(browser, r);
    }
  } finally {
    await browser.close();
  }
  return out;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

type CliMode =
  | { mode: "single"; opts: ScreenshotOptions }
  | { mode: "batch"; routes: ScreenshotOptions[] };

function parseArgs(): CliMode {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const hit = args.find((a) => a.startsWith(`${flag}=`));
    return hit?.split("=").slice(1).join("=");
  };

  const routesFile = get("--routes");
  if (routesFile) {
    const abs = resolve(process.cwd(), routesFile);
    if (!existsSync(abs)) {
      console.error(`--routes file not found: ${abs}`);
      process.exit(2);
    }
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as ScreenshotOptions[];
    if (!Array.isArray(parsed)) {
      console.error(`--routes file must contain a JSON array`);
      process.exit(2);
    }
    return { mode: "batch", routes: parsed };
  }

  const role = get("--role") as Role | undefined;
  const routePath = get("--path");
  const ready = get("--ready");
  const bpRaw = get("--breakpoints");
  const breakpoints = bpRaw
    ? (bpRaw.split(",").map((s) => s.trim()) as BreakpointName[])
    : undefined;
  if (!role || !routePath) {
    console.error(
      "usage:\n" +
        "  --role=<parent|student|coach|admin> --path=/some/route [--ready=<selector>] [--breakpoints=mobile-sm,desktop]\n" +
        "  --routes=path/to/routes.json",
    );
    process.exit(2);
  }
  return {
    mode: "single",
    opts: { role, path: routePath, ready, breakpoints },
  };
}

const isCli = typeof require !== "undefined" && require.main === module;
if (isCli) {
  const cli = parseArgs();
  const run =
    cli.mode === "single"
      ? screenshotPage(cli.opts).then(() => undefined)
      : screenshotPages(cli.routes).then(() => undefined);
  run.catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
