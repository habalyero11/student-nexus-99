import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Calculator, ChevronLeft, ChevronRight, Save, FileText, X } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import AutoSaveIndicator from "./AutoSaveIndicator";

type Grade = Database["public"]["Tables"]["grades"]["Insert"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface GradeWithStudent {
  id: string;
  students: Student;
  subject: string;
  quarter: Database["public"]["Enums"]["quarter"];
  written_work: number | null;
  performance_task: number | null;
  quarterly_assessment: number | null;
  final_grade: number | null;
  remarks: string | null;
}

interface EnhancedGradeFormProps {
  grade?: GradeWithStudent;
  students: Student[];
  onSuccess: () => void;
  onCancel: () => void;
  initialStudentId?: string;
}

const EnhancedGradeForm = ({ grade, students, onSuccess, onCancel, initialStudentId }: EnhancedGradeFormProps) => {
  const [formData, setFormData] = useState<Grade>({
    student_id: grade?.students.id || initialStudentId || (students.length === 1 ? students[0].id : ""),
    subject: grade?.subject || "",
    quarter: grade?.quarter || "1st",
    written_work: grade?.written_work || null,
    performance_task: grade?.performance_task || null,
    quarterly_assessment: grade?.quarterly_assessment || null,
    final_grade: grade?.final_grade || null,
    remarks: grade?.remarks || "",
  });

  const [calculatedGrade, setCalculatedGrade] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [advisorSubjects, setAdvisorSubjects] = useState<string[]>([]);
  const { toast } = useToast();

  // Auto-save functionality
  const autoSaveGrade = async (data: Grade) => {
    if (!data.student_id || !data.subject) return;

    try {
      // Auto-generate remarks based on final grade if not provided
      const remarks = getGradeRemarks(calculatedGrade);
      const finalData = {
        ...data,
        remarks: data.remarks || remarks.text,
        final_grade: calculatedGrade,
      };

      if (grade) {
        // Update existing grade
        const { error } = await supabase
          .from("grades")
          .update(finalData)
          .eq("id", grade.id);

        if (error) throw error;
      } else {
        // For new grades, save as draft first
        // Check for existing grade for same student, subject, and quarter
        const { data: existingGrade } = await supabase
          .from("grades")
          .select("id")
          .eq("student_id", data.student_id)
          .eq("subject", data.subject)
          .eq("quarter", data.quarter)
          .maybeSingle();

        if (!existingGrade) {
          // Create new grade
          const { error } = await supabase
            .from("grades")
            .insert([finalData]);

          if (error) throw error;
        }
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const {
    autoSaveStatus,
    saveNow: autoSaveNow,
    clearAutoSave,
    loadFromLocalStorage,
    clearLocalStorage
  } = useAutoSave({
    data: formData,
    onSave: autoSaveGrade,
    enabled: !!(formData.student_id && formData.subject && (formData.written_work || formData.performance_task || formData.quarterly_assessment)),
    storageKey: `grade-draft-${formData.student_id}-${formData.subject}-${formData.quarter}`
  });

  // Load draft from localStorage on component mount
  useEffect(() => {
    if (!grade) { // Only for new grades
      const draft = loadFromLocalStorage();
      if (draft && draft.student_id && draft.subject) {
        setFormData(draft);
        toast({
          title: "Draft Restored",
          description: "A saved draft was found and restored."
        });
      }
    }
  }, []);

  const quarters = [
    { value: "1st", label: "1st Quarter" },
    { value: "2nd", label: "2nd Quarter" },
    { value: "3rd", label: "3rd Quarter" },
    { value: "4th", label: "4th Quarter" },
  ];

  // School-specific curriculum subjects by grade level (from subjects.md)
  const getSubjectsByGradeLevel = (yearLevel: string) => {
    const subjectsByLevel = {
      // Junior High School (Grades 7-10)
      "7": [
        "Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"
      ],
      "8": [
        "Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"
      ],
      "9": [
        "Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"
      ],
      "10": [
        "Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"
      ],

      // Senior High School Grade 11 - Maxwell section (STEM track)
      "11": [
        // 1st Semester
        "Oral Communication",
        "Introduction to the Philosophy of the Human Person",
        "Empowerment Technology",
        "P.E -1",
        "Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino",
        "General Mathematics",
        "Pre-calculus",
        "Earth Science",
        // 2nd Semester
        "Reading and Writing",
        "Disaster Readiness and Risk Reduction",
        "Media and Information Literacy",
        "P.E -2",
        "Pagbasa at Pagsusuri sa Ibat Ibang Teksto",
        "Statistics and Probability",
        "Basic Calculus",
        "Practical Research 1",
        "General Chemistry 1"
      ],

      // Grade 12 subjects (placeholder - subjects.md only specifies Grade 11)
      "12": [
        "Oral Communication", "Reading and Writing", "General Mathematics", "Statistics and Probability",
        "Earth and Life Science", "Physical Science", "Research", "Filipino sa Piling Larangan"
      ]
    };

    return subjectsByLevel[yearLevel as keyof typeof subjectsByLevel] || [];
  };

  // Find current student index when component loads
  useEffect(() => {
    if (formData.student_id) {
      const index = students.findIndex(s => s.id === formData.student_id);
      if (index !== -1) {
        setCurrentStudentIndex(index);
      }
    }
  }, [formData.student_id, students]);

  useEffect(() => {
    calculateFinalGrade();
  }, [formData.written_work, formData.performance_task, formData.quarterly_assessment]);

  // Fetch user role and available subjects for advisors
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);

          // If user is an advisor, get their available subjects
          if (profile.role === "advisor") {
            try {
              const { data: subjects, error } = await supabase.rpc('get_advisor_available_subjects', {
                advisor_profile_id: profile.id
              });

              if (error) {
                console.warn("RPC function get_advisor_available_subjects not available:", error.message);
                // Fallback: use all subjects for the advisor's assigned sections
                setAdvisorSubjects([]);
              } else if (subjects) {
                setAdvisorSubjects(subjects);
              }
            } catch (rpcError) {
              console.warn("Failed to call get_advisor_available_subjects, using fallback:", rpcError);
              setAdvisorSubjects([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const calculateFinalGrade = () => {
    const writtenWork = formData.written_work || 0;
    const performanceTask = formData.performance_task || 0;
    const quarterlyAssessment = formData.quarterly_assessment || 0;

    // DepEd K-12 Grading System weights:
    // Written Work: 25%, Performance Task: 50%, Quarterly Assessment: 25%
    const final = (writtenWork * 0.25) + (performanceTask * 0.50) + (quarterlyAssessment * 0.25);
    const rounded = Math.round(final * 100) / 100;

    setCalculatedGrade(rounded);
    setFormData(prev => ({ ...prev, final_grade: rounded }));
  };

  const getGradeRemarks = (grade: number): { text: string; color: string } => {
    if (grade >= 90) return { text: "Outstanding", color: "bg-green-500" };
    if (grade >= 85) return { text: "Very Satisfactory", color: "bg-blue-500" };
    if (grade >= 80) return { text: "Satisfactory", color: "bg-yellow-500" };
    if (grade >= 75) return { text: "Fairly Satisfactory", color: "bg-orange-500" };
    return { text: "Did Not Meet Expectations", color: "bg-red-500" };
  };

  const handleInputChange = (field: keyof Grade, value: any) => {
    setFormData(prev => {
      // If student changes, reset subject since available subjects might change
      if (field === "student_id") {
        const newIndex = students.findIndex(s => s.id === value);
        if (newIndex !== -1) {
          setCurrentStudentIndex(newIndex);
        }
        return { ...prev, [field]: value, subject: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  // Get available subjects for the selected student (filtered by advisor assignments for advisors)
  const getAvailableSubjects = () => {
    const selectedStudent = students.find(s => s.id === formData.student_id);
    if (!selectedStudent) return [];

    const coreSubjects = getSubjectsByGradeLevel(selectedStudent.year_level);

    // For advisors, filter subjects by their assignments
    if (userRole === "advisor" && advisorSubjects.length > 0) {
      return coreSubjects.filter(subject => advisorSubjects.includes(subject)).sort();
    }

    // For admins, show all subjects for the grade level
    return coreSubjects.sort();
  };

  const navigateStudent = (direction: 'previous' | 'next') => {
    const newIndex = direction === 'previous'
      ? Math.max(0, currentStudentIndex - 1)
      : Math.min(students.length - 1, currentStudentIndex + 1);

    const newStudent = students[newIndex];
    if (newStudent) {
      setCurrentStudentIndex(newIndex);
      setFormData(prev => ({
        ...prev,
        student_id: newStudent.id,
        subject: "", // Reset subject when changing student
        written_work: null,
        performance_task: null,
        quarterly_assessment: null,
        final_grade: null,
        remarks: ""
      }));
    }
  };

  const handleSubmit = async (saveType: 'save' | 'draft') => {
    if (!formData.student_id || !formData.subject) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a student and enter a subject.",
      });
      return;
    }

    setLoading(true);
    setIsDraft(saveType === 'draft');

    try {
      // Auto-generate remarks based on final grade if not provided
      const remarks = getGradeRemarks(calculatedGrade);
      const finalData = {
        ...formData,
        remarks: formData.remarks || remarks.text,
        final_grade: calculatedGrade,
      };

      if (grade) {
        // Update existing grade
        const { error } = await supabase
          .from("grades")
          .update(finalData)
          .eq("id", grade.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Grade updated successfully",
        });
      } else {
        // Check for existing grade for same student, subject, and quarter
        const { data: existingGrade } = await supabase
          .from("grades")
          .select("id")
          .eq("student_id", formData.student_id)
          .eq("subject", formData.subject)
          .eq("quarter", formData.quarter)
          .maybeSingle();

        if (existingGrade) {
          toast({
            variant: "destructive",
            title: "Grade Already Exists",
            description: "A grade for this student, subject, and quarter already exists. Please edit the existing grade instead.",
          });
          return;
        }

        // Create new grade
        const { error } = await supabase
          .from("grades")
          .insert([finalData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: saveType === 'draft' ? "Grade saved as draft" : "Grade created successfully",
        });
      }

      if (saveType === 'save') {
        clearLocalStorage(); // Clear draft backup after successful save
        clearAutoSave(); // Clear auto-save state
        onSuccess();
      }
      // For draft, stay on current form

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
      setIsDraft(false);
    }
  };

  const selectedStudent = students.find(s => s.id === formData.student_id);
  const gradeRemarks = getGradeRemarks(calculatedGrade);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            navigateStudent('previous');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateStudent('next');
            break;
          case 'Enter':
            e.preventDefault();
            handleSubmit('save');
            break;
          case 's':
            e.preventDefault();
            handleSubmit('draft');
            break;
        }
      }
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStudentIndex, students.length]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with title and student info */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calculator className="h-5 w-5" />
              📚 Quick Grade Entry
              {formData.subject && ` - ${formData.subject}`}
              {formData.quarter && ` - ${formData.quarter} Quarter`}
            </CardTitle>
            <AutoSaveIndicator
              status={autoSaveStatus.status}
              lastSaved={autoSaveStatus.lastSaved}
              error={autoSaveStatus.error}
              onSaveNow={autoSaveNow}
              onRetry={autoSaveNow}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Student, Subject, Quarter Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id" className="text-sm font-medium">Student</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => handleInputChange("student_id", value)}
                disabled={!!grade}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_id_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStudent && (
                <div className="text-sm text-muted-foreground">
                  Grade {selectedStudent.year_level} - {selectedStudent.section}
                  {selectedStudent.strand && ` (${selectedStudent.strand.toUpperCase()})`}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleInputChange("subject", value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter" className="text-sm font-medium">Quarter</Label>
              <Select
                value={formData.quarter}
                onValueChange={(value) => handleInputChange("quarter", value)}
                disabled={!!grade}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map((quarter) => (
                    <SelectItem key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Components with Real-time Calculation */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Grade Input Section */}
            <div className="lg:col-span-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="written_work" className="text-sm font-medium">
                    Written Work (25%)
                  </Label>
                  <Input
                    id="written_work"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.written_work || ""}
                    onChange={(e) => handleInputChange("written_work", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.0"
                    className="h-12 text-center text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performance_task" className="text-sm font-medium">
                    Performance Task (50%)
                  </Label>
                  <Input
                    id="performance_task"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.performance_task || ""}
                    onChange={(e) => handleInputChange("performance_task", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.0"
                    className="h-12 text-center text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quarterly_assessment" className="text-sm font-medium">
                    Quarterly Assessment (25%)
                  </Label>
                  <Input
                    id="quarterly_assessment"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.quarterly_assessment || ""}
                    onChange={(e) => handleInputChange("quarterly_assessment", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.0"
                    className="h-12 text-center text-lg font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Live Grade Calculation Display */}
            <div className="lg:col-span-1">
              <div className="h-full flex flex-col justify-center items-center p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Final Grade</div>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {calculatedGrade.toFixed(1)}
                  </div>
                  <Badge className={`${gradeRemarks.color} text-white text-sm`}>
                    {gradeRemarks.text}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remarks Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label htmlFor="remarks" className="flex items-center gap-2 text-sm font-medium">
              📝 Remarks
            </Label>
            <Textarea
              id="remarks"
              value={formData.remarks || ""}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Add any additional comments about the student's performance..."
              rows={3}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              If left empty, remarks will be auto-generated based on the final grade.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateStudent('previous')}
                disabled={currentStudentIndex === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigateStudent('next')}
                disabled={currentStudentIndex >= students.length - 1}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {loading && isDraft ? "Saving..." : "Save Draft"}
              </Button>

              <Button
                type="button"
                onClick={() => handleSubmit('save')}
                disabled={loading || !formData.student_id || !formData.subject}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading && !isDraft ? "Saving..." : "Save"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-4">
              <span>⌨️ Shortcuts:</span>
              <span>Ctrl+← Previous</span>
              <span>Ctrl+→ Next</span>
              <span>Ctrl+Enter Save</span>
              <span>Ctrl+S Draft</span>
              <span>Esc Cancel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedGradeForm;