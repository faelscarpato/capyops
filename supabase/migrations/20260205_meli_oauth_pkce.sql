-- Migration: add PKCE fields for Mercado Livre OAuth
-- Created at: 2026-02-05

alter table public.meli_oauth_states add column if not exists code_verifier text;
alter table public.meli_oauth_states add column if not exists code_challenge text;
alter table public.meli_oauth_states add column if not exists code_challenge_method text;
