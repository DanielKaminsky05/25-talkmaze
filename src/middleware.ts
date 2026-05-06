import { updateSession } from "@/src/lib/auth/server/middleware/updateSession";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware function to handle incoming requests
 */
export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Determine if the current route is a "profile locked" route
  // Profile locked routes require the user to have an active profile
  if (
    pathname.startsWith("/api/webhooks/stripe") ||
    pathname.startsWith("/api/webhooks/lessonspace")
  ) {
    return NextResponse.next();
  }
  const isProfileLockedRoute =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next");
  // Check if the user is trying to access a route locked behind profile
  if (isProfileLockedRoute) {
    // Create Supabase client in middleware context
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op: cookies are handled by updateSession
          },
        },
      },
    );

    // Get current logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Fetch the account role
      const { data: account } = await supabase
        .from("account")
        .select("role")
        .eq("id", user.id)
        .single();

      // Check if current user is a "regular user", and not for example an admin
      const isRegularUser = account?.role === 1;
      const isCoach = account?.role === 2;
      const isAdmin = account?.role === 3;

      if (pathname.startsWith("/profiles") && (isCoach || isAdmin)) {
        const url = request.nextUrl.clone();
        if (isCoach) {
          url.pathname = "/coach";
          return NextResponse.redirect(url);
        }
        if (isAdmin) {
          url.pathname = "/admin";
          return NextResponse.redirect(url);
        }
      }

      // Coach Route Protection
      if (pathname.startsWith("/coach") && !isCoach) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
      }

      // Admin Route Protection
      if (pathname.startsWith("/admin") && !isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
      }

      // If they are a regular user, check if they have an active profile
      if (isRegularUser) {
        const activeProfileId = request.cookies.get("active_profile_id")?.value;
        const activeProfileType = request.cookies.get(
          "active_profile_type",
        )?.value;

        // If no active profile, redirect them to select a profile
        if (
          !activeProfileId &&
          !pathname.startsWith("/profiles") &&
          !pathname.startsWith("/onboarding")
        ) {
          const url = request.nextUrl.clone();
          url.pathname = "/profiles";
          return NextResponse.redirect(url);
        }
        // Student Subscription Gate
        if (
          activeProfileId &&
          activeProfileType === "student" &&
          pathname.startsWith("/student")
        ) {
          const { data: subscriptions } = await supabase
            .from("student_subscriptions")
            .select("id")
            .eq("student_id", activeProfileId)
            .eq("status", "active")
            .limit(1);

          if (!subscriptions || subscriptions.length === 0) {
            const url = request.nextUrl.clone();
            url.pathname = "/payments";
            return NextResponse.redirect(url);
          }
        }
      }
    }
  }

  return response;
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * Feel free to modify this pattern to include more paths.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
