"use server"

import { createClient } from "@/utils/supabase/server"
import { TeachworksClient } from "@/lib/teachworks/client"
import {z} from "zod";

//Sign up function
export const signUpNewUser = async (email: string, password: string) => {


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
            role: 3
        }
    )
    
    
    
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