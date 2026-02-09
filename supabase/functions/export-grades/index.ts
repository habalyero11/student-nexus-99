import { createClient } from 'npm:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'

// CORS headers for the Edge Function
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
    yearLevel: string;
    section: string;
    subject: string;
    quarter: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Create supabase client with user's token (applies RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        )

        // Get request data
        const requestData: ExportRequest = await req.json()
        const { yearLevel, section, subject, quarter } = requestData

        console.log('Export request:', { yearLevel, section, subject, quarter })

        // Validate required fields
        if (!yearLevel || !section || !subject || !quarter) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Download Excel template from Storage
        console.log('Downloading template from storage...')
        const { data: templateData, error: storageError } = await supabaseClient.storage
            .from('excel-templates')
            .download('grade_template.xlsx')

        if (storageError) {
            console.error('Storage error:', storageError)
            return new Response(
                JSON.stringify({ error: `Template not found: ${storageError.message}` }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Load template with xlsx (lighter and faster than exceljs)
        console.log('Loading template...')
        const arrayBuffer = await templateData.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })

        // Determine quarter sheet name
        const quarterMap: { [key: string]: string } = {
            '1st': 'Q1',
            '2nd': 'Q2',
            '3rd': 'Q3',
            '4th': 'Q4',
        }
        const quarterSuffix = quarterMap[quarter] || 'Q1'

        // Rename all ESP sheets to match the requested subject
        // This allows a single ESP template to work for all subjects
        console.log('Renaming sheets from ESP to', subject)
        const espSheets = ['ESP Q1', 'ESP Q2', 'ESP Q3', 'ESP Q4']
        const newSheetNames = [`${subject} Q1`, `${subject} Q2`, `${subject} Q3`, `${subject} Q4`]

        espSheets.forEach((oldName, index) => {
            if (workbook.Sheets[oldName]) {
                const newName = newSheetNames[index]
                // Rename the sheet
                workbook.Sheets[newName] = workbook.Sheets[oldName]
                delete workbook.Sheets[oldName]
                // Update SheetNames array
                const sheetIndex = workbook.SheetNames.indexOf(oldName)
                if (sheetIndex !== -1) {
                    workbook.SheetNames[sheetIndex] = newName
                }
            }
        })

        const sheetName = `${subject} ${quarterSuffix}`

        console.log('Looking for sheet:', sheetName)

        if (!workbook.Sheets[sheetName]) {
            return new Response(
                JSON.stringify({ error: `Sheet "${sheetName}" not found in template. Available sheets: ${workbook.SheetNames.join(', ')}` }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const worksheet = workbook.Sheets[sheetName]

        // Fetch students (RLS applied)
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, student_id_no, first_name, last_name')
            .eq('year_level', yearLevel)
            .eq('section', section)
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true })

        if (studentsError) {
            console.error('Students error:', studentsError)
            return new Response(
                JSON.stringify({ error: studentsError.message }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (!students || students.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No students found for this section' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log(`Found ${students.length} students`)

        // Fill student data into template
        // Row 13 is where student names start (adjust based on your template)
        const STUDENT_START_ROW = 13
        const NAME_COLUMN = 'B'

        students.forEach((student: any, index: number) => {
            const rowNumber = STUDENT_START_ROW + index
            const cellAddress = `${NAME_COLUMN}${rowNumber}`

            // Set student name
            worksheet[cellAddress] = {
                t: 's', // string type
                v: `${student.last_name}, ${student.first_name}`
            }
        })

        console.log('Student names filled successfully')

        // Generate Excel buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Generate filename
        const filename = `${yearLevel}-${section}_${subject}_${quarter}_${new Date().toISOString().split('T')[0]}.xlsx`

        console.log('Returning Excel file:', filename)

        // Return Excel file
        return new Response(buffer, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            }
        })

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
