import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Edit, BookOpen, Calculator, Users, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGradingSystem } from "@/hooks/useGradingSystem";
import { supabase } from "@/integrations/supabase/client";
import GradeForm from "@/components/grades/GradeForm";
import EnhancedGradeForm from "@/components/grades/EnhancedGradeForm";
import BatchGradeInput from "@/components/grades/BatchGradeInput";
import BulkGradeImport from "@/components/grades/BulkGradeImport";
import { Database } from "@/integrations/supabase/types";

type Grade = Database["public"]["Tables"]["grades"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface GradeWithStudent extends Grade {
  students: Student;
}

const Grades = () => {
  const [grades, setGrades] = useState<GradeWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeWithStudent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const { toast } = useToast();
  const { gradingSystem } = useGradingSystem();

  const quarters = ["1st", "2nd", "3rd", "4th"];

  // Get unique subjects from the current grades data (dynamic)
  // This will show all subjects that have been used in the system

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserProfile();
      fetchGrades();
      fetchStudents();
    };
    initializeData();
  }, []);

  // Re-fetch students and grades when userRole changes (for advisor filtering)
  useEffect(() => {
    if (userRole) {
      fetchStudents();
      fetchGrades();
    }
  }, [userRole]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      setUserRole(data?.role || "");
    }
  };

  const fetchGrades = async () => {
    try {
      setLoading(true);

      // Always fetch all grades with student information
      const { data, error } = await supabase
        .from("grades")
        .select(`
          *,
          students!grades_student_id_fkey (
            id,
            first_name,
            middle_name,
            last_name,
            student_id_no,
            year_level,
            section,
            strand
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter grades based on user role
      let filteredGrades = data || [];

      if (userRole === "advisor") {
        // Get advisor assignments and filter grades accordingly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            const { data: advisor } = await supabase
              .from("advisors")
              .select(`
                id,
                advisor_assignments(year_level, section, strand)
              `)
              .eq("profile_id", profile.id)
              .single();

            if (advisor?.advisor_assignments && advisor.advisor_assignments.length > 0) {
              // Filter grades to only show students from advisor's assigned sections
              filteredGrades = data?.filter(grade => {
                return advisor.advisor_assignments.some(assignment => {
                  const matchesYearLevel = grade.students.year_level === assignment.year_level;
                  const matchesSection = grade.students.section === assignment.section;

                  // For senior high, also check strand
                  if (assignment.strand) {
                    const matchesStrand = grade.students.strand === assignment.strand;
                    return matchesYearLevel && matchesSection && matchesStrand;
                  } else {
                    // For junior high, strand should be null
                    return matchesYearLevel && matchesSection;
                  }
                });
              }) || [];
            }
          }
        }
      }

      setGrades(filteredGrades);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch grades: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;

      // Filter students based on user role (same logic as grades)
      let filteredStudents = data || [];

      if (userRole === "advisor") {
        // Get advisor assignments and filter students accordingly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            const { data: advisor } = await supabase
              .from("advisors")
              .select(`
                id,
                advisor_assignments(year_level, section, strand)
              `)
              .eq("profile_id", profile.id)
              .single();

            if (advisor?.advisor_assignments && advisor.advisor_assignments.length > 0) {
              // Filter students to only show those from advisor's assigned sections
              filteredStudents = data?.filter(student => {
                return advisor.advisor_assignments.some(assignment => {
                  const matchesYearLevel = student.year_level === assignment.year_level;
                  const matchesSection = student.section === assignment.section;

                  // For senior high, also check strand
                  if (assignment.strand) {
                    const matchesStrand = student.strand === assignment.strand;
                    return matchesYearLevel && matchesSection && matchesStrand;
                  } else {
                    // For junior high, strand should be null
                    return matchesYearLevel && matchesSection;
                  }
                });
              }) || [];
            }
          }
        }
      }

      setStudents(filteredStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
    }
  };

  const getUniqueSubjects = () => {
    let filteredGrades = grades;

    // If advisor role, filter subjects based on assigned students only
    if (userRole === "advisor") {
      const assignedStudentIds = students.map(student => student.id);
      filteredGrades = grades.filter(grade => assignedStudentIds.includes(grade.student_id));
    }

    const subjects = [...new Set(filteredGrades.map(grade => grade.subject))];
    return subjects.sort();
  };

  // Group student groups by year level and section for better organization
  const groupStudentGradesBySection = (studentGroups: Array<{ student: Student; grades: GradeWithStudent[] }>) => {
    const grouped = studentGroups.reduce((acc, group) => {
      const key = `${group.student.year_level}-${group.student.section}`;
      if (!acc[key]) {
        acc[key] = {
          year_level: group.student.year_level,
          section: group.student.section,
          strand: group.student.strand,
          studentGroups: []
        };
      }
      acc[key].studentGroups.push(group);
      return acc;
    }, {} as Record<string, {
      year_level: string;
      section: string;
      strand?: string;
      studentGroups: Array<{ student: Student; grades: GradeWithStudent[] }>
    }>);

    // Sort groups by year level then section
    return Object.values(grouped).sort((a, b) => {
      const yearDiff = parseInt(a.year_level) - parseInt(b.year_level);
      if (yearDiff !== 0) return yearDiff;
      return a.section.localeCompare(b.section);
    });
  };

  // Group grades by student to show one student per row
  const groupedGrades = grades.reduce((acc, grade) => {
    const studentId = grade.student_id;
    if (!acc[studentId]) {
      acc[studentId] = {
        student: grade.students,
        grades: []
      };
    }
    acc[studentId].grades.push(grade);
    return acc;
  }, {} as Record<string, { student: Student; grades: GradeWithStudent[] }>);

  // Apply filters to the grouped data
  const filteredStudentGroups = Object.values(groupedGrades).filter((group) => {
    const studentName = `${group.student.first_name} ${group.student.middle_name || ""} ${group.student.last_name}`.toLowerCase();
    const studentId = group.student.student_id_no.toLowerCase();

    const matchesSearch =
      studentName.includes(searchTerm.toLowerCase()) ||
      studentId.includes(searchTerm.toLowerCase()) ||
      group.grades.some(grade => grade.subject.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStudent = selectedStudent === "all" || group.student.id === selectedStudent;

    // Filter grades within each group based on quarter and subject
    const hasMatchingGrade = group.grades.some(grade => {
      const matchesQuarter = selectedQuarter === "all" || grade.quarter === selectedQuarter;
      const matchesSubject = selectedSubject === "all" || grade.subject === selectedSubject;
      return matchesQuarter && matchesSubject;
    });

    return matchesSearch && matchesStudent && hasMatchingGrade;
  });

  const handleEditGrade = (grade: GradeWithStudent) => {
    setSelectedGrade(grade);
    setShowEditDialog(true);
  };

  const handleFormSuccess = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setSelectedGrade(null);
    fetchGrades();
  };

  const calculateFinalGrade = (writtenWork: number, performanceTask: number, quarterlyAssessment: number) => {
    // DepEd K-12 Grading System weights:
    // Written Work: 25%
    // Performance Task: 50%
    // Quarterly Assessment: 25%
    const final = (writtenWork * 0.25) + (performanceTask * 0.50) + (quarterlyAssessment * 0.25);
    return Math.round(final * 100) / 100;
  };

  const getGradeRemarks = (grade: number) => {
    if (grade >= 90) return { text: "Outstanding", color: "bg-green-500" };
    if (grade >= 85) return { text: "Very Satisfactory", color: "bg-blue-500" };
    if (grade >= 80) return { text: "Satisfactory", color: "bg-yellow-500" };
    if (grade >= 75) return { text: "Fairly Satisfactory", color: "bg-orange-500" };
    return { text: "Did Not Meet Expectations", color: "bg-red-500" };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Grades Management</h1>
          <p className="text-muted-foreground">DepEd K-12 Grading System</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV/Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBatchDialog(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Batch Entry
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-2">
              <DialogHeader>
                <DialogTitle>Add New Grade</DialogTitle>
                <DialogDescription>
                  Enter the student's grade information using the DepEd K-12 grading system.
                </DialogDescription>
              </DialogHeader>
              <EnhancedGradeForm
                students={students}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grading System Info */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {gradingSystem?.name || "DepEd K-12"} Grading System
          </CardTitle>
          {gradingSystem?.description && (
            <p className="text-sm text-muted-foreground">{gradingSystem.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="font-semibold text-primary">Written Work</div>
              <div className="text-2xl font-bold">{gradingSystem?.written_work_percentage || 25}%</div>
              <div className="text-muted-foreground">Quizzes, Tests, Essays</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="font-semibold text-primary">Performance Task</div>
              <div className="text-2xl font-bold">{gradingSystem?.performance_task_percentage || 50}%</div>
              <div className="text-muted-foreground">Projects, Outputs, Skills</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="font-semibold text-primary">Quarterly Assessment</div>
              <div className="text-2xl font-bold">{gradingSystem?.quarterly_assessment_percentage || 25}%</div>
              <div className="text-muted-foreground">Quarterly Exams</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, ID, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>{quarter} Quarter</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {getUniqueSubjects().map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students with Grades - Grouped by Year Level and Section */}
      <div className="space-y-6">
        {filteredStudentGroups.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {grades.length === 0 ? "No grades recorded yet. Add your first grade to get started." : "No students found matching your criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          groupStudentGradesBySection(filteredStudentGroups).map((sectionGroup) => (
            <Card key={`${sectionGroup.year_level}-${sectionGroup.section}`} className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Grade {sectionGroup.year_level} - {sectionGroup.section}
                    {sectionGroup.strand && (
                      <Badge variant="outline" className="ml-2">
                        {sectionGroup.strand.toUpperCase()}
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge variant="secondary">
                    {sectionGroup.studentGroups.length} student{sectionGroup.studentGroups.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectionGroup.studentGroups.map((group) => {
                    // Filter grades within this group based on selected filters
                    const filteredGradesForStudent = group.grades.filter(grade => {
                      const matchesQuarter = selectedQuarter === "all" || grade.quarter === selectedQuarter;
                      const matchesSubject = selectedSubject === "all" || grade.subject === selectedSubject;
                      return matchesQuarter && matchesSubject;
                    });

                    if (filteredGradesForStudent.length === 0) return null;

                    return (
                      <div key={group.student.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        {/* Student Header - Slimmer */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">
                              {group.student.first_name} {group.student.middle_name && `${group.student.middle_name} `}{group.student.last_name}
                            </h4>
                            <Badge variant="outline" className="text-xs">{group.student.student_id_no}</Badge>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {filteredGradesForStudent.length} grade{filteredGradesForStudent.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Grades Grid - Compact */}
                        <div className="grid gap-2">
                          {filteredGradesForStudent
                            .sort((a, b) => {
                              // Sort by quarter first, then by subject
                              const quarterOrder = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
                              const quarterDiff = quarterOrder[a.quarter as keyof typeof quarterOrder] - quarterOrder[b.quarter as keyof typeof quarterOrder];
                              if (quarterDiff !== 0) return quarterDiff;
                              return a.subject.localeCompare(b.subject);
                            })
                            .map((grade) => {
                              const finalGrade = grade.final_grade || calculateFinalGrade(
                                grade.written_work || 0,
                                grade.performance_task || 0,
                                grade.quarterly_assessment || 0
                              );
                              const remarks = getGradeRemarks(finalGrade);

                              return (
                                <div key={grade.id} className="flex items-center justify-between p-2 bg-muted/20 rounded border hover:bg-muted/40 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{grade.subject}</span>
                                        <Badge variant="outline" className="text-xs">{grade.quarter}</Badge>
                                      </div>
                                    </div>

                                    <div className="flex gap-3 text-xs">
                                      <div className="text-center">
                                        <div className="text-muted-foreground">WW</div>
                                        <div className="font-medium">{grade.written_work ? grade.written_work.toFixed(1) : "—"}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-muted-foreground">PT</div>
                                        <div className="font-medium">{grade.performance_task ? grade.performance_task.toFixed(1) : "—"}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-muted-foreground">QA</div>
                                        <div className="font-medium">{grade.quarterly_assessment ? grade.quarterly_assessment.toFixed(1) : "—"}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 ml-3">
                                    <div className="text-center">
                                      <div className="text-sm font-bold">{finalGrade.toFixed(1)}</div>
                                      <Badge className={`${remarks.color} text-white text-xs`}>
                                        {remarks.text}
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditGrade(grade)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredStudentGroups.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredStudentGroups.length} student{filteredStudentGroups.length !== 1 ? 's' : ''} with {filteredStudentGroups.reduce((total, group) => {
                const filteredCount = group.grades.filter(grade => {
                  const matchesQuarter = selectedQuarter === "all" || grade.quarter === selectedQuarter;
                  const matchesSubject = selectedSubject === "all" || grade.subject === selectedSubject;
                  return matchesQuarter && matchesSubject;
                }).length;
                return total + filteredCount;
              }, 0)} grade record{grades.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Grade Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-2">
          <DialogHeader>
            <DialogTitle>Edit Grade</DialogTitle>
            <DialogDescription>
              Update the student's grade information.
            </DialogDescription>
          </DialogHeader>
          {selectedGrade && (
            <EnhancedGradeForm
              grade={selectedGrade}
              students={students}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Grade Input Dialog */}
      <BatchGradeInput
        isOpen={showBatchDialog}
        onClose={() => setShowBatchDialog(false)}
        onSuccess={() => {
          setShowBatchDialog(false);
          fetchGrades();
        }}
      />

      {/* Bulk Grade Import Dialog */}
      <BulkGradeImport
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          setShowImportDialog(false);
          fetchGrades();
        }}
      />
    </div>
  );
};

export default Grades;