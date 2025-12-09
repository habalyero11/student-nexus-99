import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, BookOpen, RefreshCw, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  name: string;
  grade_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubjectFormData {
  name: string;
  grade_level: string;
}

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGrade, setActiveGrade] = useState("7");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({
    name: "",
    grade_level: "7",
  });
  const { toast } = useToast();

  const gradeOptions = [
    { value: "7", label: "Grade 7" },
    { value: "8", label: "Grade 8" },
    { value: "9", label: "Grade 9" },
    { value: "10", label: "Grade 10" },
    { value: "11", label: "Grade 11" },
    { value: "12", label: "Grade 12" },
  ];

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      // Group subjects by grade level
      const groupedSubjects: Record<string, Subject[]> = {};
      (data || []).forEach(subject => {
        if (!groupedSubjects[subject.grade_level]) {
          groupedSubjects[subject.grade_level] = [];
        }
        groupedSubjects[subject.grade_level].push(subject);
      });

      setSubjects(groupedSubjects);
    } catch (error: any) {
      console.error("Error fetching subjects:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load subjects",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject name is required",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSubject) {
        // Update existing subject
        const { error } = await supabase
          .from("subjects")
          .update({
            name: formData.name.trim(),
            grade_level: formData.grade_level,
          })
          .eq("id", editingSubject.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subject updated successfully",
        });
      } else {
        // Create new subject
        const { error } = await supabase
          .from("subjects")
          .insert({
            name: formData.name.trim(),
            grade_level: formData.grade_level,
          });

        if (error) {
          if (error.code === "23505") { // Unique constraint violation
            throw new Error("A subject with this name already exists for this grade level");
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Subject added successfully",
        });
      }

      // Reset form and close dialog
      setFormData({ name: "", grade_level: "7" });
      setShowAddDialog(false);
      setEditingSubject(null);

      // Refresh subjects list
      await fetchSubjects();
    } catch (error: any) {
      console.error("Error saving subject:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save subject",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      grade_level: subject.grade_level,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (subject: Subject) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subject deleted successfully",
      });

      // Refresh subjects list
      await fetchSubjects();
    } catch (error: any) {
      console.error("Error deleting subject:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete subject",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSubjectStatus = async (subject: Subject) => {
    try {
      const { error } = await supabase
        .from("subjects")
        .update({ is_active: !subject.is_active })
        .eq("id", subject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Subject ${subject.is_active ? "deactivated" : "activated"} successfully`,
      });

      await fetchSubjects();
    } catch (error: any) {
      console.error("Error updating subject status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update subject status",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", grade_level: activeGrade });
    setEditingSubject(null);
    setShowAddDialog(false);
  };

  const getSubjectStats = () => {
    const allSubjects = Object.values(subjects).flat();
    const activeSubjects = allSubjects.filter(s => s.is_active);
    const totalGrades = Object.keys(subjects).length;

    return {
      total: allSubjects.length,
      active: activeSubjects.length,
      inactive: allSubjects.length - activeSubjects.length,
      grades: totalGrades,
    };
  };

  const stats = getSubjectStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading subjects...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Subject Management</span>
              </CardTitle>
              <CardDescription>
                Manage subjects across all grade levels in the curriculum
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={fetchSubjects}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setFormData({ name: "", grade_level: activeGrade });
                      setEditingSubject(null);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Subject</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingSubject ? "Edit Subject" : "Add New Subject"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingSubject
                          ? "Modify the subject details below."
                          : "Add a new subject to the curriculum."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade_level">Grade Level</Label>
                        <Select
                          value={formData.grade_level}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, grade_level: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Subject Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter subject name"
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
                        {saving ? "Saving..." : editingSubject ? "Update" : "Add"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-700">Total Subjects</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-green-700">Active</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-red-700">Inactive</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.grades}</div>
              <div className="text-sm text-purple-700">Grade Levels</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects by Grade Level */}
      <Card>
        <CardHeader>
          <CardTitle>Subjects by Grade Level</CardTitle>
          <CardDescription>
            Manage subjects for each grade level in the curriculum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeGrade} onValueChange={setActiveGrade}>
            <TabsList className="grid w-full grid-cols-6">
              {gradeOptions.map(option => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {gradeOptions.map(option => (
              <TabsContent key={option.value} value={option.value} className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {option.label} Subjects
                      {subjects[option.value] && (
                        <Badge variant="secondary" className="ml-2">
                          {subjects[option.value].length} subject{subjects[option.value].length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </h3>
                  </div>

                  {subjects[option.value] && subjects[option.value].length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjects[option.value].map(subject => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium">
                              {subject.name}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSubjectStatus(subject)}
                                className="p-0 h-auto"
                              >
                                <Badge
                                  variant={subject.is_active ? "default" : "secondary"}
                                  className="cursor-pointer"
                                >
                                  {subject.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </Button>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(subject.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(subject)}
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
                                      <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{subject.name}"?
                                        This action cannot be undone and may affect existing grade records.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(subject)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
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
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No subjects found for {option.label}</p>
                      <p className="text-sm">Click "Add Subject" to create the first subject for this grade level.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectManagement;