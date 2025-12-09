import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Student = Database["public"]["Tables"]["students"]["Insert"];

interface AdvisorAssignment {
  year_level: string;
  section: string;
  strand?: string;
}

interface StudentFormProps {
  student?: Database["public"]["Tables"]["students"]["Row"];
  onSuccess: () => void;
  onCancel: () => void;
  userRole?: string;
  advisorAssignments?: AdvisorAssignment[];
}

const StudentForm = ({ student, onSuccess, onCancel, userRole, advisorAssignments }: StudentFormProps) => {
  const [formData, setFormData] = useState<Student>({
    first_name: student?.first_name || "",
    middle_name: student?.middle_name || "",
    last_name: student?.last_name || "",
    birth_place: student?.birth_place || "",
    birth_date: student?.birth_date || "",
    address: student?.address || "",
    student_id_no: student?.student_id_no || "",
    student_lrn: student?.student_lrn || "",
    year_level: student?.year_level || "7",
    section: student?.section || "",
    strand: student?.strand || null,
    age: student?.age || null,
    gender: student?.gender || null,
    contact_number: student?.contact_number || "",
    guardian_name: student?.guardian_name || "",
    parent_contact_no: student?.parent_contact_no || "",
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const getAvailableYearLevels = () => {
    const allYearLevels = ["7", "8", "9", "10", "11", "12"];

    // If advisor role, filter year levels based on assignments
    if (userRole === "advisor" && advisorAssignments) {
      const assignedYearLevels = [...new Set(advisorAssignments.map(assignment => assignment.year_level))];
      return allYearLevels.filter(yearLevel => assignedYearLevels.includes(yearLevel));
    }

    return allYearLevels;
  };

  const getSectionsByYearLevel = (yearLevel: string) => {
    let allSections: string[] = [];

    if (["7", "8", "9", "10"].includes(yearLevel)) {
      allSections = juniorHighSections[yearLevel as keyof typeof juniorHighSections] || [];
    } else if (["11", "12"].includes(yearLevel)) {
      allSections = seniorHighSections[yearLevel as keyof typeof seniorHighSections] || [];
    }

    // If advisor role, filter sections based on assignments
    if (userRole === "advisor" && advisorAssignments) {
      const assignedSections = advisorAssignments
        .filter(assignment => assignment.year_level === yearLevel)
        .map(assignment => assignment.section);

      return allSections.filter(section => assignedSections.includes(section));
    }

    return allSections;
  };

  const getAvailableStrands = () => {
    // Only Grade 11 has strands
    if (formData.year_level !== "11") {
      return [];
    }

    // If advisor role, filter strands based on Grade 11 assignments
    if (userRole === "advisor" && advisorAssignments) {
      const assignedStrands = advisorAssignments
        .filter(assignment => assignment.year_level === "11" && assignment.strand)
        .map(assignment => assignment.strand!)
        .filter((strand, index, self) => self.indexOf(strand) === index); // Remove duplicates

      return strands.filter(strand => assignedStrands.includes(strand));
    }

    return strands;
  };

  const handleInputChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Reset section when year level changes
    if (field === "year_level") {
      setFormData(prev => ({ ...prev, section: "", strand: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate age from birth date if birth date is provided
      let calculatedAge = formData.age;
      if (formData.birth_date) {
        const today = new Date();
        const birthDate = new Date(formData.birth_date);
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      const dataToSubmit = {
        ...formData,
        age: calculatedAge,
        // Ensure strand is null for junior high students
        strand: ["7", "8", "9", "10"].includes(formData.year_level!) ? null : formData.strand,
      };

      if (student) {
        // Update existing student
        const { error } = await supabase
          .from("students")
          .update(dataToSubmit)
          .eq("id", student.id);

        if (error) {
          // Handle duplicate key errors with user-friendly messages
          if (error.code === '23505') { // PostgreSQL unique constraint violation
            if (error.message.includes('student_id_no')) {
              toast({
                variant: "destructive",
                title: "Duplicate Student ID",
                description: `Student ID "${formData.student_id_no}" is already taken by another student. Please use a different ID number.`,
              });
              return;
            } else if (error.message.includes('student_lrn')) {
              toast({
                variant: "destructive",
                title: "Duplicate LRN",
                description: `LRN "${formData.student_lrn}" is already taken by another student. Please use a different LRN.`,
              });
              return;
            } else {
              toast({
                variant: "destructive",
                title: "Duplicate Entry",
                description: "This student information already exists. Please check Student ID and LRN numbers.",
              });
              return;
            }
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student updated successfully",
        });
      } else {
        // Create new student
        const { error } = await supabase
          .from("students")
          .insert([dataToSubmit]);

        if (error) {
          // Handle duplicate key errors with user-friendly messages
          if (error.code === '23505') { // PostgreSQL unique constraint violation
            if (error.message.includes('student_id_no')) {
              toast({
                variant: "destructive",
                title: "Duplicate Student ID",
                description: `Student ID "${formData.student_id_no}" is already taken by another student. Please use a different ID number.`,
              });
              return;
            } else if (error.message.includes('student_lrn')) {
              toast({
                variant: "destructive",
                title: "Duplicate LRN",
                description: `LRN "${formData.student_lrn}" is already taken by another student. Please use a different LRN.`,
              });
              return;
            } else {
              toast({
                variant: "destructive",
                title: "Duplicate Entry",
                description: "This student information already exists. Please check Student ID and LRN numbers.",
              });
              return;
            }
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student created successfully",
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

  const isJuniorHigh = ["7", "8", "9", "10"].includes(formData.year_level!);
  const availableSections = getSectionsByYearLevel(formData.year_level!);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Name Fields */}
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleInputChange("first_name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input
            id="middle_name"
            value={formData.middle_name || ""}
            onChange={(e) => handleInputChange("middle_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleInputChange("last_name", e.target.value)}
            required
          />
        </div>

        {/* Birth Information */}
        <div className="space-y-2">
          <Label htmlFor="birth_place">Birth Place</Label>
          <Input
            id="birth_place"
            value={formData.birth_place || ""}
            onChange={(e) => handleInputChange("birth_place", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Birth Date</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date || ""}
            onChange={(e) => {
              const birthDate = e.target.value;
              handleInputChange("birth_date", birthDate);
              // Calculate age automatically
              if (birthDate) {
                const today = new Date();
                const birth = new Date(birthDate);
                let calculatedAge = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  calculatedAge--;
                }
                handleInputChange("age", calculatedAge);
              } else {
                handleInputChange("age", null);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            value={formData.age || ""}
            readOnly
            className="bg-muted"
            placeholder="Auto-calculated"
          />
        </div>

        {/* Student IDs */}
        <div className="space-y-2">
          <Label htmlFor="student_id_no">Student ID No. *</Label>
          <Input
            id="student_id_no"
            value={formData.student_id_no}
            onChange={(e) => handleInputChange("student_id_no", e.target.value)}
            required
            placeholder="e.g. 2024-000001"
          />
          <p className="text-xs text-muted-foreground">Must be unique for each student</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="student_lrn">Student LRN *</Label>
          <Input
            id="student_lrn"
            value={formData.student_lrn}
            onChange={(e) => handleInputChange("student_lrn", e.target.value)}
            required
            placeholder="e.g. 123456789012"
          />
          <p className="text-xs text-muted-foreground">Learner Reference Number - must be unique</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender || ""}
            onValueChange={(value) => handleInputChange("gender", value)}
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

        {/* Academic Information */}
        <div className="space-y-2">
          <Label htmlFor="year_level">Year Level *</Label>
          <Select
            value={formData.year_level}
            onValueChange={(value) => handleInputChange("year_level", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year level" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableYearLevels().map((yearLevel) => (
                <SelectItem key={yearLevel} value={yearLevel}>
                  Grade {yearLevel} ({["7", "8", "9", "10"].includes(yearLevel) ? "Junior High" : "Senior High"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="section">Section *</Label>
          <Select
            value={formData.section}
            onValueChange={(value) => handleInputChange("section", value)}
          >
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

        {!isJuniorHigh && (
          <div className="space-y-2">
            <Label htmlFor="strand">Strand</Label>
            <Select
              value={formData.strand || ""}
              onValueChange={(value) => handleInputChange("strand", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strand" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableStrands().map((strand) => (
                  <SelectItem key={strand} value={strand}>
                    {strand.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2">
          <Label htmlFor="contact_number">Contact Number</Label>
          <Input
            id="contact_number"
            value={formData.contact_number || ""}
            onChange={(e) => handleInputChange("contact_number", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_name">Name of Guardian</Label>
          <Input
            id="guardian_name"
            value={formData.guardian_name || ""}
            onChange={(e) => handleInputChange("guardian_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent_contact_no">Parent Contact No.</Label>
          <Input
            id="parent_contact_no"
            value={formData.parent_contact_no || ""}
            onChange={(e) => handleInputChange("parent_contact_no", e.target.value)}
          />
        </div>
      </div>

      {/* Address - Full Width */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => handleInputChange("address", e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default StudentForm;