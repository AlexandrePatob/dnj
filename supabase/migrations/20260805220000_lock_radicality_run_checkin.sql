-- Dynamic Radicalidade QR codes are valid only while the run is collecting participants.
create or replace function public.dnj_guard_activity_run_qr()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v_status text;
begin
  if new.activity_run_id is not null and new.status = 'active' then
    select status into v_status from public.activity_runs where id = new.activity_run_id;
    if v_status is distinct from 'draft' then
      raise exception 'Dynamic QR is available only while its activity run is draft';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists qr_codes_guard_activity_run_checkin on public.qr_codes;
create trigger qr_codes_guard_activity_run_checkin
before insert or update of activity_run_id, status on public.qr_codes
for each row execute function public.dnj_guard_activity_run_qr();

create or replace function public.dnj_close_activity_run_qrs()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.status <> 'draft' and old.status = 'draft' then
    update public.qr_codes set status = 'disabled'
    where activity_run_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists activity_runs_close_checkin_qrs on public.activity_runs;
create trigger activity_runs_close_checkin_qrs
after update of status on public.activity_runs
for each row execute function public.dnj_close_activity_run_qrs();
