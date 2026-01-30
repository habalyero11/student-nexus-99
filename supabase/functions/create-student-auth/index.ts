import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const DEFAULT_PASSWORD = '1234'
const STUDENT_EMAIL_DOMAIN = 'students.uls-csu.internal'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseUser.auth.getUser()
      if (user) {
        const { data: p } = await supabaseAdmin.from('profiles').select('role').eq('user_id', user.id).single()
        const r = (p?.role ?? '').toLowerCase()
        if (r !== 'admin' && r !== 'advisor') {
          return new Response(JSON.stringify({ error: 'Only admin or advisor can create student auth accounts' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    const { student_id_no, password = DEFAULT_PASSWORD } = await req.json() as { student_id_no?: string; password?: string }

    if (!student_id_no?.trim()) {
      return new Response(JSON.stringify({ error: 'student_id_no is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = `s.${student_id_no.trim()}@${STUDENT_EMAIL_DOMAIN}`

    const { data: existing } = await supabaseAdmin.from('students').select('id, auth_user_id').eq('student_id_no', student_id_no.trim()).single()
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (existing.auth_user_id) {
      return new Response(JSON.stringify({ success: true, message: 'Auth account already exists', auth_user_id: existing.auth_user_id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { student_id_no: student_id_no.trim(), type: 'student' }
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: 'Failed to create auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: updErr } = await supabaseAdmin
      .from('students')
      .update({ auth_user_id: authData.user.id, must_change_password: true })
      .eq('id', existing.id)

    if (updErr) {
      return new Response(JSON.stringify({ error: 'Failed to link student to auth: ' + updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, auth_user_id: authData.user.id }), {
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
