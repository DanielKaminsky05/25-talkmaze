import { NextRequest, NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";

const client = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: courses, error } = await supabase
      .from("courses")
      .select("*");

    if (error) throw new Error(error.message);

    return NextResponse.json(courses);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { error } = await supabase.from("courses").insert({
      title: body.course.name,
      description: body.course.description ?? null,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json(body.course, { status: 201 });
  } catch (err) {
    console.error("Error creating course:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create course" },
      { status: 500 }
    );
  }
}