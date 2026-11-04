-- 0001_initial_schema.sql
-- Skema database MTCNA Training (Next.js 16 + Supabase)

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
end
$$;

-- 1. Tabel profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

-- Fungsi pembantu pengecekan role admin (security definer agar aman dipanggil dari RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Trigger pembuatan baris profiles otomatis saat user baru terdaftar di auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger mencegah perubahan kolom role oleh non-service-role
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') is distinct from 'service_role'
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Perubahan role akun tidak diizinkan.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_Immutable on public.profiles;
create trigger on_profile_role_Immutable
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- 2. Tabel referensi sumber materi
create table if not exists public.refs (
  id text primary key,
  title text not null,
  url text not null
);

-- 3. Tabel metadata soal
create table if not exists public.questions (
  id text primary key,
  topic text not null,
  kind text not null check (kind in ('tunggal', 'jamak')),
  sort_order int not null,
  source_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 4. Tabel terjemahan soal (ID & EN)
create table if not exists public.question_translations (
  question_id text not null references public.questions(id) on delete cascade,
  lang text not null check (lang in ('id', 'en')),
  body text not null,
  options jsonb not null,
  explanation text not null,
  primary key (question_id, lang)
);

-- 5. Tabel kunci jawaban (terpisah dan dikunci ketat dengan RLS)
create table if not exists public.question_keys (
  question_id text primary key references public.questions(id) on delete cascade,
  answer text not null
);

-- 6. Tabel sesi latihan / tryout (attempts)
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_attempt_id uuid references public.attempts(id) on delete set null,
  mode text not null check (mode in ('belajar', 'tryout', 'remedial')),
  lang text not null check (lang in ('id', 'en')),
  topic text,
  question_ids text[] not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  finished_at timestamptz,
  score numeric(5, 2),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired'))
);

create index if not exists idx_attempts_user_id on public.attempts(user_id, started_at desc);

-- 7. Tabel jawaban per soal pada sebuah attempt
create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  selected text not null default '',
  marked boolean not null default false,
  is_correct boolean,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- 8. Tabel log audit aksi admin
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.refs enable row level security;
alter table public.questions enable row level security;
alter table public.question_translations enable row level security;
alter table public.question_keys enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.admin_audit_log enable row level security;

-- Policies: profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Policies: refs
drop policy if exists "refs_select_authenticated" on public.refs;
create policy "refs_select_authenticated"
  on public.refs for select
  using (auth.uid() is not null);

drop policy if exists "refs_manage_admin" on public.refs;
create policy "refs_manage_admin"
  on public.refs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: questions
drop policy if exists "questions_select_authenticated" on public.questions;
create policy "questions_select_authenticated"
  on public.questions for select
  using (auth.uid() is not null);

drop policy if exists "questions_manage_admin" on public.questions;
create policy "questions_manage_admin"
  on public.questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: question_translations
-- Catatan keamanan: Hanya admin yang membaca langsung lewat session client;
-- peserta menerima teks soal dan pembahasan melalui Server Component / Server Action
-- supaya kolom explanation tidak bisa diintip sebelum tryout selesai.
drop policy if exists "question_translations_manage_admin" on public.question_translations;
create policy "question_translations_manage_admin"
  on public.question_translations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: question_keys
-- Tidak ada policy baca untuk anon maupun user biasa! Hanya admin atau service_role.
drop policy if exists "question_keys_manage_admin" on public.question_keys;
create policy "question_keys_manage_admin"
  on public.question_keys for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: attempts
drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin"
  on public.attempts for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own"
  on public.attempts for insert
  with check (auth.uid() = user_id and not public.is_admin());

drop policy if exists "attempts_update_own" on public.attempts;
create policy "attempts_update_own"
  on public.attempts for update
  using (auth.uid() = user_id and not public.is_admin())
  with check (auth.uid() = user_id and not public.is_admin());

-- Policies: attempt_answers
drop policy if exists "attempt_answers_select_own_or_admin" on public.attempt_answers;
create policy "attempt_answers_select_own_or_admin"
  on public.attempt_answers for select
  using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and (a.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "attempt_answers_write_own" on public.attempt_answers;
create policy "attempt_answers_write_own"
  on public.attempt_answers for all
  using (
    not public.is_admin()
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'in_progress'
    )
  )
  with check (
    not public.is_admin()
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'in_progress'
    )
  );

-- Policies: admin_audit_log
drop policy if exists "admin_audit_log_admin_only" on public.admin_audit_log;
create policy "admin_audit_log_admin_only"
  on public.admin_audit_log for all
  using (public.is_admin())
  with check (public.is_admin());

