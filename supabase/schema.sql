-- Supabase Basis-Schema fuer Vertriebsmanager
-- Im Supabase SQL Editor ausfuehren (Schritt 1).
-- Danach unbedingt auth_and_rls.sql ausfuehren (Schritt 2).

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
