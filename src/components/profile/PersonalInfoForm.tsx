import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, User, Briefcase, MapPin, Calendar, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfilePictureUpload from "./ProfilePictureUpload";

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: "admin" | "advisor";
}

interface AdvisorData {
  id: string;
  profile_id: string;
  birth_place?: string;
  birth_date?: string;
  address?: string;
  contact_number?: string;
  employee_no?: string;
  position?: string;
  age?: number;
  gender?: "male" | "female";
  civil_status?: "single" | "married" | "widowed" | "separated" | "divorced";
  years_of_service?: number;
  tribe?: string;
  religion?: string;
}

interface PersonalInfoFormProps {
  profile: ProfileData;
  advisorData: AdvisorData | null;
  onUpdate: (data: Partial<ProfileData & AdvisorData>) => Promise<void>;
}

interface FormData {
  // Profile fields
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  // Advisor fields
  birth_place: string;
  birth_date: string;
  address: string;
  contact_number: string;
  employee_no: string;
  position: string;
  age: number | null;
  gender: "male" | "female" | "";
  civil_status: "single" | "married" | "widowed" | "separated" | "divorced" | "";
  years_of_service: number | null;
  tribe: string;
  religion: string;
  // Contact/Social fields
  facebook_link: string;
  other_link: string;
}

const PersonalInfoForm = ({ profile, advisorData, onUpdate }: PersonalInfoFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    birth_place: "",
    birth_date: "",
    address: "",
    contact_number: "",
    employee_no: "",
    position: "",
    age: null,
    gender: "",
    civil_status: "",
    years_of_service: null,
    tribe: "",
    religion: "",
    facebook_link: "",
    other_link: "",
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize form with existing data
    setFormData({
      first_name: profile.first_name || "",
      middle_name: profile.middle_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
      birth_place: advisorData?.birth_place || "",
      birth_date: advisorData?.birth_date || "",
      address: advisorData?.address || "",
      contact_number: advisorData?.contact_number || "",
      employee_no: advisorData?.employee_no || "",
      position: advisorData?.position || "",
      age: advisorData?.age || null,
      gender: advisorData?.gender || "",
      civil_status: advisorData?.civil_status || "",
      years_of_service: advisorData?.years_of_service || null,
      tribe: advisorData?.tribe || "",
      religion: advisorData?.religion || "",
      facebook_link: (advisorData as any)?.facebook_link || "",
      other_link: (advisorData as any)?.other_link || "",
    });
  }, [profile, advisorData]);

  useEffect(() => {
    // Check if form has changes
    const originalData = {
      first_name: profile.first_name || "",
      middle_name: profile.middle_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
      birth_place: advisorData?.birth_place || "",
      birth_date: advisorData?.birth_date || "",
      address: advisorData?.address || "",
      contact_number: advisorData?.contact_number || "",
      employee_no: advisorData?.employee_no || "",
      position: advisorData?.position || "",
      age: advisorData?.age || null,
      gender: advisorData?.gender || "",
      civil_status: advisorData?.civil_status || "",
      years_of_service: advisorData?.years_of_service || null,
      tribe: advisorData?.tribe || "",
      religion: advisorData?.religion || "",
      facebook_link: (advisorData as any)?.facebook_link || "",
      other_link: (advisorData as any)?.other_link || "",
    };

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasChanges);
  }, [formData, profile, advisorData]);

  const handleInputChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthDateChange = (birthDate: string) => {
    handleInputChange("birth_date", birthDate);
    const calculatedAge = calculateAge(birthDate);
    if (calculatedAge !== null) {
      handleInputChange("age", calculatedAge);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      toast({
        title: "No Changes",
        description: "No changes detected to save.",
      });
      return;
    }

    setLoading(true);
    try {
      await onUpdate(formData);
      setHasChanges(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Picture</span>
          </CardTitle>
          <CardDescription>
            Upload a profile photo to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePictureUpload
            currentImageUrl={(profile as any)?.avatar_url}
            firstName={formData.first_name}
            lastName={formData.last_name}
            onUploadComplete={(url) => {
              // Trigger refresh of profile data
              console.log("Profile picture updated:", url);
            }}
            size="lg"
          />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
          <CardDescription>
            Your personal identification and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => handleInputChange("middle_name", e.target.value)}
                placeholder="Enter your middle name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => handleInputChange("contact_number", e.target.value)}
                placeholder="Enter your contact number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Personal Details</span>
          </CardTitle>
          <CardDescription>
            Birth information and personal characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_place">Birth Place</Label>
              <Input
                id="birth_place"
                value={formData.birth_place}
                onChange={(e) => handleInputChange("birth_place", e.target.value)}
                placeholder="Enter your birth place"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleBirthDateChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ""}
                onChange={(e) => handleInputChange("age", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Age (auto-calculated)"
                min="1"
                max="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value: "male" | "female") => handleInputChange("gender", value)}>
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
              <Select value={formData.civil_status} onValueChange={(value: "single" | "married" | "widowed" | "separated" | "divorced") => handleInputChange("civil_status", value)}>
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
                value={formData.tribe}
                onChange={(e) => handleInputChange("tribe", e.target.value)}
                placeholder="Enter your tribe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={formData.religion}
                onChange={(e) => handleInputChange("religion", e.target.value)}
                placeholder="Enter your religion"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter your complete address"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      {profile.role === "advisor" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Professional Information</span>
            </CardTitle>
            <CardDescription>
              Employment details and work information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_no">Employee Number</Label>
                <Input
                  id="employee_no"
                  value={formData.employee_no}
                  onChange={(e) => handleInputChange("employee_no", e.target.value)}
                  placeholder="Enter your employee number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  placeholder="Enter your position"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_of_service">Years of Service</Label>
                <Input
                  id="years_of_service"
                  type="number"
                  value={formData.years_of_service || ""}
                  onChange={(e) => handleInputChange("years_of_service", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Enter years of service"
                  min="0"
                  max="50"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Contact Details</span>
          </CardTitle>
          <CardDescription>
            Your contact information and social media links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_number_section">Contact Number</Label>
              <Input
                id="contact_number_section"
                value={formData.contact_number}
                onChange={(e) => handleInputChange("contact_number", e.target.value)}
                placeholder="09XX-XXX-XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook_link">Facebook Link</Label>
              <Input
                id="facebook_link"
                value={formData.facebook_link}
                onChange={(e) => handleInputChange("facebook_link", e.target.value)}
                placeholder="https://facebook.com/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_link">Other Link (e.g., LinkedIn)</Label>
              <Input
                id="other_link"
                value={formData.other_link}
                onChange={(e) => handleInputChange("other_link", e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button
          type="submit"
          disabled={loading || !hasChanges}
          className="flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? "Saving..." : "Save Changes"}</span>
        </Button>
      </div>
    </form>
  );
};

export default PersonalInfoForm;