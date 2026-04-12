-- Fix infinite recursion in profiles RLS policy.
-- Previous policy queried public.profiles inside its own USING expression.

DROP POLICY IF EXISTS "Discussion visibility for profiles" ON public.profiles;

CREATE POLICY "Discussion visibility for profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR role = 'admin'
    OR COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role'
    ) = 'admin'
  );
