import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, first name, and last name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if current user is an admin (role 3)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: currentAccount } = await supabase
      .from("account")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!currentAccount || currentAccount.role !== 3) {
      return NextResponse.json(
        { error: "Only admins can create coach accounts" },
        { status: 403 }
      );
    }

    // We must use a separate client for sign up so we don't overwrite the admin's session in the Next.js cookies
    const authClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      // Use service role if available, otherwise fallback to publishable key
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Create the user account
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Update the account table to set role to 2 (coach)
    const { error: accountError } = await supabase
      .from("account")
      .insert({ 
        id: authData.user.id,
        email: email,
        role: 2 
      });

    if (accountError) {
      console.error("Account update error:", accountError);
      return NextResponse.json(
        { error: "Failed to set coach role" },
        { status: 500 }
      );
    }

    // Insert into coaches table
    const { error: coachError } = await supabase
      .from("coaches")
      .insert({
        account_id: authData.user.id,
        name: `${firstName} ${lastName}`.trim(),
      });

    if (coachError) {
      console.error("Coach insert error:", coachError);
      return NextResponse.json(
        { error: "Failed to create coach profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      coach: {
        id: authData.user.id,
        email: authData.user.email,
        name: `${firstName} ${lastName}`.trim(),
      },
    });
  } catch (error) {
    console.error("Error creating coach:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
