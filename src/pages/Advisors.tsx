import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, UserCheck, Mail, Phone, Facebook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdvisorForm from "@/components/advisors/AdvisorForm";
import { Database } from "@/integrations/supabase/types";

type Advisor = Database["public"]["Tables"]["advisors"]["Row"] & {
  profiles: Database["public"]["Tables"]["profiles"]["Row"];
  advisor_assignments: Database["public"]["Tables"]["advisor_assignments"]["Row"][];
};

const Advisors = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const fetchAdvisors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("advisors")
        .select(`
          *,
          profiles!advisors_profile_id_fkey(
            id,
            email,
            first_name,
            middle_name,
            last_name,
            role,
            created_at,
            updated_at,
            user_id
          ),
          advisor_assignments(
            id,
            year_level,
            section,
            strand,
            subjects
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdvisors(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch advisors: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvisors = advisors.filter((advisor) => {
    const fullName = `${advisor.profiles.first_name} ${advisor.profiles.middle_name || ""} ${advisor.profiles.last_name}`.toLowerCase();
    const email = advisor.profiles.email.toLowerCase();
    const employeeNo = advisor.employee_no?.toLowerCase() || "";

    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      employeeNo.includes(searchTerm.toLowerCase())
    );
  });

  const handleEditAdvisor = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setShowEditDialog(true);
  };

  const handleDeleteAdvisor = async (advisorId: string) => {
    if (!confirm("Are you sure you want to delete this advisor? This will also delete their profile and assignments.")) return;

    try {
      // First delete the advisor (this will cascade to assignments)
      const { error: advisorError } = await supabase
        .from("advisors")
        .delete()
        .eq("id", advisorId);

      if (advisorError) throw advisorError;

      toast({
        title: "Success",
        description: "Advisor deleted successfully",
      });

      fetchAdvisors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete advisor: " + error.message,
      });
    }
  };

  const handleFormSuccess = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setSelectedAdvisor(null);
    fetchAdvisors();
  };

  const getAssignmentsSummary = (assignments: Database["public"]["Tables"]["advisor_assignments"]["Row"][]) => {
    if (assignments.length === 0) return "No assignments";

    const summary = assignments.map(assignment => {
      const gradeText = `Grade ${assignment.year_level}`;
      const sectionText = assignment.section;
      const strandText = assignment.strand ? ` (${assignment.strand.toUpperCase()})` : "";
      const subjectsText = assignment.subjects && assignment.subjects.length > 0
        ? ` [${assignment.subjects.length} subject${assignment.subjects.length !== 1 ? 's' : ''}]`
        : " [No subjects]";
      return `${gradeText} - ${sectionText}${strandText}${subjectsText}`;
    }).join(", ");

    return summary;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Advisors</h1>
          <p className="text-muted-foreground">Manage advisor accounts and assignments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Add New Advisor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Advisor</DialogTitle>
              <DialogDescription>
                Create a new advisor account with profile and assignment details.
              </DialogDescription>
            </DialogHeader>
            <AdvisorForm
              onSuccess={handleFormSuccess}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Advisors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or employee number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Advisors List */}
      <div className="grid gap-4">
        {filteredAdvisors.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {advisors.length === 0 ? "No advisors found. Add your first advisor to get started." : "No advisors found matching your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAdvisors.map((advisor) => (
            <Card key={advisor.id} className="shadow-soft hover:shadow-medium transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {advisor.profiles.first_name} {advisor.profiles.middle_name && `${advisor.profiles.middle_name} `}{advisor.profiles.last_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {advisor.profiles.email}
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {advisor.profiles.role}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {advisor.employee_no && (
                        <div>
                          <span className="font-medium text-muted-foreground">Employee No:</span>
                          <p>{advisor.employee_no}</p>
                        </div>
                      )}

                      {advisor.position && (
                        <div>
                          <span className="font-medium text-muted-foreground">Position:</span>
                          <p>{advisor.position}</p>
                        </div>
                      )}

                      {advisor.contact_number && (
                        <div>
                          <span className="font-medium text-muted-foreground">Contact:</span>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <p>{advisor.contact_number}</p>
                          </div>
                        </div>
                      )}

                      {(advisor as any).facebook_link && (
                        <div>
                          <span className="font-medium text-muted-foreground">Facebook:</span>
                          <div className="flex items-center gap-1">
                            <Facebook className="h-3 w-3 text-blue-600" />
                            <a
                              href={(advisor as any).facebook_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[150px]"
                            >
                              View Profile
                            </a>
                          </div>
                        </div>
                      )}

                      {advisor.years_of_service && (
                        <div>
                          <span className="font-medium text-muted-foreground">Years of Service:</span>
                          <p>{advisor.years_of_service} years</p>
                        </div>
                      )}

                      {advisor.age && (
                        <div>
                          <span className="font-medium text-muted-foreground">Age:</span>
                          <p>{advisor.age} years old</p>
                        </div>
                      )}

                      {advisor.gender && (
                        <div>
                          <span className="font-medium text-muted-foreground">Gender:</span>
                          <p className="capitalize">{advisor.gender}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-medium text-muted-foreground">Assignments:</span>
                      <p className="text-sm mt-1">
                        {getAssignmentsSummary(advisor.advisor_assignments)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditAdvisor(advisor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteAdvisor(advisor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredAdvisors.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredAdvisors.length} of {advisors.length} advisors
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Advisor Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Advisor</DialogTitle>
            <DialogDescription>
              Update the advisor's information and assignments.
            </DialogDescription>
          </DialogHeader>
          {selectedAdvisor && (
            <AdvisorForm
              advisor={selectedAdvisor}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Advisors;