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
    const employees = await client.getEmployees();

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
