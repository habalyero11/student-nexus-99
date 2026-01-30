import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DefaultPasswordDialog } from "@/components/student/DefaultPasswordDialog";
import { Hash, Lock, Eye, EyeOff, ArrowLeft, School } from "lucide-react";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultPasswordOpen, setDefaultPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your Student ID." });
      return;
    }
    if (!password) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your password." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("student-portal-login", {
        body: { student_id_no: studentId.trim(), password },
      });

      if (error || data?.error) {
        const message = (error as any)?.message || data?.error || "Failed to sign in.";

        // Provide more specific error messages
        let errorDescription = message;
        if (message === "Invalid Student ID or password") {
          errorDescription = "Invalid Student ID or password. Please check your credentials and try again.";
        } else if (message.includes("network") || message.includes("fetch")) {
          errorDescription = "Network error. Please check your internet connection and try again.";
        }

        toast({
          variant: "destructive",
          title: "Login Failed",
          description: errorDescription,
        });
        return;
      }

      navigate("/student-portal", { state: data });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <Card className="w-full max-w-md shadow-lg border-0 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <School className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Student Portal</CardTitle>
          <CardDescription>Sign in with your Student ID and password to view your grades and attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="studentId"
                  type="text"
                  placeholder="Enter your ID number"
                  className="pl-10"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground space-x-3">
              <Link to="/student/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              <button
                type="button"
                onClick={() => setDefaultPasswordOpen(true)}
                className="text-primary hover:underline"
              >
                Default password?
              </button>
            </p>
          </form>
        </CardContent>
      </Card>

      <DefaultPasswordDialog open={defaultPasswordOpen} onOpenChange={setDefaultPasswordOpen} />

      <p className="mt-6 text-sm text-muted-foreground">
        Faculty? <Link to="/auth" className="text-primary hover:underline">Sign in here</Link>
      </p>
    </div>
  );
};

export default StudentLogin;
