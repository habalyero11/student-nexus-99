import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, RefreshCw, User, Hash } from "lucide-react";

type Request = {
  id: string;
  student_id: string;
  requested_at: string;
  status: string;
  students: { student_id_no: string; first_name: string; last_name: string; year_level: string; section: string } | null;
};

const PasswordResetRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select(`
          id,
          student_id,
          requested_at,
          status,
          students ( student_id_no, first_name, last_name, year_level, section )
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setRequests((data as Request[]) || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to load requests." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReset = async (requestId: string) => {
    setResetting(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("reset-student-password", {
        body: { request_id: requestId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Password reset", description: "Student password has been set to 1234. They must change it on next login." });
      fetchRequests();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Reset failed." });
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Password Reset Requests</h1>
        <p className="text-muted-foreground">Students who requested a password reset. Verify with the student, then reset to the default (1234).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Pending requests
          </CardTitle>
          <CardDescription>Click &quot;Reset to 1234&quot; after confirming with the student that they requested the reset.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No pending requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {r.students?.first_name} {r.students?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {r.students?.student_id_no} · Grade {r.students?.year_level} – {r.students?.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(r.requested_at).toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleReset(r.id)}
                      disabled={!!resetting}
                    >
                      {resetting === r.id ? "Resetting..." : "Reset to 1234"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && requests.length > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetRequests;
