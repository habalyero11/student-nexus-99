# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server (Vite + HMR)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Supabase (requires Supabase CLI)
supabase start           # Start local Supabase stack
supabase stop            # Stop local stack
supabase db reset        # Reset local database
supabase db push         # Push migrations to remote database
supabase gen types typescript --project-id dedzejfdokzryilzecag > src/integrations/supabase/types.ts

# Edge Functions
supabase functions deploy create-advisor    # Deploy advisor creation function
supabase functions deploy [function-name]   # Deploy specific edge function
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **State**: React Query for server state, localStorage for preferences
- **Routing**: React Router DOM v6

### Core Domain Model

**CSU-ULS** is an educational management system for ULS-CSU with two primary user roles:

- **Admin**: Full system access, manages advisors, all students, and curriculum (subjects)
- **Advisor**: Restricted to assigned year levels, sections, strands, and subjects

#### Academic Structure
- **Year Levels**: 7-10 (Junior High), 11-12 (Senior High)
- **Sections**: Named per year level (e.g., "Einstein", "Newton")
- **Strands**: Only Grade 11 students (HUMMS, STEM, GAS, ABM, ICT)
- **Quarters**: Four grading periods per academic year

#### Key Database Relationships
```
profiles -> auth.users (1:1)
advisors -> profiles (1:1, advisor role only)
advisor_assignments -> advisors (Many:1)
students (independent)
grades -> students (Many:1)
attendance -> students (Many:1)
```

### Authentication & Authorization

#### Role-Based Access Control (RBAC)
The entire application uses **role-based filtering** at multiple levels:

1. **Database Level**: Row Level Security (RLS) policies filter data by user role
2. **API Level**: Supabase handles JWT validation and role enforcement
3. **UI Level**: Components dynamically filter options based on user assignments

#### Critical Pattern: Advisor Assignment Filtering
Most data-fetching functions follow this pattern:
```typescript
if (userRole === "advisor") {
  // Fetch advisor assignments
  const { data: advisor } = await supabase
    .from("advisors")
    .select(`advisor_assignments(year_level, section, strand)`)
    .eq("profile_id", profile.id)
    .single();

  // Filter data based on assignments
  filteredData = data.filter(item =>
    advisor.advisor_assignments.some(assignment =>
      // Match year_level, section, and strand if applicable
    )
  );
}
```

#### Timing Issues Prevention
Due to async auth loading, many components use this pattern:
```typescript
useEffect(() => {
  const initializeData = async () => {
    await fetchUserProfile(); // Wait for role to be set
    fetchOtherData();
  };
  initializeData();
}, []);

// Re-fetch when role changes
useEffect(() => {
  if (userRole) {
    fetchData();
  }
}, [userRole]);
```

### Grade Management System

#### Grade Calculation
Uses DepEd K-12 formula:
- Written Work: 25% (Junior High) / 25% (Senior High)
- Performance Task: 50% (Junior High) / 50% (Senior High)
- Quarterly Assessment: 25% (Junior High) / 25% (Senior High)

#### Smart Defaults System
- Uses `useGradeDefaults` hook to remember user preferences
- Stores last-used subject/quarter in localStorage
- Floating grade entry button provides quick access from any page

### Component Architecture Patterns

#### Form Components
All major entity forms follow this pattern:
- Accept optional entity for editing
- Include `userRole` and `advisorAssignments` props for filtering
- Use Zod validation schemas
- Support both create and edit modes

Example:
```typescript
interface StudentFormProps {
  student?: Student;
  onSuccess: () => void;
  onCancel: () => void;
  userRole?: string;
  advisorAssignments?: AdvisorAssignment[];
}
```

#### Data Display Components
Pages with student/grade data follow this filtering pattern:
- Fetch user profile first to get role and assignments
- Filter available options (year levels, sections, subjects) based on assignments
- Pass filtered data to child components
- Re-fetch when user role changes

### Edge Functions

#### Advisor Creation
Uses Edge Function at `supabase/functions/create-advisor/index.ts` to prevent auto-login issues:
- Creates user with `email_confirm: false`
- Bypasses normal signup flow to prevent advisor auto-login
- Requires `VITE_SUPABASE_SERVICE_ROLE` environment variable

### Database Migration Strategy

#### Migration Files
Located in `supabase/migrations/` with timestamp-based naming:
- Initial schema: Core tables and relationships
- RLS policies: Role-based security rules
- Functions/triggers: Automated profile creation

#### Key Enum Types
```sql
user_role: 'admin' | 'advisor'
year_level: '7' | '8' | '9' | '10' | '11' | '12'
strand: 'humms' | 'stem' | 'gas' | 'abm' | 'ict'
quarter: '1st' | '2nd' | '3rd' | '4th'
```

### Performance Considerations

#### Query Optimization
- Uses React Query for caching and background updates
- Implements strategic filtering at database level via RLS
- Batch operations for grade entry to reduce API calls

#### Security Best Practices
- All sensitive operations go through Edge Functions
- Never expose service role key in client code
- Use RLS policies instead of client-side filtering for security-critical data
- Validate user permissions on both client and server

### Common Development Patterns

#### New Feature Development
1. Add database schema changes via migration
2. Update TypeScript types (`npm run supabase:types`)
3. Implement RLS policies for new tables
4. Create/update React components with role-based filtering
5. Test with both admin and advisor roles

#### Debugging Role Issues
- Check browser network tab for failed RLS queries
- Verify `userRole` state is set before data fetching
- Ensure advisor assignments are loaded before filtering
- Test edge cases like advisors with no assignments

#### Grade 11 Strand Logic
Special handling required: Grade 11 has strands, Grade 12 does not
```typescript
// Only show strand for Grade 11
if (yearLevel === "11") {
  // Show strand selection
} else {
  // Hide strand selection, set to null
}
```

This system architecture provides comprehensive role-based access control while maintaining a clean separation between admin and advisor capabilities.