-- 0008_google_oauth_profile_trigger.sql
-- Memperbarui trigger handle_new_user untuk mendukung Google OAuth (membaca name atau full_name dari raw_user_meta_data)

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
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    ),
    'user'
  )
  on conflict (id) do update
  set
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    email = coalesce(nullif(excluded.email, ''), public.profiles.email);
  return new;
end;
$$;

-- Pastikan trigger on_auth_user_created terpasang
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

