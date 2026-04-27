import { createClient } from "@/services/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's role from the account table
    const { data: account, error: accountError } = await supabase
      .from("account")
      .select("role")
      .eq("id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Failed to fetch user role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      role: account.role,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
