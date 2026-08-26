# DNJ V2 — Handoff completo para Backend PostgreSQL + AWS S3

**Destinatário:** repositório da API real.  
**Status:** especificação de implementação.  
**Objetivo:** construir a API do DNJ sem depender de Supabase, usando PostgreSQL e Amazon S3, mantendo o front capaz de operar programação, QR, game, Moments, ranking e operação ao vivo.

> Este documento é a fonte de verdade do backend V2. O schema atual deste projeto é somente homologação e não deve ser copiado nem migrado em cadeia.

## 0. Princípios inegociáveis

1. O DNJ é uma instalação de edição única: **não existe `events` nem `event_id`**.
2. `spaces` são locais; `activities` são ações. QR sempre pertence a Activity.
3. `moments` pode ser livre ou de desafio. Galeria é uma consulta, não uma tabela.
4. Arquivo fica no S3; Postgres guarda somente metadados e estado da mídia.
5. `point_entries` é o histórico imutável. `users.points` é o saldo materializado para ranking rápido.
6. Toda alteração de saldo acontece na mesma transação que seu lançamento.
7. Toda escrita reexecutável usa `Idempotency-Key` UUID.
8. API nunca confia em pontos, visibilidade, origem de Moment, usuário ou IDs recebidos do cliente sem validar no servidor.

## 1. Vocabulário de domínio

| Termo | Definição | Exemplo |
| --- | --- | --- |
| Space | Local físico. | Capela, Palco Principal. |
| Activity | Algo configurável que acontece no DNJ. | Abertura, QR da Capela, desafio de foto, Radicalidade. |
| Participation | Registro de uma pessoa em uma Activity. | Ana validou o QR da Capela. |
| Activity Run | Uma execução de Activity competitiva. | Rodada atual da Radicalidade. |
| Moment livre | Foto espontânea, sem atividade e sem pontos. | Foto com amigos no feed. |
| Moment de desafio | Foto anexada a Participation elegível e que pode pontuar. | Foto no desafio “com a galera”. |
| Media asset | Registro de objeto no S3. | JPEG privado, 1.4 MB. |

Fora de escopo: `queues`, `queue_entries`, `gallery_posts`, `gallery_likes`, `gallery_comments`, multi-evento e comentários em fotos.

## 2. Migrations PostgreSQL

### Convenções

- Banco: PostgreSQL 16+.
- IDs: UUID gerado pelo banco com `gen_random_uuid()`.
- Horários: `timestamptz`, sempre retornados em UTC ISO-8601.
- Nomes: `snake_case` no banco; `camelCase` no JSON.
- Framework de migration é escolha do repositório da API; os nomes abaixo expressam ordem obrigatória.
- Nunca editar migration aplicada. Criar migration seguinte para qualquer mudança.

### 001 — extensões e enums

`001_extensions_and_types.sql`

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;

create type user_role as enum ('participant', 'manager', 'admin');
create type activity_kind as enum ('schedule', 'checkpoint', 'challenge', 'competitive', 'live');
create type activity_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type qr_status as enum ('active', 'paused', 'expired', 'disabled');
create type participation_status as enum ('active', 'completed', 'expired', 'cancelled');
create type run_status as enum ('draft', 'active', 'paused', 'results', 'completed', 'cancelled');
create type run_participant_status as enum ('participating', 'awarded', 'disqualified');
create type media_status as enum ('pending_upload', 'available', 'failed', 'deleted');
create type moment_origin as enum ('free', 'challenge');
create type publication_status as enum ('private', 'public');
create type moderation_status as enum ('approved', 'rejected');
create type reward_status as enum ('not_applicable', 'pending', 'awarded', 'denied', 'reversed');
create type announcement_status as enum ('draft', 'teaser', 'active', 'completed', 'cancelled');
```

### 002 — usuários e grupos

`002_users_and_groups.sql`

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  email citext not null unique,
  document_hash bytea not null unique,
  document_last4 char(4) not null check (document_last4 ~ '^[0-9]{4}$'),
  mobile_phone text,
  group_id uuid references groups(id) on delete set null,
  role user_role not null default 'participant',
  points integer not null default 0 check (points >= 0),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_group_idx on users(group_id);
create index users_ranking_idx on users(points desc, id);
```

`document_hash` deve ser `HMAC-SHA-256(documento_normalizado, segredo_da_API)`. Não salvar CPF/documento puro. A API aceita o documento no login/cadastro, mas nas respostas retorna somente `documentMasked`, por exemplo `***.***.***-09`.

### 003 — espaços, activities e gestão

`003_spaces_activities.sql`

```sql
create table spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  map_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  kind activity_kind not null,
  status activity_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  check_in_points integer not null default 0 check (check_in_points >= 0),
  moment_points integer not null default 0 check (moment_points >= 0),
  cooldown_seconds integer not null default 0 check (cooldown_seconds >= 0),
  allows_moment boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or starts_at < ends_at),
  check (not allows_moment or kind in ('checkpoint', 'challenge', 'competitive', 'live'))
);

create table activity_manager_assignments (
  activity_id uuid not null references activities(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(activity_id, user_id)
);

create index activities_schedule_idx on activities(status, starts_at) where kind = 'schedule';
create index activities_space_idx on activities(space_id);
```

Uma programação é `activities.kind = 'schedule'`. Um QR fixo em local é `kind = 'checkpoint'` com `space_id`; o local não recebe coluna de QR.

### 004 — QR e participações

`004_qr_participations.sql`

```sql
create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  token_hash bytea not null unique,
  scan_expires_at timestamptz not null,
  moment_expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  status qr_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (moment_expires_at is null or moment_expires_at >= scan_expires_at),
  check (max_uses is null or used_count <= max_uses)
);

create table participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  qr_code_id uuid references qr_codes(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  cooldown_ends_at timestamptz,
  status participation_status not null default 'active',
  can_share_moment boolean not null default false,
  check_in_points integer not null default 0 check (check_in_points >= 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, activity_id, idempotency_key)
);

create index participations_current_idx on participations(user_id, status, cooldown_ends_at desc);
create index participations_activity_idx on participations(activity_id);
```

Implementar `validate_qr(...)` como procedure/serviço transacional: localizar QR por hash, bloquear QR e usuário, validar status/expiração/limite/cooldown, criar ou recuperar Participation, inserir PointEntry e atualizar saldo. A resposta de retry deve ser exatamente a mesma Participation, nunca uma nova.

### 005 — mídia S3 e Moments

`005_media_moments.sql`

```sql
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  provider text not null default 's3' check (provider = 's3'),
  bucket text not null,
  object_key text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  bytes bigint not null check (bytes > 0 and bytes <= 10485760),
  checksum_sha256 bytea,
  upload_status media_status not null default 'pending_upload',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  participation_id uuid references participations(id) on delete restrict,
  media_asset_id uuid not null unique references media_assets(id) on delete restrict,
  origin moment_origin not null,
  publication_status publication_status not null default 'private',
  moderation_status moderation_status not null default 'approved',
  reward_status reward_status not null default 'not_applicable',
  points_awarded integer not null default 0 check (points_awarded >= 0),
  idempotency_key uuid not null unique,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((origin = 'free' and participation_id is null and points_awarded = 0 and reward_status = 'not_applicable')
      or (origin = 'challenge' and participation_id is not null))
);

create unique index moments_one_per_participation_idx
  on moments(participation_id) where participation_id is not null;
create index moments_public_feed_idx
  on moments(captured_at desc) where publication_status = 'public' and moderation_status = 'approved';
create index moments_user_idx on moments(user_id, captured_at desc);

create table moment_likes (
  moment_id uuid not null references moments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(moment_id, user_id)
);
create index moment_likes_user_idx on moment_likes(user_id);
```

Além do `CHECK`, criar trigger `validate_challenge_moment()` que confirma: `participations.user_id = moments.user_id`, Activity permite Moment, janela `moment_expires_at` ainda vale e `media_assets.owner_user_id = moments.user_id`. Não existe trigger para atribuir pontos: isso pertence à procedure de criação de Moment, para ser atômico e auditável.

### 006 — pontos e atividade competitiva

`006_points_runs.sql`

```sql
create table activity_runs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  started_by uuid references users(id) on delete set null,
  status run_status not null default 'draft',
  point_rules jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or started_at <= ended_at)
);

create table activity_run_participants (
  activity_run_id uuid not null references activity_runs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  placement integer check (placement is null or placement > 0),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  status run_participant_status not null default 'participating',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(activity_run_id, user_id)
);

create table point_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  participation_id uuid references participations(id) on delete set null,
  activity_run_id uuid references activity_runs(id) on delete set null,
  reason text not null,
  delta integer not null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);
create index point_entries_user_idx on point_entries(user_id, created_at desc);
```

Procedure interna `award_points(user_id, delta, reason, idempotency_key, participation_id?, activity_run_id?)`: insere com `ON CONFLICT DO NOTHING`; se inseriu, bloqueia usuário, impede saldo negativo, atualiza `users.points`; se já existia, devolve saldo sem reaplicar delta.

### 007 — anúncios e auditoria

`007_live_audit.sql`

```sql
create table live_announcements (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  teaser_seconds integer not null default 15 check (teaser_seconds >= 0),
  points integer not null default 0 check (points >= 0),
  delivery_targets text[] not null default array['app']::text[],
  status announcement_status not null default 'draft',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (cardinality(delivery_targets) > 0 and delivery_targets <@ array['app','tv','screen']::text[])
);

create table operation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## 3. S3: contrato técnico

### Chaves e permissões

```text
Bucket: dnj-media-<environment>
Object key: private/<user-id>/<random-uuid>.<extension>
Block Public Access: ligado
Encryption: SSE-S3 ou SSE-KMS
Lifecycle: apagar objetos não confirmados após 24h; transicionar/deletar mídia removida conforme política do evento
```

A API é a única entidade que pode gerar URL assinada. O cliente não recebe credencial AWS, nome de bucket como dado de domínio nem URL pública permanente.

### Upload

1. `POST /v2/media/upload-intents`: valida imagem e limite de 10 MB; cria asset pendente.
2. Retorna `mediaAssetId`, URL `PUT` assinada, headers obrigatórios e expiração.
3. Cliente envia bytes diretamente ao S3.
4. `POST /v2/media/{mediaAssetId}/complete`: API faz `HeadObject`, confere tamanho/tipo/checksum e marca disponível.
5. `POST /v2/moments` usa somente asset disponível e pertencente ao usuário.

Falhas: asset pendente não gera Moment; upload que expira gera novo intent; objeto órfão é limpo pelo lifecycle e tarefa de reconciliação.

## 4. Autorização

| Papel | Pode |
| --- | --- |
| Participante | Perfil próprio, QR, Moments próprios, feed permitido, like, ranking. |
| Gestor | Apenas Activities/Spaces ou runs explicitamente atribuídos. |
| Admin | Usuários, moderação, anúncios e operação global. |
| Público | Schedule, spaces, feed público, anúncio público e display público. |

Tokens de participante identificam `sub = users.id`. Sessões de gestor/admin devem ser separadas e não aceitas como bearer de participante. Todas as decisões de escopo ocorrem no servidor; não confiar em `activityId` enviado por um gestor sem confirmar assignment.

## 5. Contrato HTTP V2

### Regras comuns

- Base URL: `/v2`.
- Respostas JSON usam `camelCase`; UUIDs são strings.
- Escritas recebem header `Idempotency-Key: <uuid>`; repetir mesma chave e mesma intenção retorna resultado original.
- Erro padronizado:

```json
{ "code": "MOMENT_NOT_ELIGIBLE", "message": "Esta participação não permite enviar foto.", "details": {} }
```

### Autenticação

| Método | Rota | Corpo | Sucesso | Falhas |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | `name`, `email`, `document`, `mobilePhone`, `groupId?` | `201 ApiUser` e início de verificação | `400`, `409` |
| POST | `/auth/verify` | `emailOrPhone`, `code` | `200 { identityToken, user }` | `401`, `429` |
| GET | `/users/me` | — | `200 ApiUser` | `401` |
| PATCH | `/users/me/group` | `groupId | null` | `200 ApiUser` | `401`, `404` |

`ApiUser`:

```json
{
  "id": "uuid", "name": "Ana", "email": "ana@example.com",
  "documentMasked": "***.***.***-09", "mobilePhone": "+5541...",
  "role": "participant", "group": { "id": "uuid", "groupName": "Jovens" },
  "points": 120, "rankPosition": 4
}
```

### Descoberta e game

| Método | Rota | Regra |
| --- | --- | --- |
| GET | `/spaces` | Lista `spaces`. |
| GET | `/schedule?view=home&sector=` | Lista Activities `schedule`, estado temporal derivado no servidor. |
| GET | `/groups?search=` | Pesquisa grupos. |
| GET | `/game/overview` | Ranking individual, grupos e lançamentos do solicitante. |
| GET | `/live-announcements/active` | Anúncio atual para app/TV/telão. |

### QR e participação

| Método | Rota | Corpo | Retorno |
| --- | --- | --- | --- |
| POST | `/qr/validate` | `{ "qrToken": "valor", "idempotencyKey": "uuid" }` | `201` criada ou `200` recuperada; ambos retornam `ParticipationEnvelope`. |
| GET | `/participations/current` | — | `200` Participation ativa que permite foto ou `204`. |
| POST | `/moment-challenges/{activityId}/participations` | `{ "idempotencyKey": "uuid" }` | Cria/recupera Participation de desafio sem QR visível. |

`Participation` não contém Event:

```json
{
  "id": "uuid",
  "activity": { "id": "uuid", "name": "Foto com a galera" },
  "place": { "id": "uuid", "name": "Capela" },
  "checkedInAt": "2026-10-18T15:00:00Z",
  "cooldownEndsAt": "2026-10-18T15:10:00Z",
  "status": "active",
  "canShareMoment": true,
  "checkInPoints": 10,
  "newTotalPoints": 120
}
```

### Mídia e Moments

| Método | Rota | Regra |
| --- | --- | --- |
| POST | `/media/upload-intents` | Cria asset pendente e presigned PUT. |
| POST | `/media/{mediaAssetId}/complete` | Confirma objeto S3 do dono. |
| GET | `/media/{mediaAssetId}` | Retorna redirect/stream autorizado de mídia visível. |
| GET | `/moments?scope=feed|mine|group&cursor=&limit=` | Feed público ou coleção do usuário/grupo. |
| POST | `/moments` | Cria Moment livre ou de desafio. |
| POST | `/moments/{momentId}/likes` | Toggle de like. |

Corpo de criação de Moment:

```json
{
  "mediaAssetId": "uuid",
  "publishConsent": true,
  "participationId": "uuid opcional"
}
```

O servidor deriva `origin`: ausência de `participationId` significa `free`; presença significa tentativa de `challenge`, sujeita às regras do banco. `pointsAwarded` jamais é recebido do cliente.

Resposta `Moment`:

```json
{
  "id": "uuid", "origin": "free", "participationId": null,
  "imageUrl": "URL curta", "thumbnailUrl": "URL curta", "shareImageUrl": "URL curta",
  "placeName": null, "authorName": "Ana", "capturedAt": "2026-10-18T15:00:00Z",
  "moderationStatus": "approved", "publicationStatus": "public",
  "pointsAwarded": 0, "likesCount": 3, "likedByCurrentUser": false,
  "groupId": "uuid ou null"
}
```

### Operação

| Método | Rota | Papel |
| --- | --- | --- |
| POST | `/manager/activities/{id}/start` | Gestor atribuído. |
| POST | `/manager/activities/{id}/pause` | Gestor atribuído. |
| POST | `/manager/runs` | Gestor de Activity competitiva. |
| POST | `/manager/runs/{id}/qr` | Gestor do run; gira QR dinâmico. |
| POST | `/manager/runs/{id}/results` | Gestor; premia atomicamente. |
| POST | `/admin/live-announcements` | Admin. |
| PATCH | `/admin/moments/{id}/moderation` | Admin; pode reverter pontos/remover mídia. |

Cada operação cria `operation_audit` com ator, ação, entidade e metadados mínimos.

## 6. Códigos de erro

| HTTP | Código | Caso |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Campo ausente, formato ou limite inválido. |
| 401 | `UNAUTHENTICATED` | Token/sessão ausente ou inválido. |
| 403 | `FORBIDDEN` | Papel, ownership ou assignment inválido. |
| 404 | `NOT_FOUND` | Recurso inexistente ou não visível. |
| 409 | `QR_UNAVAILABLE` | QR pausado, já consumido no limite ou ação incompatível. |
| 409 | `MOMENT_NOT_ELIGIBLE` | Participation não permite foto. |
| 409 | `MOMENT_ALREADY_CREATED` | Uma foto por desafio já existe. |
| 410 | `QR_EXPIRED` | Janela de scan/foto acabou. |
| 413 | `IMAGE_TOO_LARGE` | Acima de 10 MB. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Não é JPEG/PNG/WebP permitido. |
| 429 | `RATE_LIMITED` | Limite de autenticação, QR ou upload. |

## 7. Compatibilidade com o OpenAPI atual

O contrato atual é `1.1.0-draft` e não pode ser preservado literalmente:

| 1.1.0 atual | V2 obrigatório |
| --- | --- |
| `Participation.event` requerido | Remover. |
| `CreateMomentRequest.participationId` requerido | Tornar opcional. |
| `Moment.participationId` requerido | Permitir `null`. |
| `Moment.placeName` requerido | Permitir `null`. |
| `Moment.authorName` não declarado | Declarar como requerido. |
| `/gallery` com `eventId` | Deprecar e remover. |
| `/gallery/{id}/likes` | Migrar para `/moments/{id}/likes`. |
| `/media/{storageKey}` | Trocar por asset ID/URL assinada. |
| Documento puro em `ApiUser` | Trocar por máscara. |

Publicar OpenAPI `2.0.0` separado. Não sobrescrever o 1.1.0 enquanto o front ainda o consome. A migração do front é: likes → upload S3 → Moment livre → remoção de Event → desligamento de Gallery legado.

## 8. Testes obrigatórios de integração

1. QR concorrente no último uso permitido: somente uma request cria Participation.
2. Mesmo `Idempotency-Key` no QR: retorna mesma Participation e não duplica PointEntry/saldo.
3. Moment livre: `participationId = null`, origem `free`, pontos zero.
4. Moment desafio com Participation alheia, expirada ou inelegível: `403`/`409`, nenhum arquivo/Moment/ponto novo.
5. Repetição de Moment desafio: uma foto e um prêmio apenas.
6. Like paralelo: uma linha por usuário/Moment e contagem correta.
7. Moment privado não aparece em feed nem recebe like de terceiro.
8. S3: asset sem `complete` não gera Moment; objeto órfão é removível sem apagar dados válidos.
9. Reversão administrativa: cria entrada negativa e corrige saldo sem duplicar reversão.
10. Ranking: soma de `point_entries` por usuário é igual a `users.points` em amostra de auditoria.

## 9. Pendências que precisam de decisão antes do código

| Decisão | Default desta especificação |
| --- | --- |
| Uma foto por desafio? | Sim; índice parcial em `participation_id`. |
| Moderar antes de publicar? | Não; publica aprovada e admin corrige/reverte depois. |
| Provider de OTP/SMS? | Não definido; interface de provider obrigatória. |
| Telefone é obrigatório? | Sim, se OTP real for SMS; caso contrário pode ser opcional. |
| Política de retenção de fotos? | Definir prazo, consentimento e processo LGPD antes de produção. |
| URL de mídia | Presigned curto por padrão; proxy se for preciso revogação imediata. |

## 10. Definition of Done do backend V2

- Migrations 001–007 aplicam em banco vazio e passam testes de integração.
- OpenAPI 2.0.0 descreve todos endpoints acima e é validado no CI.
- Nenhuma tabela/rota V2 depende de `events`, `queues` ou `gallery_*`.
- Fluxo completo funciona: cadastro → QR → pontos → upload S3 → Moment livre/desafio → like → ranking → moderação/reversão.
- Logs/auditoria não expõem documento, token QR bruto, URL S3 assinada ou credenciais.
