# DNJ — Banco de dados (estado atual no Supabase)

Fonte de verdade consultada em 2026-08-06: projeto Supabase `kawuwdvrisvbkucsnbep` (26 tabelas em `public`, todas com RLS habilitado). Cole cada bloco Mermaid no Eraser para editar visualmente. Os quatro blocos foram separados para o canvas não ficar ilegível.

## 1. Núcleo do evento e identidade

```mermaid
erDiagram
  EVENTS {
    uuid id PK
    text slug UK
    text name
    timestamptz starts_at
    timestamptz ends_at
    text status
  }
  GROUPS {
    uuid id PK
    uuid event_id FK
    text name
  }
  TEST_USERS {
    uuid id PK
    uuid group_id FK
    text external_key UK
    text email
    text display_name
    integer points
    text role
    boolean is_active
  }
  SPACES {
    uuid id PK
    uuid event_id FK
    text slug
    text name
    text map_reference
  }
  EXPERIENCES {
    uuid id PK
    uuid event_id FK
    uuid space_id FK
    text slug
    text name
    text kind
    text status
    timestamptz starts_at
    timestamptz ends_at
    integer check_in_points
    integer moment_points
    boolean allows_moment
  }
  MANAGER_SCOPES {
    uuid id PK
    uuid user_id FK
    uuid space_id FK
    text scope
  }
  EXPERIENCE_MANAGER_ASSIGNMENTS {
    uuid experience_id PK, FK
    uuid user_id PK, FK
  }

  EVENTS ||--o{ GROUPS : organizes
  GROUPS ||--o{ TEST_USERS : belongs_to
  EVENTS ||--o{ SPACES : contains
  EVENTS ||--o{ EXPERIENCES : owns
  SPACES o|--o{ EXPERIENCES : hosts
  TEST_USERS ||--o{ MANAGER_SCOPES : has
  SPACES o|--o{ MANAGER_SCOPES : limits
  TEST_USERS ||--o{ EXPERIENCE_MANAGER_ASSIGNMENTS : manages
  EXPERIENCES ||--o{ EXPERIENCE_MANAGER_ASSIGNMENTS : assigned_to
```

## 2. QR, participação e pontuação

```mermaid
erDiagram
  TEST_USERS { uuid id PK }
  EVENTS { uuid id PK }
  EXPERIENCES { uuid id PK }
  QR_CODES {
    uuid id PK
    uuid experience_id FK
    uuid activity_run_id FK
    uuid special_event_id FK
    text token_hash UK
    timestamptz expiration_time
    timestamptz expiration_momento_time
    integer max_uses
    integer used_count
    text status
  }
  PARTICIPATIONS {
    uuid id PK
    uuid user_id FK
    uuid event_id FK
    uuid experience_id FK
    uuid qr_code_id FK
    uuid idempotency_key UK
    timestamptz checked_in_at
  }
  POINT_ENTRIES {
    uuid id PK
    uuid user_id FK
    uuid participation_id FK
    text reason
    integer delta
    uuid idempotency_key UK
  }

  TEST_USERS ||--o{ PARTICIPATIONS : checks_in
  EVENTS ||--o{ PARTICIPATIONS : occurs_at
  EXPERIENCES ||--o{ QR_CODES : issues
  EXPERIENCES ||--o{ PARTICIPATIONS : receives
  QR_CODES o|--o{ PARTICIPATIONS : validates
  TEST_USERS ||--o{ POINT_ENTRIES : earns
  PARTICIPATIONS o|--o{ POINT_ENTRIES : produces
```

## 3. Momentos, mídia e moderação

```mermaid
erDiagram
  TEST_USERS { uuid id PK }
  PARTICIPATIONS { uuid id PK }
  MEDIA_OBJECTS {
    uuid id PK
    uuid owner_user_id FK
    text storage_bucket
    text storage_key UK
    text content_type
    bigint bytes
    timestamptz deleted_at
  }
  MOMENTS {
    uuid id PK
    uuid participation_id FK, UK
    uuid media_object_id FK, UK
    text publication_status
    text moderation_status
    text reward_status
    text photo_status
    integer points_awarded
    uuid idempotency_key UK
  }
  MOMENT_LIKES {
    uuid moment_id PK, FK
    uuid user_id PK, FK
  }
  MODERATION_DECISIONS {
    uuid id PK
    uuid moment_id FK
    uuid moderator_user_id FK
    text decision
    text reason
  }
  GALLERY_POSTS {
    uuid id PK
    uuid user_id FK
    text image_path UK
    text moderation_status
  }
  GALLERY_LIKES {
    uuid post_id PK, FK
    uuid user_id PK, FK
  }
  GALLERY_COMMENTS {
    uuid id PK
    uuid post_id FK
    uuid user_id FK
    text body
  }

  TEST_USERS ||--o{ MEDIA_OBJECTS : owns
  PARTICIPATIONS ||--o| MOMENTS : may_create
  MEDIA_OBJECTS ||--o| MOMENTS : backs
  MOMENTS ||--o{ MOMENT_LIKES : receives
  TEST_USERS ||--o{ MOMENT_LIKES : gives
  MOMENTS ||--o{ MODERATION_DECISIONS : reviewed_by
  TEST_USERS o|--o{ MODERATION_DECISIONS : moderates
  TEST_USERS ||--o{ GALLERY_POSTS : creates
  GALLERY_POSTS ||--o{ GALLERY_LIKES : receives
  GALLERY_POSTS ||--o{ GALLERY_COMMENTS : receives
  TEST_USERS ||--o{ GALLERY_LIKES : gives
  TEST_USERS ||--o{ GALLERY_COMMENTS : writes
```

## 4. Operação ao vivo, filas e notificações

```mermaid
erDiagram
  EVENTS { uuid id PK }
  SPACES { uuid id PK }
  EXPERIENCES { uuid id PK }
  TEST_USERS { uuid id PK }
  ACTIVITY_RUNS {
    uuid id PK
    uuid experience_id FK
    uuid started_by FK
    text status
    jsonb point_rules
  }
  ACTIVITY_RUN_PARTICIPANTS {
    uuid activity_run_id PK, FK
    uuid user_id PK, FK
    integer placement
    integer points_awarded
    text status
  }
  SPECIAL_EVENTS {
    uuid id PK
    uuid event_id FK
    uuid experience_id FK
    uuid created_by FK
    text title
    text status
    integer points
    text_array delivery_targets
  }
  SPECIAL_EVENT_DELIVERIES {
    uuid special_event_id PK, FK
    uuid user_id PK, FK
    timestamptz delivered_at
    timestamptz seen_at
  }
  QUEUES {
    uuid id PK
    uuid event_id FK
    uuid space_id FK
    text name
    text status
  }
  QUEUE_ENTRIES {
    uuid id PK
    uuid queue_id FK
    uuid user_id FK
    integer position
    text status
  }
  OPERATION_EVENTS {
    bigint id PK
    uuid actor_user_id FK
    uuid event_id FK
    uuid experience_id FK
    text event_type
    jsonb metadata
  }
  PUSH_SUBSCRIPTIONS {
    uuid id PK
    uuid user_id FK
    text endpoint UK
  }
  NOTIFICATION_CAMPAIGNS {
    uuid id PK
    text title
    text body
    text target
    timestamptz sent_at
  }

  EXPERIENCES ||--o{ ACTIVITY_RUNS : runs
  TEST_USERS o|--o{ ACTIVITY_RUNS : starts
  ACTIVITY_RUNS ||--o{ ACTIVITY_RUN_PARTICIPANTS : includes
  TEST_USERS ||--o{ ACTIVITY_RUN_PARTICIPANTS : joins
  EVENTS ||--o{ SPECIAL_EVENTS : schedules
  EXPERIENCES o|--o{ SPECIAL_EVENTS : optional_context
  TEST_USERS o|--o{ SPECIAL_EVENTS : creates
  SPECIAL_EVENTS ||--o{ SPECIAL_EVENT_DELIVERIES : delivers
  TEST_USERS ||--o{ SPECIAL_EVENT_DELIVERIES : receives
  EVENTS ||--o{ QUEUES : owns
  SPACES o|--o{ QUEUES : locates
  QUEUES ||--o{ QUEUE_ENTRIES : contains
  TEST_USERS ||--o{ QUEUE_ENTRIES : waits
  TEST_USERS o|--o{ OPERATION_EVENTS : acts
  EVENTS o|--o{ OPERATION_EVENTS : records
  EXPERIENCES o|--o{ OPERATION_EVENTS : records
  TEST_USERS o|--o{ PUSH_SUBSCRIPTIONS : subscribes
```

## Rotinas de banco relevantes

- `validate_dnj_qr`: valida QR e cria/recupera participação de modo idempotente.
- `moderate_moment` e `dnj_award_moment`: moderam e pontuam momentos.
- `dnj_finalize_activity_run_v2`: consolida as colocações de uma atividade.
- `dnj_admin_login`, `dnj_operator_login` e `dnj_admin_upsert_manager`: sessões e gestão operacional.
- Triggers: `dnj_set_updated_at`, guarda/fechamento de QR de activity run.

## Pontos de desenho para discutir

1. `test_users` é ao mesmo tempo participante, administrador e gestor (coluna `role`) e ainda recebe escopos em `manager_scopes`; é uma escolha funcional, mas tende a concentrar responsabilidades de identidade.
2. Há duas galerias: legada (`gallery_*`) e atual (`moments`, `media_objects`, `moment_likes`). A API já marca as rotas `gallery` como depreciadas; decidir a data de remoção evita duplicidade permanente.
3. `experiences` é a entidade central e também recebe `kind` para vários conceitos. É um bom ponto para avaliar se `special_events` e `activity_runs` devem continuar como extensões, como estão hoje, ou virar subtipos mais explícitos.
4. `operation_events.metadata` e `activity_runs.point_rules` são JSONB: ótimos para auditoria/regra variável, mas campos usados para filtro ou relatório recorrente devem virar colunas/indexes.
