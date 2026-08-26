-- Follow-up kept separate because the initial operational migration is already remote.
alter table public.activity_runs drop constraint if exists activity_runs_status_check;
alter table public.activity_runs add constraint activity_runs_status_check check (status in ('draft', 'active', 'paused', 'results', 'completed', 'cancelled'));

alter table public.special_events add column if not exists delivery_targets text[] not null default array['app']::text[];
alter table public.special_events add constraint special_events_delivery_targets_check check (cardinality(delivery_targets) > 0 and delivery_targets <@ array['app','tv','screen']::text[]);

create or replace function public.dnj_finalize_activity_run_v2(p_manager_id uuid, p_run_id uuid, p_placements jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_run public.activity_runs%rowtype; v_first integer; v_second integer; v_third integer; v_participation integer; v_awarded integer := 0;
begin
  if not exists (select 1 from public.manager_scopes where user_id=p_manager_id and scope='radicality') then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select * into v_run from public.activity_runs where id=p_run_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_run.status='completed' then return jsonb_build_object('ok',true,'alreadyFinalized',true,'awarded',0); end if;
  if v_run.status not in ('active','paused','results') then return jsonb_build_object('ok',false,'code','RUN_NOT_ACTIVE'); end if;
  v_first:=coalesce((v_run.point_rules->>'first')::integer,120); v_second:=coalesce((v_run.point_rules->>'second')::integer,90); v_third:=coalesce((v_run.point_rules->>'third')::integer,70); v_participation:=coalesce((v_run.point_rules->>'participation')::integer,30);
  with requested as (select (value->>'userId')::uuid user_id,min(nullif(value->>'placement','')::integer) placement from jsonb_array_elements(coalesce(p_placements,'[]'::jsonb)) group by (value->>'userId')::uuid), eligible as (select r.user_id,r.placement,case r.placement when 1 then v_first when 2 then v_second when 3 then v_third else v_participation end points from requested r join public.activity_run_participants p on p.activity_run_id=p_run_id and p.user_id=r.user_id), entries as (insert into public.point_entries(user_id,reason,delta,idempotency_key) select user_id,'radicality_run',points,md5(p_run_id::text||':'||user_id::text)::uuid from eligible on conflict(idempotency_key) do nothing returning user_id,delta), updated as (update public.test_users u set points=u.points+e.delta,updated_at=now() from entries e where u.id=e.user_id returning e.delta) select coalesce(sum(delta),0) into v_awarded from updated;
  update public.activity_run_participants p set placement=r.placement,points_awarded=case r.placement when 1 then v_first when 2 then v_second when 3 then v_third else v_participation end,status='awarded' from (select (value->>'userId')::uuid user_id,min(nullif(value->>'placement','')::integer) placement from jsonb_array_elements(coalesce(p_placements,'[]'::jsonb)) group by (value->>'userId')::uuid) r where p.activity_run_id=p_run_id and p.user_id=r.user_id;
  update public.activity_runs set status='completed',ended_at=now() where id=p_run_id;
  return jsonb_build_object('ok',true,'alreadyFinalized',false,'awarded',v_awarded);
end; $$;
revoke all on function public.dnj_finalize_activity_run_v2(uuid,uuid,jsonb) from public;
grant execute on function public.dnj_finalize_activity_run_v2(uuid,uuid,jsonb) to service_role;

create or replace function public.dnj_admin_upsert_manager(p_email text, p_name text, p_password text default null, p_scope text default 'radicality', p_space_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_user uuid;
begin
  if p_scope not in ('space_timer','radicality','special_events') or (p_scope='space_timer' and p_space_id is null) or (p_scope<>'space_timer' and p_space_id is not null) then raise exception 'invalid manager scope'; end if;
  select id into v_user from public.test_users where lower(email)=lower(trim(p_email)) limit 1;
  if v_user is null then
    insert into public.test_users(external_key,email,display_name,role,password_hash) values ('operator:'||md5(lower(trim(p_email))),lower(trim(p_email)),trim(p_name),'EVENT_MANAGER',case when p_password is null then null else extensions.crypt(p_password,extensions.gen_salt('bf')) end) returning id into v_user;
  else
    update public.test_users set email=lower(trim(p_email)),display_name=trim(p_name),role='EVENT_MANAGER',is_active=true,password_hash=case when p_password is null then password_hash else extensions.crypt(p_password,extensions.gen_salt('bf')) end where id=v_user;
  end if;
  delete from public.manager_scopes where user_id=v_user;
  insert into public.manager_scopes(user_id,scope,space_id) values(v_user,p_scope,p_space_id);
  return jsonb_build_object('id',v_user,'email',lower(trim(p_email)),'name',trim(p_name),'scope',p_scope,'spaceId',p_space_id);
end; $$;
revoke all on function public.dnj_admin_upsert_manager(text,text,text,text,uuid) from public;
grant execute on function public.dnj_admin_upsert_manager(text,text,text,text,uuid) to service_role;
