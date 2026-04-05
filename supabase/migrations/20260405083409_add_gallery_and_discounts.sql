-- ==========================================
-- 1. UPDATE TABEL PACKAGES (Diskon & Badge)
-- ==========================================
alter table public.packages
add column original_price numeric, -- Harga sebelum diskon (harga coret)
add column badge text;             -- Label promo, misal: 'Best Seller', 'Diskon 20%'

-- ==========================================
-- 2. BUAT TABEL GALLERY
-- ==========================================
create table public.gallery (
  id uuid default gen_random_uuid() primary key,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image',
  caption text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Aktifkan RLS untuk Gallery
alter table public.gallery enable row level security;

-- Policy Gallery: Semua orang bisa melihat
create policy "Semua orang bisa melihat gallery"
  on gallery for select using (is_active = true);

-- Policy Gallery: Hanya Admin yang bisa kelola
create policy "Hanya Admin yang bisa kelola gallery"
  on gallery for all using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- ==========================================
-- 3. BUAT STORAGE BUCKET (Untuk File Media)
-- ==========================================
-- Otomatis membuat bucket publik bernama 'gallery_media'
insert into storage.buckets (id, name, public)
values ('gallery_media', 'gallery_media', true)
on conflict (id) do nothing;

-- Policy Storage: Semua orang bisa melihat file (Download/View)
create policy "Public Access to Gallery Media"
  on storage.objects for select
  using ( bucket_id = 'gallery_media' );

-- Policy Storage: Hanya Admin yang bisa Upload/Delete file
create policy "Admin Access to Upload Gallery Media"
  on storage.objects for insert
  with check ( 
    bucket_id = 'gallery_media' and 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
  );

create policy "Admin Access to Delete Gallery Media"
  on storage.objects for delete
  using ( 
    bucket_id = 'gallery_media' and 
    (select role from public.profiles where id = auth.uid()) = 'admin' 
  );