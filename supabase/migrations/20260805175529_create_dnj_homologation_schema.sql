-- DNJ 2K26 canonical operational schema for the Next.js homologation API.
-- Existing public.gallery_* and public.operation_events tables are kept for
-- backwards-compatible Admin routes while the new tables become the source of
-- truth for event operations.

create extension if not exists pgcrypto;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.test_users
  add column role text not null default 'DEFAULT' check (role in ('DEFAULT', 'EVENT_MANAGER', 'ADMIN')),
  add column group_id uuid references public.groups(id) on delete set null,
  add column avatar_url text,
  add column updated_at timestamptz not null default now();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  slug text not null,
  name text not null,
  map_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slug)
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  slug text not null,
  name text not null,
  description text,
  kind text not null check (kind in ('schedule', 'stand', 'activity', 'moment_challenge', 'special')),
  starts_at timestamptz,
  ends_at timestamptz,
  check_in_points integer not null default 0 check (check_in_points >= 0),
  moment_points integer not null default 0 check (moment_points >= 0),
  cooldown_seconds integer not null default 0 check (cooldown_seconds >= 0),
  allows_moment boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slug),
  check (ends_at is null or starts_at is null or starts_at < ends_at)
);

create table public.experience_manager_assignments (
  experience_id uuid not null references public.experiences(id) on delete cascade,
  user_id uuid not null references public.test_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (experience_id, user_id)
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  token_hash text not null unique,
  expiration_time timestamptz not null,
  expiration_momento_time timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'expired', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiration_momento_time is null or expiration_momento_time >= expiration_time),
  check (max_uses is null or used_count <= max_uses)
);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.test_users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  cooldown_ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  can_share_moment boolean not null default true,
  check_in_points integer not null default 0 check (check_in_points >= 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, experience_id, idempotency_key)
);

create table public.media_objects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.test_users(id) on delete cascade,
  storage_bucket text not null default 'dnj-moments',
  storage_key text not null unique,
  content_type text not null,
  bytes bigint not null check (bytes > 0),
  created_at timestamptz not null default now()
);

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null unique references public.participations(id) on delete cascade,
  media_object_id uuid not null unique references public.media_objects(id) on delete restrict,
  publication_status text not null default 'private' check (publication_status in ('private', 'public')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  captured_at timestamptz not null default now(),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moment_likes (
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references public.test_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);

create table public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  moderator_user_id uuid references public.test_users(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create table public.point_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.test_users(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete set null,
  reason text not null,
  delta integer not null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.queues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  name text not null,
  status text not null default 'open' check (status in ('open', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues(id) on delete cascade,
  user_id uuid not null references public.test_users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'called', 'served', 'cancelled')),
  position integer not null check (position > 0),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (queue_id, user_id),
  unique (queue_id, position)
);

create table public.special_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  experience_id uuid references public.experiences(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  teaser_seconds integer not null default 15 check (teaser_seconds >= 0),
  points integer not null default 0 check (points >= 0),
  status text not null default 'draft' check (status in ('draft', 'teaser', 'active', 'completed', 'cancelled')),
  created_by uuid references public.test_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.special_event_deliveries (
  special_event_id uuid not null references public.special_events(id) on delete cascade,
  user_id uuid not null references public.test_users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (special_event_id, user_id)
);

create table public.activity_runs (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  started_by uuid references public.test_users(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or started_at <= ended_at)
);

create table public.activity_run_participants (
  activity_run_id uuid not null references public.activity_runs(id) on delete cascade,
  user_id uuid not null references public.test_users(id) on delete cascade,
  placement integer check (placement is null or placement > 0),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  status text not null default 'participating' check (status in ('participating', 'awarded', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_run_id, user_id)
);

alter table public.operation_events
  add column event_id uuid references public.events(id) on delete set null,
  add column experience_id uuid references public.experiences(id) on delete set null;

create index test_users_group_idx on public.test_users (group_id);
create index gallery_posts_user_idx on public.gallery_posts (user_id);
create index gallery_likes_user_idx on public.gallery_likes (user_id);
create index gallery_comments_user_idx on public.gallery_comments (user_id);
create index operation_events_actor_idx on public.operation_events (actor_user_id, created_at desc);
create index spaces_event_idx on public.spaces (event_id);
create index experiences_event_status_idx on public.experiences (event_id, status, starts_at);
create index experience_manager_assignments_user_idx on public.experience_manager_assignments (user_id);
create index qr_codes_experience_status_idx on public.qr_codes (experience_id, status, expires_at);
create index participations_user_status_idx on public.participations (user_id, status, checked_in_at desc);
create index participations_experience_idx on public.participations (experience_id);
create index moments_feed_idx on public.moments (publication_status, moderation_status, captured_at desc);
create index moment_likes_user_idx on public.moment_likes (user_id);
create index moderation_decisions_moment_idx on public.moderation_decisions (moment_id, created_at desc);
create index point_entries_user_created_idx on public.point_entries (user_id, created_at desc);
create index queue_entries_queue_status_position_idx on public.queue_entries (queue_id, status, position);
create index special_events_event_status_idx on public.special_events (event_id, status, starts_at);
create index activity_runs_experience_status_idx on public.activity_runs (experience_id, status);

create function public.dnj_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.dnj_set_updated_at() from public;

create trigger groups_set_updated_at before update on public.groups for each row execute function public.dnj_set_updated_at();
create trigger test_users_set_updated_at before update on public.test_users for each row execute function public.dnj_set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.dnj_set_updated_at();
create trigger spaces_set_updated_at before update on public.spaces for each row execute function public.dnj_set_updated_at();
create trigger experiences_set_updated_at before update on public.experiences for each row execute function public.dnj_set_updated_at();
create trigger qr_codes_set_updated_at before update on public.qr_codes for each row execute function public.dnj_set_updated_at();
create trigger participations_set_updated_at before update on public.participations for each row execute function public.dnj_set_updated_at();
create trigger moments_set_updated_at before update on public.moments for each row execute function public.dnj_set_updated_at();
create trigger queues_set_updated_at before update on public.queues for each row execute function public.dnj_set_updated_at();
create trigger queue_entries_set_updated_at before update on public.queue_entries for each row execute function public.dnj_set_updated_at();
create trigger special_events_set_updated_at before update on public.special_events for each row execute function public.dnj_set_updated_at();
create trigger activity_runs_set_updated_at before update on public.activity_runs for each row execute function public.dnj_set_updated_at();
create trigger activity_run_participants_set_updated_at before update on public.activity_run_participants for each row execute function public.dnj_set_updated_at();

alter table public.groups enable row level security;
alter table public.test_users enable row level security;
alter table public.events enable row level security;
alter table public.spaces enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_manager_assignments enable row level security;
alter table public.qr_codes enable row level security;
alter table public.participations enable row level security;
alter table public.media_objects enable row level security;
alter table public.moments enable row level security;
alter table public.moment_likes enable row level security;
alter table public.moderation_decisions enable row level security;
alter table public.point_entries enable row level security;
alter table public.queues enable row level security;
alter table public.queue_entries enable row level security;
alter table public.special_events enable row level security;
alter table public.special_event_deliveries enable row level security;
alter table public.activity_runs enable row level security;
alter table public.activity_run_participants enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
