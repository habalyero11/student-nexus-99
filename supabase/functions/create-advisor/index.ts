import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AdvisorRequest {
  profileData: {
    first_name: string;
    middle_name: string;
    last_name: string;
    email: string;
    role: "admin" | "advisor";
  };
  advisorData: {
    birth_place: string;
    birth_date: string;
    address: string;
    contact_number: string;
    employee_no: string;
    position: string;
    age: number | null;
    gender: "male" | "female" | null;
    civil_status: "single" | "married" | "widowed" | "separated" | "divorced" | null;
    years_of_service: number | null;
    tribe: string;
    religion: string;
  };
  assignments: Array<{
    year_level: string;
    section: string;
    strand?: string;
    subjects?: string[];
  }>;
  password: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request data
    const requestData: AdvisorRequest = await req.json()
    console.log('Received advisor creation request for:', requestData.profileData?.email)

    const { profileData, advisorData, assignments, password } = requestData

    // Validate required fields
    if (!profileData?.email || !password || !profileData?.first_name || !profileData?.last_name) {
      console.error('Missing required fields:', {
        email: !!profileData?.email,
        password: !!password,
        first_name: !!profileData?.first_name,
        last_name: !!profileData?.last_name
      })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate assignments format
    if (assignments && !Array.isArray(assignments)) {
      console.error('Invalid assignments format:', assignments)
      return new Response(
        JSON.stringify({ error: 'Assignments must be an array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate age from birth date if birth date is provided
    let calculatedAge = advisorData.age;
    if (advisorData.birth_date) {
      const today = new Date();
      const birthDate = new Date(advisorData.birth_date);
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }

    // Create auth user using admin API (this won't auto-login the current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: profileData.email,
      password: password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        first_name: profileData.first_name,
        middle_name: profileData.middle_name,
        last_name: profileData.last_name,
        role: profileData.role,
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Wait a moment for the auth trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to get existing profile first (created by trigger)
    let profileResult;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: profileData.email,
          first_name: profileData.first_name,
          middle_name: profileData.middle_name,
          last_name: profileData.last_name,
          role: profileData.role,
        })
        .eq('user_id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      profileResult = updatedProfile;
    } else {
      // Create new profile if trigger didn't work
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: profileData.email,
          first_name: profileData.first_name,
          middle_name: profileData.middle_name,
          last_name: profileData.last_name,
          role: profileData.role,
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile create error:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      profileResult = newProfile;
    }

    // Create advisor record
    const { data: advisorResult, error: advisorError } = await supabaseAdmin
      .from('advisors')
      .insert({
        profile_id: profileResult.id,
        ...advisorData,
        age: calculatedAge,
      })
      .select()
      .single()

    if (advisorError) {
      console.error('Advisor error:', advisorError)
      return new Response(
        JSON.stringify({ error: advisorError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create assignments
    if (assignments && assignments.length > 0) {
      console.log('Processing', assignments.length, 'assignments')
      const assignmentsToInsert = assignments
        .filter(a => a.section) // Only insert assignments with sections
        .map(assignment => ({
          advisor_id: advisorResult.id,
          year_level: assignment.year_level,
          section: assignment.section,
          strand: assignment.year_level === "11" ? assignment.strand : null,
          subjects: assignment.subjects || [],
        }))

      console.log('Inserting', assignmentsToInsert.length, 'valid assignments')

      if (assignmentsToInsert.length > 0) {
        const { error: assignmentError } = await supabaseAdmin
          .from('advisor_assignments')
          .insert(assignmentsToInsert)

        if (assignmentError) {
          console.error('Assignment error:', assignmentError)
          return new Response(
            JSON.stringify({ error: assignmentError.message }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
    } else {
      console.log('No assignments to process')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: authData.user,
          advisor: advisorResult
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})