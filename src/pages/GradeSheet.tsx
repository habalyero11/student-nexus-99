import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import GradeGrid from "@/components/grades/GradeGrid";
import { supabase } from "@/integrations/supabase/client";
import { useGradingSystem } from "@/hooks/useGradingSystem";
import { Filter, Grid3X3, Calculator } from "lucide-react";

const GradeSheet = () => {
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("7");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("");
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [advisorAssignments, setAdvisorAssignments] = useState<Array<{
    year_level: string;
    section: string;
    strand?: string;
    subjects?: string[];
  }>>([]);
  const [availableYearLevels, setAvailableYearLevels] = useState<string[]>([]);
  const { gradingSystem } = useGradingSystem();

  // Section mappings
  const allSections = {
    "7": ["Archimedes", "Laplace", "Miletus"],
    "8": ["Herschel", "Linnaeus", "Pythagoras"],
    "9": ["Ptolemy", "Euclid", "Pascal"],
    "10": ["Hypatia", "Euler", "Lagrange"],
    "11": ["Maxwell"],
    "12": ["Einstein", "Newton", "Aristotle", "Pasteur"],
  };

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
    fetchUserProfile();
  }, []);

  // Ensure initial data is set after advisor assignments load
  useEffect(() => {
    if (userRole === "advisor" && advisorAssignments.length > 0) {
      // Re-trigger section and subject filtering when assignments are loaded
      const yearLevels = [...new Set(advisorAssignments.map(a => a.year_level))];
      setAvailableYearLevels(yearLevels);

      // Set initial year level to first available if current one is not valid
      if (yearLevels.length > 0 && !yearLevels.includes(selectedYearLevel)) {
        setSelectedYearLevel(yearLevels[0]);
      }
    }
  }, [advisorAssignments, userRole]);

  useEffect(() => {
    // Update available sections and subjects when year level changes
    let sections = allSections[selectedYearLevel as keyof typeof allSections] || [];

    // If advisor, filter sections based on assignments
    if (userRole === "advisor" && advisorAssignments.length > 0) {
      const assignedSections = advisorAssignments
        .filter(assignment => assignment.year_level === selectedYearLevel)
        .map(assignment => assignment.section);

      sections = sections.filter(section => assignedSections.includes(section));
    }

    setAvailableSections(sections);

    if (!selectedSection || !sections.includes(selectedSection)) {
      setSelectedSection(sections[0] || "");
    }

    let subjects = getSubjectsByGradeLevel(selectedYearLevel);

    // If advisor, filter subjects based on assignments for the SPECIFIC year level
    if (userRole === "advisor" && advisorAssignments.length > 0) {
      const assignedSubjectsForYearLevel = new Set<string>();

      // Only collect subjects assigned to this advisor for the CURRENT selected year level
      advisorAssignments
        .filter(assignment => assignment.year_level === selectedYearLevel)
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

    setAvailableSubjects(subjects);

    // Auto-select "all" if no subject is selected or if current selection is not available
    if (selectedSubject !== "all" && !subjects.includes(selectedSubject)) {
      setSelectedSubject("all");
    }

    // If there are no subjects available for advisor, clear the selection
    if (userRole === "advisor" && subjects.length === 0 && selectedSubject !== "all") {
      setSelectedSubject("all");
    }
  }, [selectedYearLevel, userRole, advisorAssignments]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = data?.role || "";
      setUserRole(role);

      // If advisor, fetch their assignments
      if (role === "advisor") {
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
              advisor_assignments(year_level, section, strand, subjects)
            `)
            .eq("profile_id", profile.id)
            .single();

          if (advisor?.advisor_assignments) {
            setAdvisorAssignments(advisor.advisor_assignments);

            // Set available year levels for advisor
            const yearLevels = [...new Set(advisor.advisor_assignments.map(a => a.year_level))];
            setAvailableYearLevels(yearLevels);

            // Set initial year level to first available
            if (yearLevels.length > 0 && !yearLevels.includes(selectedYearLevel)) {
              setSelectedYearLevel(yearLevels[0]);
            }
          }
        }
      } else {
        // Admin can see all year levels
        setAvailableYearLevels(["7", "8", "9", "10", "11", "12"]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Grade Sheet</h1>
        <p className="text-muted-foreground">Excel-like grade entry interface for efficient bulk grading</p>
      </div>


      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Grade Sheet Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year Level</label>
              <Select value={selectedYearLevel} onValueChange={setSelectedYearLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYearLevels.map((yearLevel) => (
                    <SelectItem key={yearLevel} value={yearLevel}>
                      Grade {yearLevel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={userRole === "advisor" && availableSubjects.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    userRole === "advisor" && availableSubjects.length === 0
                      ? "No subjects assigned"
                      : "Select subject"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.length > 0 && (
                    <SelectItem value="all">
                      {userRole === "advisor" ? "All Assigned Subjects" : "All Subjects"}
                    </SelectItem>
                  )}
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userRole === "advisor" && availableSubjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No subjects assigned to you for this year level. Contact admin.
                </p>
              )}
            </div>
          </div>

          {/* Current Selection Summary */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm font-medium">Current Selection:</span>
            <Badge variant="outline">Grade {selectedYearLevel}</Badge>
            <Badge variant="secondary">{selectedSection}</Badge>
            <Badge variant="outline">{selectedQuarter} Quarter</Badge>
            <Badge className="bg-primary/10 text-primary">
              {selectedSubject === "all" ? "All Subjects" : selectedSubject}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grade Grid */}
      {selectedYearLevel && selectedSection && selectedQuarter && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Grade Entry Grid - Grade {selectedYearLevel} {selectedSection}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GradeGrid
              selectedYearLevel={selectedYearLevel}
              selectedSection={selectedSection}
              selectedQuarter={selectedQuarter}
              selectedSubject={selectedSubject}
              userRole={userRole}
              advisorAssignments={advisorAssignments}
            />
          </CardContent>
        </Card>
      )}

      {/* Current Grading System Reference */}
      <Card className="shadow-soft bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">
            {gradingSystem?.name || "DepEd K-12"} Grading System
          </CardTitle>
          {gradingSystem?.description && (
            <p className="text-blue-700 text-sm">{gradingSystem.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Grade Components</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Written Work (WW): {gradingSystem?.written_work_percentage || 25}%</li>
                <li>• Performance Task (PT): {gradingSystem?.performance_task_percentage || 50}%</li>
                <li>• Quarterly Assessment (QA): {gradingSystem?.quarterly_assessment_percentage || 25}%</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Grade Scale</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• 90-100: Outstanding</li>
                <li>• 85-89: Very Satisfactory</li>
                <li>• 80-84: Satisfactory</li>
                <li>• 75-79: Fairly Satisfactory</li>
                <li>• Below 75: Did Not Meet Expectations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeSheet;