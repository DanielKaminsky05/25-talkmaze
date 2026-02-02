import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get the Teachworks student ID (tw_id) from the students table
        const { data: student, error: studentError } = await supabase
            .from("students")
            .select("tw_id")
            .eq("account_id", user.id)
            .single();

        if (studentError || !student || !student.tw_id) {
            console.error("Error fetching student profile or missing tw_id:", studentError);
            return NextResponse.json(
                { error: "Student profile not found or linked to Teachworks" },
                { status: 404 }
            );
        }

        const teachworksApiKey = process.env.TEACHWORKS_API_KEY;

        if (!teachworksApiKey) {
            console.error("TEACHWORKS_API_KEY is missing");
             return NextResponse.json(
                { error: "Server misconfiguration: Missing API Key" },
                { status: 500 }
            );
        }

        // 2. Instantiate Teachworks Client
        const teachworks = new TeachworksClient(teachworksApiKey);

        // 3. Get current date for filtering (YYYY-MM-DD)
        const currentDate = new Date().toISOString().split('T')[0];

        // 4. Fetch lessons
        console.log(student.tw_id);
        const lessons = await teachworks.getLessons({
            student_id: student.tw_id,
            "from_date[gte]": currentDate,
            per_page: 50,
            direction: "asc"
        });

        return NextResponse.json(lessons);

    } catch (error: any) {
        console.error("Error in /api/teachworks/lessons:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
