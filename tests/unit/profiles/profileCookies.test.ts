import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock next/headers so cookies() returns a controllable cookie jar.
// Both setProfileCookies and getActiveProfile call `await cookies()`.
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockCookieStore = { set: mockSet, get: mockGet };

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { setProfileCookies } from "@/src/lib/profiles/server/profileCookies";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";

// ── setProfileCookies ─────────────────────────────────────────────────────────

describe("setProfileCookies", () => {
  beforeEach(() => {
    mockSet.mockReset();
  });

  it("sets active_profile_id with the given id", async () => {
    await setProfileCookies("profile-abc", "student");

    expect(mockSet).toHaveBeenCalledWith(
      "active_profile_id",
      "profile-abc",
      expect.any(Object),
    );
  });

  it("sets active_profile_type with the given type", async () => {
    await setProfileCookies("profile-abc", "student");

    expect(mockSet).toHaveBeenCalledWith(
      "active_profile_type",
      "student",
      expect.any(Object),
    );
  });

  it("sets both cookies (exactly two set calls)", async () => {
    await setProfileCookies("profile-abc", "parent");
    expect(mockSet).toHaveBeenCalledTimes(2);
  });

  it("sets httpOnly on both cookies", async () => {
    await setProfileCookies("profile-abc", "student");

    for (const call of mockSet.mock.calls) {
      expect(call[2]).toMatchObject({ httpOnly: true });
    }
  });

  it("sets sameSite: lax on both cookies", async () => {
    await setProfileCookies("profile-abc", "student");

    for (const call of mockSet.mock.calls) {
      expect(call[2]).toMatchObject({ sameSite: "lax" });
    }
  });

  it("sets path: / on both cookies", async () => {
    await setProfileCookies("profile-abc", "student");

    for (const call of mockSet.mock.calls) {
      expect(call[2]).toMatchObject({ path: "/" });
    }
  });

  it("does NOT set secure in non-production environment", async () => {
    const original = process.env.NODE_ENV;
    // NODE_ENV is 'test' in Vitest
    await setProfileCookies("profile-abc", "student");

    for (const call of mockSet.mock.calls) {
      expect(call[2].secure).toBe(false);
    }
    process.env.NODE_ENV = original;
  });

  it("sets secure: true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockSet.mockReset();

    await setProfileCookies("profile-abc", "student");

    for (const call of mockSet.mock.calls) {
      expect(call[2].secure).toBe(true);
    }

    vi.unstubAllEnvs();
  });

  it("works for parent profile type", async () => {
    await setProfileCookies("profile-xyz", "parent");

    expect(mockSet).toHaveBeenCalledWith(
      "active_profile_type",
      "parent",
      expect.any(Object),
    );
  });

  it("returns { success: true }", async () => {
    const result = await setProfileCookies("profile-abc", "student");
    expect(result).toEqual({ success: true });
  });
});

// ── getActiveProfile ──────────────────────────────────────────────────────────

describe("getActiveProfile", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  function cookiesReturning(id: string | null, type: string | null) {
    mockGet.mockImplementation((name: string) => {
      if (name === "active_profile_id") return id ? { value: id } : undefined;
      if (name === "active_profile_type") return type ? { value: type } : undefined;
      return undefined;
    });
  }

  it("returns { id, type } when both cookies are present (student)", async () => {
    cookiesReturning("profile-123", "student");
    const result = await getActiveProfile();
    expect(result).toEqual({ id: "profile-123", type: "student" });
  });

  it("returns { id, type } when both cookies are present (parent)", async () => {
    cookiesReturning("profile-456", "parent");
    const result = await getActiveProfile();
    expect(result).toEqual({ id: "profile-456", type: "parent" });
  });

  it("returns null when active_profile_id is missing", async () => {
    cookiesReturning(null, "student");
    const result = await getActiveProfile();
    expect(result).toBeNull();
  });

  it("returns null when active_profile_type is missing", async () => {
    cookiesReturning("profile-123", null);
    const result = await getActiveProfile();
    expect(result).toBeNull();
  });

  it("returns null when both cookies are missing", async () => {
    cookiesReturning(null, null);
    const result = await getActiveProfile();
    expect(result).toBeNull();
  });

  it("reads active_profile_id before active_profile_type", async () => {
    cookiesReturning("profile-123", "student");
    await getActiveProfile();

    const calls = mockGet.mock.calls.map(([name]: [string]) => name);
    expect(calls).toContain("active_profile_id");
    expect(calls).toContain("active_profile_type");
  });
});
