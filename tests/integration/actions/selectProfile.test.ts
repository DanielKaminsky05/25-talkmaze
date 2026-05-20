/**
 * Integration tests for the selectProfile server action.
 * src/lib/profiles/actions/selectProfile.ts
 *
 * The action takes FormData, validates ownership and optional PIN,
 * calls setProfileCookies, then redirects. Every code path — success
 * and failure — ends with redirect(), which throws in Next.js.
 *
 * Mocks:
 *   next/navigation redirect  → throws `REDIRECT:<url>` so tests can inspect destination
 *   setProfileCookies         → spy to assert called / not called and with what args
 *   next/headers + server-only are mocked globally by integration-mocks.ts
 *
 * Cookie attribute assertions (httpOnly, sameSite, secure) live in
 * tests/unit/profiles/profileCookies.test.ts — not duplicated here.
 */

// vi.mock calls are hoisted before imports by Vitest — order in source doesn't matter.

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/src/lib/profiles/server/profileCookies", () => ({
  setProfileCookies: vi.fn().mockResolvedValue({ success: true }),
}));

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import {
  createAccount,
  createParent,
  createStudent,
} from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { nextCookies } from "@tests/helpers/nextHeadersMock";
import { selectProfile } from "@/src/lib/profiles/actions/selectProfile";
import { setProfileCookies } from "@/src/lib/profiles/server/profileCookies";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calls the action and returns the redirect destination URL. Fails if no redirect is thrown. */
async function expectRedirect(fn: () => Promise<void>): Promise<string> {
  try {
    await fn();
    throw new Error("Expected a redirect but the action resolved normally");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.startsWith("REDIRECT:")) {
      throw new Error(`Expected a redirect, got unexpected error: ${msg}`);
    }
    return msg.slice("REDIRECT:".length);
  }
}

/** Build FormData for selectProfile. */
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

let ownerCookies: string;
let otherCookies: string;

let studentId: string;
let parentNoPinId: string;
let parentWithPinId: string;

const PIN = "4321";
const FAKE_ID = "00000000-0000-0000-0000-000000000099";

beforeAll(async () => {
  const owner = await createAccount({ role: 1 });
  const other = await createAccount({ role: 1 });

  ownerCookies = await signSessionFor(owner);
  otherCookies = await signSessionFor(other);

  const student = await createStudent(owner);
  studentId = student.id;

  const parentNoPin = await createParent(owner);
  parentNoPinId = parentNoPin.id;

  const parentWithPin = await createParent(owner, {
    profile_access_pin: PIN,
  });
  parentWithPinId = parentWithPin.id;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Reset to unauthenticated by default; each test overrides as needed.
  nextCookies.header = "";
});

// ── Missing / invalid input ───────────────────────────────────────────────────

describe("missing or invalid FormData fields", () => {
  it("throws (not a redirect) when profileId is missing", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({ profileType: "student" });
    await expect(selectProfile(fd)).rejects.toThrow("Missing profile data");
  });

  it("throws (not a redirect) when profileType is missing", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({ profileId: studentId });
    await expect(selectProfile(fd)).rejects.toThrow("Missing profile data");
  });
});

// ── Authentication ────────────────────────────────────────────────────────────

describe("unauthenticated access", () => {
  it("redirects to /login when no session cookie is present", async () => {
    // nextCookies.header left as "" by beforeEach
    const fd = makeFormData({ profileId: studentId, profileType: "student" });
    const dest = await expectRedirect(() => selectProfile(fd));
    expect(dest).toBe("/login");
  });
});

// ── Student profile ───────────────────────────────────────────────────────────

describe("student profile", () => {
  it("calls setProfileCookies and redirects to /student for the owner", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({ profileId: studentId, profileType: "student" });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/student");
    expect(setProfileCookies).toHaveBeenCalledOnce();
    expect(setProfileCookies).toHaveBeenCalledWith(studentId, "student");
  });

  it("redirects to /profiles?error=not_found when the student belongs to a different account", async () => {
    nextCookies.header = otherCookies;
    const fd = makeFormData({ profileId: studentId, profileType: "student" });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=not_found");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });

  it("redirects to /profiles?error=not_found for a non-existent student id", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({ profileId: FAKE_ID, profileType: "student" });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=not_found");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });

  it("redirects to the custom destination when one is provided", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({
      profileId: studentId,
      profileType: "student",
      destination: "/lessons",
    });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/lessons");
    expect(setProfileCookies).toHaveBeenCalledOnce();
  });
});

// ── Parent profile — no PIN ───────────────────────────────────────────────────

describe("parent profile — no PIN set", () => {
  it("calls setProfileCookies and redirects to /parent for the owner", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({ profileId: parentNoPinId, profileType: "parent" });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/parent");
    expect(setProfileCookies).toHaveBeenCalledOnce();
    expect(setProfileCookies).toHaveBeenCalledWith(parentNoPinId, "parent");
  });

  it("redirects to /profiles?error=not_found when the parent belongs to a different account", async () => {
    nextCookies.header = otherCookies;
    const fd = makeFormData({ profileId: parentNoPinId, profileType: "parent" });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=not_found");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });
});

// ── Parent profile — with PIN ─────────────────────────────────────────────────

describe("parent profile — PIN set", () => {
  it("calls setProfileCookies and redirects to /parent when the correct PIN is supplied", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({
      profileId: parentWithPinId,
      profileType: "parent",
      pin: PIN,
    });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/parent");
    expect(setProfileCookies).toHaveBeenCalledOnce();
    expect(setProfileCookies).toHaveBeenCalledWith(parentWithPinId, "parent");
  });

  it("redirects to /profiles?error=wrong_pin when a wrong PIN is supplied", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({
      profileId: parentWithPinId,
      profileType: "parent",
      pin: "0000",
    });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=wrong_pin");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });

  it("redirects to /profiles?error=wrong_pin when the PIN field is omitted entirely", async () => {
    nextCookies.header = ownerCookies;
    // No `pin` field in the FormData
    const fd = makeFormData({
      profileId: parentWithPinId,
      profileType: "parent",
    });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=wrong_pin");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });

  it("redirects to /profiles?error=not_found for a non-existent parent id", async () => {
    nextCookies.header = ownerCookies;
    const fd = makeFormData({
      profileId: FAKE_ID,
      profileType: "parent",
      pin: PIN,
    });

    const dest = await expectRedirect(() => selectProfile(fd));

    expect(dest).toBe("/profiles?error=not_found");
    expect(setProfileCookies).not.toHaveBeenCalled();
  });
});
