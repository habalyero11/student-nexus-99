import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DefaultPasswordDialog } from "@/components/student/DefaultPasswordDialog";
import { ArrowLeft, Hash, CheckCircle, School } from "lucide-react";

const StudentForgotPassword = () => {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [defaultPasswordOpen, setDefaultPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your Student ID." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-student-password-reset", {
        body: { student_id_no: studentId.trim() },
      });

      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message || "Request failed." });
        return;
      }
      if (data?.error) {
        toast({ variant: "destructive", title: "Error", description: data.error });
        return;
      }
      setDone(true);
      toast({ title: "Request submitted", description: data?.message || "Your advisor and admin have been notified." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Link to="/student-login" className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle>Request received</CardTitle>
            <CardDescription>
              Your advisor and admin have been notified. Please approach your advisor or the office to confirm your identity and have your password reset to the default (1234). You will be asked to change it when you next sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild><Link to="/student-login">Back to Student Login</Link></Button>
            <Button variant="ghost" asChild><Link to="/">Home</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Link to="/student-login" className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <School className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>Enter your Student ID. We will notify your advisor and admin so they can reset your password to the default (1234) after confirming your identity.</CardDescription>
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
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit request"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
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
    </div>
  );
};

export default StudentForgotPassword;
