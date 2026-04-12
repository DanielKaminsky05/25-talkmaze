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
          role: number
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          awarding_rule: Json
          code: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          awarding_rule?: Json
          code: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          awarding_rule?: Json
          code?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_availabilities: {
        Row: {
          coach_id: string | null
          created_at: string
          end_time: string | null
          id: number
          start_time: string | null
          weekday: number | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
          start_time?: string | null
          weekday?: number | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
          start_time?: string | null
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
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
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
          created_at: string
          id: string
          recipient_id: string
          recipient_profile_id: string | null
          recipient_profile_type: string | null
          sender_id: string
          sender_profile_id: string | null
          sender_profile_type: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          recipient_profile_id?: string | null
          recipient_profile_type?: string | null
          sender_id: string
          sender_profile_id?: string | null
          sender_profile_type?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          recipient_profile_id?: string | null
          recipient_profile_type?: string | null
          sender_id?: string
          sender_profile_id?: string | null
          sender_profile_type?: string | null
          subject?: string | null
        }
        Relationships: []
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
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_lesson_id?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_lesson_id?: string | null
          id?: string
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
        ]
      }
      lesson_progress: {
        Row: {
          coach_notes: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          status: number
          student_id: string
          updated_at: string | null
        }
        Insert: {
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          status?: number
          student_id: string
          updated_at?: string | null
        }
        Update: {
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
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
      lessons: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          next_lesson: string | null
          order: number | null
          post_lesson_url: string | null
          pre_lesson_url: string | null
          prev_lesson: string | null
          slide_show_url: string | null
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
          order?: number | null
          post_lesson_url?: string | null
          pre_lesson_url?: string | null
          prev_lesson?: string | null
          slide_show_url?: string | null
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
          order?: number | null
          post_lesson_url?: string | null
          pre_lesson_url?: string | null
          prev_lesson?: string | null
          slide_show_url?: string | null
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
          name?: string
          renewal?: string
          stripe_price_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          coach_id: string | null
          created_at: string
          end_time: string | null
          id: number
          start_time: string | null
          student_id: string | null
          weekday: number | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
          start_time?: string | null
          student_id?: string | null
          weekday?: number | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: number
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
          id: number
          start_time: string | null
          student_id: string | null
          weekday: number | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: number
          start_time?: string | null
          student_id?: string | null
          weekday?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: number
          start_time?: string | null
          student_id?: string | null
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
          awarded_at: string
          badge_id: string
          badge_url: string | null
          student_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          badge_url?: string | null
          student_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          badge_url?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
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
      student_subscriptions: {
        Row: {
          account_id: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
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
        ]
      }
      students: {
        Row: {
          account_id: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          grade: string | null
          id: string
          last_name: string | null
          lesson_space_id: string | null
          lesson_space_student_link: string | null
          lesson_space_teacher_link: string | null
          location: string | null
          notes: string | null
          teach_works_url: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: string | null
          id?: string
          last_name?: string | null
          lesson_space_id?: string | null
          lesson_space_student_link?: string | null
          lesson_space_teacher_link?: string | null
          location?: string | null
          notes?: string | null
          teach_works_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          grade?: string | null
          id?: string
          last_name?: string | null
          lesson_space_id?: string | null
          lesson_space_student_link?: string | null
          lesson_space_teacher_link?: string | null
          location?: string | null
          notes?: string | null
          teach_works_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
