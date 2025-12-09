import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Plus, X } from "lucide-react";

type Advisor = Database["public"]["Tables"]["advisors"]["Row"] & {
  profiles: Database["public"]["Tables"]["profiles"]["Row"];
  advisor_assignments: Database["public"]["Tables"]["advisor_assignments"]["Row"][];
};

interface AdvisorFormProps {
  advisor?: Advisor;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProfileData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  role: "admin" | "advisor";
}

interface AdvisorData {
  birth_place: string;
  birth_date: string;
  address: string;
  contact_number: string;
  employee_no: string;
  position: string;
  age: number | null;
  gender: "male" | "female" | null;
  civil_status: "single" | "married" | "widowed" | "separated" | "divorced" | null;
  years_of_service: number | null;
  tribe: string;
  religion: string;
}

interface Assignment {
  year_level: Database["public"]["Enums"]["year_level"];
  section: string;
  strand?: Database["public"]["Enums"]["strand"];
  subjects?: string[];
}

interface MultiSelectAssignment {
  year_levels: string[];
  sections: string[];
  strand?: Database["public"]["Enums"]["strand"];
}

const AdvisorForm = ({ advisor, onSuccess, onCancel }: AdvisorFormProps) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: advisor?.profiles.first_name || "",
    middle_name: advisor?.profiles.middle_name || "",
    last_name: advisor?.profiles.last_name || "",
    email: advisor?.profiles.email || "",
    role: advisor?.profiles.role || "advisor",
  });

  const [advisorData, setAdvisorData] = useState<AdvisorData>({
    birth_place: advisor?.birth_place || "",
    birth_date: advisor?.birth_date || "",
    address: advisor?.address || "",
    contact_number: advisor?.contact_number || "",
    employee_no: advisor?.employee_no || "",
    position: advisor?.position || "",
    age: advisor?.age || null,
    gender: advisor?.gender || null,
    civil_status: advisor?.civil_status || null,
    years_of_service: advisor?.years_of_service || null,
    tribe: advisor?.tribe || "",
    religion: advisor?.religion || "",
  });

  const [assignments, setAssignments] = useState<Assignment[]>(
    advisor?.advisor_assignments.map(a => ({
      year_level: a.year_level,
      section: a.section,
      strand: a.strand,
      subjects: a.subjects || [],
    })) || []
  );

  const [selectedYearLevels, setSelectedYearLevels] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedStrand, setSelectedStrand] = useState<string>("none");
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string[]>>({});

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const strands = ["humms", "stem", "gas", "abm", "ict"] as const;

  // Subject curriculum mapping based on subjects.md
  const subjectsByGrade: Record<string, string[]> = {
    "7": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"],
    "8": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values"],
    "9": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"],
    "10": ["Filipino", "English", "Science", "Math", "AP", "MAPEH", "TLE", "GMRC", "Values", "Elective"],
    "11": [
      // 1st Semester
      "Oral Communication",
      "Introduction to the Philosophy of the Human Person",
      "Empowerment Technology",
      "P.E - 1",
      "Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino",
      "General Mathematics",
      "Pre-calculus",
      "Earth Science",
      // 2nd Semester
      "Reading and Writing",
      "Disaster Readiness and Risk Reduction",
      "Media and Information Literacy",
      "P.E - 2",
      "Pagbasa at Pagsusuri sa Ibat Ibang Teksto",
      "Statistics and Probability",
      "Basic Calculus",
      "Practical Research 1",
      "General Chemistry 1"
    ],
    "12": [] // To be defined based on curriculum
  };

  const getSectionsByYearLevel = (yearLevel: string) => {
    if (["7", "8", "9", "10"].includes(yearLevel)) {
      return juniorHighSections[yearLevel as keyof typeof juniorHighSections] || [];
    } else if (["11", "12"].includes(yearLevel)) {
      return seniorHighSections[yearLevel as keyof typeof seniorHighSections] || [];
    }
    return [];
  };

  const getAllAvailableSections = () => {
    const allSections = new Set<string>();
    selectedYearLevels.forEach(yearLevel => {
      getSectionsByYearLevel(yearLevel).forEach(section => {
        allSections.add(section);
      });
    });
    return Array.from(allSections).sort();
  };

  const getAvailableSubjectsForGrade = (yearLevel: string): string[] => {
    return subjectsByGrade[yearLevel] || [];
  };

  const toggleSubjectForAssignment = (assignmentKey: string, subject: string) => {
    setSelectedSubjects(prev => {
      const currentSubjects = prev[assignmentKey] || [];
      const newSubjects = currentSubjects.includes(subject)
        ? currentSubjects.filter(s => s !== subject)
        : [...currentSubjects, subject];

      return {
        ...prev,
        [assignmentKey]: newSubjects
      };
    });
  };

  const generateAssignmentsFromSelection = (): Assignment[] => {
    const assignments: Assignment[] = [];
    selectedYearLevels.forEach(yearLevel => {
      selectedSections.forEach(section => {
        // Check if this section is valid for this year level
        const validSections = getSectionsByYearLevel(yearLevel);
        if (validSections.includes(section)) {
          const assignmentKey = `${yearLevel}-${section}`;
          const assignedSubjects = selectedSubjects[assignmentKey] || [];

          assignments.push({
            year_level: yearLevel as Database["public"]["Enums"]["year_level"],
            section: section,
            strand: yearLevel === "11" && selectedStrand && selectedStrand !== "none" ? selectedStrand as Database["public"]["Enums"]["strand"] : undefined,
            subjects: assignedSubjects,
          });
        }
      });
    });
    return assignments;
  };

  const toggleYearLevel = (yearLevel: string) => {
    setSelectedYearLevels(prev => {
      const newYearLevels = prev.includes(yearLevel)
        ? prev.filter(yl => yl !== yearLevel)
        : [...prev, yearLevel];

      // Reset strand if Grade 11 is deselected
      if (yearLevel === "11" && prev.includes("11")) {
        setSelectedStrand("none");
      }

      // If removing a year level, clean up its sections and subjects
      if (prev.includes(yearLevel)) {
        setSelectedSections(currentSections => {
          const sectionsForThisYear = getSectionsByYearLevel(yearLevel);
          return currentSections.filter(section => {
            // Keep section if it's valid for other selected year levels
            return newYearLevels.some(yl =>
              getSectionsByYearLevel(yl).includes(section)
            );
          });
        });

        // Clean up subjects for removed year level
        setSelectedSubjects(currentSubjects => {
          const newSubjects = { ...currentSubjects };
          Object.keys(newSubjects).forEach(key => {
            if (key.startsWith(`${yearLevel}-`)) {
              delete newSubjects[key];
            }
          });
          return newSubjects;
        });
      }

      return newYearLevels;
    });
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev => {
      const newSections = prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section];

      // If removing a section, clean up its subjects
      if (prev.includes(section)) {
        setSelectedSubjects(currentSubjects => {
          const newSubjects = { ...currentSubjects };
          selectedYearLevels.forEach(yearLevel => {
            const key = `${yearLevel}-${section}`;
            delete newSubjects[key];
          });
          return newSubjects;
        });
      }

      return newSections;
    });
  };

  // Initialize multi-select state from existing advisor assignments
  React.useEffect(() => {
    if (advisor?.advisor_assignments) {
      const yearLevels = [...new Set(advisor.advisor_assignments.map(a => a.year_level))];
      const sections = [...new Set(advisor.advisor_assignments.map(a => a.section))];
      const strand = advisor.advisor_assignments.find(a => a.strand)?.strand || "none";

      // Initialize subjects from existing assignments
      const subjectsMap: Record<string, string[]> = {};
      advisor.advisor_assignments.forEach(assignment => {
        const key = `${assignment.year_level}-${assignment.section}`;
        subjectsMap[key] = assignment.subjects || [];
      });

      setSelectedYearLevels(yearLevels);
      setSelectedSections(sections);
      setSelectedStrand(strand);
      setSelectedSubjects(subjectsMap);
    }
  }, [advisor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate age from birth date if birth date is provided
      let calculatedAge = advisorData.age;
      if (advisorData.birth_date) {
        const today = new Date();
        const birthDate = new Date(advisorData.birth_date);
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      if (advisor) {
        // Update existing advisor
        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_name: profileData.first_name,
            middle_name: profileData.middle_name,
            last_name: profileData.last_name,
            email: profileData.email,
            role: profileData.role,
          })
          .eq("id", advisor.profiles.id);

        if (profileError) throw profileError;

        // Update advisor details
        const { error: advisorError } = await supabase
          .from("advisors")
          .update({
            ...advisorData,
            age: calculatedAge,
          })
          .eq("id", advisor.id);

        if (advisorError) throw advisorError;

        // Update assignments - delete existing and create new ones
        const { error: deleteError } = await supabase
          .from("advisor_assignments")
          .delete()
          .eq("advisor_id", advisor.id);

        if (deleteError) throw deleteError;

        // Generate assignments from multi-select
        const finalAssignments = generateAssignmentsFromSelection();

        if (finalAssignments.length > 0) {
          const assignmentsToInsert = finalAssignments
            .filter(a => a.section) // Only insert assignments with sections
            .map(assignment => ({
              advisor_id: advisor.id,
              year_level: assignment.year_level,
              section: assignment.section,
              strand: assignment.year_level === "11" ? assignment.strand : null,
              subjects: assignment.subjects || [],
            }));

          if (assignmentsToInsert.length > 0) {
            const { error: assignmentError } = await supabase
              .from("advisor_assignments")
              .insert(assignmentsToInsert);

            if (assignmentError) throw assignmentError;
          }
        }

        toast({
          title: "Success",
          description: "Advisor updated successfully",
        });
      } else {
        // Create new advisor
        if (!password) {
          throw new Error("Password is required for new advisors");
        }

        // Generate assignments from multi-select
        const finalAssignments = generateAssignmentsFromSelection();

        try {
          // Try Edge Function first (prevents auto-login)
          const requestBody = {
            profileData,
            advisorData: {
              ...advisorData,
              age: calculatedAge,
            },
            assignments: finalAssignments,
            password,
          };

          const { data, error } = await supabase.functions.invoke('create-advisor', {
            body: requestBody
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);
        } catch (edgeFunctionError) {
          // Fallback to direct method if Edge Function is not deployed
          console.warn("Edge Function not available, using fallback method:", edgeFunctionError);

          toast({
            title: "Info",
            description: "Using secure fallback method for user creation",
            variant: "default",
          });

          // Store current session to restore later
          const { data: currentSession } = await supabase.auth.getSession();

          // Create auth user using fallback method
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: profileData.email,
            password: password,
            options: {
              emailRedirectTo: undefined, // Disable email confirmation for staff accounts
              data: {
                first_name: profileData.first_name,
                middle_name: profileData.middle_name,
                last_name: profileData.last_name,
                role: profileData.role,
              }
            }
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error("Failed to create user");

          // Restore the current session to prevent auto-login
          if (currentSession.session) {
            await supabase.auth.setSession(currentSession.session);
          }

          // Wait a moment for the auth trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to get existing profile first (created by trigger)
          let profileResult;
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", authData.user.id)
            .single();

          if (existingProfile) {
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await supabase
              .from("profiles")
              .update({
                email: profileData.email,
                first_name: profileData.first_name,
                middle_name: profileData.middle_name,
                last_name: profileData.last_name,
                role: profileData.role,
              })
              .eq("user_id", authData.user.id)
              .select()
              .single();

            if (updateError) throw updateError;
            profileResult = updatedProfile;
          } else {
            // Create new profile if trigger didn't work
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                user_id: authData.user.id,
                email: profileData.email,
                first_name: profileData.first_name,
                middle_name: profileData.middle_name,
                last_name: profileData.last_name,
                role: profileData.role,
              })
              .select()
              .single();

            if (createError) throw createError;
            profileResult = newProfile;
          }

          // Create advisor record
          const { data: advisorResult, error: advisorError } = await supabase
            .from("advisors")
            .insert({
              profile_id: profileResult.id,
              ...advisorData,
              age: calculatedAge,
            })
            .select()
            .single();

          if (advisorError) throw advisorError;

          // Create assignments
          if (finalAssignments.length > 0) {
            const assignmentsToInsert = finalAssignments
              .filter(a => a.section)
              .map(assignment => ({
                advisor_id: advisorResult.id,
                year_level: assignment.year_level,
                section: assignment.section,
                strand: assignment.year_level === "11" ? assignment.strand : null,
                subjects: assignment.subjects || [],
              }));

            if (assignmentsToInsert.length > 0) {
              const { error: assignmentError } = await supabase
                .from("advisor_assignments")
                .insert(assignmentsToInsert);

              if (assignmentError) throw assignmentError;
            }
          }
        }

        toast({
          title: "Success",
          description: "Advisor created successfully",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information - Combined section */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name and Account Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={profileData.middle_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, middle_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={profileData.role}
                onValueChange={(value: "admin" | "advisor") => setProfileData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advisor">Advisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!advisor && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}
          </div>

          {/* Birth and Personal Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="birth_place">Birth Place</Label>
              <Input
                id="birth_place"
                value={advisorData.birth_place}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, birth_place: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                value={advisorData.birth_date}
                onChange={(e) => {
                  const birthDate = e.target.value;
                  // Calculate age automatically
                  let calculatedAge: number | null = null;
                  if (birthDate) {
                    const today = new Date();
                    const birth = new Date(birthDate);
                    calculatedAge = today.getFullYear() - birth.getFullYear();
                    const monthDiff = today.getMonth() - birth.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                      calculatedAge--;
                    }
                  }
                  setAdvisorData(prev => ({ ...prev, birth_date: birthDate, age: calculatedAge }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={advisorData.age || ""}
                readOnly
                className="bg-muted"
                placeholder="Auto-calculated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={advisorData.gender || ""}
                onValueChange={(value: "male" | "female") => setAdvisorData(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="civil_status">Civil Status</Label>
              <Select
                value={advisorData.civil_status || ""}
                onValueChange={(value: "single" | "married" | "widowed" | "separated" | "divorced") =>
                  setAdvisorData(prev => ({ ...prev, civil_status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select civil status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribe">Tribe</Label>
              <Input
                id="tribe"
                value={advisorData.tribe}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, tribe: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={advisorData.religion}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, religion: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={advisorData.address}
              onChange={(e) => setAdvisorData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                value={advisorData.contact_number}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, contact_number: e.target.value }))}
                placeholder="09XX-XXX-XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook_link">Facebook Link</Label>
              <Input
                id="facebook_link"
                value={(advisorData as any).facebook_link || ""}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, facebook_link: e.target.value } as any))}
                placeholder="https://facebook.com/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_link">Other Link</Label>
              <Input
                id="other_link"
                value={(advisorData as any).other_link || ""}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, other_link: e.target.value } as any))}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_no">Employee Number</Label>
              <Input
                id="employee_no"
                value={advisorData.employee_no}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, employee_no: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={advisorData.position}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, position: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_of_service">Years of Service</Label>
              <Input
                id="years_of_service"
                type="number"
                value={advisorData.years_of_service || ""}
                onChange={(e) => setAdvisorData(prev => ({ ...prev, years_of_service: e.target.value ? parseInt(e.target.value) : null }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Section Assignments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select multiple year levels and sections this advisor will handle
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Year Level Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Year Levels</Label>
            <div className="flex flex-col space-y-2">
              {["7", "8", "9", "10", "11", "12"].map((yearLevel) => (
                <div key={yearLevel} className="flex items-center space-x-2">
                  <Checkbox
                    id={`year-${yearLevel}`}
                    checked={selectedYearLevels.includes(yearLevel)}
                    onCheckedChange={() => toggleYearLevel(yearLevel)}
                  />
                  <Label htmlFor={`year-${yearLevel}`} className="text-sm">
                    Grade {yearLevel}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Section Selection */}
          {selectedYearLevels.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Sections</Label>
              <p className="text-xs text-muted-foreground">
                Available sections based on selected year levels
              </p>
              <div className="flex flex-col space-y-2">
                {getAllAvailableSections().map((section) => (
                  <div key={section} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section}`}
                      checked={selectedSections.includes(section)}
                      onCheckedChange={() => toggleSection(section)}
                    />
                    <Label htmlFor={`section-${section}`} className="text-sm">
                      {section}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strand Selection for Grade 11 only */}
          {selectedYearLevels.includes("11") && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Strand (for Grade 11)</Label>
              <Select value={selectedStrand} onValueChange={setSelectedStrand}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select strand (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific strand</SelectItem>
                  {strands.map((strand) => (
                    <SelectItem key={strand} value={strand}>
                      {strand.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject Assignment */}
          {selectedYearLevels.length > 0 && selectedSections.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Subject Assignments</Label>
              <p className="text-sm text-muted-foreground">
                Assign subjects to each section. Select the subjects this advisor will teach.
              </p>

              <div className="space-y-4">
                {selectedYearLevels.map(yearLevel =>
                  selectedSections
                    .filter(section => getSectionsByYearLevel(yearLevel).includes(section))
                    .map(section => {
                      const assignmentKey = `${yearLevel}-${section}`;
                      const availableSubjects = getAvailableSubjectsForGrade(yearLevel);
                      const assignedSubjects = selectedSubjects[assignmentKey] || [];

                      return (
                        <Card key={assignmentKey} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                Grade {yearLevel} - {section}
                                {yearLevel === "11" && selectedStrand && selectedStrand !== "none" && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({selectedStrand.toUpperCase()})
                                  </span>
                                )}
                              </h4>
                              <div className="text-sm text-muted-foreground">
                                {assignedSubjects.length} / {availableSubjects.length} subjects
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {availableSubjects.map(subject => (
                                <div key={subject} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${assignmentKey}-${subject}`}
                                    checked={assignedSubjects.includes(subject)}
                                    onCheckedChange={() => toggleSubjectForAssignment(assignmentKey, subject)}
                                  />
                                  <Label
                                    htmlFor={`${assignmentKey}-${subject}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {subject}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* Assignment Preview */}
          {selectedYearLevels.length > 0 && selectedSections.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Assignment Preview</Label>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm">
                  <strong>Total Assignments:</strong> {generateAssignmentsFromSelection().length}
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {generateAssignmentsFromSelection().map((assignment, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      Grade {assignment.year_level} - {assignment.section}
                      {assignment.strand && assignment.strand !== "none" && ` (${assignment.strand.toUpperCase()})`}
                      {assignment.subjects && assignment.subjects.length > 0 && (
                        <span className="ml-2 font-medium">
                          [{assignment.subjects.length} subject{assignment.subjects.length !== 1 ? 's' : ''}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : advisor ? "Update Advisor" : "Create Advisor"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AdvisorForm;