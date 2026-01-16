"use server"

import { createClient } from "@/utils/supabase/server"

//Log in function
export const logInUser = async(email: string, password: string) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
    })

    if(error){
        console.error("There was a problem logging in: ", error)
        return {success: false, error}
    }

    return {success: true, data}
}

async function signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
}

