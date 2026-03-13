"use server"

import { createClient } from "@/utils/supabase/server"
import { TeachworksClient } from "@/lib/teachworks/client"
import {z} from "zod";

//Sign up function
export const signUpNewUser = async (email: string, password: string, masterPin: string) => {


    const teachWorksClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!)

        const testBody = {
            customer: {
                first_name: "Billy",
                last_name: "Bob",
                customer_type: "Family",
                email: email
            }
        }
        
    const response = await teachWorksClient.postFamily(testBody);
    
    console.log("Id: " + response.id);    
        
    
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    })

   
    //note customer is 1, coach is 2, and admin is 3
    const insertIntoAccount = await supabase.from('account').insert({
    id: data.user?.id,
    email: email,
    tw_customer_id: response.id.toString(),
    role: 3,
    })

    const insertIntoParents = await supabase.from('parents').insert({
    account_id: data.user?.id,
    profile_access_pin: masterPin,
    })
    
    
    
    //write id to the database
    if (error) {
        console.error("There was a problem signing up:", error)
        return { success: false, error}
    }

    return { success: true, data }
    }