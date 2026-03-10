import { NextRequest, NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";

const client = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);

export async function GET() {
  try {
    const courses = await client.getCourses();
    console.log("Fetched courses:", courses);
    return NextResponse.json(courses);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch courses" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Creating course with data:", body.course);
    const created = await client.createCourse(body.course);
    console.log("Created course:", created);
    const supabase = await createClient();
    const { error } = await supabase.from("courses").insert({
      tw_course_id: created.id,
      title: created.name,
      description: created.description ?? null,
    });
    if (error) console.error("Supabase sync failed:", error.message);

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Error creating course:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create course" },
      { status: 500 },
    );
  }
}
