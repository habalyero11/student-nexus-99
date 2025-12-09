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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
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