import { corsHeaders } from '../_shared/cors.ts'

interface PredictStudentsRequest {
    studentIds?: string[];
    advisorProfileId?: string;
    role: 'admin' | 'advisor';
}

interface GenerateRemarksRequest {
    studentName: string;
    subject: string;
    quarter: string;
    writtenWork: number | null;
    performanceTask: number | null;
    quarterlyAssessment: number | null;
    finalGrade: number;
    yearLevel: string;
    section: string;
}

interface StudentData {
    id: string;
    name: string;
    yearLevel: string;
    section: string;
    strand?: string;
    averageGrade: number;
    attendanceRate: number;
    trend: 'improving' | 'declining' | 'stable';
    grades: Array<{
        subject: string;
        quarter: string;
        finalGrade: number;
    }>;
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

async function callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function predictStudents(students: StudentData[]): Promise<Array<{
    studentId: string;
    riskLevel: 'high' | 'medium' | 'low';
    prediction: string;
    suggestions: string[];
}>> {
    if (students.length === 0) {
        return [];
    }

    const studentSummaries = students.map(s =>
        `- ${s.name} (Grade ${s.yearLevel}-${s.section}): Avg Grade: ${s.averageGrade.toFixed(1)}, Attendance: ${s.attendanceRate.toFixed(1)}%, Trend: ${s.trend}`
    ).join('\n');

    const prompt = `You are an educational analytics AI assistant for a K-12 school. Analyze these students and identify those who need improvement or are at risk of failing.

Students:
${studentSummaries}

For each student who needs attention (below 80% average or declining trend or low attendance), provide:
1. Risk level (high/medium/low)
2. Brief prediction (1 sentence)
3. 2-3 specific improvement suggestions

Respond in JSON format only:
{
  "students": [
    {
      "name": "Student Name",
      "riskLevel": "high|medium|low",
      "prediction": "Brief prediction",
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ]
}

Only include students who need attention. If all students are performing well, return {"students": []}.`;

    try {
        const response = await callGeminiAPI(prompt);
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return (parsed.students || []).map((s: any) => {
                const student = students.find(st => st.name === s.name);
                return {
                    studentId: student?.id || '',
                    riskLevel: s.riskLevel || 'low',
                    prediction: s.prediction || '',
                    suggestions: s.suggestions || [],
                };
            }).filter((s: any) => s.studentId);
        }
    } catch (error) {
        console.error('Error parsing Gemini prediction response:', error);
    }

    return [];
}

async function generateRemarks(data: GenerateRemarksRequest): Promise<string> {
    const gradeLevel = data.finalGrade >= 90 ? 'Outstanding' :
        data.finalGrade >= 85 ? 'Very Satisfactory' :
            data.finalGrade >= 80 ? 'Satisfactory' :
                data.finalGrade >= 75 ? 'Fairly Satisfactory' :
                    'Did Not Meet Expectations';

    const prompt = `You are an educational advisor generating remarks for a student's grade report.

Student: ${data.studentName}
Grade Level: ${data.yearLevel}, Section: ${data.section}
Subject: ${data.subject}
Quarter: ${data.quarter}
Written Work (25%): ${data.writtenWork ?? 'N/A'}
Performance Task (50%): ${data.performanceTask ?? 'N/A'}
Quarterly Assessment (25%): ${data.quarterlyAssessment ?? 'N/A'}
Final Grade: ${data.finalGrade.toFixed(1)} (${gradeLevel})

Generate a brief, personalized remark (2-3 sentences) that:
1. Acknowledges the student's performance level
2. Identifies specific areas where the student excels or needs improvement based on the component scores
3. Provides encouragement or actionable advice

Be professional, constructive, and encouraging. Do not use generic phrases. Focus on the specific subject and scores.`;

    try {
        const response = await callGeminiAPI(prompt);
        // Clean up the response
        return response.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error('Error generating remarks:', error);
        // Fallback to basic remarks
        return `${gradeLevel}. ${data.finalGrade >= 75 ? 'Keep up the good work!' : 'Additional support recommended.'}`;
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname.split('/').pop();

        if (path === 'predict-students') {
            // Predict at-risk students
            const { students } = await req.json();
            const predictions = await predictStudents(students || []);

            return new Response(
                JSON.stringify({ success: true, predictions }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (path === 'generate-remarks') {
            // Generate AI remarks for a grade
            const data: GenerateRemarksRequest = await req.json();
            const remarks = await generateRemarks(data);

            return new Response(
                JSON.stringify({ success: true, remarks }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Invalid endpoint' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in gemini-analytics:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
