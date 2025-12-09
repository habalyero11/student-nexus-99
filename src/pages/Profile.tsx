import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, BookOpen, Shield, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import AdvisorAssignments from "@/components/profile/AdvisorAssignments";
import SubjectManagement from "@/components/profile/SubjectManagement";
import GradingSystemManagement from "@/components/profile/GradingSystemManagement";

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

interface Assignment {
  id: string;
  year_level: string;
  section: string;
  strand?: string;
  subjects?: string[];
}

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [advisorData, setAdvisorData] = useState<AdvisorData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const { toast } = useToast();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "User not authenticated",
        });
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user is an advisor, fetch advisor-specific data and assignments
      if (profileData.role === "advisor") {
        // Fetch advisor data
        const { data: advisorInfo, error: advisorError } = await supabase
          .from("advisors")
          .select("*")
          .eq("profile_id", profileData.id)
          .single();

        if (advisorError) {
          console.warn("No advisor data found:", advisorError);
        } else {
          setAdvisorData(advisorInfo);
        }

        // Fetch advisor assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("advisor_assignments")
          .select("*")
          .eq("advisor_id", advisorInfo?.id || "");

        if (assignmentsError) {
          console.warn("No assignments found:", assignmentsError);
        } else {
          setAssignments(assignmentsData || []);
        }
      }

    } catch (error: any) {
      console.error("Error fetching profile data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<ProfileData & AdvisorData>) => {
    try {
      // Update profile data
      if (profile) {
        const profileUpdates = {
          first_name: updatedData.first_name,
          middle_name: updatedData.middle_name,
          last_name: updatedData.last_name,
          email: updatedData.email,
        };

        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", profile.id);

        if (profileError) throw profileError;

        // Update advisor data if applicable
        if (profile.role === "advisor" && advisorData) {
          const advisorUpdates = {
            birth_place: updatedData.birth_place,
            birth_date: updatedData.birth_date,
            address: updatedData.address,
            contact_number: updatedData.contact_number,
            employee_no: updatedData.employee_no,
            position: updatedData.position,
            age: updatedData.age,
            gender: updatedData.gender,
            civil_status: updatedData.civil_status,
            years_of_service: updatedData.years_of_service,
            tribe: updatedData.tribe,
            religion: updatedData.religion,
          };

          const { error: advisorError } = await supabase
            .from("advisors")
            .update(advisorUpdates)
            .eq("id", advisorData.id);

          if (advisorError) throw advisorError;
        }

        // Refresh data
        await fetchProfileData();

        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Profile Not Found</CardTitle>
            <CardDescription className="text-center">
              Unable to load your profile information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your personal information and system preferences
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="text-sm">
              <Shield className="h-3 w-3 mr-1" />
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-4 border-primary/20">
              <AvatarImage src={(profile as any)?.avatar_url || undefined} alt="Profile picture" />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {profile.first_name?.charAt(0)?.toUpperCase()}{profile.last_name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">
                {profile.first_name} {profile.middle_name && `${profile.middle_name} `}{profile.last_name}
              </CardTitle>
              <CardDescription>
                {profile.email} • {
                  profile.role === "admin"
                    ? "Administrator"
                    : advisorData?.position || "Advisor"
                }
              </CardDescription>
              {/* Contact and Social Links */}
              <div className="flex flex-wrap gap-3 mt-2">
                {advisorData?.contact_number && (
                  <span className="text-sm text-muted-foreground">
                    📞 {advisorData.contact_number}
                  </span>
                )}
                {(advisorData as any)?.facebook_link && (
                  <a
                    href={(advisorData as any).facebook_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Facebook
                  </a>
                )}
                {(advisorData as any)?.other_link && (
                  <a
                    href={(advisorData as any).other_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Other Link
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${profile.role === "admin" ? "grid-cols-4" : "grid-cols-2"}`}>
          <TabsTrigger value="personal" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Personal Info</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>My Assignments</span>
          </TabsTrigger>
          {profile.role === "admin" && (
            <>
              <TabsTrigger value="subjects" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Subject Management</span>
              </TabsTrigger>
              <TabsTrigger value="grading" className="flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Grading System</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <PersonalInfoForm
            profile={profile}
            advisorData={advisorData}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <AdvisorAssignments
            profile={profile}
            assignments={assignments}
            onRefresh={fetchProfileData}
          />
        </TabsContent>

        {profile.role === "admin" && (
          <>
            <TabsContent value="subjects" className="space-y-6">
              <SubjectManagement />
            </TabsContent>
            <TabsContent value="grading" className="space-y-6">
              <GradingSystemManagement />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Profile;