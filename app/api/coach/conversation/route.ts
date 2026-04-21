import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";
import { NextResponse } from "next/server";

export async function GET(request: Request) {

  console.log("Retrieving student message logs");
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "No contactId" }, { status: 400 });

  const user = await getCurrentUser();
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // contactId may be a student profile ID or an account ID
  const [{ data: accountExists }, { data: studentExists }] = await Promise.all([
    supabase.from("account").select("id").eq("id", contactId).single(),
    supabase.from("students").select("account_id").eq("id", contactId).single(),
  ]);

 
  if (!accountExists && !studentExists) {
    console.log("Account does not exist");
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  //fetch coach info
  const {data: coach_id_data, error: coach_id_data_error} = await supabase.from('coaches').select('id').eq('account_id', user.id).single();
  if(coach_id_data_error || !coach_id_data){
    return NextResponse.json({status:404, message: "Can not identify coach!"})
  }
  const resolvedContactId = studentExists?.account_id ?? contactId;

  console.log("resolved contact id: " + resolvedContactId)
  // There should be exactly one conversation per (student profile, coach) pair.
  // sender_profile_id stores the student profile UUID regardless of who initiated.
  // Check both directions (coach-initiated and student-initiated) with the same filter.
  const { data: myConvs, error: myConvsError } =  await
    supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", coach_id_data.id)
      .eq("profile_id", resolvedContactId)
      .order("created_at", { ascending: false })
      .limit(1)
    
  console.log("My convs: " + JSON.stringify(myConvs));

  const existing = myConvs?.[0];
  if (existing) return NextResponse.json({ conversationId: existing.id });


  // No conversation yet — create one, storing the student profile ID so both
  // the coach dashboard and /message route can find it with the same filter.

 
  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      coach_id: coach_id_data.id,
      profile_id: resolvedContactId,
      profile_type: "student"
    })
    .select("id")
    .single();

  if (insertError) {
      console.log("Insert Error: ")
      return NextResponse.json({ error: insertError.message }, { status: 500 });

  }

  return NextResponse.json({ conversationId: newConversation.id });
}
