-- 0002_ai_integration.sql
-- Integrasi AI (Ryzumi Router): Cache penjelasan, kuota persentase peserta, log pemakaian, rekomendasi, dan pengaturan global.

-- 1. Tabel cache penjelasan umum AI per soal dan bahasa
create table if not exists public.ai_explanations (
  question_id text not null references public.questions(id) on delete cascade,
  lang text not null check (lang in ('id', 'en')),
  content text not null,
  model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, lang)
);

-- 2. Tabel kuota AI per peserta
create table if not exists public.ai_user_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tokens_used int not null default 0 check (tokens_used >= 0),
  period_started_at timestamptz not null default now(),
  reset_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3. Tabel riwayat pemakaian AI
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('personal_explanation', 'ask_ai', 'recommendation')),
  question_id text references public.questions(id) on delete set null,
  attempt_id uuid references public.attempts(id) on delete set null,
  tokens_used int not null check (tokens_used >= 0),
  percent_used numeric(5, 2) not null check (percent_used >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_user_created
  on public.ai_usage_logs(user_id, created_at desc);

create index if not exists idx_ai_usage_logs_created_at
  on public.ai_usage_logs(created_at desc);

-- 4. Tabel rekomendasi belajar AI pasca-tryout (dibuat sekali per attempt)
create table if not exists public.ai_recommendations (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lang text not null check (lang in ('id', 'en')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_recommendations_user_id
  on public.ai_recommendations(user_id);

-- 5. Tabel pengaturan sakelar global AI
create table if not exists public.ai_settings (
  id text primary key default 'global' check (id = 'global'),
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.ai_settings (id, is_enabled)
values ('global', true)
on conflict (id) do nothing;

-- ============================================================================
-- FUNGSI ATOMIK PEMOTONGAN KUOTA & RESET MALAS (LAZY 3-DAY RESET)
-- ============================================================================

create or replace function public.consume_ai_user_quota(
  p_user_id uuid,
  p_tokens int,
  p_budget int,
  p_reset_days int,
  p_feature text,
  p_question_id text default null,
  p_attempt_id uuid default null
)
returns table (
  tokens_used int,
  period_started_at timestamptz,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_user_quotas%rowtype;
  v_now timestamptz := now();
  v_new_tokens int;
  v_new_reset timestamptz;
  v_percent numeric(5, 2);
begin
  if p_budget <= 0 then
    raise exception 'AI_USER_TOKEN_BUDGET harus lebih besar dari 0.';
  end if;

  insert into public.ai_user_quotas (user_id, tokens_used, period_started_at, reset_at, updated_at)
  values (p_user_id, 0, v_now, null, v_now)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.ai_user_quotas q
  where q.user_id = p_user_id
  for update;

  -- Reset malas jika jadwal reset_at sudah terlewati
  if v_row.reset_at is not null and v_now >= v_row.reset_at then
    v_row.tokens_used := 0;
    v_row.period_started_at := v_now;
    v_row.reset_at := null;
  end if;

  v_new_tokens := least(p_budget, greatest(0, v_row.tokens_used + greatest(0, p_tokens)));

  if v_new_tokens >= p_budget and v_row.reset_at is null then
    v_new_reset := v_now + make_interval(days => greatest(1, p_reset_days));
  else
    v_new_reset := v_row.reset_at;
  end if;

  update public.ai_user_quotas q
  set
    tokens_used = v_new_tokens,
    period_started_at = v_row.period_started_at,
    reset_at = v_new_reset,
    updated_at = v_now
  where q.user_id = p_user_id;

  v_percent := least(100.00, round((greatest(0, p_tokens)::numeric / p_budget::numeric) * 100.0, 2));

  insert into public.ai_usage_logs (
    user_id,
    feature,
    question_id,
    attempt_id,
    tokens_used,
    percent_used,
    created_at
  )
  values (
    p_user_id,
    p_feature,
    p_question_id,
    p_attempt_id,
    greatest(0, p_tokens),
    v_percent,
    v_now
  );

  return query
  select v_new_tokens, v_row.period_started_at, v_new_reset;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.ai_explanations enable row level security;
alter table public.ai_user_quotas enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.ai_settings enable row level security;

-- Policies: ai_explanations
-- Catatan: Penjelasan dibaca melalui Server Action setelah server memastikan jawaban sudah dikunci / tryout selesai,
-- atau oleh admin untuk manajemen cache.
drop policy if exists "ai_explanations_manage_admin" on public.ai_explanations;
create policy "ai_explanations_manage_admin"
  on public.ai_explanations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: ai_user_quotas
drop policy if exists "ai_user_quotas_select_own_or_admin" on public.ai_user_quotas;
create policy "ai_user_quotas_select_own_or_admin"
  on public.ai_user_quotas for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "ai_user_quotas_manage_admin" on public.ai_user_quotas;
create policy "ai_user_quotas_manage_admin"
  on public.ai_user_quotas for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: ai_usage_logs
drop policy if exists "ai_usage_logs_select_own_or_admin" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own_or_admin"
  on public.ai_usage_logs for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "ai_usage_logs_manage_admin" on public.ai_usage_logs;
create policy "ai_usage_logs_manage_admin"
  on public.ai_usage_logs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: ai_recommendations
drop policy if exists "ai_recommendations_select_own_or_admin" on public.ai_recommendations;
create policy "ai_recommendations_select_own_or_admin"
  on public.ai_recommendations for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "ai_recommendations_manage_admin" on public.ai_recommendations;
create policy "ai_recommendations_manage_admin"
  on public.ai_recommendations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: ai_settings
drop policy if exists "ai_settings_select_authenticated" on public.ai_settings;
create policy "ai_settings_select_authenticated"
  on public.ai_settings for select
  using (auth.uid() is not null);

drop policy if exists "ai_settings_manage_admin" on public.ai_settings;
create policy "ai_settings_manage_admin"
  on public.ai_settings for all
  using (public.is_admin())
  with check (public.is_admin());

