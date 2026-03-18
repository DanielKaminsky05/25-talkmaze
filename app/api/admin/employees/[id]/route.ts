import { NextRequest, NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";

const client = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const employeeData = body.employee;

    const updated = await client.updateEmployee(id, employeeData);
    const supabase = await createClient();

    const supabasePayload: Record<string, unknown> = {};

    if (employeeData.first_name !== undefined)
      supabasePayload.first_name = employeeData.first_name;
    if (employeeData.last_name !== undefined)
      supabasePayload.last_name = employeeData.last_name;
    if (employeeData.email !== undefined)
      supabasePayload.email = employeeData.email;
    if (employeeData.mobile_phone !== undefined)
      supabasePayload.mobile_phone = employeeData.mobile_phone;
    if (employeeData.home_phone !== undefined)
      supabasePayload.home_phone = employeeData.home_phone;
    if (employeeData.address !== undefined)
      supabasePayload.address = employeeData.address;
    if (employeeData.city !== undefined)
      supabasePayload.city = employeeData.city;
    if (employeeData.state !== undefined)
      supabasePayload.state = employeeData.state;
    if (employeeData.zip !== undefined) supabasePayload.zip = employeeData.zip;
    if (employeeData.status !== undefined)
      supabasePayload.status = employeeData.status;
    if (employeeData.birth_date !== undefined)
      supabasePayload.birth_date = employeeData.birth_date;
    if (employeeData.hire_date !== undefined)
      supabasePayload.hire_date = employeeData.hire_date;
    if (employeeData.subjects !== undefined)
      supabasePayload.subjects = employeeData.subjects;
    if (employeeData.bio !== undefined) supabasePayload.bio = employeeData.bio;
    if (employeeData.additional_notes !== undefined)
      supabasePayload.additional_notes = employeeData.additional_notes;

    if (Object.keys(supabasePayload).length > 0) {
      const { error: supabaseError } = await supabase
        .from("coaches")
        .update(supabasePayload)
        .eq("tw_employee_id", id);

      if (supabaseError) {
        console.error("Supabase sync failed:", supabaseError.message);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
