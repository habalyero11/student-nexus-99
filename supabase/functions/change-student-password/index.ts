import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { student_id, current_password, new_password } = await req.json()

        if (!student_id || !new_password) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (new_password.length < 6) {
            return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Verify current password if provided (for voluntary changes)
        // If must_change_password is true, we still might want to verify "current" if it was passed,
        // but typically for forced reset (1234) the user knows 1234.
        // Let's enforce current_password check always for security.

        if (!current_password) {
            return new Response(JSON.stringify({ error: 'Current password is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, password')
            .eq('id', student_id)
            .single()

        if (!student) {
            return new Response(JSON.stringify({ error: 'Student not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (student.password !== current_password) {
            return new Response(JSON.stringify({ error: 'Incorrect current password' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Update password
        const { error: updateError } = await supabaseAdmin
            .from('students')
            .update({
                password: new_password,
                must_change_password: false
            })
            .eq('id', student_id)

        if (updateError) {
            return new Response(JSON.stringify({ error: 'Failed to update password' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
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
