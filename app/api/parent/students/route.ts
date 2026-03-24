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

        // 1. Get all students linked to this account_id
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("tw_id, name, id")
            .eq("account_id", user.id);

        if (studentError || !students || students.length === 0) {
            return NextResponse.json([]);
        }

        const teachworksApiKey = process.env.TEACHWORKS_API_KEY;
        if (!teachworksApiKey) {
             return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        const teachworks = new TeachworksClient(teachworksApiKey);

        // 2. Fetch detailed info from Teachworks for each student
        const detailedStudentsPromises = students.map(async (s) => {
            if (!s.tw_id) return null;
            
            const cleanedId = s.tw_id.replace(/"/g, '');
            try {
                const twStudent = await teachworks.getStudent(cleanedId);
                return {
                    id: s.id,
                    name: s.name || `${twStudent.first_name} ${twStudent.last_name}`,
                    first_name: twStudent.first_name,
                    tw_id: cleanedId,
                    date_of_birth: twStudent.birth_date,
                    grade: twStudent.grade,
                    location: twStudent.school || "Remote",
                    notes: twStudent.additional_notes,
                    status: twStudent.status
                };
            } catch (e) {
                console.error(`Error fetching TW student ${cleanedId}:`, e);
                return {
                    id: s.id,
                    name: s.name,
                    tw_id: cleanedId,
                };
            }
        });

        const studentList = await Promise.all(detailedStudentsPromises);
        
        return NextResponse.json(studentList.filter(Boolean));

    } catch (error: any) {
        console.error("Error in /api/parent/students:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
