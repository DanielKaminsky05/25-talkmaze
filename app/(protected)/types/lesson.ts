export interface Appointment {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    description?: string;
    student_id?: string;
    studentName: string;
    coachName?: string;
    status?: string;
}
