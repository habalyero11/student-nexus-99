import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Settings,
  Calendar,
  Users,
  BookOpen,
  BarChart3,
  Download,
  CheckCircle,
  X
} from "lucide-react";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Row"];

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportConfig {
  type: 'grades' | 'analytics' | 'attendance' | 'custom';
  format: 'pdf' | 'excel';
  period: string;
  yearLevel: string;
  section: string;
  subject: string;
  includeComponents: {
    studentInfo: boolean;
    gradeBreakdown: boolean;
    analytics: boolean;
    charts: boolean;
    summary: boolean;
  };
  customFilters: {
    minGrade?: number;
    maxGrade?: number;
    gradeRange?: string;
  };
}

interface ReportData {
  students: Student[];
  grades: Grade[];
  analytics: any;
  metadata: {
    generatedAt: string;
    generatedBy: string;
    totalRecords: number;
    period: string;
  };
}

const ReportGenerator = ({ isOpen, onClose }: ReportGeneratorProps) => {
  const [config, setConfig] = useState<ReportConfig>({
    type: 'grades',
    format: 'pdf',
    period: 'all',
    yearLevel: 'all',
    section: 'all',
    subject: 'all',
    includeComponents: {
      studentInfo: true,
      gradeBreakdown: true,
      analytics: false,
      charts: false,
      summary: true
    },
    customFilters: {}
  });

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [availableFilters, setAvailableFilters] = useState({
    yearLevels: [] as string[],
    sections: [] as string[],
    subjects: [] as string[]
  });

  const quarters = ["1st", "2nd", "3rd", "4th"];
  const reportTypes = [
    { value: 'grades', label: 'Grade Reports', icon: <BookOpen className="h-4 w-4" /> },
    { value: 'analytics', label: 'Performance Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'attendance', label: 'Attendance Reports', icon: <Users className="h-4 w-4" /> },
    { value: 'custom', label: 'Custom Report', icon: <Settings className="h-4 w-4" /> }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchAvailableFilters();
    }
  }, [isOpen]);

  const fetchAvailableFilters = async () => {
    try {
      // Get available year levels, sections, and subjects
      const { data: students } = await supabase
        .from("students")
        .select("year_level, section, strand");

      const { data: grades } = await supabase
        .from("grades")
        .select("subject");

      if (students) {
        const yearLevels = [...new Set(students.map(s => s.year_level))].sort();
        const sections = [...new Set(students.map(s => s.section))].sort();
        setAvailableFilters(prev => ({ ...prev, yearLevels, sections }));
      }

      if (grades) {
        const subjects = [...new Set(grades.map(g => g.subject))].sort();
        setAvailableFilters(prev => ({ ...prev, subjects }));
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const fetchReportData = async (): Promise<ReportData> => {
    const { data: { user } } = await supabase.auth.getUser();

    // Build queries based on config
    let studentsQuery = supabase.from("students").select("*");
    let gradesQuery = supabase.from("grades").select(`
      *,
      students!grades_student_id_fkey (
        id, first_name, middle_name, last_name, student_id_no, year_level, section, strand
      )
    `);

    // Apply filters
    if (config.yearLevel !== 'all') {
      studentsQuery = studentsQuery.eq('year_level', config.yearLevel);
      gradesQuery = gradesQuery.eq('students.year_level', config.yearLevel);
    }

    if (config.section !== 'all') {
      studentsQuery = studentsQuery.eq('section', config.section);
      gradesQuery = gradesQuery.eq('students.section', config.section);
    }

    if (config.period !== 'all') {
      gradesQuery = gradesQuery.eq('quarter', config.period);
    }

    if (config.subject !== 'all') {
      gradesQuery = gradesQuery.eq('subject', config.subject);
    }

    // Execute queries
    const [studentsResult, gradesResult] = await Promise.all([
      studentsQuery,
      gradesQuery
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (gradesResult.error) throw gradesResult.error;

    // Generate analytics if needed
    let analytics = null;
    if (config.includeComponents.analytics || config.type === 'analytics') {
      analytics = await generateAnalytics(gradesResult.data || []);
    }

    return {
      students: studentsResult.data || [],
      grades: gradesResult.data || [],
      analytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.email || 'Unknown',
        totalRecords: (gradesResult.data || []).length,
        period: config.period
      }
    };
  };

  const generateAnalytics = async (grades: any[]) => {
    const analytics = {
      summary: {
        totalGrades: grades.length,
        averageGrade: 0,
        highestGrade: 0,
        lowestGrade: 0,
        passRate: 0
      },
      distribution: {
        outstanding: 0,
        verySatisfactory: 0,
        satisfactory: 0,
        fairlySatisfactory: 0,
        needsImprovement: 0
      },
      subjectPerformance: {} as Record<string, any>,
      quarterlyTrends: {} as Record<string, any>
    };

    if (grades.length === 0) return analytics;

    // Calculate summary
    const finalGrades = grades.map(g => g.final_grade).filter(g => g != null);
    analytics.summary.averageGrade = finalGrades.reduce((sum, grade) => sum + grade, 0) / finalGrades.length;
    analytics.summary.highestGrade = Math.max(...finalGrades);
    analytics.summary.lowestGrade = Math.min(...finalGrades);
    analytics.summary.passRate = (finalGrades.filter(g => g >= 75).length / finalGrades.length) * 100;

    // Calculate distribution
    finalGrades.forEach(grade => {
      if (grade >= 90) analytics.distribution.outstanding++;
      else if (grade >= 85) analytics.distribution.verySatisfactory++;
      else if (grade >= 80) analytics.distribution.satisfactory++;
      else if (grade >= 75) analytics.distribution.fairlySatisfactory++;
      else analytics.distribution.needsImprovement++;
    });

    // Subject performance
    const subjectGroups = grades.reduce((acc, grade) => {
      if (!acc[grade.subject]) acc[grade.subject] = [];
      acc[grade.subject].push(grade.final_grade);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(subjectGroups).forEach(([subject, subjectGrades]) => {
      const validGrades = subjectGrades.filter(g => g != null);
      if (validGrades.length > 0) {
        analytics.subjectPerformance[subject] = {
          average: validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length,
          count: validGrades.length,
          highest: Math.max(...validGrades),
          lowest: Math.min(...validGrades)
        };
      }
    });

    return analytics;
  };

  const generatePDFReport = async (data: ReportData) => {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.text('Academic Performance Report', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date(data.metadata.generatedAt).toLocaleString()}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Period: ${config.period === 'all' ? 'All Quarters' : config.period + ' Quarter'}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Total Records: ${data.metadata.totalRecords}`, 20, yPosition);
    yPosition += 15;

    // Summary (if analytics included)
    if (data.analytics && config.includeComponents.summary) {
      pdf.setFontSize(16);
      pdf.text('Performance Summary', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Average Grade: ${data.analytics.summary.averageGrade.toFixed(2)}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Highest Grade: ${data.analytics.summary.highestGrade}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Lowest Grade: ${data.analytics.summary.lowestGrade}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Pass Rate: ${data.analytics.summary.passRate.toFixed(1)}%`, 20, yPosition);
      yPosition += 15;
    }

    // Grade breakdown table
    if (config.includeComponents.gradeBreakdown && data.grades.length > 0) {
      pdf.setFontSize(16);
      pdf.text('Grade Records', 20, yPosition);
      yPosition += 10;

      // Table headers
      pdf.setFontSize(10);
      const headers = ['Student', 'Subject', 'Quarter', 'WW', 'PT', 'QA', 'Final', 'Remarks'];
      let xPos = 20;
      headers.forEach((header, index) => {
        pdf.text(header, xPos, yPosition);
        xPos += 25;
      });
      yPosition += 5;

      // Table data
      data.grades.slice(0, 30).forEach((grade) => { // Limit to 30 records for PDF
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }

        xPos = 20;
        const student = grade.students || {};
        const rowData = [
          `${student.first_name} ${student.last_name}`.substring(0, 15),
          grade.subject.substring(0, 12),
          grade.quarter,
          grade.written_work?.toFixed(1) || '-',
          grade.performance_task?.toFixed(1) || '-',
          grade.quarterly_assessment?.toFixed(1) || '-',
          grade.final_grade?.toFixed(1) || '-',
          grade.remarks?.substring(0, 10) || '-'
        ];

        rowData.forEach((data) => {
          pdf.text(data, xPos, yPosition);
          xPos += 25;
        });
        yPosition += 4;
      });
    }

    return pdf;
  };

  const generateExcelReport = async (data: ReportData) => {
    const workbook = XLSX.utils.book_new();

    // Grades worksheet
    if (config.includeComponents.gradeBreakdown) {
      const gradesData = data.grades.map(grade => ({
        'Student ID': grade.students?.student_id_no || '',
        'Student Name': `${grade.students?.first_name || ''} ${grade.students?.last_name || ''}`,
        'Year Level': grade.students?.year_level || '',
        'Section': grade.students?.section || '',
        'Subject': grade.subject,
        'Quarter': grade.quarter,
        'Written Work': grade.written_work,
        'Performance Task': grade.performance_task,
        'Quarterly Assessment': grade.quarterly_assessment,
        'Final Grade': grade.final_grade,
        'Remarks': grade.remarks
      }));

      const gradesSheet = XLSX.utils.json_to_sheet(gradesData);
      XLSX.utils.book_append_sheet(workbook, gradesSheet, 'Grades');
    }

    // Analytics worksheet
    if (data.analytics && config.includeComponents.analytics) {
      const analyticsData = [
        ['Performance Summary', ''],
        ['Average Grade', data.analytics.summary.averageGrade.toFixed(2)],
        ['Highest Grade', data.analytics.summary.highestGrade],
        ['Lowest Grade', data.analytics.summary.lowestGrade],
        ['Pass Rate (%)', data.analytics.summary.passRate.toFixed(1)],
        ['', ''],
        ['Grade Distribution', ''],
        ['Outstanding (90-100)', data.analytics.distribution.outstanding],
        ['Very Satisfactory (85-89)', data.analytics.distribution.verySatisfactory],
        ['Satisfactory (80-84)', data.analytics.distribution.satisfactory],
        ['Fairly Satisfactory (75-79)', data.analytics.distribution.fairlySatisfactory],
        ['Needs Improvement (<75)', data.analytics.distribution.needsImprovement]
      ];

      const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics');
    }

    // Subject performance worksheet
    if (data.analytics?.subjectPerformance && config.includeComponents.analytics) {
      const subjectData = Object.entries(data.analytics.subjectPerformance).map(([subject, perf]) => ({
        'Subject': subject,
        'Average': perf.average.toFixed(2),
        'Highest': perf.highest,
        'Lowest': perf.lowest,
        'Total Records': perf.count
      }));

      const subjectSheet = XLSX.utils.json_to_sheet(subjectData);
      XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subject Performance');
    }

    return workbook;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      // Fetch data
      setProgress(20);
      const data = await fetchReportData();
      setReportData(data);

      setProgress(50);

      // Generate report based on format
      if (config.format === 'pdf') {
        setProgress(70);
        const pdf = await generatePDFReport(data);

        setProgress(90);
        const fileName = `report-${config.type}-${Date.now()}.pdf`;
        pdf.save(fileName);
      } else {
        setProgress(70);
        const workbook = await generateExcelReport(data);

        setProgress(90);
        const fileName = `report-${config.type}-${Date.now()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      }

      setProgress(100);

      setTimeout(() => {
        setProgress(0);
        setGenerating(false);
        onClose();
      }, 1000);

    } catch (error: any) {
      console.error("Error generating report:", error);
      setGenerating(false);
    }
  };

  const updateConfig = (field: keyof ReportConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateIncludeComponent = (component: keyof ReportConfig['includeComponents'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      includeComponents: {
        ...prev.includeComponents,
        [component]: value
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Create customizable academic reports in PDF or Excel format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type & Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={config.type} onValueChange={(value) => updateConfig('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={config.format} onValueChange={(value) => updateConfig('format', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF Report
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel Spreadsheet
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select value={config.period} onValueChange={(value) => updateConfig('period', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Quarters</SelectItem>
                      {quarters.map(quarter => (
                        <SelectItem key={quarter} value={quarter}>{quarter} Quarter</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year Level</Label>
                  <Select value={config.yearLevel} onValueChange={(value) => updateConfig('yearLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {availableFilters.yearLevels.map(level => (
                        <SelectItem key={level} value={level}>Grade {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={config.section} onValueChange={(value) => updateConfig('section', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {availableFilters.sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={config.subject} onValueChange={(value) => updateConfig('subject', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {availableFilters.subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Include Components */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Report Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="studentInfo"
                      checked={config.includeComponents.studentInfo}
                      onCheckedChange={(checked) => updateIncludeComponent('studentInfo', !!checked)}
                    />
                    <Label htmlFor="studentInfo" className="text-sm">Student Information</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gradeBreakdown"
                      checked={config.includeComponents.gradeBreakdown}
                      onCheckedChange={(checked) => updateIncludeComponent('gradeBreakdown', !!checked)}
                    />
                    <Label htmlFor="gradeBreakdown" className="text-sm">Grade Breakdown</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="analytics"
                      checked={config.includeComponents.analytics}
                      onCheckedChange={(checked) => updateIncludeComponent('analytics', !!checked)}
                    />
                    <Label htmlFor="analytics" className="text-sm">Performance Analytics</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary"
                      checked={config.includeComponents.summary}
                      onCheckedChange={(checked) => updateIncludeComponent('summary', !!checked)}
                    />
                    <Label htmlFor="summary" className="text-sm">Summary Statistics</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="charts"
                      checked={config.includeComponents.charts}
                      onCheckedChange={(checked) => updateIncludeComponent('charts', !!checked)}
                      disabled={config.format === 'excel'}
                    />
                    <Label htmlFor="charts" className="text-sm">
                      Charts & Graphs {config.format === 'excel' && '(PDF only)'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generation Progress */}
          {generating && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating report...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose} disabled={generating}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2">
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate {config.format.toUpperCase()} Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerator;