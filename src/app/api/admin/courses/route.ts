import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";

const PostBodySchema = z
  .object({
    course: z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, created_at");

    if (error) {
      console.error("admin/courses GET error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ courses: data ?? [] });
  } catch (err: unknown) {
    console.error("admin/courses GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const parsed = PostBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("courses")
      .insert({
        title: parsed.data.course.title,
        description: parsed.data.course.description ?? null,
      })
      .select("id, title, description, created_at")
      .single();

    if (error) {
      console.error("admin/courses POST insert error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ course: data }, { status: 201 });
  } catch (err: unknown) {
    console.error("admin/courses POST error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
