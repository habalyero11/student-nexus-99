// Quick script to check advisor_assignments structure
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
)

const checkAssignments = async () => {
    const { data, error } = await supabase
        .from('advisor_assignments')
        .select('*')
        .limit(5)

    console.log('Advisor assignments:', JSON.stringify(data, null, 2))
    console.log('Error:', error)
}

checkAssignments()
