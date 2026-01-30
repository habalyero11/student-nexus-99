import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import FloatingGradeButton from "@/components/grades/FloatingGradeButton";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const DashboardLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const check = async (uid: string) => {
      try {
        const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", uid).single();
        if (profile) return;
        const { data: student } = await supabase.from("students").select("id").eq("auth_user_id", uid).single();
        if (student && mounted) navigate("/student-portal", { replace: true });
      } catch {
        // ignore RLS or network errors; treat as staff
      }
    };

    const apply = (session: { user: unknown } | null) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u as typeof user);
      setLoading(false);
      if (!u) {
        navigate("/auth", { replace: true });
      } else {
        check((u as { id: string }).id);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      apply(session);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => apply(session))
      .catch(() => apply(null))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const t = window.setTimeout(() => {
      if (mounted) setLoading((prev) => (prev ? false : prev));
    }, 5000);

    return () => {
      mounted = false;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 flex items-center border-b bg-background px-6">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-xl font-semibold text-foreground">
              CSU-ULS Management System
            </h1>
          </header>
          <div className="flex-1 p-6 bg-muted/30">
            <Outlet />
          </div>
        </main>

        {/* Floating Grade Entry Button - Show on most pages except auth */}
        {!location.pathname.includes('/auth') && (
          <FloatingGradeButton
            onGradeAdded={() => {
              // Refresh the current page data if it's grades or students page
              if (location.pathname.includes('/grades') || location.pathname.includes('/students')) {
                window.location.reload();
              }
            }}
          />
        )}
      </div>
    </SidebarProvider>
  );
};