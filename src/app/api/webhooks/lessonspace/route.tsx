import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/src/services/supabase/service";
import { EmailTemplate } from "./components/email_template";

/**
 * POST /api/webhooks/lessonspace
 *
 * Handles LessonSpace session events. Today the only event we act on carries
 * a `summary` (post-lesson AI summary); other events (room created, etc.)
 * return 200 no-op.
 *
 * Contract per docs/api-contract.md §webhook-routes:
 *   - Signature-verified instead of role-gated. **Signature verification is
 *     not yet implemented** — tracked as a Phase-5 follow-up. For now the
 *     route accepts any POST.
 *   - Uses createServiceRoleClient (the only legitimate consumer outside the
 *     two webhook routes per the contract).
 *   - Error responses use { error: string }, not { status, message }.
 *
 * Audit fix (CRITICAL): the previous implementation emailed every summary to
 * the hardcoded "wdstalkmaze@gmail.com" instead of the student's family
 * account email. That's a PII leak — student lesson summaries went to a
 * shared inbox.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const room = (body as { room?: { id?: string } }).room;
  const roomId = room?.id;
  const summary = (body as { summary?: string }).summary;

  // Room-created / no-summary events: 200 no-op.
  if (!summary) {
    return NextResponse.json({ ok: true });
  }

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id" }, { status: 400 });
  }

  // Env guards — fail loudly rather than silently no-op.
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("lessonspace webhook: RESEND_API_KEY missing");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("account_id, first_name, last_name")
    .eq("webhook_room_id", roomId)
    .maybeSingle();

  if (studentError) {
    console.error("lessonspace webhook student lookup error", studentError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
  if (!student) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!student.first_name || !student.last_name) {
    return NextResponse.json(
      { error: "Student record incomplete" },
      { status: 422 },
    );
  }

  // Resolve the account email — the family's email is the recipient for the
  // AI summary. Previously this was hardcoded to wdstalkmaze@gmail.com.
  const { data: account, error: accountError } = await supabase
    .from("account")
    .select("email")
    .eq("id", student.account_id)
    .maybeSingle();

  if (accountError || !account?.email) {
    console.error(
      "lessonspace webhook account lookup error",
      accountError,
    );
    return NextResponse.json(
      { error: "Account email not found" },
      { status: 404 },
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Talk Maze <onboarding@resend.dev>",
      to: account.email,
      subject: "Talkmaze Lessonspace AI summary",
      react: (
        <EmailTemplate
          firstName={student.first_name}
          lastName={student.last_name}
          summary={summary}
          date={new Date()}
        />
      ),
    });
    if (error) {
      console.error("lessonspace webhook resend error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    console.error("lessonspace webhook error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
