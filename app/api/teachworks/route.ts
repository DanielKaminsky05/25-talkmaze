import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
        return NextResponse.json(
            { error: "Missing studentId parameter" },
            { status: 400 }
        );
    }

    const apiKey = process.env.TEACHWORKS_API_KEY;
    const apiUrl = process.env.TEACHWORKS_API_URL || "https://api.teachworks.com/v1";

    if (!apiKey) {
        console.error("TEACHWORKS_API_KEY is not defined");
        return NextResponse.json([
            {
                id: "mock-1",
                title: "Mock Lesson 1",
                start_date: new Date(Date.now() + 86400000).toISOString(),
                end_date: new Date(Date.now() + 90000000).toISOString(),
                description: "This is a mock lesson."
            },
            {
                id: "mock-2",
                title: "Mock Lesson 2",
                start_date: new Date(Date.now() + 172800000).toISOString(),
                end_date: new Date(Date.now() + 176400000).toISOString(),
                description: "This is another mock lesson."
            }
        ]);
    }

    try {
        const response = await fetch(`${apiUrl}/customers/${studentId}/appointments`, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Teachworks API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching Teachworks schedule:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedule" },
            { status: 500 }
        );
    }
}
