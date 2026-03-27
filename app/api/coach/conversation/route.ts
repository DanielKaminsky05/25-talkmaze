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

  // Validate contact exists in either table
  const [{ data: accountExists }, { data: studentExists }] = await Promise.all([
    supabase.from("account").select("id").eq("id", contactId).single(),
    supabase.from("students").select("account_id").eq("id", contactId).single(),
  ]);

  if (!accountExists && !studentExists) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // If the contact is a student, resolve their account_id for conversation lookup
  const resolvedContactId = studentExists?.account_id ?? contactId;

  // Reliable two-query lookup
  const [{ data: conv1 }, { data: conv2 }] = await Promise.all([
    supabase.from("conversations").select("id").eq("sender_id", user.id).eq("recipient_id", resolvedContactId).maybeSingle(),
    supabase.from("conversations").select("id").eq("sender_id", resolvedContactId).eq("recipient_id", user.id).maybeSingle(),
  ]);

  const existing = conv1 ?? conv2;
  if (conv1 && conv2) {
  console.warn("DUPLICATE CONVERSATIONS FOUND", conv1.id, conv2.id);
}
  if (existing) return NextResponse.json({ conversationId: existing.id });

  // Create new conversation using resolved IDs
  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({ sender_id: user.id, recipient_id: resolvedContactId })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ conversationId: newConversation.id });
}