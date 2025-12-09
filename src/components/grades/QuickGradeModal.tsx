import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGradeDefaults } from "@/hooks/useGradeDefaults";
import { Database } from "@/integrations/supabase/types";
import { Plus, Calculator, Zap, X, Save } from "lucide-react";

type Grade = Database["public"]["Tables"]["grades"]["Insert"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface QuickGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const QuickGradeModal = ({ isOpen, onClose, onSuccess }: QuickGradeModalProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<Grade>({
    student_id: "",
    subject: "",
    quarter: "1st",
    written_work: null,
    performance_task: null,
    quarterly_assessment: null,
    final_grade: null,
    remarks: "",
  });
  const [calculatedGrade, setCalculatedGrade] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const { toast } = useToast();
  const { defaults, updateLastUsed, updateRecentGrades } = useGradeDefaults();

  const quarters = [
    { value: "1st", label: "1st Quarter" },
    { value: "2nd", label: "2nd Quarter" },
    { value: "3rd", label: "3rd Quarter" },
    { value: "4th", label: "4th Quarter" },
  ];

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

  // Fetch students on modal open
  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      // Apply defaults
      setFormData(prev => ({
        ...prev,
        subject: defaults.lastSubject,
        quarter: defaults.lastQuarter,
        written_work: defaults.recentGradeValues.writtenWork,
        performance_task: defaults.recentGradeValues.performanceTask,
        quarterly_assessment: defaults.recentGradeValues.quarterlyAssessment,
      }));
    }
  }, [isOpen, defaults]);

  // Calculate final grade whenever components change
  useEffect(() => {
    calculateFinalGrade();
  }, [formData.written_work, formData.performance_task, formData.quarterly_assessment]);

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);

      // Role-based student fetching (similar to other pages)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, id")
        .eq("user_id", user.id)
        .single();

      let query = supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      if (profile?.role === "advisor") {
        // Get advisor's assigned students
        const { data: advisor } = await supabase
          .from("advisors")
          .select(`
            id,
            advisor_assignments(year_level, section, strand)
          `)
          .eq("profile_id", profile.id)
          .single();

        if (advisor?.advisor_assignments && advisor.advisor_assignments.length > 0) {
          const { data, error } = await query;
          if (error) throw error;

          const filteredStudents = data?.filter(student => {
            return advisor.advisor_assignments.some(assignment => {
              const matchesYearLevel = student.year_level === assignment.year_level;
              const matchesSection = student.section === assignment.section;

              if (assignment.strand) {
                const matchesStrand = student.strand === assignment.strand;
                return matchesYearLevel && matchesSection && matchesStrand;
              } else {
                return matchesYearLevel && matchesSection;
              }
            });
          }) || [];

          setStudents(filteredStudents);

          // Auto-select first student if none selected and we have defaults
          if (!formData.student_id && filteredStudents.length > 0) {
            const suggestedStudent = filteredStudents.find(s =>
              s.year_level === defaults.lastYearLevel && s.section === defaults.lastSection
            ) || filteredStudents[0];

            setFormData(prev => ({ ...prev, student_id: suggestedStudent.id }));
          }
          return;
        }
      }

      // Admin sees all students
      const { data, error } = await query;
      if (error) throw error;

      setStudents(data || []);

      // Auto-select first student if none selected
      if (!formData.student_id && data && data.length > 0) {
        setFormData(prev => ({ ...prev, student_id: data[0].id }));
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students: " + error.message,
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  const calculateFinalGrade = () => {
    const writtenWork = formData.written_work || 0;
    const performanceTask = formData.performance_task || 0;
    const quarterlyAssessment = formData.quarterly_assessment || 0;

    // DepEd K-12 Grading System weights
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getAvailableSubjects = () => {
    const selectedStudent = students.find(s => s.id === formData.student_id);
    if (!selectedStudent) return [];
    return getSubjectsByGradeLevel(selectedStudent.year_level).sort();
  };

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.subject) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a student and subject.",
      });
      return;
    }

    setLoading(true);

    try {
      // Check for existing grade
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
          description: "A grade for this student, subject, and quarter already exists.",
        });
        return;
      }

      // Auto-generate remarks based on final grade
      const remarks = getGradeRemarks(calculatedGrade);
      const finalData = {
        ...formData,
        remarks: formData.remarks || remarks.text,
        final_grade: calculatedGrade,
      };

      const { error } = await supabase
        .from("grades")
        .insert([finalData]);

      if (error) throw error;

      // Update defaults for next time
      const selectedStudent = students.find(s => s.id === formData.student_id);
      if (selectedStudent) {
        updateLastUsed(
          formData.subject,
          formData.quarter,
          selectedStudent.year_level,
          selectedStudent.section
        );
        updateRecentGrades(
          formData.written_work,
          formData.performance_task,
          formData.quarterly_assessment
        );
      }

      toast({
        title: "Success",
        description: "Grade saved successfully!",
      });

      onSuccess();
      onClose();

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        student_id: "",
        subject: "",
        quarter: "1st",
        written_work: null,
        performance_task: null,
        quarterly_assessment: null,
        final_grade: null,
        remarks: "",
      });
    }
  }, [isOpen]);

  const selectedStudent = students.find(s => s.id === formData.student_id);
  const gradeRemarks = getGradeRemarks(calculatedGrade);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            ⚡ Quick Grade Entry
          </DialogTitle>
          <DialogDescription>
            Rapid grade input with smart defaults and shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student and Subject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => handleInputChange("student_id", value)}
                disabled={studentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={studentsLoading ? "Loading..." : "Select student"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.year_level}-{student.section})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select
                value={formData.quarter}
                onValueChange={(value) => handleInputChange("quarter", value)}
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

            {selectedStudent && (
              <div className="space-y-2">
                <Label>Student Info</Label>
                <div className="flex gap-1 pt-2">
                  <Badge variant="outline">Grade {selectedStudent.year_level}</Badge>
                  <Badge variant="secondary">{selectedStudent.section}</Badge>
                  {selectedStudent.strand && (
                    <Badge className="bg-secondary text-secondary-foreground">
                      {selectedStudent.strand.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Grade Input */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Written Work (25%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.written_work || ""}
                        onChange={(e) => handleInputChange("written_work", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Performance Task (50%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.performance_task || ""}
                        onChange={(e) => handleInputChange("performance_task", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Quarterly Assessment (25%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.quarterly_assessment || ""}
                        onChange={(e) => handleInputChange("quarterly_assessment", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Grade Calculation */}
                <div className="lg:col-span-1">
                  <div className="h-full flex flex-col justify-center items-center p-3 bg-primary/5 rounded-lg border">
                    <Calculator className="h-5 w-5 text-primary mb-2" />
                    <div className="text-2xl font-bold text-primary mb-1">
                      {calculatedGrade.toFixed(1)}
                    </div>
                    <Badge className={`${gradeRemarks.color} text-white text-xs`}>
                      {gradeRemarks.text}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.student_id || !formData.subject}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Grade"}
            </Button>
          </div>

          {/* Shortcut hint */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            💡 Tip: Press Ctrl+G anywhere to open Quick Grade Entry
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickGradeModal;