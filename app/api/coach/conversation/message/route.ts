import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json([], { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });

  // Resolve sender names for each message
  const messages = await Promise.all(
  data.map(async (m) => {
    const { data: account } = await supabase
      .from("account")
      .select("email")
      .eq("id", m.sender_id)
      .maybeSingle();

    const { data: student } = await supabase
      .from("students")
      .select("first_name, last_name")
      .eq("account_id", m.sender_id)
      .maybeSingle();

    const { data: coach } = await supabase
      .from("coaches")
      .select("first_name, last_name")
      .eq("account_id", m.sender_id)
      .maybeSingle();


      let name = "Unknown";

      if (student) {
        name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();
      } else if (coach) {
        name = `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim();
      } else if (account?.email) {
        name = account.email;
      }
    
    return {
      id: m.id,
      text: m.body,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender: {
        name: name,
        email: account?.email ?? "",
      },
    };
  })
);

  return NextResponse.json(messages);
}