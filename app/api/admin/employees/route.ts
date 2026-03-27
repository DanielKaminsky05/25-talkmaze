import { NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";
export async function GET() {
  try {
  
    const supabase = await createClient();

    const {data, error} = await supabase.from('coaches').select("*");

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
