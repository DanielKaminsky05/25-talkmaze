"use client";

import { TeachworksStudent } from "@/lib/teachworks/types";
import { useState,useEffect } from "react";
import { StringFormatParams } from "zod/v4/core";

export type Student = {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  lesson_space_id: string | null;
  profile_access_pin: string | null;
  teach_works_url: string | null;
  lesson_space_teacher_link: string | null;
  lesson_space_student_link: string | null;
  remaining_lessons: number | null;
};

export type Coach = {
    id: string,
    account_id: string,
    name: string,
    created_at: string,
    updated_at: string
}
interface StudentProps {
  
  courseId: string,
}

export default function AssignStudentDropDown({
 courseId
}: StudentProps) {
 
  

  const [students, setStudents] = useState<Student[] | null>(null);
  const[notEnrolledStudents, setNotEnrolledStudents] = useState<Student[] | undefined>([]);
  const[enrolledStudents , setEnrolledStudents] = useState<Student[] | undefined>([]);
  async function onStudentClick(student: Student){
   try{
    setNotEnrolledStudents(notEnrolledStudents?.filter(ne_student => ne_student.id != student.id))
    const response = await fetch("/api/admin/courses/assign", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body:JSON.stringify({
            studentId: student.id,
            courseId: courseId
        })
    })
   }catch(err){

   }

  }
  useEffect(() => {
  async function getStudents() {
    try {
      const response = await fetch("/api/admin/students");
      const data = await response.json();

      console.log("students response:", data);

      if (Array.isArray(data)) {
        setStudents(data);
      } else if (Array.isArray(data.data)) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }

      //get not assigned students

      const response1 = await fetch('/api/admin/assign');
      const data1 = await response1.json();
      console.log("Unassigned students: " + data1);

      if(Array.isArray(data1)){
        setNotEnrolledStudents(data1);
      }else if(Array.isArray(data1.data)){
        setNotEnrolledStudents(data1.data);
      }else{
        setNotEnrolledStudents([]);
      }

      if(notEnrolledStudents && students){
        setEnrolledStudents(students.filter(
        (student) =>
        !notEnrolledStudents.some((s) => s.id === student.id)))
      }
      
    } catch (err) {
      console.log("Error getting students");
    }
  }

  getStudents();
}, []);
  


  return (
    <div className="border border-gray-300 rounded bg-white shadow-sm max-h-40 overflow-y-auto">
    <h3>Not enrolled students</h3>
      {notEnrolledStudents&& notEnrolledStudents.map((student) => (
        <div
          key={student.id}
          onClick={() => onStudentClick(student)}
          className="px-3 py-2 text-xs text-gray-800 hover:bg-blue-100 cursor-pointer flex justify-between"
        >
          <span>
            {student.name}
          </span>
          <span className="text-gray-400">#{student.id}</span>
        </div>
      ))}

      <h3>Enrolled Students</h3>
       {enrolledStudents&& enrolledStudents.map((student) => (
        <div
          key={student.id}
          onClick={() => onStudentClick(student)}
          className="px-3 py-2 text-xs text-gray-800 hover:bg-blue-100 cursor-pointer flex justify-between"
        >
          <span>
            {student.name}
          </span>
          <span className="text-gray-400">#{student.id}</span>
        </div>
      ))}
    </div>
  );
}