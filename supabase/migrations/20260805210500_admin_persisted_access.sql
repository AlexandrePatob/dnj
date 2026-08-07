-- Admin is a real persisted actor, separate from participant and manager scopes.
insert into public.test_users (external_key, email, display_name, role, password_hash)
values ('admin:dnj', 'admin@dnj.local', 'Administração DNJ', 'ADMIN', extensions.crypt('dnj2026', extensions.gen_salt('bf')))
on conflict (external_key) do update
set email = excluded.email, display_name = excluded.display_name, role = 'ADMIN', is_active = true,
    password_hash = coalesce(public.test_users.password_hash, excluded.password_hash);

create or replace function public.dnj_admin_login(p_email text, p_password text)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select coalesce((
    select jsonb_build_object('email', u.email, 'display_name', u.display_name)
    from public.test_users u
    where lower(u.email) = lower(trim(p_email)) and u.role = 'ADMIN' and u.is_active
      and u.password_hash is not null and extensions.crypt(p_password, u.password_hash) = u.password_hash
  ), 'null'::jsonb);
$$;

revoke all on function public.dnj_admin_login(text, text) from public;
grant execute on function public.dnj_admin_login(text, text) to service_role;
