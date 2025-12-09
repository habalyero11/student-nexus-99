import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, BarChart3, Users, School, ArrowRight } from "lucide-react";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Landing = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [session, setSession] = useState<boolean>(false);
    const [studentId, setStudentId] = useState("");
    const [checkingId, setCheckingId] = useState(false);

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
                description: "Please enter your Student ID number",
            });
            return;
        }

        setCheckingId(true);
        try {
            const { data, error } = await supabase
                .from("students")
                .select("student_id_no")
                .eq("student_id_no", studentId.trim())
                .single();

            if (error || !data) {
                toast({
                    variant: "destructive",
                    title: "Student Not Found",
                    description: "The ID number you entered does not exist in our records.",
                });
            } else {
                navigate(`/student-portal/${encodeURIComponent(data.student_id_no)}`);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An error occurred while verifying your ID.",
            });
        } finally {
            setCheckingId(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navigation */}
            <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between py-4">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <School className="h-6 w-6" />
                        <span>CSU-ULS</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                        <a href="#features" className="hover:text-primary transition-colors">Features</a>
                        <a href="#stats" className="hover:text-primary transition-colors">Impact</a>
                        <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter I.D. Number"
                                    className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleStudentLogin()}
                                />
                            </div>
                            <Button variant="secondary" size="sm" onClick={handleStudentLogin} disabled={checkingId}>
                                {checkingId ? "Checking..." : "View Grades"}
                            </Button>
                        </div>
                        {session ? (
                            <Button onClick={() => navigate("/dashboard")}>Dashboard</Button>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
                                <Button onClick={() => navigate("/auth")}>Get Started</Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 md:py-32 overflow-hidden">
                    <div className="container relative z-10 flex flex-col items-center text-center">
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-8">
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                            Now Live for Academic Year 2024-2025
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Empowering Education <br className="hidden md:block" /> with Data-Driven Insights
                        </h1>
                        <p className="max-w-[800px] text-lg text-muted-foreground md:text-xl mb-10">
                            The comprehensive educational management system for University Laboratory School - Cotabato State University. Streamline academic performance tracking, grade management, and student analytics in one unified platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            {session ? (
                                <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/dashboard")}>
                                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/auth")}>
                                    Access Portal <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                                Learn More
                            </Button>
                        </div>
                    </div>

                    {/* Background decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-10 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-purple-500 rounded-full blur-3xl"></div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 bg-muted/50">
                    <div className="container">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Everything You Need to Succeed</h2>
                            <p className="text-lg text-muted-foreground max-w-[700px] mx-auto">
                                Our platform provides powerful tools for administrators, teachers, and students to enhance the educational experience.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <Card className="bg-background border-none shadow-lg hover:shadow-xl transition-all duration-300">
                                <CardHeader>
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <BarChart3 className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Advanced Analytics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        Visualize student performance with interactive charts and graphs. Identify trends and areas for improvement with real-time data.
                                    </CardDescription>
                                </CardContent>
                            </Card>

                            <Card className="bg-background border-none shadow-lg hover:shadow-xl transition-all duration-300">
                                <CardHeader>
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <GraduationCap className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Grade Management</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        Streamlined grading system for teachers. Easily input, calculate, and publish grades while maintaining accuracy and security.
                                    </CardDescription>
                                </CardContent>
                            </Card>

                            <Card className="bg-background border-none shadow-lg hover:shadow-xl transition-all duration-300">
                                <CardHeader>
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Student Profiles</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        Comprehensive student records including attendance, academic history, and personal information in one secure location.
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section id="stats" className="py-20">
                    <div className="container">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <div className="space-y-2">
                                <h3 className="text-4xl font-bold text-primary">1000+</h3>
                                <p className="text-muted-foreground">Students</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-4xl font-bold text-primary">50+</h3>
                                <p className="text-muted-foreground">Faculty Members</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-4xl font-bold text-primary">99.9%</h3>
                                <p className="text-muted-foreground">Uptime</p>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-4xl font-bold text-primary">24/7</h3>
                                <p className="text-muted-foreground">Access</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-gradient-hero text-primary-foreground">
                    <div className="container text-center">
                        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">Ready to Transform Your Academic Journey?</h2>
                        <p className="text-lg text-primary-foreground/80 max-w-[600px] mx-auto mb-10">
                            Join the ULS-CSU community and experience the future of educational management today.
                        </p>
                        <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-bold" onClick={() => navigate(session ? "/dashboard" : "/auth")}>
                            {session ? "Go to Dashboard" : "Get Started Now"}
                        </Button>
                    </div>
                </section>
            </main>

            <footer id="contact" className="py-10 border-t bg-muted/30">
                <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg text-primary">
                        <School className="h-5 w-5" />
                        <span>ULS-CSU Nexus</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-center md:text-left">
                        © 2024 University Laboratory School - Cotabato State University. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-primary">Privacy Policy</a>
                        <a href="#" className="hover:text-primary">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
