import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Users,
  Save,
  RefreshCw
} from "lucide-react";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Grade = Database["public"]["Tables"]["grades"]["Insert"];

interface BulkGradeImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  student_id_no: string;
  student_name: string;
  subject: string;
  quarter: string;
  written_work: number | null;
  performance_task: number | null;
  quarterly_assessment: number | null;
  final_grade?: number | null;
  remarks?: string;
  // Validation
  isValid: boolean;
  errors: string[];
  // Database mapping
  studentRecord?: Student;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const BulkGradeImport = ({ isOpen, onClose, onSuccess }: BulkGradeImportProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<{
    valid: number;
    invalid: number;
    duplicates: number;
  }>({ valid: 0, invalid: 0, duplicates: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'import' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const quarters = ["1st", "2nd", "3rd", "4th"];

  // Template for CSV download
  const csvTemplate = [
    {
      student_id_no: "",
      student_name: "",
      subject: "",
      quarter: "",
      written_work: "",
      performance_task: "",
      quarterly_assessment: "",
      final_grade: "",
      remarks: ""
    }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const processFile = async (file: File) => {
    setLoading(true);
    setImportData([]);
    setStep('upload');

    try {
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            data = results.data;
            processImportData(data);
          },
          error: (error) => {
            toast({
              variant: "destructive",
              title: "CSV Parse Error",
              description: error.message
            });
            setLoading(false);
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
        processImportData(data);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a CSV or Excel file"
        });
        setLoading(false);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "File Processing Error",
        description: error.message
      });
      setLoading(false);
    }
  };

  const processImportData = async (rawData: any[]) => {
    try {
      // Fetch students for validation
      await fetchStudents();

      const processedData: ImportRow[] = rawData.map((row, index) => {
        const errors: string[] = [];

        // Validate required fields
        if (!row.student_id_no) errors.push("Student ID is required");
        if (!row.subject) errors.push("Subject is required");
        if (!row.quarter) errors.push("Quarter is required");

        // Validate quarter
        if (row.quarter && !quarters.includes(row.quarter)) {
          errors.push("Quarter must be one of: " + quarters.join(", "));
        }

        // Validate numeric fields
        const writtenWork = parseFloat(row.written_work);
        const performanceTask = parseFloat(row.performance_task);
        const quarterlyAssessment = parseFloat(row.quarterly_assessment);

        if (row.written_work && (isNaN(writtenWork) || writtenWork < 0 || writtenWork > 100)) {
          errors.push("Written Work must be between 0-100");
        }
        if (row.performance_task && (isNaN(performanceTask) || performanceTask < 0 || performanceTask > 100)) {
          errors.push("Performance Task must be between 0-100");
        }
        if (row.quarterly_assessment && (isNaN(quarterlyAssessment) || quarterlyAssessment < 0 || quarterlyAssessment > 100)) {
          errors.push("Quarterly Assessment must be between 0-100");
        }

        return {
          student_id_no: row.student_id_no?.toString() || "",
          student_name: row.student_name?.toString() || "",
          subject: row.subject?.toString() || "",
          quarter: row.quarter?.toString() || "",
          written_work: isNaN(writtenWork) ? null : writtenWork,
          performance_task: isNaN(performanceTask) ? null : performanceTask,
          quarterly_assessment: isNaN(quarterlyAssessment) ? null : quarterlyAssessment,
          final_grade: row.final_grade ? parseFloat(row.final_grade) : null,
          remarks: row.remarks?.toString() || "",
          isValid: errors.length === 0,
          errors
        };
      });

      setImportData(processedData);
      setStep('validate');
      await validateData(processedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Data Processing Error",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, id")
        .eq("user_id", user.id)
        .single();

      let query = supabase
        .from("students")
        .select("*")
        .order("student_id_no", { ascending: true });

      if (profile?.role === "advisor") {
        // Get advisor's assigned students
        const { data: advisor } = await supabase
          .from("advisors")
          .select(`
            id,
            advisor_assignments(year_level, section, strand)
          `)
          .eq("profile_id", profile.id)
          .single();

        if (advisor?.advisor_assignments && advisor.advisor_assignments.length > 0) {
          const { data, error } = await query;
          if (error) throw error;

          console.log("BulkImport - Advisor assignments:", advisor.advisor_assignments);
          console.log("BulkImport - All students before filtering:", data?.length);

          const filteredStudents = data?.filter(student => {
            const matches = advisor.advisor_assignments.some(assignment => {
              const matchesYearLevel = student.year_level === assignment.year_level;
              const matchesSection = student.section === assignment.section;

              // For Grade 11-12 students, check strand if assignment has strand
              if (student.year_level === "11" || student.year_level === "12") {
                if (assignment.strand) {
                  const matchesStrand = student.strand === assignment.strand;
                  return matchesYearLevel && matchesSection && matchesStrand;
                } else {
                  // Assignment doesn't specify strand, but student is 11-12, still match on year/section
                  return matchesYearLevel && matchesSection;
                }
              } else {
                // For Grade 7-10, ignore strand completely
                return matchesYearLevel && matchesSection;
              }
            });
            return matches;
          }) || [];

          console.log("BulkImport - Filtered students for advisor:", filteredStudents.length);
          setStudents(filteredStudents);
          return;
        }
      }

      // Admin sees all students
      const { data, error } = await query;
      if (error) throw error;
      console.log("BulkImport - All students fetched:", data?.length);
      setStudents(data || []);

    } catch (error: any) {
      console.error("BulkImport - Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error Fetching Students",
        description: error.message
      });
    }
  };

  const validateData = async (data: ImportRow[]) => {
    try {
      const validatedData = data.map(row => {
        // Find matching student
        const studentRecord = students.find(s => s.student_id_no === row.student_id_no);

        if (!studentRecord) {
          row.errors.push("Student ID not found in system");
          row.isValid = false;
        } else {
          row.studentRecord = studentRecord;
        }

        return row;
      });

      // Check for duplicate entries within the import
      const duplicates = new Set<string>();
      const seen = new Set<string>();

      validatedData.forEach(row => {
        const key = `${row.student_id_no}-${row.subject}-${row.quarter}`;
        if (seen.has(key)) {
          duplicates.add(key);
          row.errors.push("Duplicate entry in import file");
          row.isValid = false;
        }
        seen.add(key);
      });

      // Check for existing grades in database
      for (const row of validatedData) {
        if (row.studentRecord) {
          const { data: existingGrade } = await supabase
            .from("grades")
            .select("id")
            .eq("student_id", row.studentRecord.id)
            .eq("subject", row.subject)
            .eq("quarter", row.quarter)
            .maybeSingle();

          if (existingGrade) {
            row.errors.push("Grade already exists in system");
            row.isValid = false;
          }
        }
      }

      const valid = validatedData.filter(row => row.isValid).length;
      const invalid = validatedData.filter(row => !row.isValid).length;

      setValidationResults({
        valid,
        invalid,
        duplicates: duplicates.size
      });

      setImportData(validatedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: error.message
      });
    }
  };

  const calculateFinalGrade = (writtenWork: number | null, performanceTask: number | null, quarterlyAssessment: number | null): number => {
    const ww = writtenWork || 0;
    const pt = performanceTask || 0;
    const qa = quarterlyAssessment || 0;
    return Math.round(((ww * 0.25) + (pt * 0.50) + (qa * 0.25)) * 100) / 100;
  };

  const getGradeRemarks = (grade: number): string => {
    if (grade >= 90) return "Outstanding";
    if (grade >= 85) return "Very Satisfactory";
    if (grade >= 80) return "Satisfactory";
    if (grade >= 75) return "Fairly Satisfactory";
    return "Did Not Meet Expectations";
  };

  const handleImport = async () => {
    const validRows = importData.filter(row => row.isValid);

    if (validRows.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Data",
        description: "Please fix validation errors before importing"
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setStep('import');

    const result: ImportResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const totalRows = validRows.length;
      const batchSize = 10;

      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        const gradeData: Grade[] = batch.map(row => {
          const finalGrade = row.final_grade || calculateFinalGrade(
            row.written_work,
            row.performance_task,
            row.quarterly_assessment
          );

          return {
            student_id: row.studentRecord!.id,
            subject: row.subject,
            quarter: row.quarter,
            written_work: row.written_work,
            performance_task: row.performance_task,
            quarterly_assessment: row.quarterly_assessment,
            final_grade: finalGrade,
            remarks: row.remarks || getGradeRemarks(finalGrade)
          };
        });

        const { error } = await supabase
          .from("grades")
          .insert(gradeData);

        if (error) {
          batch.forEach((_, batchIndex) => {
            result.failed++;
            result.errors.push({
              row: i + batchIndex + 1,
              error: error.message
            });
          });
        } else {
          result.successful += batch.length;
        }

        setImportProgress(((i + batch.length) / totalRows) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportResult(result);
      setStep('result');

      if (result.successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.successful} grades${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Error",
        description: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse(csvTemplate);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grade_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setImportData([]);
    setSelectedFile(null);
    setStep('upload');
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetImport();
    onClose();
  };

  const handleFinish = () => {
    if (importResult && importResult.successful > 0) {
      onSuccess();
    }
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Grade Import
          </DialogTitle>
          <DialogDescription>
            Import grades from CSV or Excel files
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download the CSV template to ensure your data is in the correct format
                  </p>
                  <Button onClick={downloadTemplate} variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop your CSV or Excel file here, or click to browse
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {loading ? "Processing..." : "Choose File"}
                    </Button>
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Validation */}
          {step === 'validate' && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Validation Summary */}
              <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{validationResults.valid}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{validationResults.invalid}</div>
                    <div className="text-sm text-muted-foreground">Invalid Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{validationResults.duplicates}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Preview */}
              <Card className="flex-1 overflow-hidden">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-sm">Data Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {importData.map((row, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg ${
                            row.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {row.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{row.student_id_no}</span>
                              <span className="text-sm text-muted-foreground">{row.student_name}</span>
                            </div>
                            <Badge variant={row.isValid ? "default" : "destructive"}>
                              {row.subject} - {row.quarter}
                            </Badge>
                          </div>

                          {!row.isValid && row.errors.length > 0 && (
                            <div className="text-sm text-red-600 space-y-1">
                              {row.errors.map((error, errorIndex) => (
                                <div key={errorIndex}>• {error}</div>
                              ))}
                            </div>
                          )}

                          {row.isValid && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>WW: {row.written_work?.toFixed(1) || "—"}</div>
                              <div>PT: {row.performance_task?.toFixed(1) || "—"}</div>
                              <div>QA: {row.quarterly_assessment?.toFixed(1) || "—"}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between flex-shrink-0">
                <Button variant="outline" onClick={resetImport}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validationResults.valid === 0}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Import {validationResults.valid} Records
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Import Progress */}
          {step === 'import' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium mb-2">Importing Grades...</h3>
                <p className="text-muted-foreground">Please wait while we import your grades</p>
              </div>

              <div className="max-w-md mx-auto">
                <Progress value={importProgress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {Math.round(importProgress)}% Complete
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Import Complete</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                    <div className="text-sm text-muted-foreground">Successfully Imported</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-red-600">Import Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 mb-1">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button onClick={handleFinish}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finish
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkGradeImport;