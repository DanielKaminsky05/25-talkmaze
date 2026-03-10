import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
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

    /*if (!currentAccount || currentAccount.role !== 3) {
      return NextResponse.json(
        { error: "Only admins can create admin accounts" },
        { status: 403 }
      );
    }*/

    // Create the user account using regular signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
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

    // Update the account table to set role to 3 (admin)
    const { error: accountError } = await supabase
      .from("account")
      .update({ role: 3 })
      .eq("id", authData.user.id);

    if (accountError) {
      console.error("Account update error:", accountError);
      return NextResponse.json(
        { error: "Failed to set admin role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
