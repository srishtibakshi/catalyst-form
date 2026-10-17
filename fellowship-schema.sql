-- ============================================================
-- Philanthropel Fellowship — Supabase Schema
-- Run ONCE in your Supabase SQL Editor (same project as Catalyst)
-- ============================================================

create table if not exists public.fellowship_applications (
  id                uuid primary key,
  submitted_at      timestamptz not null default now(),

  -- About you
  name              text not null,
  email             text not null,
  location          text not null,
  link              text,
  stage             text not null,
  background        text not null,

  -- You and the third sector
  why_sector        text not null,
  sector_connection text[] not null default '{}',

  -- The work
  focus_areas       text[] not null default '{}',
  ai_comfort        integer check (ai_comfort between 1 and 5),
  built_something   text not null,
  problem_idea      text not null,

  -- Practicalities
  time_commitment   text not null,
  heard_from        text,
  anything_else     text,
  consent           boolean not null,

  -- Review
  status            text not null default 'New'
);

create index if not exists fellowship_applications_submitted_at_idx
  on public.fellowship_applications (submitted_at desc);
create index if not exists fellowship_applications_email_idx
  on public.fellowship_applications (email);

-- Row-level security.
-- Unlike intake_responses, there is NO anon insert policy: applications are
-- written only by the form's server with the service-role key, so nobody can
-- post rows straight into this table with the public anon key.
alter table public.fellowship_applications enable row level security;

-- Authenticated (admin) can read everything.
create policy "auth_select"
  on public.fellowship_applications for select
  to authenticated using (true);
