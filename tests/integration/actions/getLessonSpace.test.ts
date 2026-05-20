/**
 * Integration tests for the getLessonSpace server action.
 * src/lib/lessonspace/actions/getLessonSpace.ts
 *
 * The action reads the active student profile from cookies, looks up the
 * student's lesson_space_id, then calls the LessonSpace API to generate a
 * fresh participant URL. It throws on every error path (no profile, wrong
 * profile type, missing room id, API failure).
 *
 * LessonSpace HTTP calls are intercepted by MSW so no real network traffic
 * is made. next/headers is mocked globally by integration-mocks.ts.
 * nextCookies.header drives getActiveProfile() (active_profile_id / _type).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import {
  createAccount,
  createParent,
  createStudent,
} from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { nextCookies } from "@tests/helpers/nextHeadersMock";
import { server } from "@tests/helpers/msw";
import { http, HttpResponse } from "msw";
import { getLessonSpace } from "@/src/lib/lessonspace/actions/getLessonSpace";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_LESSON_SPACE_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_CLIENT_URL = "https://app.thelessonspace.com/room/test-room";

let familyCookies: string;
let studentWithRoomCookies: string;   // active profile = student, lesson_space_id set
let studentNoRoomCookies: string;     // active profile = student, lesson_space_id null
let parentCookies: string;            // active profile = parent

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const familyAccount = await createAccount({ role: 1 });
  familyCookies = await signSessionFor(familyAccount);

  const studentWithRoom = await createStudent(familyAccount, {
    lesson_space_id: FAKE_LESSON_SPACE_ID,
  });
  const studentNoRoom = await createStudent(familyAccount);
  const parent = await createParent(familyAccount);

  studentWithRoomCookies = `${familyCookies}; active_profile_id=${studentWithRoom.id}; active_profile_type=student`;
  studentNoRoomCookies   = `${familyCookies}; active_profile_id=${studentNoRoom.id}; active_profile_type=student`;
  parentCookies          = `${familyCookies}; active_profile_id=${parent.id}; active_profile_type=parent`;
});

afterAll(() => server.close());

beforeEach(() => {
  nextCookies.header = "";
});

afterEach(() => server.resetHandlers());

// ── Error paths ───────────────────────────────────────────────────────────────

describe("no active profile", () => {
  it("throws when no active_profile_id cookie is present", async () => {
    nextCookies.header = familyCookies; // authenticated, but no profile selected
    await expect(getLessonSpace()).rejects.toThrow("Unable to identify student");
  });
});

describe("wrong profile type", () => {
  it("throws when active profile type is parent", async () => {
    nextCookies.header = parentCookies;
    await expect(getLessonSpace()).rejects.toThrow("Unable to identify student");
  });
});

describe("student with no lesson_space_id", () => {
  it("throws when lesson_space_id is null on the student row", async () => {
    nextCookies.header = studentNoRoomCookies;
    await expect(getLessonSpace()).rejects.toThrow("Unable to find room");
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("student with lesson_space_id", () => {
  it("returns the client_url from the LessonSpace API response", async () => {
    nextCookies.header = studentWithRoomCookies;
    const url = await getLessonSpace();
    expect(url).toBe(FAKE_CLIENT_URL);
  });

  it("calls LessonSpace without a webhooks field (includeWebhooks: false)", async () => {
    let capturedBody: Record<string, unknown> = {};

    server.use(
      http.post("https://api.thelessonspace.com/v2/spaces/launch/", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          client_url: FAKE_CLIENT_URL,
          room_id: "00000000-0000-0000-0000-000000000099",
        });
      }),
    );

    nextCookies.header = studentWithRoomCookies;
    await getLessonSpace();

    expect(capturedBody.webhooks).toBeUndefined();
  });

  it("sends the student's lesson_space_id as the room id in the request", async () => {
    let capturedBody: Record<string, unknown> = {};

    server.use(
      http.post("https://api.thelessonspace.com/v2/spaces/launch/", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          client_url: FAKE_CLIENT_URL,
          room_id: "00000000-0000-0000-0000-000000000099",
        });
      }),
    );

    nextCookies.header = studentWithRoomCookies;
    await getLessonSpace();

    expect(capturedBody.id).toBe(FAKE_LESSON_SPACE_ID);
  });
});
