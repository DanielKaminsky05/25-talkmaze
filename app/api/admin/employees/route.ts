import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
export async function GET() {
  try {
  
    const supabase = await createClient();

    const {data,error} = await supabase.from('coaches').select("*");

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
