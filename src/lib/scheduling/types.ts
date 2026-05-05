import type { TablesInsert } from "@/src/services/supabase/types/database";

export type SchedulingResult = {
	success: boolean;
	status: number;
	message?: string;
	error?: string;
};

export type BookedSlotForApproval = {
	id: string;
	coach_id: string;
	student_id: string;
	weekday: number;
	start_time: string;
	end_time: string;
	timezone: string;
	status: string;
	num_sessions: number | null;
	start_date: string | null;
};

export type GeneratedSession = TablesInsert<"sessions">;
