import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Plus, Filter, Eye, Edit, Trash2, BookOpen, User, GraduationCap, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentForm from "@/components/students/StudentForm";
import GradeForm from "@/components/grades/GradeForm";
import EnhancedGradeForm from "@/components/grades/EnhancedGradeForm";

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_place?: string;
  birth_date?: string;
  address?: string;
  student_id_no: string;
  student_lrn: string;
  year_level: string;
  section: string;
  strand?: string;
  age?: number;
  gender?: string;
  contact_number?: string;
  guardian_name?: string;
  parent_contact_no?: string;
}

interface Grade {
  id: string;
  subject: string;
  quarter: string;
  written_work?: number;
  performance_task?: number;
  quarterly_assessment?: number;
  final_grade?: number;
  remarks?: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks?: string;
  created_at: string;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedStrand, setSelectedStrand] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState<Student | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [studentGrades, setStudentGrades] = useState<Grade[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [advisorAssignments, setAdvisorAssignments] = useState<Array<{
    year_level: string;
    section: string;
    strand?: string;
  }>>([]);
  const { toast } = useToast();

  // Group students by year level and section
  const groupStudentsBySection = (students: Student[]) => {
    const grouped = students.reduce((acc, student) => {
      const key = `${student.year_level}-${student.section}`;
      if (!acc[key]) {
        acc[key] = {
          year_level: student.year_level,
          section: student.section,
          students: []
        };
      }
      acc[key].students.push(student);
      return acc;
    }, {} as Record<string, { year_level: string; section: string; students: Student[] }>);

    // Sort groups by year level then section
    return Object.values(grouped).sort((a, b) => {
      const yearDiff = parseInt(a.year_level) - parseInt(b.year_level);
      if (yearDiff !== 0) return yearDiff;
      return a.section.localeCompare(b.section);
    });
  };

  // Check if advisor can edit a specific student
  const canEditStudent = (student: Student): boolean => {
    // Admin can edit any student
    if (userRole === "admin") {
      return true;
    }

    // Advisor can edit students in their assigned sections
    if (userRole === "advisor" && advisorAssignments.length > 0) {
      return advisorAssignments.some(assignment => {
        const matchesYearLevel = student.year_level === assignment.year_level;
        const matchesSection = student.section === assignment.section;

        // For senior high (Grade 11), also check strand if assignment has one
        if (assignment.strand && student.year_level === "11") {
          const matchesStrand = student.strand === assignment.strand;
          return matchesYearLevel && matchesSection && matchesStrand;
        } else {
          // For junior high or assignments without specific strand
          return matchesYearLevel && matchesSection;
        }
      });
    }

    return false;
  };

  // Section and strand mappings
  const juniorHighSections = {
    "7": ["Archimedes", "Laplace", "Miletus"],
    "8": ["Herschel", "Linnaeus", "Pythagoras"],
    "9": ["Ptolemy", "Euclid", "Pascal"],
    "10": ["Hypatia", "Euler", "Lagrange"],
  };

  const seniorHighSections = {
    "11": ["Maxwell"],
    "12": ["Einstein", "Newton", "Aristotle", "Pasteur"],
  };

  const strands = ["humms", "stem", "gas", "abm", "ict"];

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchStudents();
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

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Always fetch all students initially
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;

      // Filter students based on user role
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
              // Store advisor assignments for form filtering
              setAdvisorAssignments(advisor.advisor_assignments);

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
                    // For junior high, strand should be null or match if advisor has no specific strand
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_lrn.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYearLevel = selectedYearLevel === "all" || student.year_level === selectedYearLevel;
    const matchesSection = selectedSection === "all" || student.section === selectedSection;
    const matchesStrand = selectedStrand === "all" || student.strand === selectedStrand;

    return matchesSearch && matchesYearLevel && matchesSection && matchesStrand;
  });

  const getSectionsByYearLevel = (yearLevel: string) => {
    if (["7", "8", "9", "10"].includes(yearLevel)) {
      return juniorHighSections[yearLevel as keyof typeof juniorHighSections] || [];
    } else if (["11", "12"].includes(yearLevel)) {
      return seniorHighSections[yearLevel as keyof typeof seniorHighSections] || [];
    }
    return [];
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowEditDialog(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student deleted successfully",
      });

      fetchStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete student: " + error.message,
      });
    }
  };

  const handleFormSuccess = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setSelectedStudent(null);
    fetchStudents();
  };

  const handleInputGrade = (student: Student) => {
    setSelectedStudentForGrade(student);
    setShowGradeDialog(true);
  };

  const handleViewDetails = async (student: Student) => {
    setSelectedStudentForDetails(student);
    setShowDetailsDialog(true);
    setLoadingDetails(true);

    try {
      // Fetch student grades
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", student.id)
        .order("quarter", { ascending: true })
        .order("subject", { ascending: true });

      if (gradesError) throw gradesError;
      setStudentGrades(gradesData || []);

      // Fetch student attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.id)
        .order("date", { ascending: false })
        .limit(50); // Last 50 attendance records

      if (attendanceError) throw attendanceError;
      setStudentAttendance(attendanceData || []);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch student details: " + error.message,
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGradeFormSuccess = () => {
    setShowGradeDialog(false);
    setSelectedStudentForGrade(null);
    toast({
      title: "Success",
      description: "Grade added successfully",
    });
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
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Manage student records and information</p>
        </div>
        {(userRole === "admin" || userRole === "advisor") && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-4xl sm:w-full sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Enter the student's information below. All required fields must be completed.
                </DialogDescription>
              </DialogHeader>
              <StudentForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowAddDialog(false)}
                userRole={userRole}
                advisorAssignments={advisorAssignments}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

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
                  placeholder="Search by name, ID, or LRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedYearLevel} onValueChange={setSelectedYearLevel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Year Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Year Levels</SelectItem>
                <SelectItem value="7">Grade 7</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {selectedYearLevel !== "all" && getSectionsByYearLevel(selectedYearLevel).map((section) => (
                  <SelectItem key={section} value={section}>{section}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStrand} onValueChange={setSelectedStrand}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Strand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strands</SelectItem>
                {strands.map((strand) => (
                  <SelectItem key={strand} value={strand}>{strand.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students List - Grouped by Year Level and Section */}
      <div className="space-y-6">
        {filteredStudents.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No students found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          groupStudentsBySection(filteredStudents).map((group) => (
            <Card key={`${group.year_level}-${group.section}`} className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Grade {group.year_level} - {group.section}
                    {group.students[0]?.strand && (
                      <Badge variant="outline" className="ml-2">
                        {group.students[0].strand.toUpperCase()}
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge variant="secondary">{group.students.length} student{group.students.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {group.students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {student.first_name} {student.middle_name && `${student.middle_name} `}{student.last_name}
                            </p>
                            <Badge variant="outline" className="text-xs">{student.student_id_no}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">LRN: {student.student_lrn}</p>
                        </div>
                        {student.gender && (
                          <Badge variant="outline" className="text-xs capitalize">{student.gender}</Badge>
                        )}
                      </div>

                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewDetails(student)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Details</p>
                            </TooltipContent>
                          </Tooltip>

                          {canEditStudent(student) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEditStudent(student)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Student</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleInputGrade(student)}
                              >
                                <BookOpen className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Input Grade</p>
                            </TooltipContent>
                          </Tooltip>

                          {userRole === "admin" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteStudent(student.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Student</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredStudents.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-4xl sm:w-full sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student's information below.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm
              student={selectedStudent}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowEditDialog(false)}
              userRole={userRole}
              advisorAssignments={advisorAssignments}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Input Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 sm:max-w-5xl sm:w-full sm:mx-auto">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle>📚 Quick Grade Entry</DialogTitle>
              <DialogDescription>
                Add a grade for{" "}
                {selectedStudentForGrade &&
                  `${selectedStudentForGrade.first_name} ${selectedStudentForGrade.last_name}`}
              </DialogDescription>
            </DialogHeader>
            {selectedStudentForGrade && (
              <EnhancedGradeForm
                students={[selectedStudentForGrade]} // Pass only the selected student
                initialStudentId={selectedStudentForGrade.id}
                onSuccess={handleGradeFormSuccess}
                onCancel={() => setShowGradeDialog(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="w-[95vw] max-w-7xl h-[90vh] flex flex-col sm:max-w-7xl sm:w-[95vw] sm:mx-auto">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="text-xl">Student Details</DialogTitle>
            <DialogDescription>
              Complete information for{" "}
              {selectedStudentForDetails &&
                `${selectedStudentForDetails.first_name} ${selectedStudentForDetails.last_name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForDetails && (
            <div className="flex-1 min-h-0 pt-4">
              <Tabs defaultValue="personal" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 flex-shrink-0 mb-4">
                  <TabsTrigger value="personal" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger value="academic" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Academic Info
                  </TabsTrigger>
                  <TabsTrigger value="grades" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Grades
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Attendance
                  </TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                          <p className="font-medium">
                            {selectedStudentForDetails.first_name}{" "}
                            {selectedStudentForDetails.middle_name && `${selectedStudentForDetails.middle_name} `}
                            {selectedStudentForDetails.last_name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Birth Date</Label>
                          <p>{selectedStudentForDetails.birth_date ? new Date(selectedStudentForDetails.birth_date).toLocaleDateString() : "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Birth Place</Label>
                          <p>{selectedStudentForDetails.birth_place || "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Age</Label>
                          <p>{selectedStudentForDetails.age ? `${selectedStudentForDetails.age} years old` : "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                          <p className="capitalize">{selectedStudentForDetails.gender || "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Contact Number</Label>
                          <p>{selectedStudentForDetails.contact_number || "Not provided"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                          <p>{selectedStudentForDetails.address || "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Guardian Name</Label>
                          <p>{selectedStudentForDetails.guardian_name || "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Parent Contact</Label>
                          <p>{selectedStudentForDetails.parent_contact_no || "Not provided"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Academic Information Tab */}
                <TabsContent value="academic" className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Student ID Number</Label>
                          <p className="font-medium">{selectedStudentForDetails.student_id_no}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Learner Reference Number (LRN)</Label>
                          <p className="font-medium">{selectedStudentForDetails.student_lrn}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Year Level</Label>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Grade {selectedStudentForDetails.year_level}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {["7", "8", "9", "10"].includes(selectedStudentForDetails.year_level) ? "Junior High School" : "Senior High School"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Section</Label>
                          <Badge variant="secondary">{selectedStudentForDetails.section}</Badge>
                        </div>
                        {selectedStudentForDetails.strand && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Strand</Label>
                            <Badge className="bg-secondary text-secondary-foreground">
                              {selectedStudentForDetails.strand.toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Grades Tab */}
                <TabsContent value="grades" className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {/* Overall Average Summary */}
                  {studentGrades.length > 0 && (() => {
                    // Calculate quarterly averages
                    const quarterlyGrades: { [key: string]: number[] } = {
                      '1st': [], '2nd': [], '3rd': [], '4th': []
                    };

                    studentGrades.forEach(grade => {
                      const finalGrade = grade.final_grade || (
                        ((grade.written_work || 0) * 0.25) +
                        ((grade.performance_task || 0) * 0.50) +
                        ((grade.quarterly_assessment || 0) * 0.25)
                      );
                      if (finalGrade > 0 && quarterlyGrades[grade.quarter]) {
                        quarterlyGrades[grade.quarter].push(finalGrade);
                      }
                    });

                    const getQuarterAvg = (quarter: string) => {
                      const gradesList = quarterlyGrades[quarter];
                      if (gradesList.length === 0) return null;
                      return gradesList.reduce((a, b) => a + b, 0) / gradesList.length;
                    };

                    const q1Avg = getQuarterAvg('1st');
                    const q2Avg = getQuarterAvg('2nd');
                    const q3Avg = getQuarterAvg('3rd');
                    const q4Avg = getQuarterAvg('4th');

                    // Calculate overall average from quarterly averages
                    const validQuarters = [q1Avg, q2Avg, q3Avg, q4Avg].filter(q => q !== null) as number[];
                    const overallAvg = validQuarters.length > 0
                      ? validQuarters.reduce((a, b) => a + b, 0) / validQuarters.length
                      : null;

                    const getGradeColorSummary = (grade: number | null) => {
                      if (grade === null) return "text-muted-foreground";
                      if (grade >= 90) return "text-green-600";
                      if (grade >= 85) return "text-blue-600";
                      if (grade >= 80) return "text-yellow-600";
                      if (grade >= 75) return "text-orange-600";
                      return "text-red-600";
                    };

                    const getGradeBgSummary = (grade: number | null) => {
                      if (grade === null) return "bg-muted/30";
                      if (grade >= 90) return "bg-green-50";
                      if (grade >= 85) return "bg-blue-50";
                      if (grade >= 80) return "bg-yellow-50";
                      if (grade >= 75) return "bg-orange-50";
                      return "bg-red-50";
                    };

                    return (
                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            Grade Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {/* Q1 Average */}
                            <div className={`text-center p-3 rounded-lg ${getGradeBgSummary(q1Avg)}`}>
                              <div className="text-xs text-muted-foreground mb-1">Q1 Average</div>
                              <div className={`text-xl font-bold ${getGradeColorSummary(q1Avg)}`}>
                                {q1Avg !== null ? q1Avg.toFixed(1) : "—"}
                              </div>
                            </div>
                            {/* Q2 Average */}
                            <div className={`text-center p-3 rounded-lg ${getGradeBgSummary(q2Avg)}`}>
                              <div className="text-xs text-muted-foreground mb-1">Q2 Average</div>
                              <div className={`text-xl font-bold ${getGradeColorSummary(q2Avg)}`}>
                                {q2Avg !== null ? q2Avg.toFixed(1) : "—"}
                              </div>
                            </div>
                            {/* Q3 Average */}
                            <div className={`text-center p-3 rounded-lg ${getGradeBgSummary(q3Avg)}`}>
                              <div className="text-xs text-muted-foreground mb-1">Q3 Average</div>
                              <div className={`text-xl font-bold ${getGradeColorSummary(q3Avg)}`}>
                                {q3Avg !== null ? q3Avg.toFixed(1) : "—"}
                              </div>
                            </div>
                            {/* Q4 Average */}
                            <div className={`text-center p-3 rounded-lg ${getGradeBgSummary(q4Avg)}`}>
                              <div className="text-xs text-muted-foreground mb-1">Q4 Average</div>
                              <div className={`text-xl font-bold ${getGradeColorSummary(q4Avg)}`}>
                                {q4Avg !== null ? q4Avg.toFixed(1) : "—"}
                              </div>
                            </div>
                            {/* Overall Average */}
                            <div className={`text-center p-3 rounded-lg border-2 border-primary/20 ${getGradeBgSummary(overallAvg)}`}>
                              <div className="text-xs text-muted-foreground mb-1 font-medium">Overall Average</div>
                              <div className={`text-2xl font-bold ${getGradeColorSummary(overallAvg)}`}>
                                {overallAvg !== null ? overallAvg.toFixed(1) : "—"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <Card>
                    <CardHeader>
                      <CardTitle>Grade Records</CardTitle>
                      <CardDescription>
                        All recorded grades using the DepEd K-12 grading system
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingDetails ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : studentGrades.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No grades recorded yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Quarter</TableHead>
                                <TableHead>Written Work (25%)</TableHead>
                                <TableHead>Performance Task (50%)</TableHead>
                                <TableHead>Quarterly Assessment (25%)</TableHead>
                                <TableHead>Final Grade</TableHead>
                                <TableHead>Remarks</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentGrades.map((grade) => {
                                const finalGrade = grade.final_grade || (
                                  ((grade.written_work || 0) * 0.25) +
                                  ((grade.performance_task || 0) * 0.50) +
                                  ((grade.quarterly_assessment || 0) * 0.25)
                                );

                                const getGradeColor = (grade: number) => {
                                  if (grade >= 90) return "text-green-600";
                                  if (grade >= 85) return "text-blue-600";
                                  if (grade >= 80) return "text-yellow-600";
                                  if (grade >= 75) return "text-orange-600";
                                  return "text-red-600";
                                };

                                return (
                                  <TableRow key={grade.id}>
                                    <TableCell className="font-medium">{grade.subject}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{grade.quarter}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {grade.written_work ? grade.written_work.toFixed(1) : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {grade.performance_task ? grade.performance_task.toFixed(1) : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {grade.quarterly_assessment ? grade.quarterly_assessment.toFixed(1) : "—"}
                                    </TableCell>
                                    <TableCell className={`text-center font-bold ${getGradeColor(finalGrade)}`}>
                                      {finalGrade.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {grade.remarks || "—"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Records</CardTitle>
                      <CardDescription>
                        Recent attendance history (last 50 records)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingDetails ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : studentAttendance.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No attendance records found.</p>
                        </div>
                      ) : (
                        <>
                          {/* Attendance Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-green-600">
                                {studentAttendance.filter(a => a.status === "present").length}
                              </div>
                              <div className="text-sm text-green-600">Present</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-red-600">
                                {studentAttendance.filter(a => a.status === "absent").length}
                              </div>
                              <div className="text-sm text-red-600">Absent</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                              <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-yellow-600">
                                {studentAttendance.filter(a => a.status === "late").length}
                              </div>
                              <div className="text-sm text-yellow-600">Late</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-blue-600">
                                {studentAttendance.filter(a => a.status === "excused").length}
                              </div>
                              <div className="text-sm text-blue-600">Excused</div>
                            </div>
                          </div>

                          {/* Attendance History Table */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Remarks</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {studentAttendance.map((record) => {
                                  const getStatusColor = (status: string) => {
                                    switch (status) {
                                      case "present": return "bg-green-500";
                                      case "absent": return "bg-red-500";
                                      case "late": return "bg-yellow-500";
                                      case "excused": return "bg-blue-500";
                                      default: return "bg-gray-500";
                                    }
                                  };

                                  const getStatusIcon = (status: string) => {
                                    switch (status) {
                                      case "present": return CheckCircle;
                                      case "absent": return XCircle;
                                      case "late": return Clock;
                                      case "excused": return AlertCircle;
                                      default: return AlertCircle;
                                    }
                                  };

                                  const StatusIcon = getStatusIcon(record.status);

                                  return (
                                    <TableRow key={record.id}>
                                      <TableCell>
                                        {new Date(record.date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`${getStatusColor(record.status)} text-white`}>
                                          <StatusIcon className="h-3 w-3 mr-1" />
                                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {record.remarks || "—"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;