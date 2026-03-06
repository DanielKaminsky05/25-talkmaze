"use server"


import { createClient } from "@/utils/supabase/server"

//Log in function
export const logInUser = async(email: string, password: string) => {

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })



    
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

