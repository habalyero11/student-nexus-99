import { supabase } from "@/integrations/supabase/client";

interface GradeScaleRange {
    min: number;
    max: number;
    label: string;
}

interface GradingSystem {
    id: string;
    name: string;
    written_work_percentage: number;
    performance_task_percentage: number;
    quarterly_assessment_percentage: number;
    grade_scale: GradeScaleRange[];
}

interface ExportOptions {
    yearLevel: string;
    section: string;
    subject: string;
    quarter: string;
    gradingSystem: GradingSystem | null;
    profile: any;
}

export const exportToExcel = async (options: ExportOptions) => {
    const { yearLevel, section, subject, quarter } = options;

    try {
        // Get the session token for authorization
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('You must be logged in to export grades');
        }

        // Get the Supabase project URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (!supabaseUrl) {
            throw new Error('Supabase URL not configured');
        }

        // Call Edge Function directly using fetch to properly handle binary response
        const response = await fetch(`${supabaseUrl}/functions/v1/export-grades`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                yearLevel,
                section,
                subject,
                quarter
            })
        });

        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = 'Failed to generate Excel file';
            try {
                const errorData = await response.json();
                console.error('Server error response:', JSON.stringify(errorData, null, 2));
                errorMessage = errorData.error || errorMessage;
                if (errorData.details) {
                    errorMessage += ` - ${errorData.details}`;
                }
            } catch (e) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
                console.error('Failed to parse error response:', e);
            }
            console.error('Full error message:', errorMessage);
            throw new Error(errorMessage);
        }

        // Get binary data as ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();

        // Create blob from ArrayBuffer
        const blob = new Blob([arrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Generate filename
        const filename = `GradeSheet_${yearLevel}-${section}_${subject}_${quarter}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        window.URL.revokeObjectURL(url);

    } catch (error: any) {
        console.error('Export error:', error);
        throw error;
    }
};

