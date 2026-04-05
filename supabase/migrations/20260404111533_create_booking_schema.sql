-- 1. Buat Tabel Packages (Paket Jasa Dokumentasi)
create table public.packages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  features jsonb default '[]'::jsonb, -- Menyimpan list fitur seperti ["1 Fotografer", "Video 1 Menit"]
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Buat Tabel Bookings (Pemesanan Jadwal)
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete restrict not null,
  event_date date not null,
  event_time time without time zone,
  location text not null,
  status text check (status in ('pending', 'confirmed', 'completed', 'cancelled')) default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Aktifkan Row Level Security (RLS)
alter table public.packages enable row level security;
alter table public.bookings enable row level security;

-- ==========================================
-- 4. ATURAN KEAMANAN (POLICIES) UNTUK PACKAGES
-- ==========================================
-- Semua user yang login bisa melihat daftar paket
create policy "Semua orang bisa melihat paket aktif"
  on packages for select using (is_active = true);

-- Hanya Admin yang bisa insert/update/delete paket
create policy "Hanya Admin yang bisa kelola paket"
  on packages for all using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- ==========================================
-- 5. ATURAN KEAMANAN (POLICIES) UNTUK BOOKINGS
-- ==========================================
-- Client hanya bisa melihat & membuat booking untuk dirinya sendiri
create policy "Client bisa melihat bookingannya sendiri"
  on bookings for select using (auth.uid() = client_id);

create policy "Client bisa membuat booking"
  on bookings for insert with check (auth.uid() = client_id);

-- Admin bisa melihat semua bookingan dan mengubah statusnya
create policy "Admin bisa melihat semua booking"
  on bookings for select using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "Admin bisa update status booking"
  on bookings for update using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );