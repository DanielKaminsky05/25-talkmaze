<<<<<<< HEAD


import { createClient } from '@supabase/supabase-js'
=======
"use server"
>>>>>>> Signup/LogIn

import { createClient } from "@/utils/supabase/server"

//Log in function
export const logInUser = async(email: string, password: string) => {
<<<<<<< HEAD
   
    try{
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })
=======
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
    })
>>>>>>> Signup/LogIn

        if(error){
            return {success: false,error}
        }
        return {success: true, error}
    }catch(e){
        console.error("There was a problem logging in: ", e)
        
    }
<<<<<<< HEAD
    
}
=======

    return {success: true, data}
}

async function signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
}

>>>>>>> Signup/LogIn
