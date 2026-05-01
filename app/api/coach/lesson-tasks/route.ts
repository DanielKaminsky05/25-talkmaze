import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/** Service-role client used for storage deletions. */
function adminStorage() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ).storage.from("course_files");
}

/**
 * PATCH /api/coach/lesson-tasks
 *
 * Upserts (or deletes) a coach-set per-student task override.
 *
 * Accepts multipart/form-data:
 *   student_id  - UUID
 *   lesson_id   - UUID
 *   course_id   - UUID (for storage path)
 *   type        - "pre" | "post"
 *   description - string (optional, HTML from Tiptap)
 *   file        - File (optional)
 *   clear_file  - "true" to explicitly clear the existing file without uploading a new one
 *
 * Logic:
 *   - If both description is empty/absent and no file is provided (or file is cleared),
 *     the override row is deleted → student falls back to admin default.
 *   - Otherwise, uploads file (if provided) and upserts the lesson_tasks row.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const student_id = formData.get("student_id") as string | null;
    const lesson_id = formData.get("lesson_id") as string | null;
    const course_id = formData.get("course_id") as string | null;
    const type = formData.get("type") as string | null;
    const description = (formData.get("description") as string | null) ?? "";
    const file = formData.get("file") as File | null;
    const clear_file = formData.get("clear_file") === "true";

    if (!student_id || !lesson_id || !course_id || !type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: student_id, lesson_id, course_id, type",
        },
        { status: 400 },
      );
    }

    if (type !== "pre" && type !== "post") {
      return NextResponse.json(
        { error: "type must be 'pre' or 'post'" },
        { status: 400 },
      );
    }

    // Fetch any existing override row for this student/lesson/type
    const { data: existing } = await supabase
      .from("lesson_tasks")
      .select("id, file_url")
      .eq("lesson_id", lesson_id)
      .eq("student_id", student_id)
      .eq("type", type)
      .maybeSingle();

    const descriptionIsEmpty = !description || description === "<p></p>";
    const hasFile = file && file.size > 0;
    const keepExistingFile = !hasFile && !clear_file && existing?.file_url;

    // If description is empty and no file will remain, delete the override row
    if (descriptionIsEmpty && !hasFile && !keepExistingFile) {
      if (existing) {
        // Delete storage file if present
        if (existing.file_url) {
          const oldPath = existing.file_url.replace(/^course_files\//, "");
          await adminStorage().remove([oldPath]);
        }
        await supabase.from("lesson_tasks").delete().eq("id", existing.id);
      }
      return NextResponse.json({ deleted: true });
    }

    // Upload new file if provided
    let newFileUrl: string | null = existing?.file_url ?? null;

    if (hasFile && file) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const taskFolder =
        type === "pre" ? "pre_lesson_tasks" : "post_lesson_tasks";
      const filePath = `${course_id}/${lesson_id}/student_overrides/${student_id}/${taskFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course_files")
        .upload(filePath, file);

      if (uploadError) {
        return NextResponse.json(
          { error: "File upload failed: " + uploadError.message },
          { status: 500 },
        );
      }

      // Delete old override file from storage if it was replaced
      if (
        existing?.file_url &&
        existing.file_url !== `course_files/${filePath}`
      ) {
        const oldPath = existing.file_url.replace(/^course_files\//, "");
        await adminStorage().remove([oldPath]);
      }

      newFileUrl = `course_files/${filePath}`;
    } else if (clear_file && existing?.file_url) {
      // Explicit file clear
      const oldPath = existing.file_url.replace(/^course_files\//, "");
      await adminStorage().remove([oldPath]);
      newFileUrl = null;
    }

    // Upsert the override row
    const upsertPayload = {
      lesson_id,
      student_id,
      type,
      file_url: newFileUrl,
      description: descriptionIsEmpty ? null : description,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("lesson_tasks")
        .update(upsertPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase
        .from("lesson_tasks")
        .insert(upsertPayload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error in PATCH /api/coach/lesson-tasks:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
