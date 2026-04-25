import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Filter, Users, CheckCircle, XCircle, Clock, AlertCircle, Plus, CalendarDays, MoreHorizontal, CheckSquare, Trash2, Sun, Sunset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"] & {
  students: Student;
};

// New type for class sessions
type ClassSession = {
  id: string;
  date: string;
  name: string | null;
  type: 'regular' | 'special' | 'holiday';
  year_level: string;
  section: string;
  session?: SessionPart;
};

type SessionPart = 'morning' | 'afternoon';

const Attendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<SessionPart>(() => {
    // Default to current session based on local time (morning before 12:00)
    return new Date().getHours() < 12 ? 'morning' : 'afternoon';
  });
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionType, setNewSessionType] = useState<'regular' | 'special' | 'holiday'>('regular');

  const { toast } = useToast();

  const attendanceStatuses = [
    { value: "present", label: "Present", icon: CheckCircle, color: "text-green-600 bg-green-50 hover:bg-green-100 border-green-200" },
    { value: "absent", label: "Absent", icon: XCircle, color: "text-red-600 bg-red-50 hover:bg-red-100 border-red-200" },
    { value: "late", label: "Late", icon: Clock, color: "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200" },
    { value: "excused", label: "Excused", icon: AlertCircle, color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200" }
  ];

  // Section mappings (same as before)
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

  /* ... imports ... */

  // ... (inside component)
  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userRole) {
      if (selectedYearLevel !== 'all' && selectedSection !== 'all') {
        fetchSession();
      } else {
        setSession(null);
      }
      fetchStudents();
      fetchAttendance();
    }
  }, [userRole, selectedDate, selectedYearLevel, selectedSection, selectedSession]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      // Normalize role to lowercase to prevent case-sensitivity bugs
      setUserRole((data?.role || "").toLowerCase());
    }
  };

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('date', selectedDate)
        .eq('year_level', selectedYearLevel)
        .eq('section', selectedSection)
        .eq('session', selectedSession)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setSession(data);
    } catch (error) {
      // Table might not exist yet if migration wasn't run, fail silently
      console.log('Session fetch skipped or failed');
    }
  };

  const createSession = async () => {
    try {
      if (selectedYearLevel === 'all' || selectedSection === 'all') {
        toast({
          variant: "destructive",
          title: "Select Class",
          description: "Please select a specific Year Level and Section first.",
        });
        return;
      }

      const { data, error } = await supabase
        .from('class_sessions')
        .upsert({
          date: selectedDate,
          year_level: selectedYearLevel,
          section: selectedSection,
          session: selectedSession,
          name: newSessionName || (newSessionType === 'regular' ? `Regular Class (${selectedSession})` : newSessionType),
          type: newSessionType
        }, { onConflict: 'date,year_level,section,session' })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      setIsCreatingSession(false);
      setNewSessionName("");
      toast({ title: "Session Created", description: "Class session has been set up." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create session: " + error.message,
      });
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      // Role-based filtering logic (Admin see all, Advisor see assigned)
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
              .select(`id, advisor_assignments(year_level, section, strand)`)
              .eq("profile_id", profile.id)
              .single();

            if (advisor?.advisor_assignments && advisor.advisor_assignments.length > 0) {
              const { data, error } = await query;
              if (error) throw error;

              const filteredStudents = data?.filter(student => {
                return advisor.advisor_assignments.some(assignment => {
                  const matchesYearLevel = student.year_level?.trim() === assignment.year_level?.trim();
                  // Case-insensitive comparison for section
                  const studentSection = student.section?.trim().toLowerCase() || "";
                  const assignmentSection = assignment.section?.trim().toLowerCase() || "";
                  const matchesSection = studentSection === assignmentSection;

                  if (assignment.strand) {
                    return matchesYearLevel && matchesSection && student.strand === assignment.strand;
                  }
                  return matchesYearLevel && matchesSection;
                });
              }) || [];

              setStudents(filteredStudents);
              setLoading(false); // Done for advisor path
              return;
            }
          }
        }
      }

      // Admin or fallback
      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);

    } catch (error: any) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`*, students!attendance_student_id_fkey (*)`)
        .eq("date", selectedDate)
        .eq("session", selectedSession);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const updateAttendance = async (studentId: string, status: string, remarks: string = "") => {
    // If holiday, prevent marking attendance unless changed to regular
    if (session?.type === 'holiday') {
      toast({
        variant: "destructive",
        title: "Holiday",
        description: "Cannot mark attendance on a holiday session.",
      });
      return;
    }

    try {
      // Optimistic update
      const existingRecord = attendance.find(a => a.student_id === studentId);
      const newAttendance = [
        ...attendance.filter(a => a.student_id !== studentId),
        {
          ...existingRecord,
          student_id: studentId,
          status,
          remarks: remarks || "",
          date: selectedDate,
          session: selectedSession,
        } as any
      ];
      setAttendance(newAttendance);

      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: studentId,
          date: selectedDate,
          session: selectedSession,
          status,
          remarks: remarks || null,
        }, {
          onConflict: 'student_id,date,session'
        });

      if (error) throw error;

      // Don't toast on every click, it's too spammy for attendance taking
      // toast({ title: "Saved", duration: 1000 }); 
    } catch (error: any) {
      fetchAttendance(); // Revert on error
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update: " + error.message,
      });
    }
  };

  const markAll = async (status: string) => {
    if (session?.type === 'holiday') return;

    try {
      const updates = filteredStudents.map(s => ({
        student_id: s.id,
        date: selectedDate,
        session: selectedSession,
        status: status
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(updates, { onConflict: 'student_id,date,session' });

      if (error) throw error;

      toast({ title: "Updated All", description: `Marked all displayed students as ${status}` });
      fetchAttendance();
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
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

  // Filter students based on selection
  const filteredStudents = students.filter((student) => {
    const studentName = `${student.first_name} ${student.middle_name || ""} ${student.last_name}`.toLowerCase();
    const studentId = student.student_id_no.toLowerCase();

    const matchesSearch =
      studentName.includes(searchTerm.toLowerCase()) ||
      studentId.includes(searchTerm.toLowerCase());

    const matchesYearLevel = selectedYearLevel === "all" || student.year_level === selectedYearLevel;

    // Case-insensitive check for section
    const studentSection = student.section?.trim().toLowerCase() || "";
    const targetSection = selectedSection?.trim().toLowerCase() || "";

    const matchesSection = selectedSection === "all" || studentSection === targetSection;

    return matchesSearch && matchesYearLevel && matchesSection;
  });

  // Calculate stats for current view
  const stats = {
    total: filteredStudents.length,
    present: filteredStudents.filter(s => getAttendanceForStudent(s.id)?.status === 'present').length,
    absent: filteredStudents.filter(s => getAttendanceForStudent(s.id)?.status === 'absent').length,
    late: filteredStudents.filter(s => getAttendanceForStudent(s.id)?.status === 'late').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Manage daily class attendance records</p>
        </div>

        {/* Date + Session Picker */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
            <CalendarDays className="h-5 w-5 text-primary" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 w-[140px] font-medium"
            />
            <span className="text-xs text-muted-foreground pr-2 hidden sm:inline">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
          </div>

          {/* Morning / Afternoon toggle */}
          <div className="flex items-center bg-card p-1 rounded-lg border shadow-sm">
            <Button
              type="button"
              variant={selectedSession === 'morning' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedSession('morning')}
              className="gap-1 h-8"
              title="Morning session"
            >
              <Sun className="h-4 w-4" />
              AM
            </Button>
            <Button
              type="button"
              variant={selectedSession === 'afternoon' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedSession('afternoon')}
              className="gap-1 h-8"
              title="Afternoon session"
            >
              <Sunset className="h-4 w-4" />
              PM
            </Button>
          </div>
        </div>
      </div>

      {/* Weekend / non-class day hint (Sat/Sun) */}
      {(() => {
        const day = new Date(selectedDate + 'T00:00:00').getDay();
        if (day === 0 || day === 6) {
          return (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Heads up: classes meet Monday–Friday. {day === 0 ? 'Sunday' : 'Saturday'} is not a regular class day.
            </div>
          );
        }
        return null;
      })()}

      {/* Main Control Bar */}
      <Card className="shadow-sm border-none bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>

              <Select value={selectedYearLevel} onValueChange={setSelectedYearLevel}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Year Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {["7", "8", "9", "10", "11", "12"].map(y => (
                    <SelectItem key={y} value={y}>Grade {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[160px] bg-background">
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

            {/* Session Actions */}
            {selectedYearLevel !== 'all' && selectedSection !== 'all' && (
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                {session ? (
                  <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-md border border-primary/10">
                    <div className="text-sm">
                      <span className="font-semibold text-primary block">{session.name || "Regular Class"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{session.type} Session</span>
                    </div>
                    {session.type !== 'holiday' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
                            <MoreHorizontal className="h-4 w-4 text-primary" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAll('present')}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Mark All Present
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markAll('absent')}>
                            <XCircle className="mr-2 h-4 w-4" /> Mark All Absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ) : (
                  <Dialog open={isCreatingSession} onOpenChange={setIsCreatingSession}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Create Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Class Session</DialogTitle>
                        <DialogDescription>
                          Create a session for {selectedYearLevel} - {selectedSection} on {selectedDate}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Session Type</Label>
                          <Select value={newSessionType} onValueChange={(v: any) => setNewSessionType(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regular">Regular Class</SelectItem>
                              <SelectItem value="special">Special Activity</SelectItem>
                              <SelectItem value="holiday">No Class / Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Session Name (Optional)</Label>
                          <Input
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            placeholder={newSessionType === 'regular' ? "e.g. Science Period 1" : "e.g. Intramurals Day 1"}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreatingSession(false)}>Cancel</Button>
                        <Button onClick={createSession}>Create Session</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {/* Only show holiday message when a session exists and is type holiday */}
      {selectedYearLevel !== 'all' && selectedSection !== 'all' && session?.type === 'holiday' ? (
        <div className="flex flex-col items-center justify-center py-20 bg-amber-50/50 rounded-xl border border-amber-100">
          <CalendarDays className="h-16 w-16 text-amber-500/30 mb-4" />
          <h3 className="text-lg font-medium text-amber-800">{session.name}</h3>
          <p className="text-sm text-amber-600/80">No attendance required for this day.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-700">{stats.total}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-700">{stats.present}</span>
              <span className="text-xs text-green-600/70 uppercase tracking-wider">Present</span>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-red-700">{stats.absent}</span>
              <span className="text-xs text-red-600/70 uppercase tracking-wider">Absent</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-amber-700">{stats.late}</span>
              <span className="text-xs text-amber-600/70 uppercase tracking-wider">Late</span>
            </div>
          </div>

          {/* Student List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => {
              const record = getAttendanceForStudent(student.id);
              const status = record?.status;
              const activeStatus = attendanceStatuses.find(s => s.value === status);

              return (
                <Card key={student.id} className={`overflow-hidden transition-all ${status ? 'ring-1 ring-primary/20 shadow-md' : 'shadow-sm hover:shadow-md'}`}>
                  <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-800 truncate" title={`${student.first_name} ${student.last_name}`}>
                          {student.last_name}, {student.first_name}
                        </div>
                        <div className="text-xs text-muted-foreground">Grade {student.year_level} - {student.section}</div>
                      </div>
                      {status && (
                        <Badge variant="outline" className={`${activeStatus?.color.split(' ')[0]} bg-transparent border-current`}>
                          {activeStatus?.label}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {attendanceStatuses.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => updateAttendance(student.id, s.value)}
                          className={`
                                   flex flex-col items-center justify-center p-2 rounded-md transition-all border
                                   ${status === s.value
                              ? s.color + " shadow-sm scale-105 font-medium"
                              : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"}
                                 `}
                          title={s.label}
                        >
                          <s.icon className={`h-5 w-5 mb-1 ${status === s.value ? "fill-current" : ""}`} />
                          <span className="text-[10px]">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No students found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;