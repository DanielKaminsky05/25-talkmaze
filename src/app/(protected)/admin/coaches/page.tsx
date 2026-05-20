"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/services/supabase/client";
import type { EventInput } from "@fullcalendar/core";

import CoachListItem from "./_components/CoachListItem";
import EmptyDetail from "../_components/EmptyDetail";
import AdminCalendar from "../_components/AdminCalendar";
import Pagination from "../_components/Pagination";
import EmployeeDetailModal from "./_components/EmployeeDetailModal";
import CreateCoachModal from "./_components/CreateCoachModal";
import type { Coach } from "../_types";
import { useAdminMobileDetail } from "../_context/AdminMobileDetailContext";

const ITEMS_PER_PAGE = 15;

const inputClass =
  "w-full bg-[#1F2E3B] border border-white/8 text-white placeholder:text-white/25 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#B1E7D6]/40 transition-colors";

function parseAvailabilityTime(val: string | null | undefined): string {
  if (!val) return "";
  if (/^\d{2}:\d{2}/.test(val)) return val.slice(0, 5);
  if (val.length > 10) return val.slice(11, 16);
  return "";
}

export default function CoachesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCoachId = searchParams.get("id");
  const { setHasDetail } = useAdminMobileDetail();

  const [employees, setEmployees] = useState<Coach[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [isCreateCoachModalOpen, setIsCreateCoachModalOpen] = useState(false);
  const [coachEvents, setCoachEvents] = useState<EventInput[]>([]);
  const [coachEventsLoading, setCoachEventsLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const res = await fetch("/api/admin/employees");
      if (!res.ok) throw new Error();
      const body = await res.json();
      setEmployees(Array.isArray(body?.employees) ? body.employees : []);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedCoachId) ?? null,
    [employees, selectedCoachId],
  );

  useEffect(() => {
    setHasDetail(!!selectedCoachId);
    return () => setHasDetail(false);
  }, [selectedCoachId, setHasDetail]);

  useEffect(() => {
    if (!selectedEmployee) {
      setCoachEvents([]);
      return;
    }
    setCoachEventsLoading(true);
    const supabase = createClient();

    Promise.all([
      supabase
        .from("coach_availabilities")
        .select("weekday, start_time, end_time, start_time_new, end_time_new")
        .eq("coach_id", selectedEmployee.id),
      supabase
        .from("sessions")
        .select(
          "id, start_time, end_time, student_id, students(first_name, last_name)",
        )
        .eq("coach_id", selectedEmployee.id),
    ]).then(([{ data: availability }, { data: sessions }]) => {
      const availabilityEvents: EventInput[] = (availability ?? [])
        .map((s) => {
          const start = parseAvailabilityTime(s.start_time_new ?? s.start_time);
          const end = parseAvailabilityTime(s.end_time_new ?? s.end_time);
          if (!start || !end) return null;
          return {
            daysOfWeek: [s.weekday ?? 0],
            startTime: start,
            endTime: end,
            title: `${start} – ${end}`,
            backgroundColor: "#1e4535",
            borderColor: "#65CFAD",
            textColor: "#65CFAD",
          };
        })
        .filter(Boolean) as EventInput[];

      const sessionEvents: EventInput[] = (sessions ?? []).map((s: any) => {
        const student = s.students;
        const name = student
          ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
            "Session"
          : "Session";
        return {
          id: String(s.id),
          title: name,
          start: s.start_time,
          end: s.end_time ?? undefined,
          backgroundColor: "#B1E7D6",
          borderColor: "transparent",
          textColor: "#1F2E3B",
        };
      });

      setCoachEvents([...availabilityEvents, ...sessionEvents]);
      setCoachEventsLoading(false);
    });
  }, [selectedEmployee?.id]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSearch]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.account_id.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(
    () =>
      filteredEmployees.slice(
        (employeePage - 1) * ITEMS_PER_PAGE,
        employeePage * ITEMS_PER_PAGE,
      ),
    [filteredEmployees, employeePage],
  );

  if (employeesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#65CFAD] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* List panel */}
      <div
        className={`shrink-0 w-full md:w-72 lg:w-80 xl:w-[340px] bg-[#162330] border-r border-white/5 flex flex-col overflow-hidden
          ${selectedCoachId ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-3 border-b border-white/5 flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search coaches…"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={() => setIsCreateCoachModalOpen(true)}
            title="New Coach"
            className="shrink-0 w-10 h-10 bg-[#65CFAD] text-[#1F2E3B] rounded-xl flex items-center justify-center font-bold text-lg hover:bg-[#50bfa0] transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {paginatedEmployees.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-12">
              No coaches found
            </p>
          ) : (
            paginatedEmployees.map((e) => (
              <CoachListItem
                key={e.id}
                coach={e}
                isSelected={selectedCoachId === e.id}
                onClick={() => router.push(`?id=${e.id}`)}
              />
            ))
          )}
        </div>
        <div className="shrink-0 border-t border-white/5 px-3 py-2">
          <Pagination
            currentPage={employeePage}
            totalPages={totalPages}
            totalItems={filteredEmployees.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setEmployeePage}
          />
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={`flex-1 min-w-0 overflow-y-auto
          ${!selectedCoachId ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
      >
        {!selectedEmployee && <EmptyDetail />}
        {selectedEmployee && (
          <div className="p-4 md:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#65CFAD]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#65CFAD] text-2xl font-bold">
                    {selectedEmployee.first_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold leading-tight">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-white/35 text-xs mt-0.5 font-mono">
                    #{selectedEmployee.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(true)}
                className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-[#1F2E3B] bg-[#65CFAD] hover:bg-[#50bfa0] rounded-xl transition-colors"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Account ID",
                  value: selectedEmployee.account_id.slice(0, 16) + "…",
                },
                {
                  label: "Joined",
                  value: selectedEmployee.created_at
                    ? new Date(selectedEmployee.created_at).toLocaleDateString()
                    : "—",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-[#1F2E3B] rounded-xl p-3 border border-white/5"
                >
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="text-white/70 text-sm font-semibold truncate">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#1e4535] border border-[#65CFAD]" />
                <span className="text-white/40 text-xs">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#B1E7D6]" />
                <span className="text-white/40 text-xs">Booked</span>
              </div>
            </div>

            <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
              <AdminCalendar
                events={coachEvents}
                initialView="timeGridWeek"
                loading={coachEventsLoading}
                offsetPx={360}
              />
            </div>
          </div>
        )}
      </div>

      {editingEmployee && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setEditingEmployee(false)}
          onUpdate={(updated) => {
            setEmployees((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e)),
            );
            setEditingEmployee(false);
          }}
        />
      )}
      <CreateCoachModal
        isOpen={isCreateCoachModalOpen}
        onClose={() => setIsCreateCoachModalOpen(false)}
        onSuccess={() => {
          fetchEmployees();
          setIsCreateCoachModalOpen(false);
        }}
      />
    </div>
  );
}
