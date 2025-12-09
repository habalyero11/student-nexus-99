-- Fixed diagnostic query for admin role issues

-- 1. Check current user profiles and their roles (without limit syntax error)
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