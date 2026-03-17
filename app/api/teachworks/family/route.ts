import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { CreateFamilyRequest } from "@/lib/teachworks/types";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: CreateFamilyRequest = await request.json();

        // Basic validation
        if (!body.first_name || !body.last_name) {
            return NextResponse.json(
                { error: "First name and last name are required" },
                { status: 400 }
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

        const teachworks = new TeachworksClient(teachworksApiKey);

        const family = await teachworks.postFamily(body);

        return NextResponse.json(family);

    } catch (error: any) {
        console.error("Error in POST /api/teachworks/family:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
