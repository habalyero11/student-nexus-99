import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Calculator, Info } from "lucide-react";

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

interface GradeFormProps {
  grade?: GradeWithStudent;
  students: Student[];
  onSuccess: () => void;
  onCancel: () => void;
}

const GradeForm = ({ grade, students, onSuccess, onCancel }: GradeFormProps) => {
  const [formData, setFormData] = useState<Grade>({
    student_id: grade?.students.id || (students.length === 1 ? students[0].id : ""),
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
  const { toast } = useToast();

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
      // Based on typical STEM track progression, these would be advanced versions
      "12": [
        "Oral Communication", "Reading and Writing", "General Mathematics", "Statistics and Probability",
        "Earth and Life Science", "Physical Science", "Research", "Filipino sa Piling Larangan"
      ]
    };

    return subjectsByLevel[yearLevel as keyof typeof subjectsByLevel] || [];
  };

  // For this school, Grade 11 is Maxwell (STEM), so we don't need strand-specific filtering
  // All Grade 11 students follow the same curriculum
  const getSpecializedSubjectsByStrand = (strand: string) => {
    // Since Grade 11 Maxwell follows one curriculum, return empty array
    // The main subjects are already included in getSubjectsByGradeLevel
    return [];
  };

  useEffect(() => {
    calculateFinalGrade();
  }, [formData.written_work, formData.performance_task, formData.quarterly_assessment]);

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

  const getGradeRemarks = (grade: number): string => {
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  const handleInputChange = (field: keyof Grade, value: any) => {
    setFormData(prev => {
      // If student changes, reset subject since available subjects might change
      if (field === "student_id") {
        return { ...prev, [field]: value, subject: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  // Get available subjects for the selected student
  const getAvailableSubjects = () => {
    const selectedStudent = students.find(s => s.id === formData.student_id);
    if (!selectedStudent) return [];

    const coreSubjects = getSubjectsByGradeLevel(selectedStudent.year_level);

    // For Senior High (Grades 11-12), also add strand-specific subjects
    if (["11", "12"].includes(selectedStudent.year_level) && selectedStudent.strand) {
      const strandSubjects = getSpecializedSubjectsByStrand(selectedStudent.strand);
      return [...coreSubjects, ...strandSubjects].sort();
    }

    return coreSubjects.sort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_id || !formData.subject) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a student and enter a subject.",
      });
      return;
    }

    setLoading(true);

    try {
      // Auto-generate remarks based on final grade
      const autoRemarks = getGradeRemarks(calculatedGrade);
      const finalData = {
        ...formData,
        remarks: formData.remarks || autoRemarks,
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
          description: "Grade created successfully",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student and Subject Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student *</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => handleInputChange("student_id", value)}
                disabled={!!grade} // Disable when editing existing grade
              >
                <SelectTrigger>
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
              <Label htmlFor="subject">Subject *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => handleInputChange("subject", value)}
              >
                <SelectTrigger>
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
              {formData.student_id && (
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const selectedStudent = students.find(s => s.id === formData.student_id);
                    if (selectedStudent) {
                      const gradeLevel = selectedStudent.year_level;
                      const strand = selectedStudent.strand;
                      if (["11", "12"].includes(gradeLevel) && strand) {
                        return `Showing subjects for Grade ${gradeLevel} - ${strand.toUpperCase()} strand`;
                      } else {
                        return `Showing subjects for Grade ${gradeLevel} (Junior High School)`;
                      }
                    }
                    return "";
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={formData.quarter}
                onValueChange={(value) => handleInputChange("quarter", value)}
                disabled={!!grade} // Disable when editing existing grade
              >
                <SelectTrigger>
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

      {/* Subject Information */}
      {formData.student_id && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 text-sm">DepEd K-12 Curriculum Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(() => {
              const selectedStudent = students.find(s => s.id === formData.student_id);
              if (!selectedStudent) return null;

              const isJuniorHigh = ["7", "8", "9", "10"].includes(selectedStudent.year_level);
              const availableSubjects = getAvailableSubjects();

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800">Student:</span>
                    <span>{selectedStudent.first_name} {selectedStudent.last_name}</span>
                    <Badge variant="outline" className="text-xs">
                      Grade {selectedStudent.year_level}
                      {selectedStudent.strand && ` - ${selectedStudent.strand.toUpperCase()}`}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">
                      {isJuniorHigh ? "Junior High School" : "Senior High School"} Subjects:
                    </span>
                    <p className="text-blue-600 mt-1">
                      {availableSubjects.length} subjects available based on DepEd K-12 curriculum
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Grade Components */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            DepEd K-12 Grade Components
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="written_work" className="flex items-center gap-2">
                Written Work (25%)
                <span className="text-sm text-muted-foreground">(0-100)</span>
              </Label>
              <Input
                id="written_work"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.written_work || ""}
                onChange={(e) => handleInputChange("written_work", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Enter score"
              />
              <div className="text-xs text-muted-foreground">
                Includes quizzes, tests, essays, and written assignments
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performance_task" className="flex items-center gap-2">
                Performance Task (50%)
                <span className="text-sm text-muted-foreground">(0-100)</span>
              </Label>
              <Input
                id="performance_task"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.performance_task || ""}
                onChange={(e) => handleInputChange("performance_task", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Enter score"
              />
              <div className="text-xs text-muted-foreground">
                Includes projects, presentations, skills demonstration
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarterly_assessment" className="flex items-center gap-2">
                Quarterly Assessment (25%)
                <span className="text-sm text-muted-foreground">(0-100)</span>
              </Label>
              <Input
                id="quarterly_assessment"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.quarterly_assessment || ""}
                onChange={(e) => handleInputChange("quarterly_assessment", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Enter score"
              />
              <div className="text-xs text-muted-foreground">
                Quarterly examination or major assessment
              </div>
            </div>
          </div>

          {/* Final Grade Calculation */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Final Grade</h4>
                  <p className="text-sm text-muted-foreground">
                    Calculated using DepEd K-12 formula
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {calculatedGrade.toFixed(2)}
                  </div>
                  <div className="text-sm font-medium">
                    {getGradeRemarks(calculatedGrade)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grade Scale Reference */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium mb-2">DepEd K-12 Grade Scale:</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div><strong>90-100:</strong> Outstanding</div>
                    <div><strong>85-89:</strong> Very Satisfactory</div>
                    <div><strong>80-84:</strong> Satisfactory</div>
                    <div><strong>75-79:</strong> Fairly Satisfactory</div>
                    <div><strong>Below 75:</strong> Did Not Meet Expectations</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Additional Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="remarks">Teacher's Remarks (Optional)</Label>
            <Textarea
              id="remarks"
              value={formData.remarks || ""}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Add any additional comments about the student's performance, behavior, or areas for improvement..."
              rows={3}
            />
            <div className="text-xs text-muted-foreground">
              If left empty, remarks will be auto-generated based on the final grade.
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : grade ? "Update Grade" : "Save Grade"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default GradeForm;