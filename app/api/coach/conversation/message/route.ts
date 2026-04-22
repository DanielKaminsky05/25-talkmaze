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

  // Fetch conversation to know coach and profile
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("coach_id, profile_id, profile_type")
    .eq("id", conversationId)
    .single();

  if (convError || !conv) return NextResponse.json([], { status: 404 });

  // Resolve coach's account_id and display info
  const { data: coach } = await supabase
    .from("coaches")
    .select("account_id, first_name, last_name, avatar_url")
    .eq("id", conv.coach_id)
    .single();

  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  console.log("Retrieved messages: " + JSON.stringify(data))
  if (error) return NextResponse.json([], { status: 500 });

  const messages = await Promise.all(
    data.map(async (m) => {
      let name: string;
      let avatar_url: string | null = null;

      if (coach && m.sender_id === coach.account_id) {
        name = `${coach.first_name || ""} ${coach.last_name || ""}`.trim() || "Unknown";
        avatar_url = coach.avatar_url ?? null;
      } else {
        if (conv.profile_type === "student") {
          const { data: student } = await supabase
            .from("students")
            .select("first_name, last_name, avatar_url")
            .eq("id", conv.profile_id)
            .maybeSingle();
          name = student
            ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
            : "Unknown";
          avatar_url = student?.avatar_url ?? null;
        } else {
          const { data: parent } = await supabase
            .from("parents")
            .select("first_name, last_name, avatar_url")
            .eq("id", conv.profile_id)
            .maybeSingle();
          name = parent
            ? `${parent.first_name || ""} ${parent.last_name || ""}`.trim()
            : "Unknown";
          avatar_url = parent?.avatar_url ?? null;
        }
      }

      return {
        id: m.id,
        text: m.body,
        created_at: m.created_at,
        sender_id: m.sender_id,
        sender: { name, avatar_url },
      };
    }),
  );

  return NextResponse.json(messages);
}
