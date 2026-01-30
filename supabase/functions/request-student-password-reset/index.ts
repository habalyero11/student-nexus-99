import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { student_id_no } = await req.json() as { student_id_no?: string }

    if (!student_id_no?.trim()) {
      return new Response(JSON.stringify({ error: 'student_id_no is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: student, error: findErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('student_id_no', student_id_no.trim())
      .single()

    if (findErr || !student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: existing } = await supabaseAdmin
      .from('password_reset_requests')
      .select('id')
      .eq('student_id', student.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ success: true, message: 'A reset request is already pending. Your advisor and admin have been notified.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: insErr } = await supabaseAdmin
      .from('password_reset_requests')
      .insert({ student_id: student.id, status: 'pending' })

    if (insErr) {
      return new Response(JSON.stringify({ error: 'Failed to submit request: ' + insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Your advisor and admin have been notified. Please approach them to reset your password to the default (1234).' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
