-- Diagnostic and fix for admin role issues

-- 1. Check current user profiles and their roles
SELECT
  p.id,
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- 2. If you need to update your current user to admin role, first find your user_id:
-- (Replace 'your-email@example.com' with your actual email)
SELECT
  u.id as user_id,
  u.email,
  p.role as current_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'your-email@example.com';

-- 3. Update your user role to admin (replace the user_id with the actual ID from step 2)
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- 4. If profile doesn't exist, create it manually (replace with your actual details)
-- INSERT INTO profiles (user_id, email, first_name, last_name, role)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   'your-email@example.com',
--   'Your First Name',
--   'Your Last Name',
--   'admin'
-- );

-- 5. Verify the update worked
-- SELECT
--   p.id,
--   p.user_id,
--   p.email,
--   p.first_name,
--   p.last_name,
--   p.role
-- FROM profiles p
-- WHERE p.email = 'your-email@example.com';