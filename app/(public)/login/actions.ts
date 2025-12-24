

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

//Log in function
export const logInUser = async(email: string, password: string) => {
   
    try{
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })

        if(error){
            return {success: false,error}
        }
        return {success: true, error}
    }catch(e){
        console.error("There was a problem logging in: ", e)
        
    }
    
}