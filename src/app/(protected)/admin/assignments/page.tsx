"use client";

import { useEffect, useState } from "react";

import CoachAssignmentCard from "./CoachAssignmentCard";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";
import type { Assignment, Coach, Student } from "../_types";

export default function AssignmentsPage() {
  useDocumentTitle("Assignments");
  const [employees, setEmployees] = useState<Coach[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/employees").then((r) => r.json()),
      fetch("/api/admin/students").then((r) => r.json()),
      fetch("/api/admin/assignments").then((r) => r.json()),
    ])
      .then(([empData, stuData, asnData]) => {
        const empList = Array.isArray(empData?.employees)
          ? empData.employees
          : [];
        const stuList = Array.isArray(stuData?.students)
          ? stuData.students
          : [];
        const asnList = Array.isArray(asnData?.assignments)
          ? asnData.assignments
          : [];
        setEmployees(empList);
        setStudents(
          stuList.length
            ? stuList.map((s: any) => ({
                id: String(s.id),
                account_id: String(s.account_id),
                first_name: s.first_name ?? null,
                last_name: s.last_name ?? null,
                avatar_url: s.avatar_url ?? null,
                bio: s.bio ?? null,
                created_at: s.created_at ?? "",
                updated_at: s.updated_at ?? "",
                date_of_birth: s.date_of_birth ?? null,
                grade: s.grade ?? null,
                lesson_space_id: s.lesson_space_id ?? null,
                lesson_space_student_link: s.lesson_space_student_link ?? null,
                lesson_space_teacher_link: s.lesson_space_teacher_link ?? null,
                location: s.location ?? null,
                notes: s.notes ?? null,
                post_lesson_days: s.post_lesson_days ?? null,
                post_lesson_tasks_enabled: s.post_lesson_tasks_enabled ?? null,
                webhook_room_id: s.webhook_room_id ?? null,
              }))
            : [],
        );
        setAssignments(asnList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddAssignment = async (coachId: string, studentId: string) => {
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_id: coachId, student_id: studentId }),
    });
    if (!res.ok) {
      alert("Failed to add assignment");
      return;
    }
    const body = await res.json();
    if (body?.assignment) setAssignments((prev) => [...prev, body.assignment]);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to remove assignment");
      fetch("/api/admin/assignments")
        .then((r) => r.json())
        .then((body) =>
          setAssignments(
            Array.isArray(body?.assignments) ? body.assignments : [],
          ),
        );
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
      {employees.map((coach) => {
        const coachAssignments = assignments.filter(
          (a) => a.coach_id === coach.id.toString(),
        );
        const assignedIds = new Set(coachAssignments.map((a) => a.student_id));
        const availableStudents = students.filter(
          (s) => !assignedIds.has(s.id.toString()),
        );
        return (
          <CoachAssignmentCard
            key={coach.id}
            coach={coach}
            assignedStudents={coachAssignments}
            availableStudents={availableStudents}
            onAdd={(sId) => handleAddAssignment(coach.id.toString(), sId)}
            onRemove={handleRemoveAssignment}
          />
        );
      })}
    </div>
  );
}
