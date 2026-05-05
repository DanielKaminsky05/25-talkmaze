"use client";

import { useState, useRef, useEffect } from "react";
import { Assignment } from "@/src/lib/types/assignments";
import { Student, Coach } from "./AssignStudentDropDown";

interface CoachAssignmentCardProps {
  coach: Coach;
  assignedStudents: Assignment[];
  availableStudents: Student[];
  onAdd: (studentId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
}

export default function CoachAssignmentCard({
  coach,
  assignedStudents,
  availableStudents,
  onAdd,
  onRemove,
}: CoachAssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  const studentDisplayName = (s: Student) =>
    [s.first_name, s.last_name].filter(Boolean).join(" ") || `#${s.id}`;

  const filteredAvailable = availableStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      studentDisplayName(s).toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.account_id.toLowerCase().includes(q)
    );
  });

  const handleAdd = async (studentId: string) => {
    setLoadingStudentId(studentId);
    setIsDropdownOpen(false);
    setSearchQuery("");
    try {
      await onAdd(studentId);
    } finally {
      setLoadingStudentId(null);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setRemovingAssignmentId(assignmentId);
    try {
      await onRemove(assignmentId);
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  return (
    <div className={`rounded-xl border transition-colors ${isExpanded ? "bg-[#2B4257]/40 border-[#B1E7D6]/20" : "bg-[#2B4257]/20 border-white/5 hover:border-white/10"}`}>
      {/* Header row */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-[#B1E7D6]/50 flex-shrink-0 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-white truncate">
            {coach.first_name} {coach.last_name}
          </span>
        </div>
        <span
          className={`flex-shrink-0 ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            assignedStudents.length > 0
              ? "bg-[#B1E7D6]/10 text-[#B1E7D6]"
              : "bg-white/5 text-white/30"
          }`}
        >
          {assignedStudents.length} {assignedStudents.length === 1 ? "student" : "students"}
        </span>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3">
          {/* Assigned students list */}
          {assignedStudents.length === 0 ? (
            <p className="text-xs text-white/30 italic py-1">No students assigned yet.</p>
          ) : (
            <ul className="space-y-1">
              {assignedStudents.map((assignment) => {
                const isRemoving = removingAssignmentId === assignment.id;
                const studentName = assignment.students
                  ? [assignment.students.first_name, assignment.students.last_name].filter(Boolean).join(" ") || `Student #${assignment.student_id}`
                  : `Student #${assignment.student_id}`;
                return (
                  <li
                    key={assignment.id}
                    className={`flex items-center justify-between gap-2 py-1.5 px-3 rounded-lg transition-colors ${
                      isRemoving ? "opacity-40" : "bg-[#1F2E3B]/40 hover:bg-[#1F2E3B]/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">{studentName}</p>
                      {assignment.students?.account_id && (
                        <p className="text-xs text-white/35 font-mono truncate">{assignment.students.account_id}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(assignment.id)}
                      disabled={isRemoving}
                      title="Remove student"
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:cursor-not-allowed"
                    >
                      {isRemoving ? (
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add student dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              disabled={availableStudents.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-[#B1E7D6]/70 hover:text-[#B1E7D6] disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {availableStudents.length === 0 ? "All students assigned" : "Add student"}
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#1F2E3B] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-20 overflow-hidden">
                <div className="p-2 border-b border-white/5">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search students…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#2B4257] border border-white/10 text-white placeholder:text-white/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#B1E7D6]/50 transition-colors"
                  />
                </div>
                <ul className="max-h-44 overflow-y-auto py-1">
                  {filteredAvailable.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-white/30 italic">No matches</li>
                  ) : (
                    filteredAvailable.map((student) => {
                      const isAdding = loadingStudentId === student.id.toString();
                      return (
                        <li key={student.id}>
                          <button
                            onClick={() => handleAdd(student.id.toString())}
                            disabled={isAdding}
                            className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-[#B1E7D6]/10 hover:text-[#B1E7D6] transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{studentDisplayName(student)}</span>
                            {isAdding && (
                              <svg className="animate-spin w-3 h-3 flex-shrink-0 text-[#B1E7D6]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
