# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Student Nexus application.

## Functions

### create-advisor

This Edge Function creates new advisor accounts without automatically logging them in, solving the common Supabase auto-login issue when using `auth.signUp()`.

**Problem**: When using `supabase.auth.admin.createUser()` on the client side, it can sometimes cause session conflicts or auto-login behavior that interferes with the current user's session.

**Solution**: This Edge Function runs on the server side with the service role key, ensuring:
- New users are created without affecting the current session
- Proper security by keeping service role keys on the server
- Full control over the registration flow
- Users must confirm their email before first login

## Deployment

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref dedzejfdokzryilzecag
   ```

### Deploy Functions

Deploy all functions:
```bash
supabase functions deploy
```

Deploy specific function:
```bash
supabase functions deploy create-advisor
```

### Environment Variables

The Edge Functions require the following environment variables:
- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided by Supabase

### Local Development

Start local development:
```bash
supabase start
supabase functions serve
```

Test the function locally:
```bash
curl -X POST 'http://localhost:54329/functions/v1/create-advisor' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "profileData": {
      "first_name": "John",
      "middle_name": "M",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "role": "advisor"
    },
    "advisorData": {
      "birth_place": "City",
      "birth_date": "1990-01-01",
      "address": "123 Main St",
      "contact_number": "+1234567890",
      "employee_no": "EMP001",
      "position": "Teacher",
      "age": 33,
      "gender": "male",
      "civil_status": "single",
      "years_of_service": 5,
      "tribe": "",
      "religion": ""
    },
    "assignments": [
      {
        "year_level": "7",
        "section": "Archimedes",
        "strand": null
      }
    ],
    "password": "securepassword123"
  }'
```

## Function Details

### create-advisor

**Endpoint**: `/functions/v1/create-advisor`
**Method**: POST
**Auth**: Requires valid JWT token

**Request Body**:
```typescript
{
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
  }>;
  password: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    user: User;
    advisor: Advisor;
  }
}
```

**Error Response**:
```typescript
{
  error: string;
}
```

## Security Notes

- All functions use CORS headers to allow cross-origin requests
- Service role key is used server-side only for maximum security
- New users must confirm their email before first login
- All database operations respect Row Level Security (RLS) policies