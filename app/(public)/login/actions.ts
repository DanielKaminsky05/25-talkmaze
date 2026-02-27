"use server"

import { TeachworksClient } from "@/lib/teachworks/client"
import { createClient } from "@/utils/supabase/server"

//Log in function
export const logInUser = async(email: string, password: string) => {

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })



    const teachWorksClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!)

        const testBody = {
            customer: {
                first_name: "Billy",
                last_name: "Bob",
                customer_type: "Family",
                email: email
            }
        }
        console.log("Sending To Teachworks")
        const response = await teachWorksClient.postFamily(testBody);

        console.log(response);

        if(error){
            return {success: false,error}
        }

        
        return {success: true, data}

        
    }catch(e){
        console.error("There was a problem logging in: ", e)
        return {success: true, e}
    }

   
}


async function signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
}

