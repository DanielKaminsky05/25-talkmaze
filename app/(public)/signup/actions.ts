"use server"

import { createClient } from "@/utils/supabase/server"
import { TeachworksClient } from "@/lib/teachworks/client"
import { cookies } from "next/headers"
import {z} from "zod";
import crypto from "crypto";

//Sign up function
export const signUpNewUser = async (email: string, password: string, masterPin: string, userName: string) => {


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
    
    if (!data.user) {
        return { success: false, error: new Error("User creation failed") };
    }

    const cookieStore = await cookies();
    cookieStore.set({
        name: "account_id",
        value: data.user.id,
        httpOnly: true,
        path: '/',
        sameSite: 'lax'
    });

    //note customer is 1, coach is 2, and admin is 3
    const insertIntoAccount = await supabase.from('account').insert({
            id: data.user.id,
            email: email,
            tw_customer_id: response.id.toString(),
            role: 1 // Changed to 1 (Customer/Parent) as per standard roles
        }
    )

    // Insert into parents table
    const insertIntoParents = await supabase.from('parents').insert({
        id: crypto.randomUUID(),
        account_id: data.user.id,
        name: userName,
        profile_access_pin: masterPin,
        billing_email: email,
        tw_id: response.id.toString(),
        phone_number: null
    })

    if (insertIntoParents.error) {
        console.error("Error creating parent profile:", insertIntoParents.error);
        return { success: false, error: insertIntoParents.error };
    }

    
    
    
    
    //write id to the database
    if (error) {
        console.error("There was a problem signing up:", error)
        return { success: false, error}
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
  .regex(/\d/, "Password must have at least one number" ),
  confirmPassword:z.string()
})
 .refine(async (data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ['confirmPassword'],
  });