export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account: {
        Row: {
          created_at: string
          email: string
          id: string
          new: boolean | null
          role: number
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          new?: boolean | null
          role: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          new?: boolean | null
          role?: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      booked_slots: {
        Row: {
          coach_id: string
          created_at: string
          end_time: string
          id: string
          num_sessions: number | null
          start_date: string | null
          start_time: string
          status: string
          student_id: string
          timezone: string
          weekday: number
        }
        Insert: {
          coach_id: string
          created_at?: string
          end_time: string
          id?: string
          num_sessions?: number | null
          start_date?: string | null
          start_time: string
          status: string
          student_id: string
          timezone: string
          weekday: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          end_time?: string
          id?: string
          num_sessions?: number | null
          start_date?: string | null
          start_time?: string
          status?: string
          student_id?: string
          timezone?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "booked_slots_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booked_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availabilities: {
        Row: {
          coach_id: string | null
          created_at: string
          end_time: string | null
          end_time_new: string | null
          id: number
          start_time: string | null
          start_time_new: string | null
          timezone: string | null
          weekday: number | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          end_time_new?: string | null
          id?: number
          start_time?: string | null
          start_time_new?: string | null
          timezone?: string | null
          weekday?: number | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          end_time_new?: string | null
          id?: number
          start_time?: string | null
          start_time_new?: string | null
          timezone?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_availabilities_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_students: {
        Row: {
          coach_id: string
          created_at: string
          student_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          student_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          account_id: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          coach_id: string
          coach_last_read_at: string | null
          created_at: string
          id: string
          profile_id: string
          profile_last_read_at: string | null
          profile_type: string
        }
        Insert: {
          coach_id: string
          coach_last_read_at?: string | null
          created_at?: string
          id?: string
          profile_id: string
          profile_last_read_at?: string | null
          profile_type: string
        }
        Update: {
          coach_id?: string
          coach_last_read_at?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          profile_last_read_at?: string | null
          profile_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignment: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          isActive: boolean | null
          progress: number | null
          student_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          isActive?: boolean | null
          progress?: number | null
          student_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          isActive?: boolean | null
          progress?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_assignment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          head_lesson_id: string | null
          id: string
          tail_lesson_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_lesson_id?: string | null
          id?: string
          tail_lesson_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_lesson_id?: string | null
          id?: string
          tail_lesson_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_head_lesson_id_fkey"
            columns: ["head_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_tail_lesson_id_fkey"
            columns: ["tail_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          coach_notes: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          improvement_feedback: string | null
          lesson_id: string
          positive_feedback: string | null
          status: number
          student_id: string
          updated_at: string | null
        }
        Insert: {
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          improvement_feedback?: string | null
          lesson_id: string
          positive_feedback?: string | null
          status?: number
          student_id: string
          updated_at?: string | null
        }
        Update: {
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          improvement_feedback?: string | null
          lesson_id?: string
          positive_feedback?: string | null
          status?: number
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_summaries: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          student_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_summaries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string | null
          id: string
          lesson_id: string
          student_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          lesson_id: string
          student_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string
          student_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          next_lesson: string | null
          prev_lesson: string | null
          slide_pptx_url: string | null
          slide_show_url: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          next_lesson?: string | null
          prev_lesson?: string | null
          slide_pptx_url?: string | null
          slide_show_url?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          next_lesson?: string | null
          prev_lesson?: string | null
          slide_pptx_url?: string | null
          slide_show_url?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          account_id: string
          avatar_url: string | null
          billing_email: string | null
          bio: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          phone_number: string | null
          profile_access_pin: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          billing_email?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          profile_access_pin?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          billing_email?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          profile_access_pin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cents: number
          classes: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          renewal: string
          stripe_price_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          cents: number
          classes: number
          created_at?: string | null
          currency: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          renewal: string
          stripe_price_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          cents?: number
          classes?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          renewal?: string
          stripe_price_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          coach_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          session_date: string
          session_id: number | null
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date: string
          session_id?: number | null
          status: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          session_id?: number | null
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          coach_id: string | null
          created_at: string
          end_time: string | null
          id: number
          requested_at: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          reschedule_status: string | null
          start_time: string | null
          student_id: string | null
          weekday: number | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
          requested_at?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          reschedule_status?: string | null
          start_time?: string | null
          student_id?: string | null
          weekday?: number | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
          requested_at?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          reschedule_status?: string | null
          start_time?: string | null
          student_id?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_availabilities: {
        Row: {
          created_at: string
          end_time: string | null
          end_time_new: string | null
          id: number
          start_time: string | null
          start_time_new: string | null
          student_id: string | null
          timezone: string | null
          weekday: number | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          end_time_new?: string | null
          id?: number
          start_time?: string | null
          start_time_new?: string | null
          student_id?: string | null
          timezone?: string | null
          weekday?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          end_time_new?: string | null
          id?: number
          start_time?: string | null
          start_time_new?: string | null
          student_id?: string | null
          timezone?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_availabilities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          awarded_at: string | null
          badge_id: string
          claimed_at: string | null
          student_id: string
        }
        Insert: {
          awarded_at?: string | null
          badge_id: string
          claimed_at?: string | null
          student_id: string
        }
        Update: {
          awarded_at?: string | null
          badge_id?: string
          claimed_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey1"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_id_fkey1"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subscriptions: {
        Row: {
          account_id: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          pending_created_at: string | null
          pending_effective_date: string | null
          pending_plan_id: string | null
          pending_stripe_schedule_id: string | null
          plan_id: string
          sessions_remaining: number | null
          status: string
          student_id: string
        }
        Insert: {
          account_id?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          pending_created_at?: string | null
          pending_effective_date?: string | null
          pending_plan_id?: string | null
          pending_stripe_schedule_id?: string | null
          plan_id?: string
          sessions_remaining?: number | null
          status: string
          student_id?: string
        }
        Update: {
          account_id?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          pending_created_at?: string | null
          pending_effective_date?: string | null
          pending_plan_id?: string | null
          pending_stripe_schedule_id?: string | null
          plan_id?: string
          sessions_remaining?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tokens: {
        Row: {
          awarded_at: string
          badge_url: string | null
          student_id: string
          token_id: string
        }
        Insert: {
          awarded_at?: string
          badge_url?: string | null
          student_id: string
          token_id: string
        }
        Update: {
          awarded_at?: string
          badge_url?: string | null
          student_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          account_id: string
          active_course_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          grade: string | null
          id: string
          is_setup_complete: boolean | null
          last_name: string | null
          lesson_space_id: string | null
          lesson_space_student_link: string | null
          lesson_space_teacher_link: string | null
          location: string | null
          notes: string | null
          post_lesson_days: number
          post_lesson_tasks_enabled: boolean
          teach_works_url: string | null
          updated_at: string
          webhook_room_id: string | null
        }
        Insert: {
          account_id: string
          active_course_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: string | null
          id?: string
          is_setup_complete?: boolean | null
          last_name?: string | null
          lesson_space_id?: string | null
          lesson_space_student_link?: string | null
          lesson_space_teacher_link?: string | null
          location?: string | null
          notes?: string | null
          post_lesson_days?: number
          post_lesson_tasks_enabled?: boolean
          teach_works_url?: string | null
          updated_at?: string
          webhook_room_id?: string | null
        }
        Update: {
          account_id?: string
          active_course_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: string | null
          id?: string
          is_setup_complete?: boolean | null
          last_name?: string | null
          lesson_space_id?: string | null
          lesson_space_student_link?: string | null
          lesson_space_teacher_link?: string | null
          location?: string | null
          notes?: string | null
          post_lesson_days?: number
          post_lesson_tasks_enabled?: boolean
          teach_works_url?: string | null
          updated_at?: string
          webhook_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_active_course_id_fkey"
            columns: ["active_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          lesson_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          lesson_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          lesson_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_unread_total: {
        Args: { p_profile_id: string; p_profile_type: string }
        Returns: number
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
