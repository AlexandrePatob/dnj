# Migração do Frontend para a API V2 Design

**Spec**: `.specs/features/v2-backend-handoff/spec.md`  
**Status**: Draft — pronto para aprovação antes de tarefas

---

## Architecture Overview

O frontend passa a falar com a API V2 por uma origem same-origin do Next (`/api/v2`), encaminhada por rewrite para o upstream de develop confirmado:

`https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2`

O rewrite não implementa regra de domínio; ele só preserva cookies e elimina CORS/cookies de terceiros. A V2 continua sendo a autoridade para identidade, autorização, dados, transições e mídia. O browser envia a foto diretamente ao S3 apenas depois de receber uma intenção assinada.

```mermaid
flowchart LR
  UI[React screens] --> API[lib/api V2 client]
  API --> PROXY[/api/v2 rewrite]
  PROXY --> V2[DNJ Game API V2]
  V2 --> DB[(PostgreSQL)]
  V2 --> INTENT[Upload intent]
  INTENT --> S3[S3 signed PUT]
  S3 --> COMPLETE[POST media complete]
  COMPLETE --> V2
  V2 --> UI
  LEGACY[Next / Supabase legacy handlers] -. only unmapped operational flows .-> UI
```

### Authentication lifecycle

1. Google Sign-In entrega um ID token ao cliente.
2. `POST /auth/google` cria cookies V2 e retorna `IdentitySessionResponse`.
3. O client guarda somente o estado de apresentação e o CSRF token necessário para a sessão corrente; não persiste `accessToken` no `localStorage`.
4. No bootstrap, `GET /auth/session` restaura a identidade pelos cookies. Em `401`, o client tenta uma única renovação com `POST /auth/refresh` + `X-CSRF-Token` e repete a requisição original uma vez.
5. Logout chama `POST /auth/logout`, limpa o estado local de apresentação e retorna à tela de login.

`/auth/refresh` requer o cookie CSRF e o mesmo valor no header. O contrato retorna `csrfToken` no login/refresh; a implementação deve verificar, em develop, que o cookie CSRF é legível pela origem same-origin após reload antes de depender de refresh pós-reload.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to use |
| --- | --- | --- |
| Cliente com timeout e `ApiError` | `src/lib/api/client.ts` | Evoluir para base V2, credenciais, erro V2, refresh único e idempotência; não criar clientes por tela. |
| Adaptadores de auth/grupos/agenda | `src/lib/api/auth.ts`, `groups.ts`, `schedule.ts` | Substituir contratos V1 pelos adapters V2 e manter as telas desacopladas de URL. |
| Persistência de tema e estado de UI | `src/lib/storage.ts` | Preservar tema; retirar a persistência do token e ajustar a sessão de apresentação. |
| Shell e bootstrap | `src/components/dnj-app.tsx` | Trocar restauração de `localStorage` por bootstrap V2 e gate de onboarding. |
| Estado de rede e snapshot offline | `src/hooks/use-network-status.ts`, `src/lib/pwa/offline-snapshot.ts` | Manter snapshot sem token/documento; não persistir respostas autenticadas. |
| Service worker | `src/pwa/sw.ts` | Conformar AD-002: bypass de `/api/v2` e de URLs S3 assinadas. |
| Telas de Game, QR, mapa, galeria e Moments | `src/features/{game,scanner,map,gallery,moments}/` | Mover chamadas diretas para adapters V2, preservando os componentes de UI. |

### Integration Points

| System | Integration Method |
| --- | --- |
| API V2 develop | Upstream server-only configurado para a URL Lambda validada por `GET /healthcheck`; rota pública same-origin `/api/v2`. |
| Google Identity | Componente/SDK de login entrega somente `idToken` a `authApi.loginWithGoogle`. A seleção concreta de SDK fica em tarefa de autenticação. |
| Sessão V2 | Cookies emitidos pela API atravessam o rewrite; requisições usam `credentials: "include"`. |
| S3 | PUT usando exatamente `uploadUrl`, `method` e `headers` da intenção; nunca pelo rewrite e nunca persistindo URL assinada. |
| Legado Next/Supabase | Permanece apenas em admin/gestor, evento especial, display e Web Push sem mapeamento V2 confirmado. |

---

## Components

### V2 environment and rewrite

- **Purpose**: expor um único endereço público da API sem revelar ou acoplar telas ao upstream da Lambda.
- **Location**: `src/lib/env.ts`, `next.config.ts`, `.env.example`.
- **Interfaces**:
  - `env.apiBaseUrl: string` — `/api/v2` no browser.
  - `DNJ_V2_UPSTREAM_URL: string` — URL absoluta server-only, terminando em `/v2`.
- **Dependencies**: configuração de ambiente da Vercel/Next.
- **Reuses**: `next.config.ts` e a convenção existente de `NEXT_PUBLIC_API_URL`.

### V2 HTTP client

- **Purpose**: executar todas as chamadas V2 com origem, credenciais, timeout, erro normalizado, refresh limitado e idempotência.
- **Location**: `src/lib/api/client.ts` e novos módulos pequenos em `src/lib/api/`.
- **Interfaces**:
  - `apiRequest<T>(path, options): Promise<T>` — leitura/autenticação comum.
  - `apiMutation<T>(path, { method, body, idempotencyKey }): Promise<T>` — escrita com chave obrigatória.
  - `ApiError` — expõe `status`, `code`, `message`, `details` e `requestId`.
  - `newIdempotencyKey(): string` — UUID v4 por intenção.
- **Dependencies**: `env`, cookies CSRF same-origin e `fetch` nativo.
- **Reuses**: timeout e tratamento offline do cliente atual.

### Identity session adapter

- **Purpose**: traduzir a resposta V2 em estado de aplicação, sem reter access token no armazenamento persistente.
- **Location**: `src/lib/api/auth.ts`, `src/lib/storage.ts`, `src/components/dnj-app.tsx`.
- **Interfaces**:
  - `loginWithGoogle(idToken): IdentitySessionResponse`
  - `getSession(): CurrentSessionResponse`
  - `completeOnboarding(input): CurrentSessionResponse`
  - `logout(): Promise<void>`
  - `clearSessionPresentation(): void`
- **Dependencies**: V2 HTTP client e provedor Google.
- **Reuses**: `DnjApp` para navegar entre login, grupo/onboarding e home.

### Domain adapters

- **Purpose**: impedir que telas conheçam paths V2, headers ou diferenças de payload.
- **Location**: `src/lib/api/{groups,schedule,game,moments,media,notifications}.ts`.
- **Interfaces**:
  - grupos/perfil: `listGroups`, `getCurrentGroup`, `updateCurrentGroup`, `getCurrentProfile`.
  - conteúdo: `getSchedule`, `listSpaces`, `listActivities`.
  - game: `getOverview`, `getCurrentRun`, `getCurrentParticipation`, `validateQr`.
  - Moments: `listMoments`, `toggleLike`, `createMoment`.
  - mídia: `createUploadIntent`, `putUpload`, `completeUpload`.
- **Dependencies**: V2 HTTP client; `putUpload` usa `fetch` direto apenas na URL assinada.
- **Reuses**: contratos e mapeadores existentes onde os campos continuam semanticamente equivalentes.

### Moment upload orchestrator

- **Purpose**: executar a única sequência permitida para foto e expor progresso para `MomentComposer`.
- **Location**: `src/lib/api/media.ts`, consumido por `src/features/moments/moment-composer.tsx`.
- **Interfaces**:
  - `publishMoment({ file, publishConsent, participationId? }): Promise<Moment>`.
  - Estados: `hashing | requesting_intent | uploading | completing | publishing | success | error`.
- **Dependencies**: Web Crypto SHA-256, V2 client e URL S3 da intenção.
- **Reuses**: UI de composer e feedback atuais; substitui apenas seu POST multipart.

---

## Data Models

```ts
type V2ErrorEnvelope = {
  code: string;
  message: string;
  details: unknown | null;
  requestId: string;
};

type IdentityUser = {
  id: string;
  email: string;
  name: string;
  mobilePhone: string;
  documentMasked: string;
  role: "ADMIN" | "EVENT_MANAGER" | "DEFAULT";
  group: { id: string; name: string } | null;
  onboardingComplete: boolean;
};

type SessionPresentation = {
  user: IdentityUser;
  onboardingRequired: boolean;
  csrfToken?: string;
};

type UploadIntent = {
  id: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
};
```

`SessionPresentation` vive em memória durante a sessão. O app pode restaurar `IdentityUser` de `GET /auth/session`, mas não deve restaurar token, CPF integral ou URL S3 por `localStorage`/offline snapshot.

---

## Error Handling Strategy

| Error scenario | Handling | User impact |
| --- | --- | --- |
| `401` em leitura/chamada autenticada | Um refresh com CSRF e uma única repetição; se falhar, limpar apresentação e voltar ao login. | Sessão expirada, sem loop. |
| `204` em run/participation atual | Modelar como resultado vazio. | Placeholder contextual, não alerta de falha. |
| `409 IDEMPOTENCY_KEY_REUSED` | Não reenviar payload divergente; preservar `requestId`. | Mensagem de conflito, sem duplicação. |
| `409 UPLOAD_INCOMPLETE` no complete | Retry controlado do complete usando a mesma intenção. | Upload pode concluir sem duplicar asset. |
| `410` em intenção | Solicitar nova intenção e reiniciar upload, após informar expiração. | Usuário seleciona/reenvia a foto. |
| `413`/`415` da intenção | Bloquear antes do PUT. | Feedback claro sobre tamanho/tipo. |
| Rede/timeout/`5xx` | Permitir retry explícito com mesma chave para a mesma mutação; nunca retry automático de `409`. | Erro recuperável e previsível. |
| URL de mídia expirada | Recarregar a coleção/Moment da V2. | Imagem volta sem cache de URL sensível. |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Token de participante é persistido em `localStorage`. | `src/lib/storage.ts:20` | Exposição a XSS e contrato incompatível com cookies/refresh V2. | Remover persistência de token na fundação V2; usar cookie HttpOnly e estado de apresentação em memória. |
| Bootstrap atual confia apenas no estado local. | `src/components/dnj-app.tsx:154` | Sessão revogada/alterada no servidor permanece aparente no app. | Bootstrap por `GET /auth/session` antes de liberar telas protegidas. |
| Chamadas V1 são diretas nas telas. | `src/features/game/game-screen.tsx:307`, `gallery-screen.tsx:80`, `map-screen.tsx:11`, `moment-composer.tsx:54` | Troca de backend exigiria alterações espalhadas e inconsistentes. | Migrar cada chamada para adapters de domínio antes de substituir a rota. |
| `DnjApp` mistura bootstrap, auth, navegação e polling de eventos especiais. | `src/components/dnj-app.tsx:58` | Alto risco de regressão no login e difícil teste isolado. | Extrair bootstrap de identidade e manter evento especial explicitamente no legado até decisão de produto. |
| Evento especial, display e Web Push não estão no contrato V2. | `src/components/dnj-app.tsx:185`, `src/features/display/live-ranking-display.tsx:226`, `src/features/account/account-screen.tsx:29` | Remoção ampla de Supabase quebraria superfícies ao vivo. | Lista de exclusão por rota; só remover após endpoint V2 ou decisão de manter serviço separado. |
| Service worker tem política deliberada de não cachear API. | `src/pwa/sw.ts`, AD-002 | Risco de regressão se novos paths forem tratados como assets. | Testar explicitamente `/api/v2/**` e URLs S3 como pass-through. |
| Sem teste atual para OAuth Google/refresh/upload V2. | `src/lib/api/*.test.ts`, `src/features/moments/` | Caminhos críticos podem passar apenas manualmente. | Criar testes unitários do cliente e E2E por fluxo antes de remover aliases. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Public API origin | `/api/v2` same-origin com rewrite | Preserva sessão por cookie e reduz dependência de CORS sem criar BFF de domínio. |
| Develop upstream | URL Lambda V2 fornecida pelo usuário, validada por `/healthcheck` | Retornou `200 {"service":"dnj-game-api","status":"ok"}`. |
| Primary auth transport | Cookies V2; bearer apenas compatibilidade transitória do adapter | Evita token persistente no browser e habilita refresh oficial. |
| Legacy retirement | Por fluxo, após observabilidade em produção | É a condição explícita do handoff V2. |
| API cache | Nenhuma resposta V2 autenticada no service worker | Conforma AD-002 e preserva segurança. |

## Requirement Design Mapping

| Requirement | Design element |
| --- | --- |
| V2AUTH-01 | V2 HTTP client + Identity session adapter |
| V2AUTH-02 | rewrite same-origin + bootstrap/refresh lifecycle |
| V2CORE-01 | Domain adapters de grupos, conteúdo e game |
| V2CORE-02 | `apiMutation` e tratamento de 204/409/retry |
| V2MEDIA-01 | Moment upload orchestrator |
| V2MEDIA-02 | S3 intent, complete e política de URLs assinadas |
| V2SAFE-01 | testes por fluxo + client centralizado |
| V2SAFE-02 | rollout por adapter e inventário de legados |
| V2EXT-01 | adapters opcionais de perfil, favoritos e notificações |
