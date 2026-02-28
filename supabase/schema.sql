-- Beginner-friendly schema for UCM Concierge.
-- Uses TEXT ids so local demo ids (usr_admin, evt_..., etc.) can be seeded directly.

create type app_role as enum ('traveler', 'assistant', 'admin');
create type travel_type as enum ('flight', 'hotel', 'car', 'other');
create type nudge_status as enum ('pending', 'approved', 'snoozed', 'disabled', 'sent');
create type approval_status as enum ('draft', 'approved', 'rejected');

create table if not exists users (
  id text primary key,
  email text unique not null,
  full_name text not null,
  role app_role not null default 'traveler',
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  title text not null,
  city text not null,
  venue text not null,
  timezone text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists attendees (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  executive_flag boolean not null default false,
  receive_nudges boolean not null default true,
  unique(event_id, user_id)
);

create table if not exists travel_items (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  attendee_id text not null references attendees(id) on delete cascade,
  type travel_type not null,
  provider text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  confirmation_code text,
  location text,
  notes text,
  links jsonb not null default '{}'::jsonb
);

create table if not exists speakers (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  full_name text not null,
  title text,
  organization text,
  bio text,
  headshot_url text
);

create table if not exists agenda_items (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  title text not null,
  location text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text,
  speaker_ids text[] not null default '{}'::text[]
);

create table if not exists executive_briefs (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  version integer not null,
  summary text not null,
  meeting_focus text,
  speaker_synopsis text[] not null default '{}'::text[],
  watchouts text[] not null default '{}'::text[],
  suggested_questions text[] not null default '{}'::text[],
  status approval_status not null default 'draft',
  approved_by text references users(id),
  approved_at timestamptz,
  generated_at timestamptz not null default now(),
  unique(event_id, version)
);

create table if not exists copilot_nudges (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  attendee_id text not null references attendees(id) on delete cascade,
  title text not null,
  body text not null,
  source_rule text not null,
  scheduled_at timestamptz not null,
  status nudge_status not null default 'pending',
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  requires_admin_approval boolean not null default true
);

create table if not exists person_profiles (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  person_type text not null check (person_type in ('speaker', 'invitee')),
  full_name text not null,
  email text,
  organization text,
  role_title text,
  highlights text[] not null default '{}'::text[],
  source_approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists profile_enrichment_drafts (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  person_id text not null references person_profiles(id) on delete cascade,
  provider text not null,
  match_confidence numeric(4, 2) not null,
  status approval_status not null default 'draft',
  conflict_flags text[] not null default '{}'::text[],
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text references users(id)
);

create table if not exists profile_field_provenance (
  id text primary key,
  draft_id text not null references profile_enrichment_drafts(id) on delete cascade,
  field_name text not null,
  field_value text not null,
  source_name text not null,
  source_url text,
  retrieved_at timestamptz not null
);

create table if not exists audit_log (
  id text primary key,
  actor_id text references users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
alter table events enable row level security;
alter table attendees enable row level security;
alter table travel_items enable row level security;
alter table speakers enable row level security;
alter table agenda_items enable row level security;
alter table executive_briefs enable row level security;
alter table copilot_nudges enable row level security;
alter table person_profiles enable row level security;
alter table profile_enrichment_drafts enable row level security;
alter table profile_field_provenance enable row level security;
alter table audit_log enable row level security;

create or replace function public.current_user_role()
returns app_role
language sql stable
as $$
  select coalesce((auth.jwt()->>'app_role')::app_role, 'traveler'::app_role)
$$;

drop policy if exists "attendee select policy" on attendees;
create policy "attendee select policy"
on attendees for select
using (
  user_id = auth.uid()::text
  or public.current_user_role() in ('assistant', 'admin')
);

drop policy if exists "travel select policy" on travel_items;
create policy "travel select policy"
on travel_items for select
using (
  attendee_id in (select id from attendees where user_id = auth.uid()::text)
  or public.current_user_role() in ('assistant', 'admin')
);

drop policy if exists "assistant admin write travel" on travel_items;
create policy "assistant admin write travel"
on travel_items for all
using (public.current_user_role() in ('assistant', 'admin'))
with check (public.current_user_role() in ('assistant', 'admin'));

drop policy if exists "approved briefs visible" on executive_briefs;
create policy "approved briefs visible"
on executive_briefs for select
using (
  status = 'approved'
  or public.current_user_role() in ('assistant', 'admin')
);

drop policy if exists "enrichment managed by assistant admin" on profile_enrichment_drafts;
create policy "enrichment managed by assistant admin"
on profile_enrichment_drafts for all
using (public.current_user_role() in ('assistant', 'admin'))
with check (public.current_user_role() in ('assistant', 'admin'));

drop policy if exists "nudges managed by assistant admin" on copilot_nudges;
create policy "nudges managed by assistant admin"
on copilot_nudges for all
using (public.current_user_role() in ('assistant', 'admin'))
with check (public.current_user_role() in ('assistant', 'admin'));
