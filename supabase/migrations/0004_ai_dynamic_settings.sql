-- 0004_ai_dynamic_settings.sql
-- Menambahkan kolom konfigurasi dinamis AI ke tabel ai_settings agar dapat diatur langsung oleh Admin tanpa restart server.

alter table if exists public.ai_settings
  add column if not exists base_url text,
  add column if not exists model text,
  add column if not exists user_token_budget int,
  add column if not exists quota_reset_days int;

-- Constraint check untuk batas wajar nilai konfigurasi dinamis (nullable bila memakai fallback .env)
alter table public.ai_settings
  drop constraint if exists check_ai_settings_user_token_budget,
  add constraint check_ai_settings_user_token_budget
    check (user_token_budget is null or (user_token_budget >= 500 and user_token_budget <= 10000000));

alter table public.ai_settings
  drop constraint if exists check_ai_settings_quota_reset_days,
  add constraint check_ai_settings_quota_reset_days
    check (quota_reset_days is null or (quota_reset_days >= 1 and quota_reset_days <= 30));

