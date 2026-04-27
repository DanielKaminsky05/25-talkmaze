import { createClient } from "@/services/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET route handler to select an active profile.
 * Only supports profiles without a PIN.
 * Sets cookies and redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const profileType = searchParams.get("profileType") as "student" | "parent" | null;

  if (!profileId || !profileType) {
    return NextResponse.json({ error: "Missing profile data" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate profile and ensure it has no PIN
  if (profileType === "parent") {
    const { data: parent, error } = await supabase
      .from("parents")
      .select("id, profile_access_pin")
      .eq("id", profileId)
      .eq("account_id", user.id)
      .single();

    if (error || !parent) {
      return NextResponse.redirect(new URL("/profiles?error=not_found", request.url));
    }

    if (parent.profile_access_pin != null) {
      // Profiles with PIN should use the POST method (form)
      return NextResponse.redirect(new URL("/profiles", request.url));
    }
  } else {
    // Validate profile for student (No PIN check)
    const { data: student, error } = await supabase
      .from("students")
      .select("id")
      .eq("id", profileId)
      .eq("account_id", user.id)
      .single();

    if (error || !student) {
      return NextResponse.redirect(new URL("/profiles?error=not_found", request.url));
    }
  }

  // Set cookies
  const cookieStore = await cookies();
  cookieStore.set("active_profile_id", profileId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("active_profile_type", profileType, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  // Redirect
  const destination = profileType === "parent" ? "/parent" : "/home";
  return NextResponse.redirect(new URL(destination, request.url));
}
