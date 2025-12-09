import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Search, Filter, Users, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"] & {
  students: Student;
};

const Attendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("");
  const { toast } = useToast();

  const attendanceStatuses = [
    { value: "present", label: "Present", icon: CheckCircle, color: "bg-green-500" },
    { value: "absent", label: "Absent", icon: XCircle, color: "bg-red-500" },
    { value: "late", label: "Late", icon: Clock, color: "bg-yellow-500" },
    { value: "excused", label: "Excused", icon: AlertCircle, color: "bg-blue-500" }
  ];

  // Section mappings
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

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchStudents();
      fetchAttendance();
    }
  }, [userRole, selectedDate]);

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
      let query = supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      // Role-based filtering (same logic as other pages)
      if (userRole === "advisor") {
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
              // Filter students based on advisor assignments
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
              return;
            }
          }
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

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students!attendance_student_id_fkey (
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
        .eq("date", selectedDate);

      if (error) throw error;

      // Apply same role-based filtering as students
      let filteredAttendance = data || [];

      if (userRole === "advisor") {
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
              filteredAttendance = data?.filter(record => {
                return advisor.advisor_assignments.some(assignment => {
                  const matchesYearLevel = record.students.year_level === assignment.year_level;
                  const matchesSection = record.students.section === assignment.section;

                  if (assignment.strand) {
                    const matchesStrand = record.students.strand === assignment.strand;
                    return matchesYearLevel && matchesSection && matchesStrand;
                  } else {
                    return matchesYearLevel && matchesSection;
                  }
                });
              }) || [];
            }
          }
        }
      }

      setAttendance(filteredAttendance);
    } catch (error: any) {
      console.error("Error fetching attendance:", error);
    }
  };

  const updateAttendance = async (studentId: string, status: string, remarks: string = "") => {
    try {
      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: studentId,
          date: selectedDate,
          status,
          remarks: remarks || null,
        }, {
          onConflict: 'student_id,date'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance updated successfully",
      });

      fetchAttendance();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update attendance: " + error.message,
      });
    }
  };

  const getAttendanceForStudent = (studentId: string) => {
    return attendance.find(record => record.student_id === studentId);
  };

  const getSectionsByYearLevel = (yearLevel: string) => {
    if (["7", "8", "9", "10"].includes(yearLevel)) {
      return juniorHighSections[yearLevel as keyof typeof juniorHighSections] || [];
    } else if (["11", "12"].includes(yearLevel)) {
      return seniorHighSections[yearLevel as keyof typeof seniorHighSections] || [];
    }
    return [];
  };

  const filteredStudents = students.filter((student) => {
    const studentName = `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.toLowerCase();
    const studentId = student.student_id_no.toLowerCase();

    const matchesSearch =
      studentName.includes(searchTerm.toLowerCase()) ||
      studentId.includes(searchTerm.toLowerCase());

    const matchesYearLevel = selectedYearLevel === "all" || student.year_level === selectedYearLevel;
    const matchesSection = selectedSection === "all" || student.section === selectedSection;

    return matchesSearch && matchesYearLevel && matchesSection;
  });

  // Calculate attendance statistics
  const attendanceStats = {
    total: filteredStudents.length,
    present: attendance.filter(record => record.status === "present").length,
    absent: attendance.filter(record => record.status === "absent").length,
    late: attendance.filter(record => record.status === "late").length,
    excused: attendance.filter(record => record.status === "excused").length,
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
        <p className="text-muted-foreground">Track and manage student attendance records</p>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{attendanceStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {attendanceStatuses.map((status) => (
          <Card key={status.value} className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <status.icon className={`h-5 w-5 text-white p-1 rounded ${status.color}`} />
                <div>
                  <div className="text-2xl font-bold">
                    {attendanceStats[status.value as keyof typeof attendanceStats]}
                  </div>
                  <div className="text-sm text-muted-foreground">{status.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date Selection and Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Date Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or ID..."
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
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>
            Attendance for {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </CardTitle>
          <CardDescription>
            Click on status buttons to mark attendance for each student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No students found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade & Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const studentAttendance = getAttendanceForStudent(student.id);
                    const currentStatus = studentAttendance?.status;

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {student.first_name} {student.middle_name && `${student.middle_name} `}{student.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student.student_id_no}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="outline">Grade {student.year_level}</Badge>
                            <Badge variant="secondary">{student.section}</Badge>
                            {student.strand && (
                              <Badge className="bg-secondary text-secondary-foreground">
                                {student.strand.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {currentStatus && (
                            <Badge className={attendanceStatuses.find(s => s.value === currentStatus)?.color + " text-white"}>
                              {attendanceStatuses.find(s => s.value === currentStatus)?.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {attendanceStatuses.map((status) => (
                              <Button
                                key={status.value}
                                size="sm"
                                variant={currentStatus === status.value ? "default" : "outline"}
                                className={`h-8 px-2 ${currentStatus === status.value ? status.color : ""}`}
                                onClick={() => updateAttendance(student.id, status.value)}
                              >
                                <status.icon className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {studentAttendance?.remarks || "—"}
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

      {filteredStudents.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredStudents.length} students for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Attendance;