import { NextRequest, NextResponse } from "next/server";
import { createTeacherLinkForCoachAccount } from "@/src/lib/lessonspace/server/participants";

/**
 * Returns a fresh LessonSpace teacher launch link for a coach/student pair.
 *
 * @param _req Incoming request (unused; route params are used).
 * @param context Dynamic route params containing coach account id and student id.
 * @returns JSON response with provider launch payload or an error object.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ coachId: string; studentId: string }> },
) {
  void _req;
  const { coachId, studentId } = await params;
  console.log("Trying to get all rooms ", coachId);

  try {
    const teacherLink = await createTeacherLinkForCoachAccount({
      studentId,
      coachAccountId: coachId,
    });

    return NextResponse.json(teacherLink);
  } catch (error) {
    return NextResponse.json(
      {
        status: 500,
        message:
          error instanceof Error
            ? error.message
            : "Error fetching student data",
      },
      { status: 500 },
    );
  }
}
