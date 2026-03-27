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

        // 1. Get all Teachworks student IDs (tw_id) and names for this account_id
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("tw_id, name")
            .eq("account_id", user.id);

        if (studentError || !students || students.length === 0) {
            console.error("Error fetching student profiles or missing students:", studentError);
            // If no students are found, we return an empty array of lessons
            return NextResponse.json([]);
        }

        // Create a map of tw_id to supabase name
        const studentNameMap = new Map<string, string>();
        students.forEach(s => {
            if (s.tw_id) {
                const cleanedId = s.tw_id.startsWith('"') && s.tw_id.endsWith('"') 
                    ? s.tw_id.slice(1, -1) 
                    : s.tw_id;
                studentNameMap.set(cleanedId, s.name || "Student");
            }
        });

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

        // 4. Fetch lessons for all students
        const lessonsPromises = students.map(student => {
            if (!student.tw_id) return Promise.resolve([]);
            
            // Handle potential quotes from JSON.stringify if stored that way
            const studentId = student.tw_id.startsWith('"') && student.tw_id.endsWith('"') 
                ? student.tw_id.slice(1, -1) 
                : student.tw_id;

            return teachworks.getLessons({
                student_id: studentId,
                "from_date[gte]": currentDate,
                per_page: 50,
                direction: "asc"
            });
        });

        const allLessonsResults = await Promise.all(lessonsPromises);
        
        // 5. Flatten and deduplicate by lesson id
        const flattenedLessons = allLessonsResults.flat();
        const uniqueLessons = Array.from(new Map(flattenedLessons.map(l => [l.id, l])).values());

        // 6. Enrich lessons with Supabase names if possible
        const enrichedLessons = uniqueLessons.map((lesson: any) => {
            const studentId = lesson.participants?.[0]?.student_id?.toString();
            const supabaseName = studentId ? studentNameMap.get(studentId) : null;
            return {
                ...lesson,
                supabase_student_name: supabaseName
            };
        });

        // 7. Sort by date
        enrichedLessons.sort((a, b) => new Date(a.from_datetime).getTime() - new Date(b.from_datetime).getTime());

        return NextResponse.json(enrichedLessons);

    } catch (error: any) {
        console.error("Error in /api/teachworks/family-lessons:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
