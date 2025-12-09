import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user came from a password reset email
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Session error:", error);
                    setIsValidSession(false);
                } else if (session) {
                    setIsValidSession(true);
                } else {
                    // Listen for the PASSWORD_RECOVERY event
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        async (event, session) => {
                            if (event === "PASSWORD_RECOVERY") {
                                setIsValidSession(true);
                            }
                        }
                    );

                    // Give a moment for the auth state to settle
                    setTimeout(() => {
                        setCheckingSession(false);
                    }, 1000);

                    return () => subscription.unsubscribe();
                }
            } catch (err) {
                console.error("Error checking session:", err);
                setIsValidSession(false);
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Passwords don't match",
                description: "Please make sure both passwords are the same.",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: "destructive",
                title: "Password too short",
                description: "Password must be at least 6 characters long.",
            });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setResetComplete(true);
            toast({
                title: "Password Updated",
                description: "Your password has been successfully reset.",
            });

            // Sign out after password reset to ensure clean state
            await supabase.auth.signOut();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to reset password. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
                <Card className="w-full max-w-md shadow-strong">
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isValidSession && !checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
                <Card className="w-full max-w-md shadow-strong">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-destructive rounded-full">
                                <Lock className="h-8 w-8 text-destructive-foreground" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Invalid or Expired Link</CardTitle>
                        <CardDescription>
                            This password reset link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Please request a new password reset link.
                        </p>
                        <Button
                            onClick={() => navigate("/forgot-password")}
                            className="w-full bg-gradient-primary hover:opacity-90"
                        >
                            Request New Link
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (resetComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
                <Card className="w-full max-w-md shadow-strong">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-500 rounded-full">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
                        <CardDescription>
                            Your password has been successfully updated.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => navigate("/auth")}
                            className="w-full bg-gradient-primary hover:opacity-90"
                        >
                            Sign In with New Password
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            <Card className="w-full max-w-md shadow-strong">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary rounded-full">
                            <GraduationCap className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
                    <CardDescription>
                        Enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Password must be at least 6 characters long.
                        </p>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-primary hover:opacity-90 transition-all"
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
