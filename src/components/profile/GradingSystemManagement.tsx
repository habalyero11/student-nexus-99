import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Calculator, RefreshCw, Save, X, CheckCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GradingSystem {
  id: string;
  name: string;
  description: string | null;
  written_work_percentage: number;
  performance_task_percentage: number;
  quarterly_assessment_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GradingSystemFormData {
  name: string;
  description: string;
  written_work_percentage: number;
  performance_task_percentage: number;
  quarterly_assessment_percentage: number;
}

const GradingSystemManagement = () => {
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<GradingSystem | null>(null);
  const [formData, setFormData] = useState<GradingSystemFormData>({
    name: "",
    description: "",
    written_work_percentage: 25,
    performance_task_percentage: 50,
    quarterly_assessment_percentage: 25,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGradingSystems();
  }, []);

  const fetchGradingSystems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("grading_systems")
        .select("*")
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGradingSystems(data || []);
    } catch (error: any) {
      console.error("Error fetching grading systems:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load grading systems",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePercentages = () => {
    const total = formData.written_work_percentage + formData.performance_task_percentage + formData.quarterly_assessment_percentage;
    return Math.abs(total - 100) < 0.01; // Allow for small floating point errors
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "System name is required",
      });
      return;
    }

    if (!validatePercentages()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Percentages must sum to exactly 100%",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSystem) {
        // Update existing system
        const { error } = await supabase
          .from("grading_systems")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            written_work_percentage: formData.written_work_percentage,
            performance_task_percentage: formData.performance_task_percentage,
            quarterly_assessment_percentage: formData.quarterly_assessment_percentage,
          })
          .eq("id", editingSystem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Grading system updated successfully",
        });
      } else {
        // Create new system
        const { error } = await supabase
          .from("grading_systems")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            written_work_percentage: formData.written_work_percentage,
            performance_task_percentage: formData.performance_task_percentage,
            quarterly_assessment_percentage: formData.quarterly_assessment_percentage,
            is_active: false, // New systems are inactive by default
          });

        if (error) {
          if (error.code === "23505") { // Unique constraint violation
            throw new Error("A grading system with this name already exists");
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Grading system created successfully",
        });
      }

      // Reset form and close dialog
      resetForm();
      await fetchGradingSystems();
    } catch (error: any) {
      console.error("Error saving grading system:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save grading system",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (system: GradingSystem) => {
    setEditingSystem(system);
    setFormData({
      name: system.name,
      description: system.description || "",
      written_work_percentage: system.written_work_percentage,
      performance_task_percentage: system.performance_task_percentage,
      quarterly_assessment_percentage: system.quarterly_assessment_percentage,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (system: GradingSystem) => {
    if (system.is_active) {
      toast({
        variant: "destructive",
        title: "Cannot Delete",
        description: "Cannot delete the active grading system. Please activate another system first.",
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("grading_systems")
        .delete()
        .eq("id", system.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Grading system deleted successfully",
      });

      await fetchGradingSystems();
    } catch (error: any) {
      console.error("Error deleting grading system:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete grading system",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (system: GradingSystem) => {
    try {
      setSaving(true);

      // First, deactivate all systems
      const { error: deactivateError } = await supabase
        .from("grading_systems")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

      if (deactivateError) throw deactivateError;

      // Then activate the selected system
      const { error: activateError } = await supabase
        .from("grading_systems")
        .update({ is_active: true })
        .eq("id", system.id);

      if (activateError) throw activateError;

      toast({
        title: "Success",
        description: `"${system.name}" is now the active grading system`,
      });

      await fetchGradingSystems();
    } catch (error: any) {
      console.error("Error activating grading system:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to activate grading system",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      written_work_percentage: 25,
      performance_task_percentage: 50,
      quarterly_assessment_percentage: 25,
    });
    setEditingSystem(null);
    setShowAddDialog(false);
  };

  const handlePercentageChange = (field: keyof Pick<GradingSystemFormData, 'written_work_percentage' | 'performance_task_percentage' | 'quarterly_assessment_percentage'>, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTotalPercentage = () => {
    return formData.written_work_percentage + formData.performance_task_percentage + formData.quarterly_assessment_percentage;
  };

  const getActiveSystem = () => {
    return gradingSystems.find(system => system.is_active);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading grading systems...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeSystem = getActiveSystem();

  return (
    <div className="space-y-6">
      {/* Active System Display */}
      {activeSystem && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span>Active Grading System</span>
                </CardTitle>
                <CardDescription className="text-green-700">
                  Currently used for all grade calculations
                </CardDescription>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-800">{activeSystem.name}</h3>
              {activeSystem.description && (
                <p className="text-green-700">{activeSystem.description}</p>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="font-semibold text-green-800">Written Work</div>
                  <div className="text-2xl font-bold text-green-600">{activeSystem.written_work_percentage}%</div>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="font-semibold text-green-800">Performance Task</div>
                  <div className="text-2xl font-bold text-green-600">{activeSystem.performance_task_percentage}%</div>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-lg">
                  <div className="font-semibold text-green-800">Quarterly Assessment</div>
                  <div className="text-2xl font-bold text-green-600">{activeSystem.quarterly_assessment_percentage}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Grading System Management</span>
              </CardTitle>
              <CardDescription>
                Create and manage grading systems with custom percentage weights
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={fetchGradingSystems}
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
                      resetForm();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add System</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingSystem ? "Edit Grading System" : "Create New Grading System"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingSystem
                          ? "Modify the grading system details below."
                          : "Create a new grading system with custom percentage weights."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">System Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Custom K-12 System"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description of this grading system"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base font-medium">Assessment Percentages</Label>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="written_work">Written Work (%)</Label>
                            <Input
                              id="written_work"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.written_work_percentage}
                              onChange={(e) => handlePercentageChange('written_work_percentage', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="performance_task">Performance Task (%)</Label>
                            <Input
                              id="performance_task"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.performance_task_percentage}
                              onChange={(e) => handlePercentageChange('performance_task_percentage', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="quarterly_assessment">Quarterly Assessment (%)</Label>
                            <Input
                              id="quarterly_assessment"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.quarterly_assessment_percentage}
                              onChange={(e) => handlePercentageChange('quarterly_assessment_percentage', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                        </div>

                        <div className="text-center p-3 rounded-lg border">
                          <div className="text-sm text-muted-foreground">Total Percentage</div>
                          <div className={`text-2xl font-bold ${getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {getTotalPercentage().toFixed(2)}%
                          </div>
                          {getTotalPercentage() !== 100 && (
                            <div className="text-xs text-red-600 mt-1">Must equal exactly 100%</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving || getTotalPercentage() !== 100}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : editingSystem ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gradingSystems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System Name</TableHead>
                  <TableHead>WW %</TableHead>
                  <TableHead>PT %</TableHead>
                  <TableHead>QA %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingSystems.map(system => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{system.name}</div>
                        {system.description && (
                          <div className="text-sm text-muted-foreground">{system.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{system.written_work_percentage}%</TableCell>
                    <TableCell>{system.performance_task_percentage}%</TableCell>
                    <TableCell>{system.quarterly_assessment_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant={system.is_active ? "default" : "secondary"}>
                        {system.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(system.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!system.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(system)}
                            disabled={saving}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Activate</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(system)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        {!system.is_active && (
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
                                <AlertDialogTitle>Delete Grading System</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{system.name}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(system)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No grading systems found</p>
              <p className="text-sm">Click "Add System" to create your first grading system.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradingSystemManagement;