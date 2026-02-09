import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Calculator, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGradingSystem } from "@/hooks/useGradingSystem";
import ExcelStyleGradeGrid from "@/components/grades/ExcelStyleGradeGrid";
import GradeSummarySheet from "@/components/grades/GradeSummarySheet";
import { exportToExcel } from "@/lib/exportGrades";

interface Section {
    id: string;
    name: string;
    year_level: string;
}

interface Subject {
    id: string;
    name: string;
}

interface Profile {
    id: string;
    role: string;
    first_name: string;
    last_name: string;
}

const ExcelGradeSheet = () => {
    const { toast } = useToast();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedYearLevel, setSelectedYearLevel] = useState<string>("7");
    const [selectedSection, setSelectedSection] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedQuarter, setSelectedQuarter] = useState<string>("1st");
    const [sections, setSections] = useState<Section[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [advisorId, setAdvisorId] = useState<string | null>(null);

    const { gradingSystem, loading: gradingLoading } = useGradingSystem(advisorId);

    const YEAR_LEVELS = ["7", "8", "9", "10", "11", "12"];
    const QUARTERS = [
        { value: "1st", label: "First Quarter" },
        { value: "2nd", label: "Second Quarter" },
        { value: "3rd", label: "Third Quarter" },
        { value: "4th", label: "Fourth Quarter" },
    ];

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (profile) {
            fetchAdvisorId();
            fetchSections();
        }
    }, [profile, selectedYearLevel]);

    useEffect(() => {
        if (profile && selectedSection) {
            fetchSubjects();
        }
    }, [profile, selectedYearLevel, selectedSection, advisorId]);

    const fetchSubjects = async () => {
        try {
            // Don't fetch subjects until we have both year level and section selected
            if (!selectedYearLevel || !selectedSection) {
                setSubjects([]);
                return;
            }

            // Get ALL subjects assigned to this section from ANY advisor
            const { data: assignments } = await supabase
                .from("advisor_assignments")
                .select("subjects")
                .eq("year_level", selectedYearLevel)
                .eq("section", selectedSection);

            if (!assignments || assignments.length === 0) {
                setSubjects([]);
                return;
            }

            // Collect all subjects for this section
            let allSectionSubjects = [...new Set(
                assignments.flatMap(a => a.subjects || [])
            )];

            // If advisor, further filter to only their assigned subjects
            if (profile?.role === "advisor" && advisorId) {
                const { data: advisorAssignments } = await supabase
                    .from("advisor_assignments")
                    .select("subjects")
                    .eq("advisor_id", advisorId)
                    .eq("year_level", selectedYearLevel)
                    .eq("section", selectedSection);

                if (advisorAssignments && advisorAssignments.length > 0) {
                    const advisorSubjects = [...new Set(
                        advisorAssignments.flatMap(a => a.subjects || [])
                    )];

                    // Only show subjects that the advisor teaches in this section
                    allSectionSubjects = allSectionSubjects.filter(s =>
                        advisorSubjects.includes(s)
                    );
                }
            }

            // Fetch full subject details from subjects table
            if (allSectionSubjects.length > 0) {
                const { data: subjectData, error } = await supabase
                    .from("subjects")
                    .select("*")
                    .in("name", allSectionSubjects)
                    .order("name");

                if (error) throw error;

                // Deduplicate by name
                const uniqueSubjects = subjectData ? Array.from(
                    new Map(subjectData.map(item => [item.name, item])).values()
                ) : [];

                setSubjects(uniqueSubjects);

                // Auto-select first subject
                if (uniqueSubjects.length > 0 && !selectedSubject) {
                    setSelectedSubject(uniqueSubjects[0].name);
                }
            } else {
                setSubjects([]);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("profiles")
                .select("id, role, first_name, last_name")
                .eq("user_id", user.id)
                .single();
            if (data) {
                setProfile(data);
            }
        }
    };

    const fetchAdvisorId = async () => {
        if (!profile || profile.role !== "advisor") return;

        const { data } = await supabase
            .from("advisors")
            .select("id")
            .eq("profile_id", profile.id)
            .single();

        if (data) {
            setAdvisorId(data.id);
        }
    };

    const fetchSections = async () => {
        try {
            const { data, error } = await supabase
                .from("sections")
                .select("*")
                .eq("year_level", selectedYearLevel)
                .order("name");

            if (error) throw error;

            setSections(data || []);

            // Auto-select first section if available
            if (data && data.length > 0 && !selectedSection) {
                setSelectedSection(data[0].name);
            }
        } catch (error) {
            console.error("Error fetching sections:", error);
        }
    };



    const handleExport = async () => {
        if (!selectedSection || !selectedSubject) {
            toast({
                variant: "destructive",
                title: "Missing Selection",
                description: "Please select section and subject first",
            });
            return;
        }

        try {
            setLoading(true);

            await exportToExcel({
                yearLevel: selectedYearLevel,
                section: selectedSection,
                subject: selectedSubject,
                quarter: selectedQuarter,
                gradingSystem,
                profile,
            });

            toast({
                title: "Export Successful",
                description: "Grade sheet exported to Excel",
            });
        } catch (error: any) {
            console.error("Export error:", error);
            toast({
                variant: "destructive",
                title: "Export Failed",
                description: error.message || "Failed to export grade sheet",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Excel-Style Grade Sheet</h1>
                        <p className="text-muted-foreground">
                            Manage grades with individual activity scores
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleExport}
                    disabled={loading || !selectedSection || !selectedSubject}
                    className="flex items-center space-x-2"
                >
                    <Download className="h-4 w-4" />
                    <span>Export to Excel</span>
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Calculator className="h-5 w-5" />
                        <span>Filters</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year Level</label>
                            <Select value={selectedYearLevel} onValueChange={setSelectedYearLevel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEAR_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            Grade {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Section</label>
                            <Select value={selectedSection} onValueChange={setSelectedSection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((section) => (
                                        <SelectItem key={section.id} value={section.name}>
                                            {section.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.name}>
                                            {subject.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quarter</label>
                            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {QUARTERS.map((quarter) => (
                                        <SelectItem key={quarter.value} value={quarter.value}>
                                            {quarter.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {gradingSystem && !gradingLoading && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="text-sm font-medium mb-2">Active Grading System: {gradingSystem.name}</div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Written Work:</span>
                                    <span className="ml-2 font-semibold">{gradingSystem.written_work_percentage}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Performance Task:</span>
                                    <span className="ml-2 font-semibold">{gradingSystem.performance_task_percentage}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Quarterly Assessment:</span>
                                    <span className="ml-2 font-semibold">{gradingSystem.quarterly_assessment_percentage}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quarter Tabs */}
            {selectedSection && selectedSubject && (
                <Tabs defaultValue="q1" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="q1">Q1</TabsTrigger>
                        <TabsTrigger value="q2">Q2</TabsTrigger>
                        <TabsTrigger value="q3">Q3</TabsTrigger>
                        <TabsTrigger value="q4">Q4</TabsTrigger>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>

                    <TabsContent value="q1" className="space-y-4">
                        <ExcelStyleGradeGrid
                            yearLevel={selectedYearLevel}
                            section={selectedSection}
                            subject={selectedSubject}
                            quarter="1st"
                            gradingSystem={gradingSystem}
                        />
                    </TabsContent>

                    <TabsContent value="q2" className="space-y-4">
                        <ExcelStyleGradeGrid
                            yearLevel={selectedYearLevel}
                            section={selectedSection}
                            subject={selectedSubject}
                            quarter="2nd"
                            gradingSystem={gradingSystem}
                        />
                    </TabsContent>

                    <TabsContent value="q3" className="space-y-4">
                        <ExcelStyleGradeGrid
                            yearLevel={selectedYearLevel}
                            section={selectedSection}
                            subject={selectedSubject}
                            quarter="3rd"
                            gradingSystem={gradingSystem}
                        />
                    </TabsContent>

                    <TabsContent value="q4" className="space-y-4">
                        <ExcelStyleGradeGrid
                            yearLevel={selectedYearLevel}
                            section={selectedSection}
                            subject={selectedSubject}
                            quarter="4th"
                            gradingSystem={gradingSystem}
                        />
                    </TabsContent>

                    <TabsContent value="summary" className="space-y-4">
                        <GradeSummarySheet
                            yearLevel={selectedYearLevel}
                            section={selectedSection}
                            subject={selectedSubject}
                            gradingSystem={gradingSystem}
                        />
                    </TabsContent>
                </Tabs>
            )}

            {(!selectedSection || !selectedSubject) && (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Please select a section and subject to view the grade sheet</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ExcelGradeSheet;

