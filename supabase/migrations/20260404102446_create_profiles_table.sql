-- 1. Buat tabel profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('client', 'admin')) default 'client',
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Aktifkan RLS (Row Level Security) agar aman
alter table public.profiles enable row level security;

-- 3. Buat aturan keamanan (Policies)
-- User hanya boleh melihat dan mengedit profil miliknya sendiri
create policy "User can view own profile" 
  on profiles for select 
  using ( auth.uid() = id );

create policy "User can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );

-- 4. Buat fungsi Trigger untuk otomatisasi pembuatan profil
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Pasang Trigger ke tabel auth.users bawaan Supabase
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();