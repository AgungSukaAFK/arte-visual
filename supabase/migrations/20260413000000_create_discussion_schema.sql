-- Discussion panel schema: conversations + messages + storage policies

create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_message_at timestamptz default now() not null
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  booking_id uuid references public.bookings(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  attachment_url text,
  attachment_type text check (attachment_type in ('image', 'file')),
  attachment_name text,
  is_read boolean default false,
  created_at timestamptz default now() not null,
  constraint messages_has_payload check (
    coalesce(nullif(trim(content), ''), '') <> ''
    or attachment_url is not null
    or booking_id is not null
    or invoice_id is not null
    or package_id is not null
  )
);

create index if not exists idx_messages_conversation_created_at
  on public.messages(conversation_id, created_at);

create index if not exists idx_messages_unread_conversation
  on public.messages(conversation_id, is_read);

create index if not exists idx_conversations_last_message_at
  on public.conversations(last_message_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations access
create policy "Client lihat konversasi sendiri"
  on public.conversations
  for select
  using (auth.uid() = client_id);

create policy "Client bisa insert konversasi sendiri"
  on public.conversations
  for insert
  with check (auth.uid() = client_id);

create policy "Client update konversasi sendiri"
  on public.conversations
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

create policy "Admin lihat semua konversasi"
  on public.conversations
  for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin update semua konversasi"
  on public.conversations
  for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Message read access
create policy "Client baca pesan konversasinya"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = auth.uid()
    )
  );

create policy "Admin baca semua pesan"
  on public.messages
  for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Message insert access
create policy "Client kirim pesan konversasinya"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = auth.uid()
    )
  );

create policy "Admin kirim pesan ke semua konversasi"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Mark message as read (update)
create policy "Client update read status"
  on public.messages
  for update
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = auth.uid()
    )
  );

create policy "Admin update read status"
  on public.messages
  for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Trigger to keep conversation timestamps updated after inserts
create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = timezone('utc'::text, now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_after_message on public.messages;
create trigger trg_touch_conversation_after_message
after insert on public.messages
for each row execute function public.touch_conversation_after_message();

-- Enable realtime for discussion tables.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end;
$$;

-- Discussion attachment storage policies
insert into storage.buckets (id, name, public)
values ('discussion-attachments', 'discussion-attachments', true)
on conflict (id) do nothing;

drop policy if exists "Upload lampiran diskusi oleh user login" on storage.objects;
create policy "Upload lampiran diskusi oleh user login"
  on storage.objects
  for insert
  with check (
    bucket_id = 'discussion-attachments'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Lihat lampiran diskusi" on storage.objects;
create policy "Lihat lampiran diskusi"
  on storage.objects
  for select
  using (bucket_id = 'discussion-attachments');
