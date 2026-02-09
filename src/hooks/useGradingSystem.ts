import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GradeScaleRange {
  min: number;
  max: number;
  label: string;
}

interface GradingSystem {
  id: string;
  name: string;
  description: string | null;
  written_work_percentage: number;
  performance_task_percentage: number;
  quarterly_assessment_percentage: number;
  grade_scale: GradeScaleRange[];
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

export const useGradingSystem = (advisorId?: string | null): UseGradingSystemResult => {
  const [gradingSystem, setGradingSystem] = useState<GradingSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveGradingSystem = async () => {
    try {
      setLoading(true);
      setError(null);

      // If advisor ID is provided, try to get their system first
      if (advisorId) {
        const { data: advisorSystem, error: advisorError } = await supabase
          .from("grading_systems")
          .select("*")
          .eq("advisor_id", advisorId)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!advisorError && advisorSystem) {
          setGradingSystem(advisorSystem);
          setLoading(false);
          return;
        }
      }

      // Otherwise get the global system
      const { data: globalSystem, error: globalError } = await supabase
        .from("grading_systems")
        .select("*")
        .is("advisor_id", null)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!globalError && globalSystem) {
        setGradingSystem(globalSystem);
      } else {
        // Fallback to default values
        console.warn("No active grading system found, using defaults");
        setGradingSystem({
          id: "default",
          name: "DepEd K-12 Default",
          description: "Default grading system (fallback)",
          written_work_percentage: 25,
          performance_task_percentage: 50,
          quarterly_assessment_percentage: 25,
          grade_scale: [
            { min: 90, max: 100, label: "Outstanding" },
            { min: 85, max: 89, label: "Very Satisfactory" },
            { min: 80, max: 84, label: "Satisfactory" },
            { min: 75, max: 79, label: "Fairly Satisfactory" },
            { min: 0, max: 74, label: "Did Not Meet Expectations" },
          ],
        });
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
        grade_scale: [
          { min: 90, max: 100, label: "Outstanding" },
          { min: 85, max: 89, label: "Very Satisfactory" },
          { min: 80, max: 84, label: "Satisfactory" },
          { min: 75, max: 79, label: "Fairly Satisfactory" },
          { min: 0, max: 74, label: "Did Not Meet Expectations" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveGradingSystem();
  }, [advisorId]);

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

// Utility function to get grade remarks using custom grade scale
export const getGradeRemarksWithScale = (grade: number, gradeScale?: GradeScaleRange[]): string => {
  if (!gradeScale || gradeScale.length === 0) {
    // Use default scale
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  }

  // Find matching range in custom scale
  for (const range of gradeScale) {
    if (grade >= range.min && grade <= range.max) {
      return range.label;
    }
  }

  return "Not Graded";
};

// Legacy function for backward compatibility
export const getGradeRemarks = (grade: number): string => {
  return getGradeRemarksWithScale(grade);
};