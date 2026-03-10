import { NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";

export async function GET() {
  try {
    const apiKey = process.env.TEACHWORKS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Teachworks API key not configured" },
        { status: 500 }
      );
    }

    const client = new TeachworksClient(apiKey);
    const students = await client.getStudents();

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
