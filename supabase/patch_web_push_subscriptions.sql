-- Push-Abonnements für die installierte Vertriebs-PWA.
-- Im Supabase SQL Editor ausführen. Private VAPID-Schlüssel bleiben ausschließlich bei Vercel.

create extension if not exists pgcrypto;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_push_subscriptions_endpoint_check check (char_length(endpoint) between 20 and 2048)
);

create index if not exists idx_web_push_subscriptions_user
  on public.web_push_subscriptions (user_id, updated_at desc);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from public;
revoke all on public.web_push_subscriptions from anon;
revoke all on public.web_push_subscriptions from authenticated;
