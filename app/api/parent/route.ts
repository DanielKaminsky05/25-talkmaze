import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createClient();

  
  const { phoneNumber, pin } = await req.json();

  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    return NextResponse.json({
      success: false,
      message: "Error finding current user",
    }, { status: 401 });
  }

  const { error: updateError } = await supabase
    .from("parents")
    .update({
      phone_number: phoneNumber,
      profile_access_pin: pin,
    })
    .eq("account_id", user.id);

  if (updateError) {
    console.log("Update err: " + JSON.stringify(updateError));
    return NextResponse.json({
      success: false,
      message: "Unable to finish parent onboarding"
    }, { status: 500 });
  }

 
  return NextResponse.redirect(new URL("/onboarding", req.url));
}