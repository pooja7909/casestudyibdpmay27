-- Diffuse Vision Lab — PostgreSQL schema for Supabase
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ---------- tables ----------
create table if not exists public.teachers (
  user_id uuid primary key references auth.users on delete cascade
);

create table if not exists public.classes (
  code        text primary key,
  name        text not null,
  teacher_id  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,
  email         text,
  class_code    text references public.classes(code) on delete set null,
  created_at    timestamptz not null default now()
);

-- One row per student: all their lab work as JSON (predictions, evidence, answers, memo, AI log…)
create table if not exists public.progress (
  user_id     uuid primary key references auth.users on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.teachers enable row level security;
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- ---------- helper functions (security definer avoids policy recursion) ----------
create or replace function public.is_teacher() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from teachers where user_id = auth.uid())
$$;

create or replace function public.teaches(student uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles p join classes c on c.code = p.class_code
    where p.id = student and c.teacher_id = auth.uid()
  )
$$;

-- Lets the sign-up form check a class code without exposing the list of classes.
create or replace function public.class_exists(c text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from classes where code = upper(trim(c)))
$$;
grant execute on function public.class_exists(text) to anon, authenticated;

-- ---------- policies ----------
drop policy if exists "teachers read self" on public.teachers;
create policy "teachers read self" on public.teachers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "teacher reads own classes" on public.classes;
create policy "teacher reads own classes" on public.classes
  for select to authenticated using (teacher_id = auth.uid());
drop policy if exists "teacher creates classes" on public.classes;
create policy "teacher creates classes" on public.classes
  for insert to authenticated with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists "teacher deletes own classes" on public.classes;
create policy "teacher deletes own classes" on public.classes
  for delete to authenticated using (teacher_id = auth.uid());

drop policy if exists "read own or taught profiles" on public.profiles;
create policy "read own or taught profiles" on public.profiles
  for select to authenticated using (id = auth.uid() or public.teaches(id));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Students may change only their display name (not their class).
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "read own or taught progress" on public.progress;
create policy "read own or taught progress" on public.progress
  for select to authenticated using (user_id = auth.uid() or public.teaches(user_id));
drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "update own progress" on public.progress;
create policy "update own progress" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- create a profile automatically at sign-up ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cc text := upper(nullif(trim(new.raw_user_meta_data->>'class_code'), ''));
begin
  if cc is not null and not exists (select 1 from classes where code = cc) then cc := null; end if;
  insert into profiles (id, display_name, email, class_code)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
          new.email, cc);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------- make yourself a teacher (run after you have signed up on the site) ----------
-- insert into public.teachers (user_id)
--   select id from auth.users where email = 'you@yourschool.org';
