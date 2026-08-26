-- DNJ 2K26 homologation seed. Source: Programação - DNJ 2k26 - Página1.pdf
-- All times use Curitiba's event-local UTC-03 offset and are idempotent.

insert into public.events (slug, name, starts_at, ends_at, status)
values ('dnj-2k26-curitiba', 'Dia Nacional da Juventude 2K26 — Curitiba', '2026-10-18 09:00:00-03', '2026-10-18 22:00:00-03', 'active')
on conflict (slug) do update set name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status;

with event_row as (
  select id from public.events where slug = 'dnj-2k26-curitiba'
)
insert into public.spaces (event_id, slug, name, map_reference)
select event_row.id, seed.slug, seed.name, seed.map_reference
from event_row
cross join (values
  ('credenciamento', 'Credenciamento', 'map:credenciamento'),
  ('praca-alimentacao', 'Praça de Alimentação', 'map:praca-alimentacao'),
  ('espaco-esperanca', 'Espaço Esperança', 'map:esperanca'),
  ('feira-vocacional', 'Feira Vocacional', 'map:feira-vocacional'),
  ('espaco-santidade', 'Espaço Santidade', 'map:santidade'),
  ('arena-talk-arts', 'Arena Talk & Arts', 'map:talk-arts'),
  ('espaco-radicalidade', 'Espaço Radicalidade', 'map:radicalidade'),
  ('santo-papo', 'Santo Papo', 'map:santo-papo'),
  ('espaco-juventude', 'Espaço Juventude', 'map:juventude'),
  ('capela', 'Capela', 'map:capela'),
  ('lojas', 'Lojas', 'map:lojas'),
  ('palco-principal', 'Palco Principal', 'programacao:palco-principal')
) as seed(slug, name, map_reference)
on conflict (event_id, slug) do update set name = excluded.name, map_reference = excluded.map_reference;

with event_row as (
  select id from public.events where slug = 'dnj-2k26-curitiba'
), schedule_seed as (
  select * from (values
    ('palco-abertura', 'palco-principal', 'Abertura', 'Apresentadores · vídeo · dança', '09:00', '09:15'),
    ('palco-animacao-manha', 'palco-principal', 'Animação da Manhã', 'Arautos', '09:15', '10:00'),
    ('palco-apresentadores-1000', 'palco-principal', 'Apresentadores', null, '10:00', '10:05'),
    ('palco-pregacao-caminho', 'palco-principal', 'Pregação — Caminho', 'Catholic Nerd', '10:05', '10:45'),
    ('palco-apresentadores-1045', 'palco-principal', 'Apresentadores', null, '10:45', '11:00'),
    ('palco-standup', 'palco-principal', 'Stand-up católico', 'Math Colo', '11:00', '11:30'),
    ('palco-irmas-beatbox', 'palco-principal', 'Irmãs Beat Box', null, '11:30', '11:45'),
    ('palco-apresentadores-1145', 'palco-principal', 'Apresentadores', null, '11:45', '11:55'),
    ('palco-pregacao-reconstroi', 'palco-principal', 'Pregação — Vai e reconstrói a minha Igreja', 'Pe. Clayton', '11:55', '12:35'),
    ('palco-apresentadores-1235', 'palco-principal', 'Apresentadores', 'Troca de roupa', '12:35', '12:45'),
    ('palco-bandeiraco', 'palco-principal', 'Bandeiraço', 'Preparação do palco', '12:45', '13:00'),
    ('palco-lumen', 'palco-principal', 'Lumen', null, '13:00', '13:30'),
    ('palco-flex-1330', 'palco-principal', 'Flex time', null, '13:30', '13:45'),
    ('palco-apresentadores-1345', 'palco-principal', 'Apresentadores', null, '13:45', '13:50'),
    ('palco-pastoral-vocacional', 'palco-principal', 'Pastoral Vocacional', 'Pe. Pedro', '13:50', '14:20'),
    ('palco-apresentadores-1420', 'palco-principal', 'Apresentadores', null, '14:20', '14:35'),
    ('palco-pregacao-pastoreio', 'palco-principal', 'Pregação — O pastoreio: ser Igreja', 'Guilherme', '14:35', '15:15'),
    ('palco-apresentadores-1515', 'palco-principal', 'Apresentadores', null, '15:15', '15:20'),
    ('palco-adoracao', 'palco-principal', 'Adoração — procissão: Jesus no centro', 'Pe. Leonardo', '15:20', '16:05'),
    ('palco-flex-1605', 'palco-principal', 'Flex time', null, '16:05', '16:20'),
    ('palco-apresentadores-1620', 'palco-principal', 'Apresentadores', null, '16:20', '16:25'),
    ('palco-festa-cores', 'palco-principal', 'Festa das Cores', null, '16:25', '16:55'),
    ('palco-apresentadores-1655', 'palco-principal', 'Apresentadores', null, '16:55', '17:00'),
    ('palco-teatro', 'palco-principal', 'Teatro', null, '17:00', '17:30'),
    ('palco-prepara-missa', 'palco-principal', 'Apresentadores', 'Preparação para a missa', '17:30', '18:00'),
    ('palco-santa-missa', 'palco-principal', 'Santa Missa', 'Pe. Reginaldo Manzotti', '18:00', '19:30'),
    ('palco-flex-1930', 'palco-principal', 'Flex time', null, '19:30', '19:40'),
    ('palco-setor-juventude', 'palco-principal', 'Setor Juventude', null, '19:40', '20:00'),
    ('palco-dj', 'palco-principal', 'DJ', null, '20:00', '20:20'),
    ('palco-apresentadores-2020', 'palco-principal', 'Apresentadores', null, '20:20', '20:25'),
    ('palco-show-msh', 'palco-principal', 'Show MSH', null, '20:25', '21:55'),
    ('palco-highlight', 'palco-principal', 'Highlight', 'Apresentadores', '21:55', '22:00'),
    ('palco-encerramento', 'palco-principal', 'Encerramento', null, '22:00', '22:10'),
    ('santidade-igor-felix', 'espaco-santidade', 'Igor Felix', 'Fechar com Evangelizar', '13:00', '14:00'),
    ('santidade-testemunho-bispos', 'espaco-santidade', 'Testemunho dos Bispos', null, '14:00', '15:00'),
    ('santidade-louvor', 'espaco-santidade', 'Louvor', null, '15:00', '16:00'),
    ('santidade-oracoes', 'espaco-santidade', 'Orações', null, '16:00', '17:00'),
    ('santidade-testemunhos', 'espaco-santidade', 'Momento Testemunhos', null, '17:00', '18:00'),
    ('santidade-adoracao-maria', 'espaco-santidade', 'Adoração — Pregação Maria', null, '18:00', '19:00'),
    ('santidade-encerramento', 'espaco-santidade', 'Encerramento', null, '19:00', '20:00')
  ) as seed(slug, space_slug, name, description, starts_at_local, ends_at_local)
), schedule_spaces as (
  select spaces.id, spaces.slug from public.spaces spaces join event_row on event_row.id = spaces.event_id
)
insert into public.experiences (event_id, space_id, slug, name, description, kind, starts_at, ends_at, allows_moment, status)
select event_row.id, schedule_spaces.id, schedule_seed.slug, schedule_seed.name, schedule_seed.description, 'schedule',
  ('2026-10-18 ' || schedule_seed.starts_at_local || ':00-03')::timestamptz,
  ('2026-10-18 ' || schedule_seed.ends_at_local || ':00-03')::timestamptz,
  false, 'active'
from schedule_seed
join event_row on true
left join schedule_spaces on schedule_spaces.slug = schedule_seed.space_slug
on conflict (event_id, slug) do update set space_id = excluded.space_id, name = excluded.name, description = excluded.description, starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = excluded.status;

do $$
declare
  v_event_id uuid;
begin
  select id into v_event_id from public.events where slug = 'dnj-2k26-curitiba';
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'groups' and column_name = 'event_id') then
    insert into public.groups (event_id, name) values
      (v_event_id, 'Grupo Chama Viva — Bairro Alto'), (v_event_id, 'GJC Santa Teresinha'),
      (v_event_id, 'Jovens da Luz'), (v_event_id, 'Jovens Esperança'),
      (v_event_id, 'Grupo São Francisco'), (v_event_id, 'Jovens do Caminho')
    on conflict (event_id, name) do nothing;
  else
    insert into public.groups (name) values
      ('Grupo Chama Viva — Bairro Alto'), ('GJC Santa Teresinha'), ('Jovens da Luz'),
      ('Jovens Esperança'), ('Grupo São Francisco'), ('Jovens do Caminho')
    on conflict (name) do nothing;
  end if;
end $$;

with experience_row as (
  select id from public.experiences where slug = 'palco-abertura'
)
insert into public.qr_codes (experience_id, token_hash, expiration_time, expiration_momento_time, max_uses, status)
select id, encode(digest('DNJ-ABERTURA-2026', 'sha256'), 'hex'), '2026-10-18 09:15:00-03', '2026-10-18 10:00:00-03', null, 'active'
from experience_row
on conflict (token_hash) do update set expiration_time = excluded.expiration_time, expiration_momento_time = excluded.expiration_momento_time, status = excluded.status;
