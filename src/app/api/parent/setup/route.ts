import { NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

/**
 * PATCH /api/parent
 * Updates the parent's phone number and PIN after account creation.
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();

  const { phoneNumber, pin } = await req.json();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error finding current user",
      },
      { status: 401 },
    );
  }

  // Save the phone number and PIN on the parent record.
  // The PIN is what lets the parent unlock their profile on the /profiles page.
  const { error: updateError } = await supabase
    .from("parents")
    .update({
      phone_number: phoneNumber,
      profile_access_pin: pin,
    })
    .eq("account_id", user.id);

  if (updateError) {
    console.log("Update err: " + JSON.stringify(updateError));
    return NextResponse.json(
      {
        success: false,
        message: "Unable to finish parent onboarding",
      },
      { status: 500 },
    );
  }

  // Mark onboarding as complete so /profiles stops redirecting them here.
  await supabase.from("account").update({ new: false }).eq("id", user.id);

  return NextResponse.json({ success: true }, { status: 200 });
}
