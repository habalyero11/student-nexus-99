import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, RefreshCw, Save, X, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Section {
    id: string;
    name: string;
    year_level: string;
    created_at: string;
    updated_at: string;
}

interface SectionFormData {
    name: string;
    year_level: string;
}

const YEAR_LEVELS = ["7", "8", "9", "10", "11", "12"];

const SectionManagement = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [formData, setFormData] = useState<SectionFormData>({
        name: "",
        year_level: "7",
    });
    const [studentCount, setStudentCount] = useState<{ [key: string]: number }>({});
    const { toast } = useToast();

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("sections")
                .select("*")
                .order("year_level", { ascending: true })
                .order("name", { ascending: true });

            if (error) throw error;
            setSections(data || []);

            // Fetch student counts for each section
            await fetchStudentCounts(data || []);
        } catch (error: any) {
            console.error("Error fetching sections:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load sections",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentCounts = async (sectionsList: Section[]) => {
        try {
            const counts: { [key: string]: number } = {};

            for (const section of sectionsList) {
                const { count, error } = await supabase
                    .from("students")
                    .select("*", { count: "exact", head: true })
                    .eq("section", section.name)
                    .eq("year_level", section.year_level);

                if (!error) {
                    counts[section.id] = count || 0;
                }
            }

            setStudentCount(counts);
        } catch (error) {
            console.error("Error fetching student counts:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Section name is required",
            });
            return;
        }

        setSaving(true);
        try {
            if (editingSection) {
                // Update existing section
                const { error } = await supabase
                    .from("sections")
                    .update({
                        name: formData.name.trim(),
                        year_level: formData.year_level,
                    })
                    .eq("id", editingSection.id);

                if (error) {
                    if (error.code === "23505") {
                        throw new Error("A section with this name already exists in this year level");
                    }
                    throw error;
                }

                toast({
                    title: "Success",
                    description: "Section updated successfully",
                });
            } else {
                // Create new section
                const { error } = await supabase
                    .from("sections")
                    .insert({
                        name: formData.name.trim(),
                        year_level: formData.year_level,
                    });

                if (error) {
                    if (error.code === "23505") {
                        throw new Error("A section with this name already exists in this year level");
                    }
                    throw error;
                }

                toast({
                    title: "Success",
                    description: "Section created successfully",
                });
            }

            resetForm();
            await fetchSections();
        } catch (error: any) {
            console.error("Error saving section:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to save section",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (section: Section) => {
        setEditingSection(section);
        setFormData({
            name: section.name,
            year_level: section.year_level,
        });
        setShowAddDialog(true);
    };

    const handleDelete = async (section: Section) => {
        try {
            setSaving(true);

            // Delete section (students will cascade delete due to foreign key)
            const { error } = await supabase
                .from("sections")
                .delete()
                .eq("id", section.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Section "${section.name}" and ${studentCount[section.id] || 0} student(s) deleted successfully`,
            });

            await fetchSections();
        } catch (error: any) {
            console.error("Error deleting section:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete section",
            });
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            year_level: "7",
        });
        setEditingSection(null);
        setShowAddDialog(false);
    };

    const groupedSections = YEAR_LEVELS.map(level => ({
        yearLevel: level,
        sections: sections.filter(s => s.year_level === level)
    }));

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Loading sections...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center space-x-2">
                                <Layers className="h-5 w-5" />
                                <span>Section Management</span>
                            </CardTitle>
                            <CardDescription>
                                Create, edit, and manage sections for each year level
                            </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                onClick={fetchSections}
                                disabled={loading}
                                className="flex items-center space-x-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                            </Button>
                            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                                <DialogTrigger asChild>
                                    <Button
                                        onClick={resetForm}
                                        className="flex items-center space-x-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add Section</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <form onSubmit={handleSubmit}>
                                        <DialogHeader>
                                            <DialogTitle>
                                                {editingSection ? "Edit Section" : "Create New Section"}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {editingSection
                                                    ? "Modify the section details below."
                                                    : "Create a new section for a specific year level."}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="year_level">Year Level *</Label>
                                                <Select
                                                    value={formData.year_level}
                                                    onValueChange={(value) =>
                                                        setFormData((prev) => ({ ...prev, year_level: value }))
                                                    }
                                                >
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
                                                <Label htmlFor="name">Section Name *</Label>
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                                                    }
                                                    placeholder="e.g., Archimedes, Laplace, Newton"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={resetForm}>
                                                <X className="h-4 w-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={saving}>
                                                <Save className="h-4 w-4 mr-2" />
                                                {saving ? "Saving..." : editingSection ? "Update" : "Create"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {groupedSections.map(({ yearLevel, sections: yearSections }) => (
                            <div key={yearLevel}>
                                <h3 className="text-lg font-semibold mb-3">Grade {yearLevel}</h3>
                                {yearSections.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Section Name</TableHead>
                                                <TableHead>Students</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {yearSections.map((section) => (
                                                <TableRow key={section.id}>
                                                    <TableCell className="font-medium">{section.name}</TableCell>
                                                    <TableCell>{studentCount[section.id] || 0}</TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {new Date(section.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(section)}
                                                                className="flex items-center space-x-1"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                                <span>Edit</span>
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                        <span>Delete</span>
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Section</AlertDialogTitle>
                                                                        <AlertDialogDescription className="space-y-2">
                                                                            <p>
                                                                                Are you sure you want to delete section "{section.name}"?
                                                                            </p>
                                                                            <p className="font-semibold text-red-600">
                                                                                ⚠️ Warning: This will also delete {studentCount[section.id] || 0} student(s) in this section and all their grades!
                                                                            </p>
                                                                            <p>This action cannot be undone.</p>
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(section)}
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                        >
                                                                            Delete Section and Students
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                                        <p className="text-sm">No sections for Grade {yearLevel}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SectionManagement;
