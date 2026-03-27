"use server"

import { createClient } from "@/utils/supabase/server"
import { TeachworksClient } from "@/lib/teachworks/client"
import { NextResponse } from "next/server";
import { z } from "zod";

//Sign up function
export const signUpNewUser = async (familyFirstName: string, familyLastName: string, email: string, password: string, masterPin: string) => {


    const teachWorksClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!)

    const testBody = {
        customer: {
            first_name: familyFirstName,
            last_name: familyLastName,
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

    
    if(error){
        console.log("Error signing up user: " + error);
        return;
    }
    if(!data.user){
        //return NextResponse.json({status:404, message: 'unable to identify user after supabase signup'})
        console.log("No data.user");
        return;
    }
    //note customer is 1, coach is 2, and admin is 3
    const insertIntoAccount = await supabase.from('account').insert({
        id: data.user.id,
        email: email,
        tw_customer_id: response.id.toString(),
        role: 1,
    }
    )

    const insertIntoParents = await supabase.from('parents').insert({
        account_id: data.user.id,
        name: `${familyFirstName} ${familyLastName}`,
        profile_access_pin: masterPin,
        billing_email: email,
        tw_id: null,
        phone_number: null,

    })

    //write id to the database
    if (error) {
        console.error("There was a problem signing up:", error)
        return { success: false, error }
    }






    return { success: true, data }
}



const userSchema = z.object({
    userName: z.string().trim().min(3, "Name must be at least 3 characters long").max(50, "Name cannot exceed 50 characters"),
    email: z.string().trim().email("Invalid email format"),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must have at least one uppercase character")
        .regex(/[a-z]/, "Password must have at least one lowercase character")
        .regex(/[@$!%*?&#-~^]/, "Password must have at least one special character")
        .regex(/\d/, "Password must have at least one number"),
    confirmPassword: z.string()
})
    .refine(async (data) => data.password === data.confirmPassword, {
        message: "Passwords must match",
        path: ['confirmPassword'],
    });