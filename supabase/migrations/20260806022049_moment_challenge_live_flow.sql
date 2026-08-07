alter table public.experiences
  add column if not exists moment_duration_minutes integer;

alter table public.experiences
  drop constraint if exists experiences_moment_challenge_duration_check,
  add constraint experiences_moment_challenge_duration_check
    check (
      kind <> 'moment_challenge'
      or moment_duration_minutes is null
      or moment_duration_minutes between 1 and 180
    );

alter table public.special_events
  add column if not exists display_qr_payload text;
