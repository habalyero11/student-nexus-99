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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: p } = await supabaseAdmin.from('profiles').select('role').eq('user_id', user.id).single()
    if ((p?.role ?? '').toLowerCase() !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admin can run backfill' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: students } = await supabaseAdmin.from('students').select('id, student_id_no').is('auth_user_id', null)
    if (!students?.length) {
      return new Response(JSON.stringify({ success: true, created: 0, message: 'No students without auth accounts.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let created = 0
    const errors: string[] = []

    for (const s of students) {
      const email = `s.${s.student_id_no}@${STUDENT_EMAIL_DOMAIN}`
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { student_id_no: s.student_id_no, type: 'student' }
      })
      if (authError) {
        errors.push(`${s.student_id_no}: ${authError.message}`)
        continue
      }
      if (!authData.user) continue
      const { error: updErr } = await supabaseAdmin.from('students').update({ auth_user_id: authData.user.id, must_change_password: true }).eq('id', s.id)
      if (updErr) errors.push(`${s.student_id_no}: ${updErr.message}`)
      else created++
    }

    return new Response(JSON.stringify({ success: true, created, total: students.length, errors: errors.slice(0, 10) }), {
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
