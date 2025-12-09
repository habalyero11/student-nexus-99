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
      advisor_assignments: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          section: string
          strand: Database["public"]["Enums"]["strand"] | null
          subjects: string[] | null
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          section: string
          strand?: Database["public"]["Enums"]["strand"] | null
          subjects?: string[] | null
          updated_at?: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          section?: string
          strand?: Database["public"]["Enums"]["strand"] | null
          subjects?: string[] | null
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "advisor_assignments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisors: {
        Row: {
          address: string | null
          age: number | null
          birth_date: string | null
          birth_place: string | null
          civil_status: Database["public"]["Enums"]["civil_status"] | null
          contact_number: string | null
          created_at: string
          employee_no: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          position: string | null
          profile_id: string
          religion: string | null
          tribe: string | null
          updated_at: string
          years_of_service: number | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          civil_status?: Database["public"]["Enums"]["civil_status"] | null
          contact_number?: string | null
          created_at?: string
          employee_no?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          position?: string | null
          profile_id: string
          religion?: string | null
          tribe?: string | null
          updated_at?: string
          years_of_service?: number | null
        }
        Update: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          civil_status?: Database["public"]["Enums"]["civil_status"] | null
          contact_number?: string | null
          created_at?: string
          employee_no?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          position?: string | null
          profile_id?: string
          religion?: string | null
          tribe?: string | null
          updated_at?: string
          years_of_service?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          remarks: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          remarks?: string | null
          status: string
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          remarks?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "advisor_at_risk_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "at_risk_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_grade_summary"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_performance_trends"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          final_grade: number | null
          id: string
          performance_task: number | null
          quarter: Database["public"]["Enums"]["quarter"]
          quarterly_assessment: number | null
          remarks: string | null
          student_id: string
          subject: string
          updated_at: string
          written_work: number | null
        }
        Insert: {
          created_at?: string
          final_grade?: number | null
          id?: string
          performance_task?: number | null
          quarter: Database["public"]["Enums"]["quarter"]
          quarterly_assessment?: number | null
          remarks?: string | null
          student_id: string
          subject: string
          updated_at?: string
          written_work?: number | null
        }
        Update: {
          created_at?: string
          final_grade?: number | null
          id?: string
          performance_task?: number | null
          quarter?: Database["public"]["Enums"]["quarter"]
          quarterly_assessment?: number | null
          remarks?: string | null
          student_id?: string
          subject?: string
          updated_at?: string
          written_work?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "advisor_at_risk_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "at_risk_students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_grade_summary"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_performance_trends"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          middle_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          advisor_id: string | null
          age: number | null
          birth_date: string | null
          birth_place: string | null
          contact_number: string | null
          created_at: string
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          guardian_name: string | null
          id: string
          last_name: string
          middle_name: string | null
          parent_contact_no: string | null
          section: string
          strand: Database["public"]["Enums"]["strand"] | null
          student_id_no: string
          student_lrn: string
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          address?: string | null
          advisor_id?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          contact_number?: string | null
          created_at?: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          guardian_name?: string | null
          id?: string
          last_name: string
          middle_name?: string | null
          parent_contact_no?: string | null
          section: string
          strand?: Database["public"]["Enums"]["strand"] | null
          student_id_no: string
          student_lrn: string
          updated_at?: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          address?: string | null
          advisor_id?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          contact_number?: string | null
          created_at?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          guardian_name?: string | null
          id?: string
          last_name?: string
          middle_name?: string | null
          parent_contact_no?: string | null
          section?: string
          strand?: Database["public"]["Enums"]["strand"] | null
          student_id_no?: string
          student_lrn?: string
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "students_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          grade_level: Database["public"]["Enums"]["year_level"]
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_level: Database["public"]["Enums"]["year_level"]
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_level?: Database["public"]["Enums"]["year_level"]
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_subjects_by_grade: {
        Row: {
          grade_level: Database["public"]["Enums"]["year_level"] | null
          subject_count: number | null
          subjects: string[] | null
        }
        Relationships: []
      }
      advisor_assignments_detailed: {
        Row: {
          advisor_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          profile_id: string | null
          school_level: string | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          subject: string | null
          subjects: string[] | null
          updated_at: string | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_assignments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_at_risk_students: {
        Row: {
          absent_days: number | null
          advisor_id: string | null
          advisor_profile_id: string | null
          advisor_subjects: string[] | null
          attendance_rate: number | null
          completed_grades: number | null
          failing_grades: number | null
          overall_average: number | null
          present_days: number | null
          primary_concern: string | null
          q1_average: number | null
          q1_to_q2_trend: string | null
          q2_average: number | null
          q3_average: number | null
          q4_average: number | null
          recommended_action: string | null
          risk_level: string | null
          risk_score: number | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          student_id: string | null
          student_id_no: string | null
          student_lrn: string | null
          student_name: string | null
          total_attendance_days: number | null
          total_grades: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_assignments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["advisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_grade_analytics: {
        Row: {
          advisor_profile_id: string | null
          average_grade: number | null
          fairly_satisfactory_count: number | null
          incomplete_count: number | null
          needs_improvement_count: number | null
          outstanding_count: number | null
          satisfactory_count: number | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          subject: string | null
          total_grades: number | null
          total_students: number | null
          very_satisfactory_count: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["advisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_section_performance: {
        Row: {
          advisor_profile_id: string | null
          average_attendance_rate: number | null
          average_risk_score: number | null
          declining_students: number | null
          fairly_satisfactory_students: number | null
          high_risk_count: number | null
          improving_students: number | null
          low_risk_count: number | null
          medium_risk_count: number | null
          needs_improvement_students: number | null
          outstanding_students: number | null
          satisfactory_students: number | null
          section: string | null
          section_average_for_subjects: number | null
          section_health: string | null
          stable_students: number | null
          strand: Database["public"]["Enums"]["strand"] | null
          students_with_risk: number | null
          subjects: string[] | null
          total_students: number | null
          very_satisfactory_students: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "advisors_profile_id_fkey"
            columns: ["advisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      at_risk_students: {
        Row: {
          absent_days: number | null
          attendance_rate: number | null
          completed_grades: number | null
          failing_grades: number | null
          overall_average: number | null
          present_days: number | null
          primary_concern: string | null
          q1_average: number | null
          q1_to_q2_trend: string | null
          q2_average: number | null
          q3_average: number | null
          q4_average: number | null
          recommended_action: string | null
          risk_level: string | null
          risk_score: number | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          student_id: string | null
          student_id_no: string | null
          student_lrn: string | null
          student_name: string | null
          total_attendance_days: number | null
          total_grades: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      grades_readable: {
        Row: {
          date_recorded: string | null
          final_grade: number | null
          grade_id: string | null
          grade_status: string | null
          last_updated: string | null
          performance_task: number | null
          quarter: Database["public"]["Enums"]["quarter"] | null
          quarterly_assessment: number | null
          remarks: string | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          student_id_no: string | null
          student_lrn: string | null
          student_name: string | null
          subject: string | null
          written_work: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      section_performance_analytics: {
        Row: {
          average_attendance_rate: number | null
          average_risk_score: number | null
          declining_students: number | null
          fairly_satisfactory_students: number | null
          high_risk_count: number | null
          improving_students: number | null
          low_risk_count: number | null
          medium_risk_count: number | null
          needs_improvement_students: number | null
          outstanding_students: number | null
          satisfactory_students: number | null
          section: string | null
          section_average: number | null
          section_health: string | null
          stable_students: number | null
          strand: Database["public"]["Enums"]["strand"] | null
          students_with_risk: number | null
          total_students: number | null
          very_satisfactory_students: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      student_grade_summary: {
        Row: {
          academic_status: string | null
          completed_grades: number | null
          incomplete_grades: number | null
          overall_average: number | null
          q1_subjects: number | null
          q2_subjects: number | null
          q3_subjects: number | null
          q4_subjects: number | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          student_id: string | null
          student_id_no: string | null
          student_lrn: string | null
          student_name: string | null
          total_grades_recorded: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      student_performance_trends: {
        Row: {
          completed_grades: number | null
          failing_grades: number | null
          overall_average: number | null
          q1_average: number | null
          q1_to_q2_trend: string | null
          q2_average: number | null
          q3_average: number | null
          q4_average: number | null
          risk_level: string | null
          section: string | null
          strand: Database["public"]["Enums"]["strand"] | null
          student_id: string | null
          student_id_no: string | null
          student_lrn: string | null
          student_name: string | null
          total_grades: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      subject_performance_analysis: {
        Row: {
          avg_final_grade: number | null
          avg_performance_task: number | null
          avg_quarterly_assessment: number | null
          avg_written_work: number | null
          fairly_satisfactory_count: number | null
          graded_students: number | null
          needs_improvement_count: number | null
          outstanding_count: number | null
          quarter: Database["public"]["Enums"]["quarter"] | null
          satisfactory_count: number | null
          section: string | null
          subject: string | null
          total_students: number | null
          very_satisfactory_count: number | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: []
      }
      system_performance_analytics: {
        Row: {
          at_risk_percentage: number | null
          at_risk_students: number | null
          declining_students: number | null
          fairly_satisfactory_count: number | null
          high_risk_count: number | null
          improving_students: number | null
          low_risk_count: number | null
          medium_risk_count: number | null
          needs_improvement_count: number | null
          outstanding_count: number | null
          satisfactory_count: number | null
          system_average_attendance: number | null
          system_average_grade: number | null
          system_average_risk_score: number | null
          system_health: string | null
          total_students: number | null
          very_satisfactory_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_advisor_available_subjects: {
        Args: { advisor_profile_id: string }
        Returns: string[]
      }
      get_advisor_students_for_subjects: {
        Args: { advisor_profile_id: string; subject_filter?: string[] }
        Returns: {
          student_id: string
        }[]
      }
      get_subjects_for_grade: {
        Args: { target_grade_level: Database["public"]["Enums"]["year_level"] }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      civil_status: "single" | "married" | "widowed" | "separated" | "divorced"
      gender: "male" | "female"
      quarter: "1st" | "2nd" | "3rd" | "4th"
      strand: "humms" | "stem" | "gas" | "abm" | "ict"
      user_role: "admin" | "advisor"
      year_level: "7" | "8" | "9" | "10" | "11" | "12"
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
    Enums: {
      civil_status: ["single", "married", "widowed", "separated", "divorced"],
      gender: ["male", "female"],
      quarter: ["1st", "2nd", "3rd", "4th"],
      strand: ["humms", "stem", "gas", "abm", "ict"],
      user_role: ["admin", "advisor"],
      year_level: ["7", "8", "9", "10", "11", "12"],
    },
  },
} as const
