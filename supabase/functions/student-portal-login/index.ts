import { createClient } from 'npm:@supabase/supabase-js@2'

// Simple CORS headers for browser calls via supabase-js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

type LoginBody = {
  student_id_no?: string
  password?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { student_id_no, password } = (await req.json()) as LoginBody

    if (!student_id_no?.trim() || !password) {
      return new Response(JSON.stringify({ error: 'Student ID and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // 1) Verify student_id_no + password in students table
    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from('students')
      .select(
        [
          'id',
          'first_name',
          'middle_name',
          'last_name',
          'student_id_no',
          'student_lrn',
          'year_level',
          'section',
          'strand',
          'birth_place',
          'birth_date',
          'address',
          'age',
          'gender',
          'contact_number',
          'guardian_name',
          'parent_contact_no',
          'must_change_password',
        ].join(', '),
      )
      .eq('student_id_no', student_id_no.trim())
      .eq('password', password)
      .single()

    if (studentError || !student) {
      return new Response(
        JSON.stringify({
          error: 'Invalid Student ID or password',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 2) Load grades
    const { data: grades, error: gradesError } = await supabaseAdmin
      .from('grades')
      .select('*')
      .eq('student_id', student.id)
      .order('quarter', { ascending: true })
      .order('subject', { ascending: true })

    if (gradesError) {
      return new Response(JSON.stringify({ error: 'Failed to load grades' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Load recent attendance
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .order('date', { ascending: false })
      .limit(50)

    if (attendanceError) {
      return new Response(JSON.stringify({ error: 'Failed to load attendance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return everything needed by the StudentPortal
    return new Response(
      JSON.stringify({
        student,
        grades: grades ?? [],
        attendance: attendance ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('student-portal-login error', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

