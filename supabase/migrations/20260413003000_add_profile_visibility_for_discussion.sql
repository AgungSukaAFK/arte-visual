-- Allow profile visibility needed by discussion feature.
-- Client: can view own profile + all admin profiles.
-- Admin: can view all profiles.

create policy "Discussion visibility for profiles"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or (select role from public.profiles where id = auth.uid()) = 'admin'
    or (
      role = 'admin'
      and (select role from public.profiles where id = auth.uid()) = 'client'
    )
  );
