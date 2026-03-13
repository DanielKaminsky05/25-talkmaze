"use server"
import { cookies } from 'next/headers';
import {createStudent,student} from '@/lib/profile-management/addProfile'

export async function handleStudentCreation(firstName: string, lastName: string, date:Date){
    const cookieStore = await cookies();
    
    const response = await createStudent(firstName, lastName, date);
    
}