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

  // contactId may be a student profile ID or an account ID
  const [{ data: accountExists }, { data: studentExists }] = await Promise.all([
    supabase.from("account").select("id").eq("id", contactId).single(),
    supabase.from("students").select("account_id").eq("id", contactId).single(),
  ]);

  if (!accountExists && !studentExists) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const resolvedContactId = studentExists?.account_id ?? contactId;

  // There should be exactly one conversation per (student profile, coach) pair.
  // sender_profile_id stores the student profile UUID regardless of who initiated.
  // Check both directions (coach-initiated and student-initiated) with the same filter.
  const [{ data: myConvs }, { data: theirConvs }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id")
      .eq("sender_id", user.id)
      .eq("recipient_id", resolvedContactId)
      .eq("sender_profile_id", studentExists ? contactId : "")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("conversations")
      .select("id")
      .eq("sender_id", resolvedContactId)
      .eq("recipient_id", user.id)
      .eq("sender_profile_id", studentExists ? contactId : "")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const existing = myConvs?.[0] ?? theirConvs?.[0];
  if (existing) return NextResponse.json({ conversationId: existing.id });

  // No conversation yet — create one, storing the student profile ID so both
  // the coach dashboard and /message route can find it with the same filter.
  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      sender_id: user.id,
      recipient_id: resolvedContactId,
      ...(studentExists && {
        sender_profile_id: contactId,
        sender_profile_type: "student",
      }),
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ conversationId: newConversation.id });
}
