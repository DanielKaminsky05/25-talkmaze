import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
export async function GET() {
  try {
    
    const supabase = await createClient();

    const {data,error} = await supabase.from('students').select("*");
    console.log("Data: " + data)
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
