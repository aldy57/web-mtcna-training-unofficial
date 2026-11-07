-- 0005_ai_custom_models.sql
-- Menambahkan kolom available_models (jsonb) pada tabel ai_settings untuk manajemen model AI oleh Admin.

alter table if exists public.ai_settings
  add column if not exists available_models jsonb not null default '[]'::jsonb;

