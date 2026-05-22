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
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "../../src/services/supabase/types/database";
import {
  createAccount,
  createParent,
  createStudent,
  createCoach,
  createPlan,
  createSubscription,
  linkCoachToStudent,
} from "../../tests/helpers/factories";
import { resetAll } from "../../tests/helpers/db";

type StudentRow = Database["public"]["Tables"]["students"]["Row"];
type CoachRow = Database["public"]["Tables"]["coaches"]["Row"];
type ParentRow = Database["public"]["Tables"]["parents"]["Row"];

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

/**
 * Seeds enough realistic data to make seed-sensitive pages render their
 * non-empty layouts during the screenshot sweep:
 *   - 1 course with 2 chained lessons (so /lessons and /lessons/[slug] render
 *     real cards/content instead of empty states)
 *   - course_assignment so the student sees the course
 *   - coach_students link so /coach/students/[studentId] is reachable
 *   - 1 conversation + 2 messages so /message and /message/[id] populate
 *   - 3 tokens + 1 student_token so /reward shows an earned + locked mix
 */
async function seedRichData(
  parentAcct: { id: string },
  parent: ParentRow,
  student: StudentRow,
  coach: CoachRow,
  coachAcct: { id: string },
) {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Course + lessons (chained via prev/next pointers)
  const { data: course, error: courseErr } = await db
    .from("courses")
    .insert({ title: "Beginner Speech", description: "Intro to public speaking" })
    .select()
    .single();
  if (courseErr) throw new Error(`seedRichData: course — ${courseErr.message}`);

  const { data: lesson1, error: l1Err } = await db
    .from("lessons")
    .insert({
      course_id: course.id,
      title: "Lesson 1: Introduction",
      description: "Welcome to the course",
      slug: "beginner-speech-lesson-1",
    })
    .select()
    .single();
  if (l1Err) throw new Error(`seedRichData: lesson1 — ${l1Err.message}`);

  const { data: lesson2, error: l2Err } = await db
    .from("lessons")
    .insert({
      course_id: course.id,
      title: "Lesson 2: Speaking with Confidence",
      description: "Building confidence",
      slug: "beginner-speech-lesson-2",
      prev_lesson: lesson1.id,
    })
    .select()
    .single();
  if (l2Err) throw new Error(`seedRichData: lesson2 — ${l2Err.message}`);

  await db.from("lessons").update({ next_lesson: lesson2.id }).eq("id", lesson1.id);
  await db
    .from("courses")
    .update({ head_lesson_id: lesson1.id, tail_lesson_id: lesson2.id })
    .eq("id", course.id);

  // Assign course to student
  const { error: caErr } = await db.from("course_assignment").insert({
    course_id: course.id,
    student_id: student.id,
    isActive: true,
    progress: 0,
  });
  if (caErr) throw new Error(`seedRichData: course_assignment — ${caErr.message}`);

  // Coach <-> student link
  await linkCoachToStudent(coach, student);

  // Conversation between coach and parent profile + 2 messages
  const { data: convo, error: cvErr } = await db
    .from("conversations")
    .insert({
      coach_id: coach.id,
      profile_id: parent.id,
      profile_type: "parent",
    })
    .select()
    .single();
  if (cvErr) throw new Error(`seedRichData: conversation — ${cvErr.message}`);

  const { error: msgErr } = await db.from("messages").insert([
    {
      conversation_id: convo.id,
      sender_id: coachAcct.id,
      body: "Hi! Looking forward to our first lesson.",
    },
    {
      conversation_id: convo.id,
      sender_id: parentAcct.id,
      body: "Thanks — we're excited too.",
    },
  ]);
  if (msgErr) throw new Error(`seedRichData: messages — ${msgErr.message}`);

  // Tokens (3 total) + 1 awarded to the student so /reward shows a mix
  const { data: tokens, error: tkErr } = await db
    .from("tokens")
    .insert([
      { code: "first-lesson", title: "First Lesson", description: "Complete your first lesson" },
      { code: "five-streak", title: "Five Streak", description: "Five lessons in a row" },
      { code: "ten-streak", title: "Ten Streak", description: "Ten lessons in a row" },
    ])
    .select();
  if (tkErr) throw new Error(`seedRichData: tokens — ${tkErr.message}`);

  const { error: stErr } = await db
    .from("student_tokens")
    .insert({ student_id: student.id, token_id: tokens![0].id });
  if (stErr) throw new Error(`seedRichData: student_tokens — ${stErr.message}`);

  console.log(
    `  course=${course.id} lessons=[${lesson1.slug}, ${lesson2.slug}] convo=${convo.id} tokens=${tokens!.length}`,
  );
}

async function main() {
  console.log("→ resetting local Supabase DB + auth.users");
  await resetAll();

  console.log("→ seeding accounts");
  const parentAcct = await createAccount({ role: 1 });
  const parent = await createParent(parentAcct, {
    first_name: "Test",
    last_name: "Parent",
  });
  const student = await createStudent(parentAcct, {
    first_name: "Test",
    last_name: "Student",
  });
  const plan = await createPlan();
  await createSubscription(student, plan);

  const { account: coachAcct, coach } = await createCoach();

  const adminAcct = await createAccount({ role: 3 });

  console.log("→ seeding rich data (course, lessons, link, convo, tokens)");
  await seedRichData(parentAcct, parent, student, coach, coachAcct);

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
