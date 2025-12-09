# Deploy Edge Function Instructions

## Important Note
The project "ULS-CSU" (dedzejfdokzryilzecag) was not found in the current CLI session's accessible projects. This could be because:
- The project is in a different organization
- Different account access is needed
- The project needs to be accessed through the organization owner

## Method 1: Manual Deployment (Requires Proper Access)

1. **Ensure you're logged in with the correct account**:
   ```bash
   npx supabase login
   ```
   Make sure you're logged in with the account that has access to the ULS-CSU project.

2. **Verify project access**:
   ```bash
   npx supabase projects list
   ```
   Look for "ULS-CSU" with reference ID "dedzejfdokzryilzecag"

3. **Link your project** (only if it appears in the list):
   ```bash
   npx supabase link --project-ref dedzejfdokzryilzecag
   ```

4. **Deploy the Edge Function**:
   ```bash
   npx supabase functions deploy create-advisor
   ```

## Method 2: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/dedzejfdokzryilzecag)
2. Navigate to "Edge Functions" in the sidebar
3. Click "New Function"
4. Name it `create-advisor`
5. Copy the contents of `supabase/functions/create-advisor/index.ts` into the editor
6. Also create the CORS file by creating a new file at `supabase/functions/_shared/cors.ts`
7. Deploy the function

## Method 3: Alternative Approach

The application currently has a fallback mechanism that will work without the Edge Function deployed. However, this fallback:
- Uses the session restoration method to prevent auto-login
- May still cause brief session conflicts
- Is less secure than the Edge Function approach

## Verification

After deployment, you can test the function:
```bash
curl -X POST 'https://dedzejfdokzryilzecag.supabase.co/functions/v1/create-advisor' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"test": true}'
```

## Current Status

- ✅ Edge Function code created
- ✅ CORS configuration added
- ✅ Fallback mechanism implemented
- ⏳ Edge Function deployment pending
- ✅ Multi-select advisor assignment working

The application will work with the fallback mechanism until the Edge Function is deployed.