# DNJ V2 — Dois exemplos E2E de população

Este documento usa o schema descrito em [DNJ V2 — Backend Handoff](DNJ-V2-BACKEND-HANDOFF.md). Os UUIDs foram abreviados para facilitar a leitura. Não existe tabela `events`, `gallery` ou `queues`.

## Mapa rápido

```text
users → participations → moments
          ↑       ↑          ↑
qr_codes ┘       activities  media_assets

activities → activity_runs → activity_run_participants
users + participations/runs → point_entries → users.points
```

## Cenário 1 — Radicalidade, QR e Moment livre sem ponto

### Objetivo

Ana lê o QR dinâmico da Radicalidade, participa de uma rodada, fica em primeiro e recebe pontos. Depois publica uma foto espontânea no feed; essa foto não tem participation e não recebe ponto.

### 1. Dados permanentes de identidade e local

```text
groups
┌─────────┬─────────────────────┐
│ id      │ name                │
├─────────┼─────────────────────┤
│ grp-luz │ Jovens da Luz       │
└─────────┴─────────────────────┘

users
┌─────────┬──────────────┬─────────┬──────────────┬────────┬───────┐
│ id      │ display_name │ group_id│ role         │ points │ email │
├─────────┼──────────────┼─────────┼──────────────┼────────┼───────┤
│ usr-ana │ Ana Souza    │ grp-luz │ participant  │ 0      │ ana@… │
│ usr-bia │ Bia Lima     │ grp-luz │ participant  │ 0      │ bia@… │
│ usr-joao│ João Gestor  │ null    │ manager      │ 0      │ joao@…│
└─────────┴──────────────┴─────────┴──────────────┴────────┴───────┘

spaces
┌──────────────┬──────────────────────┬────────────────────────┐
│ id           │ name                 │ map_reference          │
├──────────────┼──────────────────────┼────────────────────────┤
│ sp-radical   │ Espaço Radicalidade  │ map:radicalidade       │
└──────────────┴──────────────────────┴────────────────────────┘
```

`document_hash`, `document_last4`, timestamps e demais campos obrigatórios existem nesses usuários, mas foram omitidos da visualização.

### 2. Configuração da Radicalidade

```text
activities
┌──────────────┬────────────┬─────────────┬─────────────┬─────────┬───────────────┐
│ id           │ space_id   │ kind        │ name        │ status  │ check_in_points│
├──────────────┼────────────┼─────────────┼─────────────┼─────────┼───────────────┤
│ act-radical  │ sp-radical │ competitive │ Radicalidade│ active  │ 0             │
└──────────────┴────────────┴─────────────┴─────────────┴─────────┴───────────────┘

activity_manager_assignments
┌──────────────┬──────────┐
│ activity_id  │ user_id  │
├──────────────┼──────────┤
│ act-radical  │ usr-joao │
└──────────────┴──────────┘

activity_runs
┌─────────┬─────────────┬──────────────┬─────────┬─────────────────────────────────────┐
│ id      │ activity_id │ started_by   │ status  │ point_rules                         │
├─────────┼─────────────┼──────────────┼─────────┼─────────────────────────────────────┤
│ run-01  │ act-radical │ usr-joao     │ active  │ {"first":50,"participation":10}    │
└─────────┴─────────────┴──────────────┴─────────┴─────────────────────────────────────┘

qr_codes
┌─────────┬─────────────┬──────────────────┬────────┬──────────┬───────────┐
│ id      │ activity_id │ token_hash       │ status │ max_uses │ used_count│
├─────────┼─────────────┼──────────────────┼────────┼──────────┼───────────┤
│ qr-rad-1│ act-radical │ sha256(token-01) │ active │ 50       │ 0         │
└─────────┴─────────────┴──────────────────┴────────┴──────────┴───────────┘
```

O QR é da Activity Radicalidade, não do Space. Uma nova rodada pode invalidar este QR e criar outro, ainda associado à mesma Activity.

### 3. Ana e Bia leem o QR

Elas chamam `POST /v2/qr/validate`, cada uma com chave de idempotência diferente. A operação bloqueia o QR, incrementa `used_count` e cria duas participations.

```text
participations
┌─────────────┬─────────┬─────────────┬─────────┬────────┬─────────────────┐
│ id          │ user_id │ activity_id │ qr_code │ status │ check_in_points │
├─────────────┼─────────┼─────────────┼─────────┼────────┼─────────────────┤
│ part-ana-r1 │ usr-ana │ act-radical │ qr-rad-1│ active │ 0               │
│ part-bia-r1 │ usr-bia │ act-radical │ qr-rad-1│ active │ 0               │
└─────────────┴─────────┴─────────────┴─────────┴────────┴─────────────────┘

qr_codes (após as leituras)
┌─────────┬───────────┐
│ id      │ used_count│
├─────────┼───────────┤
│ qr-rad-1│ 2         │
└─────────┴───────────┘

activity_run_participants
┌─────────────────┬─────────┬───────────┬────────────────┬───────────────┐
│ activity_run_id │ user_id │ placement │ points_awarded │ status        │
├─────────────────┼─────────┼───────────┼────────────────┼───────────────┤
│ run-01          │ usr-ana │ null      │ 0              │ participating │
│ run-01          │ usr-bia │ null      │ 0              │ participating │
└─────────────────┴─────────┴───────────┴────────────────┴───────────────┘
```

Neste exemplo a entrada no run é feita pelo gestor ao confirmar participantes. Se o produto decidir que QR entra automaticamente no run ativo, a procedure de QR insere a mesma linha — o modelo continua igual.

### 4. Gestor fecha o resultado

João envia `POST /v2/manager/runs/run-01/results` com Ana em primeiro e Bia como participante. Uma única transação cria os lançamentos, atualiza saldos, preenche resultado e fecha o run.

```text
activity_runs
┌─────────┬───────────┐
│ id      │ status    │
├─────────┼───────────┤
│ run-01  │ completed │
└─────────┴───────────┘

activity_run_participants
┌─────────────────┬─────────┬───────────┬────────────────┬─────────┐
│ activity_run_id │ user_id │ placement │ points_awarded │ status  │
├─────────────────┼─────────┼───────────┼────────────────┼─────────┤
│ run-01          │ usr-ana │ 1         │ 50             │ awarded │
│ run-01          │ usr-bia │ null      │ 10             │ awarded │
└─────────────────┴─────────┴───────────┴────────────────┴─────────┘
point_entries
┌─────────────┬─────────┬─────────────────┬─────────────────┬───────┐
│ id          │ user_id │ activity_run_id │ reason          │ delta │
├─────────────┼─────────┼─────────────────┼─────────────────┼───────┤
│ pe-run-a-01 │ usr-ana │ run-01          │ radicality_run │ 50    │
│ pe-run-b-01 │ usr-bia │ run-01          │ radicality_run │ 10    │
└─────────────┴─────────┴─────────────────┴─────────────────┴───────┘

users (saldo materializado após a mesma transação)
┌─────────┬──────────────┬────────┐
│ id      │ display_name │ points │
├─────────┼──────────────┼────────┤
│ usr-ana │ Ana Souza    │ 50     │
│ usr-bia │ Bia Lima     │ 10     │
└─────────┴──────────────┴────────┘
```

### 5. Ana publica um Moment livre

Ana tira uma foto espontânea. Ela cria intenção de upload, envia ao S3, confirma a mídia e cria o Moment sem `participationId`.

```text
media_assets
┌───────────────┬───────────────┬─────────────────────────────────────┬──────────────┬──────────┐
│ id            │ owner_user_id │ object_key                          │ upload_status│ bytes    │
├───────────────┼───────────────┼─────────────────────────────────────┼──────────────┼──────────┤
│ media-ana-free│ usr-ana       │ private/usr-ana/0a1b2c.jpg         │ available    │ 1400000  │
└───────────────┴───────────────┴─────────────────────────────────────┴──────────────┴──────────┘

moments
┌────────────────┬─────────┬─────────────────┬───────────────┬────────┬────────────────┬─────────────────┐
│ id             │ user_id │ participation_id│ origin        │ points │ publication    │ media_asset_id  │
├────────────────┼─────────┼─────────────────┼───────────────┼────────┼────────────────┼─────────────────┤
│ moment-ana-free│ usr-ana │ null            │ free          │ 0      │ public         │ media-ana-free  │
└────────────────┴─────────┴─────────────────┴───────────────┴────────┴────────────────┴─────────────────┘

moment_likes
┌─────────────────┬─────────┐
│ moment_id       │ user_id │
├─────────────────┼─────────┤
│ moment-ana-free │ usr-bia │
└─────────────────┴─────────┘
```

Não existe PointEntry novo e `users.points` permanece Ana=50/Bia=10. A Galeria/feed é simplesmente a consulta deste Moment porque ele é `public`, `approved` e tem mídia `available`.

### 6. Auditoria da operação

```text
operation_audit
┌─────────────┬──────────────┬────────────────────┬─────────────┐
│ id          │ actor_user_id│ action             │ entity_id   │
├─────────────┼──────────────┼────────────────────┼─────────────┤
│ audit-run-01│ usr-joao     │ activity_run.close │ run-01      │
└─────────────┴──────────────┴────────────────────┴─────────────┘
```

## Cenário 2 — anúncio especial e Moment de desafio pontuado

### Objetivo

Admin abre um anúncio especial “Foto com a galera”. A Activity de desafio permite uma foto. Ana entra no desafio, envia foto e recebe 30 pontos. Esta foto é diferente do Moment livre: ela tem Participation e gera PointEntry.

### 1. Configuração do desafio e do anúncio

```text
spaces
┌────────────┬──────────────────────┐
│ id         │ name                 │
├────────────┼──────────────────────┤
│ sp-palco   │ Palco Principal      │
└────────────┴──────────────────────┘

activities
┌──────────────────┬──────────┬───────────┬─────────────────────┬─────────┬────────────────┬────────────────┐
│ id               │ space_id │ kind      │ name                │ status  │ allows_moment  │ moment_points  │
├──────────────────┼──────────┼───────────┼─────────────────────┼─────────┼────────────────┼────────────────┤
│ act-foto-galera  │ sp-palco │ challenge │ Foto com a galera  │ active  │ true           │ 30             │
└──────────────────┴──────────┴───────────┴─────────────────────┴─────────┴────────────────┴────────────────┘

live_announcements
┌───────────────┬─────────────────┬─────────────────────┬────────┬───────────┬────────────┐
│ id            │ activity_id     │ title               │ status │ points    │ targets    │
├───────────────┼─────────────────┼─────────────────────┼────────┼───────────┼────────────┤
│ live-foto-01  │ act-foto-galera │ Foto com a galera! │ active │ 30        │ app,tv     │
└───────────────┴─────────────────┴─────────────────────┴────────┴───────────┴────────────┘
```

`live_announcements` é o que antes poderia ser chamado de “evento especial”. Não é pai de dados nem substitui Activity: ele só controla o anúncio/teaser e os destinos de exibição.

### 2. Ana entra no desafio

O app chama `POST /v2/moment-challenges/act-foto-galera/participations`. Esse desafio pode não exibir QR; se usar QR, a mesma Participation seria criada por `/qr/validate`.

```text
participations
┌──────────────────┬─────────┬─────────────────┬────────────┬────────┬──────────────────┐
│ id               │ user_id │ activity_id     │ qr_code_id │ status │ can_share_moment │
├──────────────────┼─────────┼─────────────────┼────────────┼────────┼──────────────────┤
│ part-ana-foto-01 │ usr-ana │ act-foto-galera │ null       │ active │ true             │
└──────────────────┴─────────┴─────────────────┴────────────┴────────┴──────────────────┘
```

### 3. Upload e criação do Moment de desafio

```text
media_assets
┌────────────────────┬───────────────┬──────────────────────────────────────┬───────────────┐
│ id                 │ owner_user_id │ object_key                           │ upload_status │
├────────────────────┼───────────────┼──────────────────────────────────────┼───────────────┤
│ media-ana-challenge│ usr-ana       │ private/usr-ana/3d4e5f.jpg          │ available     │
└────────────────────┴───────────────┴──────────────────────────────────────┴───────────────┘

moments
┌────────────────────┬─────────┬──────────────────┬───────────┬────────┬────────────────┬───────────────────┐
│ id                 │ user_id │ participation_id │ origin    │ points │ reward_status  │ media_asset_id    │
├────────────────────┼─────────┼──────────────────┼───────────┼────────┼────────────────┼───────────────────┤
│ moment-ana-foto-01 │ usr-ana │ part-ana-foto-01 │ challenge │ 30     │ awarded        │ media-ana-challenge│
└────────────────────┴─────────┴──────────────────┴───────────┴────────┴────────────────┴───────────────────┘

point_entries
┌──────────────────┬─────────┬──────────────────┬──────────────┬───────┐
│ id               │ user_id │ participation_id │ reason       │ delta │
├──────────────────┼─────────┼──────────────────┼──────────────┼───────┤
│ pe-moment-ana-01 │ usr-ana │ part-ana-foto-01 │ moment_award │ 30    │
└──────────────────┴─────────┴──────────────────┴──────────────┴───────┘

users
┌─────────┬──────────────┬─────────────────────────┐
│ id      │ display_name │ points                  │
├─────────┼──────────────┼─────────────────────────┤
│ usr-ana │ Ana Souza    │ 80  (50 Radicalidade+30)│
│ usr-bia │ Bia Lima     │ 10                      │
└─────────┴──────────────┴─────────────────────────┘
```

### 4. Regras que o banco/API valida antes de gravar

```text
Moment de desafio só é criado se:
✓ media_assets.owner_user_id = moments.user_id
✓ media_assets.upload_status = available
✓ participations.user_id = moments.user_id
✓ participations.activity_id = act-foto-galera
✓ activities.allows_moment = true
✓ activity/QR ainda estão na janela de foto
✓ não existe outro Moment para a mesma participation
```

Se Ana repetir a mesma chamada com o mesmo `Idempotency-Key`, recebe o mesmo `moment-ana-foto-01`; não cria outra foto nem outro lançamento de 30 pontos.

## Cobertura de tabelas pelos dois cenários

| Tabela V2 | Cenário 1 | Cenário 2 |
| --- | --- | --- |
| `groups` | Grupo Jovens da Luz | reutilizado |
| `users` | Ana, Bia e gestor | Ana e admin reutilizados |
| `spaces` | Espaço Radicalidade | Palco Principal |
| `activities` | Radicalidade competitiva | Desafio de foto |
| `activity_manager_assignments` | João gerencia Radicalidade | pode atribuir gestor do desafio |
| `qr_codes` | QR dinâmico lido | opcional neste desafio |
| `participations` | Leitura de QR | Entrada no desafio |
| `activity_runs` | Rodada da Radicalidade | não necessário |
| `activity_run_participants` | Ana e Bia classificadas | não necessário |
| `media_assets` | Foto livre de Ana | Foto de desafio |
| `moments` | `free`, zero ponto | `challenge`, 30 pontos |
| `moment_likes` | Bia curte foto livre | funciona igual se público |
| `point_entries` | Pontos da Radicalidade | Prêmio do Moment |
| `live_announcements` | não necessário | Anúncio especial ativo |
| `operation_audit` | Fechamento do run | Admin pode registrar abertura/fechamento |
