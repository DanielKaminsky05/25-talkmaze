"use server"
import { cookies } from 'next/headers';
import {createStudent} from '@/lib/profile-management/addProfile'
import { time_zone } from './page';
import { createClient } from '@/utils/supabase/server';
import { TeachworksStudent } from '@/lib/teachworks/types';
import { NextResponse } from 'next/server';
export async function handleStudentCreation(firstName: string, lastName: string, email: string, birth_date: string, home_phone: string, mobile_phone: string, school: string, grade: number,additional_notes: string, time_zone: time_zone, pin: string){
    const cookieStore = await cookies();
    console.log("Inside handleStudentCreation")

    const supabase = createClient();
    const account_id = cookieStore.get('account_id')?.value;
    
    
    if(!account_id){
        return new Error("Account ID is missing");
    }

    const tw_id_res = (await supabase).from('account').select('tw_customer_id').eq('id', account_id).single();
    const tw_id = (await tw_id_res).data?.tw_customer_id;
    console.log("id: " + tw_id);
    const student_obj = {
        student: {
            customer_id: tw_id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            home_phone: home_phone,
            mobile_phone: mobile_phone,
            birth_date: birth_date,
            school: school,
            grade: grade,
            additional_notes: additional_notes,
            time_zone: null
        }
       

    }

    const result = await createStudent(student_obj);
   
    //now write the student to supabase
    console.log("Result: " + JSON.stringify(result));
    const {data, error} = await (await supabase).from('students').insert({
        account_id: account_id,
        tw_id: JSON.stringify(result.id),
        name: firstName + " " + lastName,
        profile_access_pin: pin
    });

    if(error){
        return NextResponse.json({status: 500, message: "Error inserting into supabase"})
    }

}