-- ============================================================
-- Catalyst AI Intake — Supabase Schema
-- Run ONCE in your Supabase SQL Editor
-- ============================================================

create table if not exists public.intake_responses (
  id                uuid primary key default gen_random_uuid(),
  submitted_at      timestamptz not null default now(),

  -- Identity
  respondent_name   text not null,
  respondent_email  text not null,

  -- Q1: What they do
  q1_intro          text,
  -- Q2: Role descriptor
  q2_world          text,
  -- Q3: Typical Tuesday
  q3_tuesday        text,
  -- Q4: AI reaction
  q4_ai_reaction    text,
  -- Q5: AI experience
  q5_ai_experience  text,
  -- Q6: Confidence 1-5
  q6_confidence     integer check (q6_confidence between 1 and 5),
  -- Q7: Energy focus (multi)
  q7_energy         text[],
  -- Q8: What they dread
  q8_dread          text,
  -- Q9: 2 free hours
  q9_two_hours      text,
  -- Q10: Desired outcomes (multi)
  q10_outcomes      text[],
  -- Q11: AI worries
  q11_worries       text,
  -- Q12: Wildcard
  q12_wildcard      text,

  -- Auto-derived cohort
  cohort_tag        text,

  -- Full payload for debugging
  raw_payload       jsonb
);

-- Indexes
create index on public.intake_responses (submitted_at desc);
create index on public.intake_responses (respondent_email);
create index on public.intake_responses (cohort_tag);

-- Row-level security
alter table public.intake_responses enable row level security;

-- Anon can INSERT (the public form)
create policy "anon_insert"
  on public.intake_responses for insert
  to anon with check (true);

-- Authenticated (admin) can SELECT + read everything
create policy "auth_select"
  on public.intake_responses for select
  to authenticated using (true);
