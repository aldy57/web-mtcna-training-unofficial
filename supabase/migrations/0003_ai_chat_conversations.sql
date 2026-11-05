-- 0003_ai_chat_conversations.sql
-- Riwayat Percakapan MIRA AI: Sesi obrolan persisten dan pesan chat peserta.

-- 1. Tabel sesi percakapan AI
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Obrolan Baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user_updated
  on public.ai_conversations(user_id, updated_at desc);

-- 2. Tabel pesan percakapan AI
create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_used int not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_messages_conv_created
  on public.ai_chat_messages(conversation_id, created_at asc);

create index if not exists idx_ai_chat_messages_user_created
  on public.ai_chat_messages(user_id, created_at desc);

-- 3. Row Level Security (RLS)
alter table public.ai_conversations enable row level security;
alter table public.ai_chat_messages enable row level security;

-- Kebijakan RLS ai_conversations
drop policy if exists "ai_conversations_select" on public.ai_conversations;
create policy "ai_conversations_select"
  on public.ai_conversations for select
  using (auth.uid() = user_id or is_admin());

drop policy if exists "ai_conversations_insert" on public.ai_conversations;
create policy "ai_conversations_insert"
  on public.ai_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_conversations_update" on public.ai_conversations;
create policy "ai_conversations_update"
  on public.ai_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_conversations_delete" on public.ai_conversations;
create policy "ai_conversations_delete"
  on public.ai_conversations for delete
  using (auth.uid() = user_id or is_admin());

-- Kebijakan RLS ai_chat_messages
drop policy if exists "ai_chat_messages_select" on public.ai_chat_messages;
create policy "ai_chat_messages_select"
  on public.ai_chat_messages for select
  using (auth.uid() = user_id or is_admin());

drop policy if exists "ai_chat_messages_insert" on public.ai_chat_messages;
create policy "ai_chat_messages_insert"
  on public.ai_chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_messages_delete" on public.ai_chat_messages;
create policy "ai_chat_messages_delete"
  on public.ai_chat_messages for delete
  using (auth.uid() = user_id or is_admin());

