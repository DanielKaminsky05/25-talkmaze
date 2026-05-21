import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock the supabase server client factory before importing the SUT.
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/src/services/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { requireRole } from "@/src/lib/auth/server/requireRole";

type AccountResult = { data: unknown };

function stubAccountQuery(result: AccountResult) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });
}

const FAKE_USER = { id: "user-123", email: "user@example.com" } as never;

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
});

describe("requireRole", () => {
  it("returns 401 'Unauthorized' when getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await requireRole([1]);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 'Unauthorized' when getUser returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "session expired" },
    });

    const res = await requireRole([1]);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 500 'Account not found' and logs context when account row missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
    stubAccountQuery({ data: null });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await requireRole([1]);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Account not found" });
    expect(errSpy).toHaveBeenCalledWith(
      "requireRole: session valid but no account row",
      { userId: FAKE_USER.id },
    );
  });

  it("returns 403 'Forbidden' when account.role not in allowedRoles", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
    stubAccountQuery({
      data: { id: FAKE_USER.id, role: 1, email: "u@x.com" },
    });

    const res = await requireRole([3]);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Forbidden" });
  });

  it("returns AuthContext when role matches allowedRoles", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
    stubAccountQuery({
      data: { id: FAKE_USER.id, role: 2, email: "coach@x.com" },
    });

    const res = await requireRole([2, 3]);
    expect(res).not.toBeInstanceOf(Response);
    if (res instanceof Response) throw new Error("unreachable");

    expect(res.user).toBe(FAKE_USER);
    expect(res.account).toEqual({
      id: FAKE_USER.id,
      role: 2,
      email: "coach@x.com",
    });
    expect(res.supabase).toBeDefined();
  });

  it("accepts any authenticated role when allowedRoles is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
    stubAccountQuery({
      data: { id: FAKE_USER.id, role: 1, email: "u@x.com" },
    });

    const res = await requireRole([]);
    expect(res).not.toBeInstanceOf(Response);
    if (res instanceof Response) throw new Error("unreachable");
    expect(res.account.role).toBe(1);
  });
});
