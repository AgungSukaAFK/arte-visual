-- 1. Buat fungsi "Jalur VVIP" untuk mengecek apakah user yang login adalah Admin
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Buka gembok tabel Profiles agar Admin bisa melihat & mengedit semua Klien
create policy "Admin view all profiles" on profiles for select using ( public.is_admin() );
create policy "Admin update all profiles" on profiles for update using ( public.is_admin() );

-- 3. Buka gembok tabel Bookings (Sekalian, agar Admin bisa melihat dan ACC pesanan yang masuk)
create policy "Admin view all bookings" on bookings for select using ( public.is_admin() );
create policy "Admin update all bookings" on bookings for update using ( public.is_admin() );