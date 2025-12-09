import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").optional(),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  employeeNo: z.string().optional(),
  position: z.string().optional(),
  contactNumber: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  civilStatus: z.enum(["single", "married", "widowed", "separated", "divorced"]).optional(),
  yearsOfService: z.string().optional(),
  tribe: z.string().optional(),
  religion: z.string().optional(),
});

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    middleName: "",
    lastName: "",
    employeeNo: "",
    position: "",
    contactNumber: "",
    gender: "" as "male" | "female" | "",
    birthPlace: "",
    birthDate: "",
    address: "",
    civilStatus: "" as "single" | "married" | "widowed" | "separated" | "divorced" | "",
    yearsOfService: "",
    tribe: "",
    religion: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.parse({
        email: formData.email,
        password: formData.password,
        ...(isLogin ? {} : {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          employeeNo: formData.employeeNo,
          position: formData.position,
          contactNumber: formData.contactNumber,
          gender: formData.gender || undefined,
          birthPlace: formData.birthPlace,
          birthDate: formData.birthDate,
          address: formData.address,
          civilStatus: formData.civilStatus || undefined,
          yearsOfService: formData.yearsOfService,
          tribe: formData.tribe,
          religion: formData.religion,
        }),
      });

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.email,
          password: validation.password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        navigate("/dashboard");
      } else {
        // First create the auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validation.email,
          password: validation.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              first_name: validation.firstName,
              middle_name: formData.middleName || null,
              last_name: validation.lastName,
              role: "advisor", // Always register as advisor
            },
          },
        });

        if (authError) throw authError;

        // Wait a moment for the auth trigger to create the profile
        if (authData.user) {
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Get the profile that was created by the trigger
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", authData.user.id)
            .single();

          if (!profileError && profile) {
            // Calculate age
            let calculatedAge = null;
            if (formData.birthDate) {
              const today = new Date();
              const birthDate = new Date(formData.birthDate);
              calculatedAge = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
              }
            }

            // Create the advisor record with additional details
            const { error: advisorError } = await supabase
              .from("advisors")
              .insert({
                profile_id: profile.id,
                employee_no: formData.employeeNo || null,
                position: formData.position || null,
                contact_number: formData.contactNumber || null,
                gender: formData.gender || null,
                birth_place: formData.birthPlace || null,
                birth_date: formData.birthDate || null,
                address: formData.address || null,
                civil_status: formData.civilStatus || null,
                years_of_service: formData.yearsOfService ? parseInt(formData.yearsOfService) : null,
                tribe: formData.tribe || null,
                religion: formData.religion || null,
                age: calculatedAge,
              });

            if (advisorError) {
              console.error("Failed to create advisor record:", advisorError);
            }
          }
        }

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account. After verification, an administrator will assign you to your sections.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className={`w-full ${!isLogin ? 'max-w-4xl' : 'max-w-md'} shadow-strong transition-all duration-300`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Welcome Back" : "Advisor Registration"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to access the CSU-ULS management system"
              : "Create your advisor account for CSU-ULS"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Personal Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Juan"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        required={!isLogin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        type="text"
                        placeholder="Santos"
                        value={formData.middleName}
                        onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Dela Cruz"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required={!isLogin}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Birth Date</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthPlace">Birth Place</Label>
                      <Input
                        id="birthPlace"
                        type="text"
                        placeholder="City/Province"
                        value={formData.birthPlace}
                        onChange={(e) => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value: "male" | "female") =>
                          setFormData(prev => ({ ...prev, gender: value }))
                        }
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
                      <Label htmlFor="civilStatus">Civil Status</Label>
                      <Select
                        value={formData.civilStatus}
                        onValueChange={(value: "single" | "married" | "widowed" | "separated" | "divorced") =>
                          setFormData(prev => ({ ...prev, civilStatus: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Complete Address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Professional & Additional Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Professional & Additional</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeNo">Employee No.</Label>
                      <Input
                        id="employeeNo"
                        type="text"
                        placeholder="EMP-001"
                        value={formData.employeeNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeNo: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        type="text"
                        placeholder="Teacher I"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearsOfService">Years of Service</Label>
                      <Input
                        id="yearsOfService"
                        type="number"
                        placeholder="0"
                        value={formData.yearsOfService}
                        onChange={(e) => setFormData(prev => ({ ...prev, yearsOfService: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        type="text"
                        placeholder="09XX-XXX-XXXX"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tribe">Tribe</Label>
                      <Input
                        id="tribe"
                        type="text"
                        placeholder="Optional"
                        value={formData.tribe}
                        onChange={(e) => setFormData(prev => ({ ...prev, tribe: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="religion">Religion</Label>
                      <Input
                        id="religion"
                        type="text"
                        placeholder="Optional"
                        value={formData.religion}
                        onChange={(e) => setFormData(prev => ({ ...prev, religion: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`space-y-4 ${!isLogin ? 'pt-4 border-t' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="advisor@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password *</Label>
                  {isLogin && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Enter your password" : "Minimum 6 characters"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                Note: Section assignments will be configured by the administrator after your account is verified.
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-all"
              disabled={loading}
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin
                ? "Don't have an account? Register as Advisor"
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};