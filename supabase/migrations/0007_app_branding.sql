-- 0007_app_branding.sql
-- Tabel konfigurasi nama aplikasi dan logo (simbol & dengan teks) yang dapat diubah oleh Admin.

create table if not exists public.app_branding (
  id text primary key default 'default' check (id = 'default'),
  app_name text not null default 'Web Belajar Jaringan Dasar dan AI Jaringan',
  app_full_name text not null default 'Web Belajar Jaringan Dasar dan AI Jaringan',
  logo_icon_url text not null default '/network-router-icon.svg',
  logo_with_text_url text not null default '/network-router-logo-text.svg',
  logo_url text not null default '/network-router-logo-text.svg',
  favicon_url text not null default '/network-router-icon.svg',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Penambahan kolom bila tabel telah dibuat sebelumnya
alter table public.app_branding
  add column if not exists logo_icon_url text not null default '/network-router-icon.svg',
  add column if not exists logo_with_text_url text not null default '/network-router-logo-text.svg';

alter table public.app_branding enable row level security;

drop policy if exists "app_branding_select_public" on public.app_branding;
create policy "app_branding_select_public"
  on public.app_branding for select
  using (true);

drop policy if exists "app_branding_manage_admin" on public.app_branding;
create policy "app_branding_manage_admin"
  on public.app_branding for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_branding (id, app_name, app_full_name, logo_icon_url, logo_with_text_url, logo_url, favicon_url)
values (
  'default',
  'Web Belajar Jaringan Dasar dan AI Jaringan',
  'Web Belajar Jaringan Dasar dan AI Jaringan',
  '/network-router-icon.svg',
  '/network-router-logo-text.svg',
  '/network-router-logo-text.svg',
  '/network-router-icon.svg'
)
on conflict (id) do nothing;
