import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

/**
 * PATCH /api/admin/payment-plans/[id]
 *
 * Updates the editable metadata fields of a payment plan. Only display/config
 * fields can be changed here — price amount, currency, and stripe_price_id are
 * intentionally excluded because Stripe prices are immutable once created.
 *
 * Changing `classes` only affects new signups and the next renewal for existing
 * subscribers; it does not retroactively update sessions_remaining on active
 * student_subscriptions.
 *
 * All fields are optional — only provided keys are updated.
 *
 * @param id          - Plan UUID from the URL segment
 * @body name         - Display name for the plan
 * @body description  - Optional plan description
 * @body classes      - Number of coaching sessions per billing period
 * @body renewal      - Human-readable billing interval (e.g. "per 3 months")
 * @body type         - Optional label (e.g. "3 Classes")
 *
 * @returns 200 Updated plan row.
 * @returns 404 If no plan with the given id exists.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, classes, renewal, type } = body;

    type PlanUpdates = {
      updated_at: string;
      name?: string;
      description?: string | null;
      classes?: number;
      renewal?: string;
      type?: string | null;
    };
    // Build the update object dynamically so omitted fields are left unchanged.
    const updates: PlanUpdates = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (classes !== undefined) updates.classes = Number(classes);
    if (renewal !== undefined) updates.renewal = renewal;
    if (type !== undefined) updates.type = type;

    const { data: plan, error } = await supabase
      .from("plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!plan)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error updating payment plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
}
