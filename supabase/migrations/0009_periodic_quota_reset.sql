-- 0009_periodic_quota_reset.sql
-- Memperbarui fungsi consume_ai_user_quota agar kuota direset kembali ke 100%
-- setiap periode p_reset_days (default 1 hari / 24 jam) sejak pemakaian dimulai,
-- meskipun sisa kuota belum mencapai 0%.

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
  v_reset_interval interval := make_interval(days => greatest(1, p_reset_days));
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

  -- Reset malas jika jadwal reset_at sudah terlewati ATAU pemakaian sudah melebihi siklus reset_days (1 hari)
  if (v_row.reset_at is not null and v_now >= v_row.reset_at)
     or (v_row.tokens_used > 0 and v_now >= v_row.period_started_at + v_reset_interval) then
    v_row.tokens_used := 0;
    v_row.period_started_at := v_now;
    v_row.reset_at := null;
  end if;

  v_new_tokens := least(p_budget, greatest(0, v_row.tokens_used + greatest(0, p_tokens)));

  -- Jika pemakaian mencapai atau melebihi budget, jadwalkan reset_at
  if v_new_tokens >= p_budget and v_row.reset_at is null then
    v_new_reset := v_now + v_reset_interval;
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
  select
    v_new_tokens,
    v_row.period_started_at,
    v_new_reset;
end;
$$;

