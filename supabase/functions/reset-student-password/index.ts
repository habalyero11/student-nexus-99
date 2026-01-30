import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const DEFAULT_PASSWORD = '1234'

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const profile = await supabaseAdmin.from('profiles').select('role').eq('user_id', user.id).single()
    const role = (profile?.data?.role ?? '').toLowerCase()
    if (role !== 'admin' && role !== 'advisor') {
      return new Response(JSON.stringify({ error: 'Only admin or advisor can reset student passwords' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json() as { student_id?: string; request_id?: string }
    const { student_id, request_id } = body

    let sid: string | null = null
    let reqId: string | null = request_id || null

    if (request_id) {
      const { data: reqRow } = await supabaseAdmin
        .from('password_reset_requests')
        .select('student_id')
        .eq('id', request_id)
        .eq('status', 'pending')
        .single()
      if (!reqRow) {
        return new Response(JSON.stringify({ error: 'Request not found or already resolved' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      sid = reqRow.student_id
    } else if (student_id) {
      sid = student_id
    }

    if (!sid) {
      return new Response(JSON.stringify({ error: 'student_id or request_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Direct update to students table - bypassing Supabase Auth
    // We update password to default and set must_change_password to true
    const { error: updErr } = await supabaseAdmin
      .from('students')
      .update({
        password: DEFAULT_PASSWORD,
        must_change_password: true
      })
      .eq('id', sid)

    if (updErr) {
      return new Response(JSON.stringify({ error: 'Failed to reset password: ' + updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (reqId) {
      await supabaseAdmin
        .from('password_reset_requests')
        .update({ status: 'completed', resolved_by: user.id, resolved_at: new Date().toISOString() })
        .eq('id', reqId)
    }

    return new Response(JSON.stringify({ success: true, message: 'Password has been reset to 1234. The student must change it on next login.' }), {
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
