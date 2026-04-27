import { createClient } from "@/services/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('account_id', user.id)
        .single();

    if (studentError || !student) {
        console.error("Student not found for user:", user.id);
        return NextResponse.json({ completed: 0, total: 0, error: "Student profile not found" });
    }

    const studentId = student.id;

    const { count: completedCount, error: completedError } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 1);

    const { count: totalCount, error: totalError } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

    if (completedError || totalError) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
        completed: completedCount || 0,
        total: totalCount || 24,
        studentId: studentId
    });
}
