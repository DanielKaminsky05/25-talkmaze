import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { redirect } from "next/navigation";
type Props = {
    phone_number: string,
    pin: string
}
export async function FinishSetup(phoneNumber: string, pin: string){

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
        return {
            success: false,
            message: "Error finding current user"
        }
    }
    const {data: insertData, error: insertDataError} = await supabase.from('parents').update({phone_number: phoneNumber, profile_access_pin: pin})

    if(insertDataError){
        return {
            success: false,
            message: "Unable to finish parent onboarding"
        }
    }

    console.log("About to redirect")
    redirect('/onboarding')


}