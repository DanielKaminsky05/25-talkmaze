import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

/**
 * PATCH /api/admin/payment-plans/[id]/archive
 *
 * Soft-deletes a payment plan by setting is_active = false. The plan record is
 * intentionally kept in the database so that existing student_subscriptions
 * referencing it via plan_id remain intact and queries against historical data
 * continue to work.
 *
 * Archiving does NOT cancel any active student subscriptions. 
 *
 * @param id - Plan UUID from the URL segment
 *
 * @returns 200 Updated plan row with is_active = false
 * @returns 404 If no plan with the given id exists
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { id } = await params;

    const { data: plan, error } = await supabase
      .from("plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!plan)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error archiving payment plan:", error);
    return NextResponse.json(
      { error: "Failed to archive plan" },
      { status: 500 },
    );
  }
}
