-- Momentos entram publicados e pontuados; a moderacao do Admin e somente corretiva.
alter table public.moments alter column moderation_status set default 'approved';

update public.moments
set moderation_status = 'approved'
where moderation_status = 'pending'
  and photo_status = 'available';

drop index if exists public.moments_moderation_queue_idx;
create index if not exists moments_corrective_review_idx
  on public.moments (moderation_status, reward_status, photo_status, captured_at)
  where moderation_status = 'approved'
    and reward_status = 'awarded'
    and photo_status = 'available';
