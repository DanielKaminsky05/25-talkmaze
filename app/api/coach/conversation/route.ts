import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "No contactId" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // Resolve the coach's coaches.id from their account id
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .single();

  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 403 });

  // contactId is always a profile ID (student or parent) from the contact list
  const { data: studentProfile } = await supabase
    .from("students")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();

  const profileType = studentProfile ? "student" : "parent";

  // Upsert — the unique constraint on (coach_id, profile_id) prevents duplicates
  const { data: conv, error } = await supabase
    .from("conversations")
    .upsert(
      { coach_id: coach.id, profile_id: contactId, profile_type: profileType },
      { onConflict: "coach_id,profile_id" },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversationId: conv.id });
}
