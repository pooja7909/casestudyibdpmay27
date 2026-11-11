-- Diffuse Vision Lab — PostgreSQL schema (code-based, no emails, no student names)
-- Run once in Supabase: SQL Editor → New query → paste everything → Run.
-- Then set your teacher password (see the bottom of this file).

-- ---------- remove the earlier email-based version, if you ran it ----------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.progress, public.profiles, public.classes, public.teachers cascade;
drop function if exists public.is_teacher(), public.teaches(uuid), public.class_exists(text) cascade;

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables (no personal data: only codes, group labels and lab work) ----------
create table if not exists public.lab_codes (
  code        text primary key,
  grp         text not null default '',
  created_at  timestamptz not null default now()
);
create table if not exists public.lab_work (
  code        text primary key references public.lab_codes(code) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create table if not exists public.lab_teacher (
  id            int primary key default 1 check (id = 1),
  pw_hash       text not null,
  failed        int not null default 0,
  locked_until  timestamptz
);

-- Nobody can read or write these tables directly from the website:
alter table public.lab_codes   enable row level security;
alter table public.lab_work    enable row level security;
alter table public.lab_teacher enable row level security;
revoke all on public.lab_codes, public.lab_work, public.lab_teacher from anon, authenticated;
-- …the website can only call the functions below.

-- ---------- helpers ----------
create or replace function public.lab_norm(p text) returns text
language sql immutable as $$
  select case when length(x) = 8 then substr(x, 1, 4) || '-' || substr(x, 5, 4) else x end
  from (select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) as x) s
$$;

create or replace function public.lab_gen_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := gen_random_bytes(8); s text := '';
begin
  for i in 0..7 loop s := s || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;

-- Checks the teacher password; locks for 15 minutes after 10 wrong attempts.
create or replace function public.lab_teacher_ok(p_password text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare t lab_teacher%rowtype;
begin
  select * into t from lab_teacher where id = 1;
  if not found then return false; end if;
  if t.locked_until is not null and t.locked_until > now() then return false; end if;
  if crypt(coalesce(p_password, ''), t.pw_hash) = t.pw_hash then
    update lab_teacher set failed = 0, locked_until = null where id = 1;
    return true;
  end if;
  update lab_teacher set
    failed = case when t.failed + 1 >= 10 then 0 else t.failed + 1 end,
    locked_until = case when t.failed + 1 >= 10 then now() + interval '15 minutes' else null end
  where id = 1;
  return false;
end $$;

-- ---------- student functions ----------
create or replace function public.lab_student_load(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := lab_norm(p_code); w lab_work%rowtype;
begin
  if not exists (select 1 from lab_codes where code = c) then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
  select * into w from lab_work where code = c;
  return jsonb_build_object('ok', true, 'code', c, 'data', coalesce(w.data, '{}'::jsonb), 'updated_at', w.updated_at);
end $$;

create or replace function public.lab_student_save(p_code text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := lab_norm(p_code); ts timestamptz := now();
begin
  if not exists (select 1 from lab_codes where code = c) then return jsonb_build_object('ok', false, 'error', 'unknown_code'); end if;
  if pg_column_size(p_data) > 1000000 then return jsonb_build_object('ok', false, 'error', 'too_large'); end if;
  insert into lab_work (code, data, updated_at) values (c, coalesce(p_data, '{}'::jsonb), ts)
    on conflict (code) do update set data = excluded.data, updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true, 'updated_at', ts);
end $$;

-- ---------- teacher functions (all need the teacher password) ----------
create or replace function public.lab_teacher_login(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from lab_teacher) then return jsonb_build_object('ok', false, 'error', 'no_password_set'); end if;
  if exists (select 1 from lab_teacher where locked_until > now()) then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  if lab_teacher_ok(p_password) then return jsonb_build_object('ok', true); end if;
  return jsonb_build_object('ok', false, 'error', 'wrong_password');
end $$;

create or replace function public.lab_teacher_create_codes(p_password text, p_count int, p_group text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare out text[] := '{}'; c text; n int := least(greatest(coalesce(p_count, 1), 1), 60);
begin
  if not lab_teacher_ok(p_password) then return jsonb_build_object('ok', false, 'error', 'wrong_password'); end if;
  while coalesce(array_length(out, 1), 0) < n loop
    c := lab_gen_code();
    begin
      insert into lab_codes (code, grp) values (c, left(coalesce(trim(p_group), ''), 60));
      out := out || c;
    exception when unique_violation then null; -- extremely rare: try again
    end;
  end loop;
  return jsonb_build_object('ok', true, 'codes', to_jsonb(out));
end $$;

create or replace function public.lab_teacher_list(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not lab_teacher_ok(p_password) then return jsonb_build_object('ok', false, 'error', 'wrong_password'); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('code', c.code, 'grp', c.grp, 'created_at', c.created_at, 'updated_at', w.updated_at, 'data', coalesce(w.data, '{}'::jsonb)) order by c.grp, c.created_at, c.code)
    from lab_codes c left join lab_work w on w.code = c.code), '[]'::jsonb));
end $$;

create or replace function public.lab_teacher_delete_code(p_password text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not lab_teacher_ok(p_password) then return jsonb_build_object('ok', false, 'error', 'wrong_password'); end if;
  delete from lab_codes where code = lab_norm(p_code);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lab_teacher_change_password(p_password text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not lab_teacher_ok(p_password) then return jsonb_build_object('ok', false, 'error', 'wrong_password'); end if;
  if length(coalesce(p_new, '')) < 8 then return jsonb_build_object('ok', false, 'error', 'too_short'); end if;
  update lab_teacher set pw_hash = crypt(p_new, gen_salt('bf', 10)) where id = 1;
  return jsonb_build_object('ok', true);
end $$;

-- Admin only (SQL Editor): set or reset the teacher password.
create or replace function public.lab_set_password(p_new text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_new, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  insert into lab_teacher (id, pw_hash) values (1, crypt(p_new, gen_salt('bf', 10)))
    on conflict (id) do update set pw_hash = excluded.pw_hash, failed = 0, locked_until = null;
  return 'Teacher password set.';
end $$;

-- ---------- who may call what ----------
revoke execute on function public.lab_norm(text), public.lab_gen_code(), public.lab_teacher_ok(text), public.lab_set_password(text),
  public.lab_student_load(text), public.lab_student_save(text, jsonb), public.lab_teacher_login(text),
  public.lab_teacher_create_codes(text, int, text), public.lab_teacher_list(text), public.lab_teacher_delete_code(text, text),
  public.lab_teacher_change_password(text, text) from public, anon, authenticated;
grant execute on function public.lab_student_load(text), public.lab_student_save(text, jsonb),
  public.lab_teacher_login(text), public.lab_teacher_create_codes(text, int, text), public.lab_teacher_list(text),
  public.lab_teacher_delete_code(text, text), public.lab_teacher_change_password(text, text)
  to anon, authenticated;

-- ---------- NEXT STEP: set your teacher password ----------
-- In a NEW query, run this line with your own password (at least 8 characters):
--
--   select public.lab_set_password('choose-a-strong-password');
--
-- Forgot it later? Run the same line again with a new password.
