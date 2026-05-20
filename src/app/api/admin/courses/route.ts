import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*");

    if (error) throw error;

    return NextResponse.json(courses);
  } catch (err: unknown) {
    console.error("GET courses error", err);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const body = await req.json();

    const { error } = await supabase.from("courses").insert({
      title: body.course.name ?? body.course.title,
      description: body.course.description ?? null,
    });

    if (error) throw error;

    return NextResponse.json(body.course, { status: 201 });
  } catch (err: unknown) {
    console.error("POST course error", err);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}