import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, BarChart3, Users, School, ArrowRight, Lock, Hash, Eye, EyeOff } from "lucide-react";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DefaultPasswordDialog } from "@/components/student/DefaultPasswordDialog";

const Landing = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [session, setSession] = useState<boolean>(false);
    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [checking, setChecking] = useState(false);
    const [defaultPasswordOpen, setDefaultPasswordOpen] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(!!session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleStudentLogin = async () => {
        if (!studentId.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please enter your Student ID number.",
            });
            return;
        }
        if (!password) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please enter your password.",
            });
            return;
        }

        setChecking(true);
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
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred. Please try again later.",
            });
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent font-sans selection:bg-primary/20">
            {/* Fixed Background Image - High Quality Blur & Overlay */}
            <div className="fixed inset-0 z-[-1]">
                <div className="absolute inset-0 bg-slate-950/80 z-10 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                <img
                    src="/Cotabato_State_University_(Sinsuat_Avenue,_Cotabato_City;_08-15-2023).jpg"
                    alt="CSU Campus"
                    className="w-full h-full object-cover scale-105"
                />
            </div>

            {/* Navigation - Glassmorphism */}
            <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/20 backdrop-blur-md supports-[backdrop-filter]:bg-black/10 transition-all duration-300">
                <div className="container flex h-20 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shadow-lg shadow-black/20 backdrop-blur-sm border border-white/20">
                            <img src="/icons/android-chrome-192x192.png" alt="CSU-ULS Logo" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg leading-none tracking-tight text-white">CSU-ULS</span>
                            <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">System</span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
                        <a href="#features" className="hover:text-white transition-colors relative group">
                            Features
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </a>
                        <a href="#stats" className="hover:text-white transition-colors relative group">
                            Impact
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </a>
                        <a href="#contact" className="hover:text-white transition-colors relative group">
                            Contact
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 p-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm pr-1.5 pl-4 transition-all hover:bg-white/10 hover:border-white/20 scale-[0.60] origin-right md:scale-100">
                            <div className="flex items-center gap-3 mr-2">
                                <div className="relative group">
                                    <Hash className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="ID Number"
                                        className="h-8 w-20 md:w-24 pl-5 bg-transparent border-none text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-0"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleStudentLogin())}
                                    />
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="relative group">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        className="h-8 w-20 md:w-24 pl-5 pr-6 bg-transparent border-none text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-0"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleStudentLogin())}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                        onClick={() => setShowPassword((s) => !s)}
                                    >
                                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleStudentLogin}
                                disabled={checking}
                                className="rounded-full px-5 h-8 bg-white text-black hover:bg-white/90 font-medium"
                            >
                                {checking ? "..." : "Login"}
                            </Button>
                        </div>

                        <DefaultPasswordDialog open={defaultPasswordOpen} onOpenChange={setDefaultPasswordOpen} />

                        <div className="lg:hidden">
                            {session && (
                                <Button onClick={() => navigate("/dashboard")} className="rounded-full">Dashboard</Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative">
                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                    <div className="container relative z-10 flex flex-col items-center text-center px-4">
                        <div className="animate-fade-in-up flex flex-col items-center">
                            <div className="inline-flex items-center rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md bg-white/5 mb-8 shadow-2xl shadow-black/20">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)] animate-pulse"></span>
                                System Live: Academic Year 2024-2025
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 drop-shadow-2xl">
                                <span className="block bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">Cotabato State</span>
                                <span className="block bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent pb-4">University</span>
                                <span className="block text-2xl md:text-4xl font-light tracking-widest uppercase text-white/80 mt-2">Laboratory School</span>
                            </h1>

                            <p className="max-w-[700px] text-lg md:text-xl text-white/70 mb-10 leading-relaxed font-light">
                                Experience the future of educational management. A unified platform for real-time academic tracking, seamless grade management, and advanced student analytics.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                                {session ? (
                                    <Button size="lg" className="h-14 px-10 rounded-full text-base font-semibold shadow-[0_0_20px_5px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_8px_rgba(var(--primary),0.5)] transition-all duration-300 hover:-translate-y-1" onClick={() => navigate("/dashboard")}>
                                        Launch Dashboard
                                    </Button>
                                ) : (
                                    <Button size="lg" className="h-14 px-10 rounded-full text-base font-semibold shadow-[0_0_20px_5px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_8px_rgba(var(--primary),0.5)] transition-all duration-300 hover:-translate-y-1" onClick={() => navigate("/auth")}>
                                        Faculty Access
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-14 px-10 rounded-full text-base font-semibold border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
                                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Explore Features
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                        <ArrowRight className="h-6 w-6 text-white rotate-90" />
                    </div>
                </section>

                {/* Features Section - Solid Background for Contrast */}
                <section id="features" className="py-32 bg-background relative z-20 rounded-t-[3rem] -mt-10 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.3)] border-t border-white/5">
                    <div className="container">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                            <div className="max-w-2xl">
                                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                    Engineered for Excellence
                                </h2>
                                <p className="text-xl text-muted-foreground leading-relaxed">
                                    Our platform provides powerful tools designed to empower administrators, teachers, and students with data-driven insights.
                                </p>
                            </div>
                            <Button variant="ghost" className="group text-primary">
                                View all capabilities <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: <BarChart3 className="h-8 w-8 text-blue-500" />,
                                    title: "Predictive Analytics",
                                    desc: "Visualize performance trends with real-time data modeling to identify at-risk students early."
                                },
                                {
                                    icon: <GraduationCap className="h-8 w-8 text-purple-500" />,
                                    title: "Academic Fidelity",
                                    desc: "Streamlined grading system maintaining 100% accuracy with automated computation and audits."
                                },
                                {
                                    icon: <Users className="h-8 w-8 text-pink-500" />,
                                    title: "Centralized Profiles",
                                    desc: "Unified 360° student records consolidating academic, attendance, and behavioral data."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group p-8 rounded-3xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2">
                                    <div className="h-16 w-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stats Section - High Contrast Dark */}
                <section id="stats" className="py-24 bg-primary text-primary-foreground relative z-20 overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 -skew-x-12 translate-x-20" />
                    <div className="container relative z-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            {[
                                { val: "1000+", label: "Active Students" },
                                { val: "50+", label: "Faculty Members" },
                                { val: "99.9%", label: "System Uptime" },
                                { val: "24/7", label: "Secure Access" }
                            ].map((stat, i) => (
                                <div key={i} className="space-y-2">
                                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-white opacity-90">{stat.val}</h3>
                                    <p className="text-primary-foreground/70 font-medium uppercase tracking-widest text-sm">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section - Gradient */}
                <section className="py-32 bg-background relative z-20">
                    <div className="container">
                        <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-20 text-center shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-full opacity-30">
                                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
                            </div>

                            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                                    Ready to Modernize Your Institution?
                                </h2>
                                <p className="text-lg text-slate-300 leading-relaxed">
                                    Join the digital transformation of Cotabato State University. Secure, efficient, and forward-thinking.
                                </p>
                                <Button
                                    size="lg"
                                    className="h-14 px-10 rounded-full text-lg shadow-xl shadow-cyan-500/20 bg-white text-slate-900 hover:bg-slate-100"
                                    onClick={() => navigate(session ? "/dashboard" : "/auth")}
                                >
                                    {session ? "Open Dashboard" : "Get Started Now"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="contact" className="py-12 bg-muted/80 backdrop-blur-xl border-t relative z-20">
                <div className="container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <School className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground">CSU-ULS Nexus</h3>
                                <p className="text-xs text-muted-foreground">Excellence in Education Management</p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground text-center md:text-right">
                            <p>© 2024 Cotabato State University - University Laboratory School.</p>
                            <p className="mt-1">All rights reserved. Unauthorized access is prohibited.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
