# DNJ V2 — Especificação de PostgreSQL, S3 e API

**Status:** proposta para aprovação antes da implementação no repositório da API.  
**Objetivo:** substituir o schema Supabase de homologação por um PostgreSQL limpo, de edição única do DNJ, com arquivos no Amazon S3 e contrato HTTP V2 claro.

## Decisões de domínio

| Conceito | É | Não é |
| --- | --- | --- |
| `spaces` | Local físico: Capela, Palco, Arena. | QR ou atividade. |
| `activities` | Tudo que acontece: programação, checkpoint, desafio, jogo ou ação ao vivo. | O evento DNJ inteiro. |
| `participations` | Registro de que uma pessoa realizou uma activity. | Foto obrigatória. |
| `moments` | Foto/memória criada por uma pessoa. | A Galeria. |
| Galeria | Consulta de Moments públicos, aprovados e com mídia disponível. | Tabela persistida. |
| `media_assets` | Metadados e ciclo de vida de objeto S3. | Arquivo armazenado no banco. |

Não existirão `events`, `event_id`, `queues`, `queue_entries` ou `gallery_*`.

## Requisitos

| ID | Requisito verificável |
| --- | --- |
| DATA-01 | O schema não contém entidades de evento-pai, fila ou galeria. |
| DATA-02 | QR pertence a uma Activity; a Activity pode ter Space opcional. |
| DATA-03 | Moment livre não possui Participation e nunca recebe pontos. |
| DATA-04 | Moment de desafio só usa Participation própria e elegível. |
| DATA-05 | Todo ponto possui lançamento imutável e atualização de saldo na mesma transação. |
| DATA-06 | Nenhuma URL S3 permanente ou mídia privada de terceiro é exposta. |
| API-01 | A API aceita Moment sem `participationId` e nunca retorna `event` em Participation. |
| API-02 | Ações reexecutáveis são idempotentes. |

## Modelo relacional

### Identidade

```text
users
  id uuid PK
  display_name text NOT NULL
  email citext NOT NULL UNIQUE
  document_hash bytea NOT NULL UNIQUE
  document_last4 char(4) NOT NULL
  mobile_phone text NULL
  group_id uuid NULL FK groups
  role user_role NOT NULL DEFAULT 'participant'
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0)
  last_seen_at timestamptz NULL
  created_at, updated_at timestamptz NOT NULL

groups
  id uuid PK
  name text NOT NULL UNIQUE
```

O documento recebido no login é normalizado e transformado em HMAC-SHA-256 no backend. Salvar somente `document_hash` e os quatro últimos dígitos evita usar CPF puro como `external_key`, como ocorre hoje. Respostas retornam `documentMasked`, nunca o documento completo. Se SMS real for usado, `mobile_phone` normalizado passa a ser obrigatório no fluxo de cadastro.

### Espaços, atividades e QR

```text
spaces(id, slug UNIQUE, name, map_reference)

activities(
  id, space_id NULL FK spaces, slug UNIQUE, name, description NULL,
  kind activity_kind, status activity_status,
  starts_at NULL, ends_at NULL,
  check_in_points DEFAULT 0, moment_points DEFAULT 0,
  cooldown_seconds DEFAULT 0, allows_moment DEFAULT false,
  created_at, updated_at
)

qr_codes(
  id, activity_id FK activities, token_hash UNIQUE,
  scan_expires_at, moment_expires_at NULL,
  max_uses NULL, used_count DEFAULT 0, status qr_status
)

participations(
  id, user_id FK users, activity_id FK activities, qr_code_id NULL FK qr_codes,
  checked_in_at, cooldown_ends_at NULL, status participation_status,
  can_share_moment DEFAULT false, check_in_points DEFAULT 0,
  idempotency_key, UNIQUE(user_id, activity_id, idempotency_key)
)
```

Enums: `activity_kind = schedule | checkpoint | challenge | competitive | live`; `activity_status = draft | active | paused | completed | archived`; `qr_status = active | paused | expired | disabled`; `participation_status = active | completed | expired | cancelled`.

Um QR de Capela é uma Activity `checkpoint` localizada na Capela; não é atributo de `spaces`. Isso permite várias ações no mesmo local sem acoplamento.

### Mídia e Moments

```text
media_assets(
  id, owner_user_id FK users, provider DEFAULT 's3',
  bucket, object_key UNIQUE, content_type, bytes CHECK(bytes > 0),
  checksum_sha256 NULL, upload_status media_status,
  deleted_at NULL, created_at
)

moments(
  id, user_id FK users,
  participation_id NULL FK participations,
  media_asset_id UNIQUE FK media_assets,
  origin moment_origin, publication_status, moderation_status, reward_status,
  points_awarded DEFAULT 0, idempotency_key UNIQUE,
  captured_at, created_at, updated_at
)

moment_likes(
  moment_id FK moments, user_id FK users, created_at,
  PRIMARY KEY(moment_id, user_id)
)
```

Enums: `moment_origin = free | challenge`; `publication_status = private | public`; `moderation_status = approved | rejected`; `reward_status = not_applicable | pending | awarded | denied | reversed`; `media_status = pending_upload | available | failed | deleted`.

Regras obrigatórias:

1. `free` exige `participation_id IS NULL`, `points_awarded = 0` e `reward_status = not_applicable`.
2. `challenge` exige Participation do mesmo usuário, Activity com `allows_moment`, e janela de foto válida.
3. Confirmar com produto se há uma foto por desafio. Se sim, aplicar `UNIQUE(participation_id) WHERE participation_id IS NOT NULL`.
4. Like é proibido em Moment privado, rejeitado ou sem mídia disponível.
5. Feed público filtra `public`, `approved`, mídia `available` e não removida.

### Pontos, runs e anúncios

```text
activity_runs(id, activity_id FK activities, started_by NULL FK users,
              status, point_rules jsonb, started_at NULL, ended_at NULL)

activity_run_participants(activity_run_id FK activity_runs, user_id FK users,
                          placement NULL, points_awarded DEFAULT 0, status,
                          PRIMARY KEY(activity_run_id, user_id))

point_entries(id, user_id FK users, participation_id NULL FK participations,
              activity_run_id NULL FK activity_runs, reason, delta,
              idempotency_key UNIQUE, created_at)

live_announcements(id, activity_id NULL FK activities, title,
                   starts_at, ends_at, teaser_seconds DEFAULT 15,
                   points DEFAULT 0, delivery_targets, status,
                   created_by NULL FK users)
```

`point_entries` é a fonte auditável da verdade. `users.points` é o saldo materializado para ranking em tempo real. Apenas procedures transacionais podem criar lançamento e alterar saldo; uma reversão é nova entrada negativa, nunca edição/apagamento do passado.

## Amazon S3

1. Cliente solicita intenção de upload com tipo, tamanho e `idempotencyKey`.
2. API valida usuário e cria `media_assets` como `pending_upload`.
3. API entrega presigned `PUT` curto para chave privada, aleatória e não adivinhável.
4. Cliente envia ao S3 e chama confirmação.
5. API faz `HEAD`, valida tipo/tamanho/checksum e muda asset para `available`.
6. API cria o Moment somente com mídia `available`.

Postgres e S3 não compartilham transação: objetos sem confirmação expiram por lifecycle rule; assets pendentes antigos viram `failed`; um Moment nunca é público antes da confirmação. Leitura usa presigned `GET` curto ou proxy autenticado do backend.

## Plano de migrations no novo repositório

Não copiar migrations Supabase: elas são cumulativas, incluem legado e pressupõem `events`. Criar baseline novo e migrations imutáveis.

| Ordem | Migration | Conteúdo | Por quê |
| --- | --- | --- | --- |
| 001 | `extensions_and_types` | `pgcrypto`, `citext`, enums. | Base consistente. |
| 002 | `users_and_groups` | Identidade e índices. | Auth e permissões primeiro. |
| 003 | `spaces_and_activities` | Locais, actions, gestores. | Separa lugar de ação. |
| 004 | `qr_and_participations` | QR, retry, cooldown e procedure atômica. | Evita duplicidade de pontos. |
| 005 | `media_and_moments` | S3 metadata, Moments e likes. | Foto livre e desafio. |
| 006 | `points_and_runs` | Ledger, saldo e competição. | Ranking consistente. |
| 007 | `live_announcements_and_audit` | Operação app/TV/telão e auditoria. | Controle operacional. |
| 008 | `development_seed` | Dados locais apenas. | Nunca mistura exemplo e schema. |

Migrations aplicadas não são reescritas. Seeds de usuários, senhas ou programação de demonstração não entram na imagem de produção.

## Transações e concorrência

| Operação | Deve ser atômica | Idempotência |
| --- | --- | --- |
| Validar QR | consumo QR, Participation, PointEntry e saldo | `participations.idempotency_key` |
| Moment livre | asset confirmado + Moment sem pontos | `moments.idempotency_key` |
| Moment desafio | elegibilidade + Moment + premiação | `moments.idempotency_key` |
| Finalizar run | resultados, entries e saldos de todos | chave derivada de run + usuário |
| Like | insert/delete e teste de visibilidade | PK `(moment_id,user_id)` |

QR deve bloquear linhas relevantes com `SELECT … FOR UPDATE`, impedir exceder `max_uses`, e devolver a Participation preexistente no retry. A API nunca confia em pontos, origem de Moment ou status enviados pelo cliente.

## Delta do OpenAPI 1.1.0-draft

| Atual | V2 | Razão |
| --- | --- | --- |
| `Participation.event` obrigatório | removido | Não existe `events`. |
| `CreateMomentRequest.participationId` obrigatório | opcional | Existe Moment livre. |
| `Moment.participationId: string` | `string | null` | Vínculo só existe em desafio. |
| `Moment.placeName: string` | `string | null` | Foto livre não tem local. |
| `Moment.authorName` ausente do schema, mas usado no front | obrigatório | Contrato deve refletir cliente. |
| `/gallery?eventId=` | removido | Galeria é consulta de Moments. |
| `/gallery/{id}/likes` | `POST /moments/{id}/likes` | Elimina namespace legado. |
| `/gallery/{id}/comments` | removido | Comentários não pertencem ao escopo. |
| `/media/{storageKey}` | asset ID ou URL assinada | Não expor detalhe de storage. |

Endpoints V2 necessários:

```text
POST /v2/auth/register
POST /v2/auth/verify
GET  /v2/spaces
GET  /v2/schedule
POST /v2/qr/validate
GET  /v2/participations/current
POST /v2/media/upload-intents
POST /v2/media/{id}/complete
GET  /v2/moments?scope=feed|mine|group
POST /v2/moments
POST /v2/moments/{id}/likes
GET  /v2/game/overview
GET  /v2/live-announcements/active
```

```json
// POST /v2/moments
{
  "mediaAssetId": "uuid",
  "publishConsent": true,
  "participationId": "uuid ou ausente",
  "idempotencyKey": "uuid"
}
```

```json
// resposta Moment
{
  "id": "uuid",
  "origin": "free | challenge",
  "participationId": "uuid ou null",
  "imageUrl": "URL curta assinada ou URL do backend",
  "placeName": "string ou null",
  "authorName": "string",
  "publicationStatus": "private | public",
  "moderationStatus": "approved | rejected",
  "pointsAwarded": 0,
  "likesCount": 0,
  "likedByCurrentUser": false,
  "capturedAt": "ISO-8601 UTC"
}
```

## Transição do front

1. Publicar OpenAPI V2 mantendo o 1.1.0 durante a migração.
2. Mudar like para `/moments/{id}/likes`.
3. Mudar upload para intenção S3 e confirmação.
4. Permitir composer sem Participation e manter fluxo explícito de desafio.
5. Remover `event` dos tipos e mocks quando todos clientes consumirem V2.
6. Remover `/gallery*` somente após telemetria sem consumidores.

## Critérios de aceite

1. Moment sem Participation cria `origin=free` e não altera pontos.
2. Participation de outro usuário ou inelegível não cria Moment desafio.
3. Retry de QR ou Moment não duplica Participation, Moment ou ponto.
4. Cada alteração de saldo possui exatamente uma PointEntry correspondente.
5. Feed de grupo contém Moments livres de integrantes do grupo.
6. Nenhuma resposta entrega documento puro, chave S3 ou mídia privada de terceiro.
7. O contrato V2 não contém `eventId`, `event` em Participation, Gallery como recurso ou fila.
