"use server"

import { createClient } from "@/utils/supabase/server"
import {z} from "zod";

//Sign up function
export const signUpNewUser = async (email: string, password: string) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    })

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
  .regex(/\d/, "Password must have at least one number" ),
  confirmPassword:z.string()
})
 .refine(async (data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ['confirmPassword'],
  });