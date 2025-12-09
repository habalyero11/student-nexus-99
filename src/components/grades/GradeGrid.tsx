import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useGradingSystem, calculateFinalGradeWithSystem } from "@/hooks/useGradingSystem";
import Papa from "papaparse";
import { Save, Calculator, Filter, Download } from "lucide-react";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Row"];

interface AdvisorAssignment {
  year_level: string;
  section: string;
  strand?: string;
  subjects?: string[];
}

interface GradeGridProps {
  selectedYearLevel: string;
  selectedSection: string;
  selectedQuarter: string;
  selectedSubject: string;
  userRole?: string;
  advisorAssignments?: AdvisorAssignment[];
}

interface GridGrade {
  studentId: string;
  subject: string;
  quarter: string;
  writtenWork: number | null;
  performanceTask: number | null;
  quarterlyAssessment: number | null;
  finalGrade: number | null;
  gradeId?: string;
  isModified?: boolean;
}

interface EditingCell {
  studentId: string;
  subject: string;
  component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment';
}

const GradeGrid = ({ selectedYearLevel, selectedSection, selectedQuarter, selectedSubject, userRole, advisorAssignments }: GradeGridProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, GridGrade>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { gradingSystem, writtenWorkWeight, performanceTaskWeight, quarterlyAssessmentWeight } = useGradingSystem();

  // School-specific curriculum subjects by grade level
  const getSubjectsByGradeLevel = (yearLevel: string) => {
    const subjectsByLevel = {
      "7": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"],
      "8": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"],
      "9": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"],
      "10": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"],
      "11": [
        "Oral Communication", "Introduction to the Philosophy of the Human Person", "Empowerment Technology",
        "P.E -1", "Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino", "General Mathematics",
        "Pre-calculus", "Earth Science", "Reading and Writing", "Disaster Readiness and Risk Reduction",
        "Media and Information Literacy", "P.E -2", "Pagbasa at Pagsusuri sa Ibat Ibang Teksto",
        "Statistics and Probability", "Basic Calculus", "Practical Research 1", "General Chemistry 1"
      ],
      "12": [
        "Oral Communication", "Reading and Writing", "General Mathematics", "Statistics and Probability",
        "Earth and Life Science", "Physical Science", "Research", "Filipino sa Piling Larangan"
      ]
    };
    return subjectsByLevel[yearLevel as keyof typeof subjectsByLevel] || [];
  };

  // Get subjects filtered by advisor assignments
  const getAvailableSubjects = (yearLevel: string) => {
    let subjects = getSubjectsByGradeLevel(yearLevel);

    // If advisor, filter subjects based on assignments for the current year level
    if (userRole === "advisor" && advisorAssignments) {
      const assignedSubjectsForYearLevel = new Set<string>();

      // Only collect subjects assigned to this advisor for the current year level
      advisorAssignments
        .filter(assignment => assignment.year_level === yearLevel)
        .forEach(assignment => {
          if (assignment.subjects) {
            assignment.subjects.forEach(subject => assignedSubjectsForYearLevel.add(subject));
          }
        });

      // Filter subjects to only show those assigned for this specific year level
      if (assignedSubjectsForYearLevel.size > 0) {
        subjects = subjects.filter(subject => assignedSubjectsForYearLevel.has(subject));
      } else {
        // No subjects assigned for this year level
        subjects = [];
      }
    }

    return subjects;
  };

  useEffect(() => {
    if (selectedYearLevel && selectedSection) {
      // For advisors, wait until assignments are loaded
      if (userRole === "advisor" && (!advisorAssignments || advisorAssignments.length === 0)) {
        return;
      }
      fetchData();
    }
  }, [selectedYearLevel, selectedSection, selectedQuarter, userRole, advisorAssignments]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students for the selected year level and section
      let { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("year_level", selectedYearLevel)
        .eq("section", selectedSection)
        .order("last_name", { ascending: true });

      if (studentsError) throw studentsError;

      // For advisors, filter students based on their assignments
      if (userRole === "advisor" && advisorAssignments) {
        studentsData = studentsData?.filter(student => {
          return advisorAssignments.some(assignment => {
            const matchesYearLevel = student.year_level === assignment.year_level;
            const matchesSection = student.section === assignment.section;

            // For Grade 11-12 students, check strand if assignment has strand
            if (student.year_level === "11" || student.year_level === "12") {
              if (assignment.strand) {
                const matchesStrand = student.strand === assignment.strand;
                return matchesYearLevel && matchesSection && matchesStrand;
              } else {
                // Assignment doesn't specify strand, but student is 11-12, still match on year/section
                return matchesYearLevel && matchesSection;
              }
            } else {
              // For Grade 7-10, ignore strand completely
              return matchesYearLevel && matchesSection;
            }
          });
        }) || [];
      }

      // Fetch grades for these students and the selected quarter
      const studentIds = studentsData?.map(s => s.id) || [];
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .in("student_id", studentIds)
        .eq("quarter", selectedQuarter);

      if (gradesError) throw gradesError;

      // Set students and subjects
      setStudents(studentsData || []);
      setSubjects(getAvailableSubjects(selectedYearLevel));

      // Process grades into grid format
      const gradeMap: Record<string, GridGrade> = {};

      // Initialize grid with empty grades for all student-subject combinations
      const allSubjects = selectedSubject === 'all'
        ? getAvailableSubjects(selectedYearLevel)
        : [selectedSubject];

      studentsData?.forEach(student => {
        allSubjects.forEach(subject => {
          const key = `${student.id}-${subject}`;
          gradeMap[key] = {
            studentId: student.id,
            subject,
            quarter: selectedQuarter,
            writtenWork: null,
            performanceTask: null,
            quarterlyAssessment: null,
            finalGrade: null,
          };
        });
      });

      // Fill in existing grades
      gradesData?.forEach(grade => {
        if (selectedSubject === 'all' || grade.subject === selectedSubject) {
          const key = `${grade.student_id}-${grade.subject}`;
          gradeMap[key] = {
            studentId: grade.student_id,
            subject: grade.subject,
            quarter: grade.quarter,
            writtenWork: grade.written_work,
            performanceTask: grade.performance_task,
            quarterlyAssessment: grade.quarterly_assessment,
            finalGrade: grade.final_grade,
            gradeId: grade.id,
          };
        }
      });

      setGrades(gradeMap);
      setPendingChanges(new Set());

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch data: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalGrade = (writtenWork: number | null, performanceTask: number | null, quarterlyAssessment: number | null): number => {
    return calculateFinalGradeWithSystem(writtenWork, performanceTask, quarterlyAssessment, gradingSystem);
  };

  const updateGrade = (studentId: string, subject: string, component: keyof GridGrade, value: number | null) => {
    const key = `${studentId}-${subject}`;
    const currentGrade = grades[key];

    const updatedGrade = {
      ...currentGrade,
      [component]: value,
      isModified: true,
    };

    // Recalculate final grade if updating grade components
    if (['writtenWork', 'performanceTask', 'quarterlyAssessment'].includes(component)) {
      updatedGrade.finalGrade = calculateFinalGrade(
        component === 'writtenWork' ? value : updatedGrade.writtenWork,
        component === 'performanceTask' ? value : updatedGrade.performanceTask,
        component === 'quarterlyAssessment' ? value : updatedGrade.quarterlyAssessment
      );
    }

    setGrades(prev => ({
      ...prev,
      [key]: updatedGrade,
    }));

    setPendingChanges(prev => new Set([...prev, key]));
  };

  const handleCellClick = (studentId: string, subject: string, component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment') => {
    setEditingCell({ studentId, subject, component });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, subject: string, component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment') => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();

      // Move to next cell
      const components: ('writtenWork' | 'performanceTask' | 'quarterlyAssessment')[] = ['writtenWork', 'performanceTask', 'quarterlyAssessment'];
      const currentComponentIndex = components.indexOf(component);

      if (e.shiftKey) {
        // Move backward
        if (currentComponentIndex > 0) {
          setEditingCell({ studentId, subject, component: components[currentComponentIndex - 1] });
        } else {
          // Move to previous student, last component
          const currentStudentIndex = students.findIndex(s => s.id === studentId);
          if (currentStudentIndex > 0) {
            setEditingCell({
              studentId: students[currentStudentIndex - 1].id,
              subject,
              component: components[components.length - 1]
            });
          }
        }
      } else {
        // Move forward
        if (currentComponentIndex < components.length - 1) {
          setEditingCell({ studentId, subject, component: components[currentComponentIndex + 1] });
        } else {
          // Move to next student, first component
          const currentStudentIndex = students.findIndex(s => s.id === studentId);
          if (currentStudentIndex < students.length - 1) {
            setEditingCell({
              studentId: students[currentStudentIndex + 1].id,
              subject,
              component: components[0]
            });
          }
        }
      }

      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(pendingChanges).map(key => {
        const grade = grades[key];
        return {
          id: grade.gradeId,
          student_id: grade.studentId,
          subject: grade.subject,
          quarter: grade.quarter,
          written_work: grade.writtenWork,
          performance_task: grade.performanceTask,
          quarterly_assessment: grade.quarterlyAssessment,
          final_grade: grade.finalGrade,
          remarks: grade.finalGrade && grade.finalGrade >= 90 ? "Outstanding" :
                   grade.finalGrade && grade.finalGrade >= 85 ? "Very Satisfactory" :
                   grade.finalGrade && grade.finalGrade >= 80 ? "Satisfactory" :
                   grade.finalGrade && grade.finalGrade >= 75 ? "Fairly Satisfactory" :
                   "Did Not Meet Expectations",
        };
      });

      // Separate inserts and updates
      const inserts = updates.filter(update => !update.id).map(({ id, ...data }) => data);
      const updateOperations = updates.filter(update => update.id);

      // Handle inserts
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("grades")
          .insert(inserts);

        if (insertError) throw insertError;
      }

      // Handle updates
      for (const update of updateOperations) {
        const { id, ...data } = update;
        const { error: updateError } = await supabase
          .from("grades")
          .update(data)
          .eq("id", id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `Saved ${pendingChanges.size} grade changes`,
      });

      setPendingChanges(new Set());
      fetchData(); // Refresh to get latest data

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save changes: " + error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const getGradeColor = (grade: number | null): string => {
    if (!grade) return "";
    if (grade >= 90) return "text-green-600 bg-green-50";
    if (grade >= 85) return "text-blue-600 bg-blue-50";
    if (grade >= 80) return "text-yellow-600 bg-yellow-50";
    if (grade >= 75) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const exportGrades = () => {
    const displaySubjects = selectedSubject === 'all' ? subjects : [selectedSubject];
    const exportData: any[] = [];

    students.forEach(student => {
      displaySubjects.forEach(subject => {
        const key = `${student.id}-${subject}`;
        const grade = grades[key];

        // Include all students and subjects, even those without grades
        exportData.push({
          student_id_no: student.student_id_no,
          student_name: `${student.first_name} ${student.last_name}`,
          subject: subject,
          quarter: selectedQuarter,
          written_work: grade?.writtenWork || "",
          performance_task: grade?.performanceTask || "",
          quarterly_assessment: grade?.quarterlyAssessment || "",
          final_grade: grade?.finalGrade || "",
          remarks: grade?.finalGrade ? (
            grade.finalGrade >= 90 ? "Outstanding" :
            grade.finalGrade >= 85 ? "Very Satisfactory" :
            grade.finalGrade >= 80 ? "Satisfactory" :
            grade.finalGrade >= 75 ? "Fairly Satisfactory" :
            "Did Not Meet Expectations"
          ) : ""
        });
      });
    });

    if (exportData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Students to Export",
        description: "There are no students in the selected grade and section."
      });
      return;
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grades_${selectedYearLevel}_${selectedSection}_${selectedQuarter}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${exportData.length} student records to CSV file (including empty grades).`
    });
  };

  const getCellContent = (studentId: string, subject: string, component: 'writtenWork' | 'performanceTask' | 'quarterlyAssessment') => {
    const key = `${studentId}-${subject}`;
    const grade = grades[key];
    const isEditing = editingCell?.studentId === studentId && editingCell?.subject === subject && editingCell?.component === component;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={grade?.[component] || ""}
          onChange={(e) => updateGrade(studentId, subject, component, e.target.value ? parseFloat(e.target.value) : null)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => handleKeyDown(e, studentId, subject, component)}
          className="w-full text-center border-2 border-primary"
        />
      );
    }

    return (
      <div
        className={`w-full h-8 flex items-center justify-center cursor-pointer hover:bg-muted/50 rounded ${
          grade?.isModified ? 'bg-yellow-100 border border-yellow-300' : ''
        }`}
        onClick={() => handleCellClick(studentId, subject, component)}
      >
        {grade?.[component]?.toFixed(1) || "—"}
      </div>
    );
  };

  if (loading || (userRole === "advisor" && (!advisorAssignments || advisorAssignments.length === 0))) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">
          {userRole === "advisor" && (!advisorAssignments || advisorAssignments.length === 0)
            ? "Loading advisor assignments..."
            : "Loading grade data..."}
        </span>
      </div>
    );
  }

  const displaySubjects = selectedSubject === 'all' ? subjects : [selectedSubject];

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="space-y-4">
        {/* Save Button */}
        {pendingChanges.size > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-100">
                  {pendingChanges.size} unsaved changes
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Click cells to edit, use Tab/Enter to navigate
                </span>
              </div>
              <Button onClick={saveAllChanges} disabled={saving} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save All Changes"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Export Button */}
        <div className="flex justify-end">
          <Button onClick={exportGrades} variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Grades to CSV
          </Button>
        </div>
      </div>

      {/* Grade Grid */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left font-medium">Student</th>
              {displaySubjects.map(subject => (
                <th key={subject} className="border p-2 text-center font-medium" colSpan={4}>
                  {subject}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/50">
              <th className="border p-2"></th>
              {displaySubjects.map(subject => (
                <React.Fragment key={`${subject}-headers`}>
                  <th className="border p-1 text-xs">
                    WW ({gradingSystem?.written_work_percentage || 25}%)
                  </th>
                  <th className="border p-1 text-xs">
                    PT ({gradingSystem?.performance_task_percentage || 50}%)
                  </th>
                  <th className="border p-1 text-xs">
                    QA ({gradingSystem?.quarterly_assessment_percentage || 25}%)
                  </th>
                  <th className="border p-1 text-xs">Final</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="hover:bg-muted/30">
                <td className="border p-2 font-medium">
                  <div>
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {student.student_id_no}
                  </div>
                </td>
                {displaySubjects.map(subject => {
                  const key = `${student.id}-${subject}`;
                  const grade = grades[key];
                  return (
                    <React.Fragment key={`${key}-cells`}>
                      <td className="border p-1 w-20">
                        {getCellContent(student.id, subject, 'writtenWork')}
                      </td>
                      <td className="border p-1 w-20">
                        {getCellContent(student.id, subject, 'performanceTask')}
                      </td>
                      <td className="border p-1 w-20">
                        {getCellContent(student.id, subject, 'quarterlyAssessment')}
                      </td>
                      <td className={`border p-1 w-20 text-center font-medium ${getGradeColor(grade?.finalGrade)}`}>
                        {grade?.finalGrade?.toFixed(1) || "—"}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <h4 className="font-medium text-blue-800">How to use the Grade Grid:</h4>
            <ul className="text-blue-700 space-y-1 list-disc list-inside">
              <li>Click any grade cell to edit it</li>
              <li>Use Tab/Enter to move to next cell, Shift+Tab to move back</li>
              <li>Press Escape to cancel editing</li>
              <li>Final grades are calculated automatically</li>
              <li>Modified cells are highlighted in yellow</li>
              <li>Click "Save All Changes" to save your work</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeGrid;