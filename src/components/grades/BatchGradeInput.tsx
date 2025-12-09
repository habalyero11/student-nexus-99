import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Removed Card components for cleaner layout
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
// Removed ScrollArea for simpler scrolling
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Users, Save, Calculator, CheckCircle, X } from "lucide-react";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Insert"];

interface BatchGradeInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BatchGradeData {
  subject: string;
  quarter: string;
  writtenWork: number | null;
  performanceTask: number | null;
  quarterlyAssessment: number | null;
}

const BatchGradeInput = ({ isOpen, onClose, onSuccess }: BatchGradeInputProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchData, setBatchData] = useState<BatchGradeData>({
    subject: "",
    quarter: "1st",
    writtenWork: null,
    performanceTask: null,
    quarterlyAssessment: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [filterYearLevel, setFilterYearLevel] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const { toast } = useToast();

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

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    } else {
      // Reset state when modal closes
      setSelectedStudents(new Set());
      setBatchData({
        subject: "",
        quarter: "1st",
        writtenWork: null,
        performanceTask: null,
        quarterlyAssessment: null,
      });
      setFilterYearLevel("all");
      setFilterSection("all");
      setSaveProgress(0);
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Role-based student fetching
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
        .order("year_level", { ascending: true })
        .order("section", { ascending: true })
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
            const matches = advisor.advisor_assignments.some(assignment => {
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
            return matches;
          }) || [];

          setStudents(filteredStudents);
          return;
        }
      }

      // Admin sees all students
      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalGrade = (): number => {
    const writtenWork = batchData.writtenWork || 0;
    const performanceTask = batchData.performanceTask || 0;
    const quarterlyAssessment = batchData.quarterlyAssessment || 0;

    return Math.round(((writtenWork * 0.25) + (performanceTask * 0.50) + (quarterlyAssessment * 0.25)) * 100) / 100;
  };

  const getGradeRemarks = (grade: number): string => {
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  const getAvailableSubjects = () => {
    if (filterYearLevel === "all") {
      // Return common subjects across all grade levels
      return ["Filipino", "English", "Science", "Math"];
    }
    return getSubjectsByGradeLevel(filterYearLevel);
  };

  const getUniqueYearLevels = () => {
    return [...new Set(students.map(s => s.year_level))].sort();
  };

  const getUniqueSections = () => {
    const filteredStudents = filterYearLevel === "all" ? students : students.filter(s => s.year_level === filterYearLevel);
    return [...new Set(filteredStudents.map(s => s.section))].sort();
  };

  const filteredStudents = students.filter(student => {
    const matchesYearLevel = filterYearLevel === "all" || student.year_level === filterYearLevel;
    const matchesSection = filterSection === "all" || student.section === filterSection;
    return matchesYearLevel && matchesSection;
  });

  // Group students by grade and section for better organization
  const groupedStudents = filteredStudents.reduce((groups, student) => {
    const key = `Grade ${student.year_level} - ${student.section}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(student);
    return groups;
  }, {} as Record<string, typeof filteredStudents>);

  // Students are grouped and ready for display

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBatchInputChange = (field: keyof BatchGradeData, value: any) => {
    setBatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (selectedStudents.size === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select at least one student.",
      });
      return;
    }

    if (!batchData.subject) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a subject.",
      });
      return;
    }

    setSaving(true);
    setSaveProgress(0);

    try {
      const finalGrade = calculateFinalGrade();
      const remarks = getGradeRemarks(finalGrade);

      const gradesData: Grade[] = Array.from(selectedStudents).map(studentId => ({
        student_id: studentId,
        subject: batchData.subject,
        quarter: batchData.quarter,
        written_work: batchData.writtenWork,
        performance_task: batchData.performanceTask,
        quarterly_assessment: batchData.quarterlyAssessment,
        final_grade: finalGrade,
        remarks,
      }));

      // Check for existing grades
      const existingGrades = await Promise.all(
        gradesData.map(async (grade) => {
          const { data } = await supabase
            .from("grades")
            .select("id")
            .eq("student_id", grade.student_id)
            .eq("subject", grade.subject)
            .eq("quarter", grade.quarter)
            .maybeSingle();
          return { studentId: grade.student_id, exists: !!data };
        })
      );

      const existingCount = existingGrades.filter(g => g.exists).length;
      if (existingCount > 0) {
        toast({
          variant: "destructive",
          title: "Duplicate Grades Found",
          description: `${existingCount} students already have grades for this subject and quarter.`,
        });
        return;
      }

      // Insert grades with progress tracking
      const batchSize = 5; // Process in batches of 5
      let completed = 0;

      for (let i = 0; i < gradesData.length; i += batchSize) {
        const batch = gradesData.slice(i, i + batchSize);

        const { error } = await supabase
          .from("grades")
          .insert(batch);

        if (error) throw error;

        completed += batch.length;
        setSaveProgress((completed / gradesData.length) * 100);

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "Success",
        description: `Successfully saved grades for ${selectedStudents.size} students`,
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save grades: " + error.message,
      });
    } finally {
      setSaving(false);
      setSaveProgress(0);
    }
  };

  const finalGrade = calculateFinalGrade();
  const gradeRemarks = getGradeRemarks(finalGrade);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Grade Input
          </DialogTitle>
          <DialogDescription>
            Enter the same grade for multiple students at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
          {/* Left Column - Student Selection */}
          <div className="flex flex-col space-y-4">
            {/* Filters */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-medium mb-3">Student Filters</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Year Level</Label>
                  <Select value={filterYearLevel} onValueChange={setFilterYearLevel}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Year Levels</SelectItem>
                      {getUniqueYearLevels().map(level => (
                        <SelectItem key={level} value={level}>Grade {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Section</Label>
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {getUniqueSections().map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Select Students ({selectedStudents.size} selected)
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={loading}
                  className="h-7 text-xs"
                >
                  {selectedStudents.size === filteredStudents.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto border rounded-lg bg-white">
                {loading ? (
                  <div className="text-center py-8">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No students found</div>
                ) : (
                  <div className="p-3 space-y-4">
                    {Object.entries(groupedStudents).map(([groupKey, groupStudents]) => (
                      <div key={groupKey}>
                        {/* Group Header */}
                        <div className="sticky top-0 bg-blue-50 border border-blue-200 rounded px-3 py-1 mb-2 text-sm font-medium text-blue-700">
                          {groupKey} ({groupStudents.length} student{groupStudents.length !== 1 ? 's' : ''})
                        </div>

                        {/* Students in two columns */}
                        <div className="grid grid-cols-2 gap-2">
                          {groupStudents.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded border border-gray-200"
                            >
                              <Checkbox
                                checked={selectedStudents.has(student.id)}
                                onCheckedChange={() => handleStudentToggle(student.id)}
                                className="flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {student.first_name} {student.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {student.student_id_no}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Grade Input */}
          <div className="border rounded-lg p-6 bg-gray-50 flex flex-col">
            <h3 className="text-lg font-medium mb-6">Grade Details</h3>
            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={batchData.subject} onValueChange={(value) => handleBatchInputChange("subject", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSubjects().map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={batchData.quarter} onValueChange={(value) => handleBatchInputChange("quarter", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map(quarter => (
                        <SelectItem key={quarter.value} value={quarter.value}>{quarter.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Written Work (25%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={batchData.writtenWork || ""}
                        onChange={(e) => handleBatchInputChange("writtenWork", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Performance Task (50%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={batchData.performanceTask || ""}
                        onChange={(e) => handleBatchInputChange("performanceTask", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quarterly Assessment (25%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={batchData.quarterlyAssessment || ""}
                        onChange={(e) => handleBatchInputChange("quarterlyAssessment", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.0"
                        className="text-center h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Grade Calculation */}
                <div className="lg:col-span-1">
                  <div className="h-full min-h-[120px] flex flex-col justify-center items-center p-4 bg-primary/5 rounded-lg border">
                    <Calculator className="h-6 w-6 text-primary mb-2" />
                    <div className="text-3xl font-bold text-primary mb-2">
                      {finalGrade.toFixed(1)}
                    </div>
                    <Badge className={`text-white text-sm ${
                      finalGrade >= 90 ? "bg-green-500" :
                      finalGrade >= 85 ? "bg-blue-500" :
                      finalGrade >= 80 ? "bg-yellow-500" :
                      finalGrade >= 75 ? "bg-orange-500" : "bg-red-500"
                    }`}>
                      {gradeRemarks}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress Bar (shown when saving) */}
              {saving && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Saving grades...</span>
                    <span>{Math.round(saveProgress)}%</span>
                  </div>
                  <Progress value={saveProgress} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 mt-auto border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={saving || selectedStudents.size === 0 || !batchData.subject}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Grades ({selectedStudents.size} students)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchGradeInput;