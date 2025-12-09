import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Users, GraduationCap, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: "admin" | "advisor";
}

interface Assignment {
  id: string;
  year_level: string;
  section: string;
  strand?: string;
  subjects?: string[];
}

interface AdvisorAssignmentsProps {
  profile: ProfileData;
  assignments: Assignment[];
  onRefresh: () => Promise<void>;
}

const AdvisorAssignments = ({ profile, assignments, onRefresh }: AdvisorAssignmentsProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const getYearLevelDisplayName = (yearLevel: string) => {
    return `Grade ${yearLevel}`;
  };

  const getStrandDisplayName = (strand?: string) => {
    if (!strand) return null;
    return strand.toUpperCase();
  };

  const groupAssignmentsByYearLevel = () => {
    const grouped: Record<string, Assignment[]> = {};
    assignments.forEach(assignment => {
      if (!grouped[assignment.year_level]) {
        grouped[assignment.year_level] = [];
      }
      grouped[assignment.year_level].push(assignment);
    });
    return grouped;
  };

  const getTotalStats = () => {
    const yearLevels = new Set(assignments.map(a => a.year_level));
    const sections = new Set(assignments.map(a => a.section));
    const subjects = new Set(assignments.flatMap(a => a.subjects || []));

    return {
      yearLevels: yearLevels.size,
      sections: sections.size,
      subjects: subjects.size,
      totalAssignments: assignments.length,
    };
  };

  const stats = getTotalStats();
  const groupedAssignments = groupAssignmentsByYearLevel();

  if (profile.role !== "advisor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>System Access</span>
          </CardTitle>
          <CardDescription>
            Administrator privileges and system access information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="p-2 bg-blue-100 rounded-full">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Administrator Access</h3>
              <p className="text-sm text-blue-700">
                You have full system access to manage all students, advisors, grades, and subjects.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/students")}
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Users className="h-4 w-4" />
              <span>Manage Students</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/advisors")}
              className="flex items-center justify-center space-x-2 h-12"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Manage Advisors</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>My Assignments Overview</span>
              </CardTitle>
              <CardDescription>
                Your current teaching assignments and responsibilities
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="flex items-center space-x-3 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-900">No Assignments Found</h3>
                <p className="text-sm text-yellow-700">
                  You don't have any current teaching assignments. Please contact your administrator.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.yearLevels}</div>
                  <div className="text-sm text-blue-700">Year Levels</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.sections}</div>
                  <div className="text-sm text-green-700">Sections</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.subjects}</div>
                  <div className="text-sm text-purple-700">Subjects</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.totalAssignments}</div>
                  <div className="text-sm text-orange-700">Total Assignments</div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Detailed Assignments by Year Level */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Assignment Details</h3>
                {Object.entries(groupedAssignments)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([yearLevel, yearAssignments]) => (
                    <Card key={yearLevel} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{getYearLevelDisplayName(yearLevel)}</span>
                          <Badge variant="secondary">
                            {yearAssignments.length} section{yearAssignments.length !== 1 ? 's' : ''}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {yearAssignments.map((assignment, index) => (
                            <div key={assignment.id} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-lg">
                                    Section: {assignment.section}
                                  </h4>
                                  {assignment.strand && (
                                    <Badge variant="outline" className="mt-1">
                                      {getStrandDisplayName(assignment.strand)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/students", {
                                      state: {
                                        filterYearLevel: assignment.year_level,
                                        filterSection: assignment.section
                                      }
                                    })}
                                    className="flex items-center space-x-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>View Students</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/grades", {
                                      state: {
                                        filterYearLevel: assignment.year_level,
                                        filterSection: assignment.section
                                      }
                                    })}
                                    className="flex items-center space-x-1"
                                  >
                                    <BookOpen className="h-3 w-3" />
                                    <span>Manage Grades</span>
                                  </Button>
                                </div>
                              </div>

                              {assignment.subjects && assignment.subjects.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Assigned Subjects ({assignment.subjects.length}):
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {assignment.subjects.map((subject, subjectIndex) => (
                                      <Badge
                                        key={`${assignment.id}-${subjectIndex}`}
                                        variant="default"
                                        className="text-xs"
                                      >
                                        {subject}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Quick Actions */}
              <Separator className="my-6" />
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/students")}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <Users className="h-4 w-4" />
                    <span>My Students</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/grades")}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Grade Management</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/attendance")}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Attendance</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvisorAssignments;