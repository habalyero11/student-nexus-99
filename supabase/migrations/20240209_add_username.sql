-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- Function to get email by username (Security Definer to bypass RLS for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM public.profiles
  WHERE username = username_input;
  
  RETURN found_email;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
