import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  UserCheck,
  BookOpen,
  Grid3X3
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  role: string;
  first_name: string;
  last_name: string;
}

export const AppSidebar = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("user_id", user.id)
          .single();
        setProfile(data);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out",
      });
    } else {
      navigate("/auth");
      toast({
        title: "Goodbye!",
        description: "Successfully signed out",
      });
    }
  };

  const adminItems = [
    { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    { title: "Students", url: "/students", icon: GraduationCap },
    { title: "Advisors", url: "/advisors", icon: UserCheck },
    { title: "Grades", url: "/grades", icon: BookOpen },
    { title: "Grade Sheet", url: "/grade-sheet", icon: Grid3X3 },
    { title: "Attendance", url: "/attendance", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: Users },
  ];

  const advisorItems = [
    { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    { title: "Students", url: "/students", icon: GraduationCap },
    { title: "Grades", url: "/grades", icon: BookOpen },
    { title: "Grade Sheet", url: "/grade-sheet", icon: Grid3X3 },
    { title: "Attendance", url: "/attendance", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: Users },
  ];

  const menuItems = profile?.role === "admin" ? adminItems : advisorItems;

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg">
            <img
              src="/icons/favicon-32x32.png"
              alt="CSU-ULS Logo"
              className="h-8 w-8"
            />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">CSU-ULS</h2>
              <p className="text-sm text-sidebar-foreground/70">Management System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 mb-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-sidebar-accent transition-colors">
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-md ${
                          isActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                            : "text-sidebar-foreground hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {profile && !collapsed && (
          <div className="mb-4 p-3 bg-sidebar-accent rounded-lg">
            <p className="text-sm font-medium text-sidebar-foreground">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/70 capitalize">
              {profile.role}
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => navigate("/profile")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Profile</span>}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};