import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get all students linked to this account_id
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select(`
                id,
                first_name,
                last_name,
                grade,
                avatar_url,
                location,
                date_of_birth,
                bio,
                student_subscriptions (
                    sessions_remaining,
                    status
                )
            `)
            .eq("account_id", user.id);

        if (studentError || !students || students.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Map to a clean response format
        const studentList = students.map((s: any) => {
            const subscription = s.student_subscriptions?.[0] || null;
            return {
                id: s.id,
                name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
                first_name: s.first_name,
                last_name: s.last_name,
                grade: s.grade,
                avatar_url: s.avatar_url,
                location: s.location,
                date_of_birth: s.date_of_birth,
                bio: s.bio,
                remaining_lessons: subscription?.sessions_remaining ?? 0,
                status: subscription?.status || "inactive"
            };
        });
        
        return NextResponse.json(studentList);

    } catch (error: any) {
        console.error("Error in /api/parent/students:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
