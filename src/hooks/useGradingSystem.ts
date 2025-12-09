import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GradingSystem {
  id: string;
  name: string;
  description: string | null;
  written_work_percentage: number;
  performance_task_percentage: number;
  quarterly_assessment_percentage: number;
}

interface UseGradingSystemResult {
  gradingSystem: GradingSystem | null;
  loading: boolean;
  error: string | null;
  refreshGradingSystem: () => Promise<void>;
  // Calculated values based on grading system
  writtenWorkWeight: number;
  performanceTaskWeight: number;
  quarterlyAssessmentWeight: number;
}

export const useGradingSystem = (): UseGradingSystemResult => {
  const [gradingSystem, setGradingSystem] = useState<GradingSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveGradingSystem = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the database function to get active grading system
      const { data, error: fetchError } = await supabase.rpc('get_active_grading_system');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setGradingSystem(data[0]);
      } else {
        // Fallback to direct query if function fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("grading_systems")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .single();

        if (fallbackError) {
          // If no active system found, use default DepEd K-12 values
          console.warn("No active grading system found, using defaults");
          setGradingSystem({
            id: "default",
            name: "DepEd K-12 Default",
            description: "Default grading system (fallback)",
            written_work_percentage: 25,
            performance_task_percentage: 50,
            quarterly_assessment_percentage: 25,
          });
        } else {
          setGradingSystem(fallbackData);
        }
      }
    } catch (err: any) {
      console.error("Error fetching grading system:", err);
      setError(err.message);

      // Fallback to default values on error
      setGradingSystem({
        id: "default",
        name: "DepEd K-12 Default",
        description: "Default grading system (fallback)",
        written_work_percentage: 25,
        performance_task_percentage: 50,
        quarterly_assessment_percentage: 25,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveGradingSystem();
  }, []);

  // Calculate weights as decimals for calculations
  const writtenWorkWeight = gradingSystem ? gradingSystem.written_work_percentage / 100 : 0.25;
  const performanceTaskWeight = gradingSystem ? gradingSystem.performance_task_percentage / 100 : 0.50;
  const quarterlyAssessmentWeight = gradingSystem ? gradingSystem.quarterly_assessment_percentage / 100 : 0.25;

  return {
    gradingSystem,
    loading,
    error,
    refreshGradingSystem: fetchActiveGradingSystem,
    writtenWorkWeight,
    performanceTaskWeight,
    quarterlyAssessmentWeight,
  };
};

// Utility function to calculate final grade using active grading system
export const calculateFinalGradeWithSystem = (
  writtenWork: number | null,
  performanceTask: number | null,
  quarterlyAssessment: number | null,
  gradingSystem?: GradingSystem | null
): number => {
  const ww = writtenWork || 0;
  const pt = performanceTask || 0;
  const qa = quarterlyAssessment || 0;

  // Use provided grading system or fallback to default percentages
  const wwWeight = gradingSystem ? gradingSystem.written_work_percentage / 100 : 0.25;
  const ptWeight = gradingSystem ? gradingSystem.performance_task_percentage / 100 : 0.50;
  const qaWeight = gradingSystem ? gradingSystem.quarterly_assessment_percentage / 100 : 0.25;

  return Math.round(((ww * wwWeight) + (pt * ptWeight) + (qa * qaWeight)) * 100) / 100;
};

// Utility function to get grade remarks
export const getGradeRemarks = (grade: number): string => {
  if (grade >= 90) return "Outstanding";
  if (grade >= 85) return "Very Satisfactory";
  if (grade >= 80) return "Satisfactory";
  if (grade >= 75) return "Fairly Satisfactory";
  return "Did Not Meet Expectations";
};