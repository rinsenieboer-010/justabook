begin;

create table public.jab_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 250),
  url text not null default '' check (char_length(url) <= 2000),
  transcript text not null default '' check (char_length(transcript) <= 500000),
  audio_path text,
  transcript_job text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.jab_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 250),
  content text not null check (char_length(content) between 1 and 12000),
  quote text not null default '' check (char_length(quote) <= 1200),
  tags text not null default '' check (char_length(tags) <= 500),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  source_id uuid,
  excerpt text not null default '' check (char_length(excerpt) <= 20000),
  location text not null default '' check (char_length(location) <= 250),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (source_id, user_id) references public.jab_sources(id, user_id)
);

create table public.jab_lesson_links (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  related_id uuid not null,
  note text not null default '' check (char_length(note) <= 2000),
  primary key (lesson_id, related_id),
  check (lesson_id <> related_id),
  foreign key (lesson_id, user_id) references public.jab_lessons(id, user_id) on delete cascade,
  foreign key (related_id, user_id) references public.jab_lessons(id, user_id) on delete cascade
);

create table public.jab_knowledge_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  interval_days integer not null default 7 check (interval_days in (0,1,2,3,7)),
  anchor_date date not null default current_date
);

alter table public.jab_sources enable row level security;
alter table public.jab_lessons enable row level security;
alter table public.jab_lesson_links enable row level security;
alter table public.jab_knowledge_preferences enable row level security;
create policy own_sources on public.jab_sources for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_lessons on public.jab_lessons for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_links on public.jab_lesson_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_preferences on public.jab_knowledge_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.jab_sources, public.jab_lessons, public.jab_lesson_links, public.jab_knowledge_preferences to authenticated;
create index jab_sources_user on public.jab_sources(user_id, created_at);
create index jab_lessons_user_status on public.jab_lessons(user_id, status, created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jab-audio', 'jab-audio', false, 209715200, array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm','video/mp4'])
on conflict (id) do nothing;
create policy own_book_audio on storage.objects for all to authenticated
using (bucket_id = 'jab-audio' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'jab-audio' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
