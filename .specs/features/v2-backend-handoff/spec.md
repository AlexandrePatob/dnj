# Migração do Frontend para a API V2 Specification

## Problem Statement

O frontend DNJ ainda combina um cliente HTTP parcial, Route Handlers locais do Next e Supabase para autenticação, dados do participante, operação e mídia. A API DNJ V2 publicada substitui o fluxo do participante por um contrato único, com autenticação Google, sessão, PostgreSQL/S3 e regras explícitas de idempotência.

Esta feature prepara e executa a adoção gradual do contrato V2 no frontend, mantendo rollback seguro enquanto existirem consumidores das rotas legadas.

## Goals

- [ ] Fazer o app do participante consumir a API V2 para todos os fluxos já cobertos pelo contrato publicado.
- [ ] Eliminar a dependência do Supabase e dos Route Handlers V1 dos fluxos migrados.
- [ ] Preservar estados de UI, autorização, retry e comportamento offline seguro durante a troca.
- [ ] Manter cada fluxo migrável e reversível até evidência de ausência de tráfego nas rotas antigas.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Alterar a API V2, seu banco PostgreSQL ou bucket S3 | O contrato publicado é responsabilidade do repositório de backend. |
| Desligar definitivamente rotas V1 no backend | Exige observabilidade de tráfego real e coordenação com o time de backend. |
| Criar telas inéditas só porque a V2 as suporta | A feature migra capacidades já presentes no frontend. |
| Migrar eventos especiais, display/telão ou Web Push VAPID | Não há equivalência confirmada no Swagger V2 publicado. |
| Remover imediatamente todos os Route Handlers de admin/gestor | Alguns fluxos legados não têm operação V2 equivalente confirmada. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem da API | O frontend exporá `/api/v2` same-origin, encaminhado a um upstream V2 configurável por ambiente. | O Swagger de develop publica uma URL Lambda V2 validada por healthcheck; o rewrite evita CORS e cookies de terceiros. | y |
| Sessão no browser | Cookies V2 serão o transporte primário; bearer fica apenas como compatibilidade transitória do adapter. | O contrato oficial inclui refresh/CSRF por cookie e o access token não precisa ser persistido no browser. | y |
| Proxy Next | Criar rewrite sem regra de domínio para o upstream V2. | Preserva a API como fonte de verdade e reduz risco de integração cross-origin. | y |
| Login | Substituir SMS/código pelo fluxo Google + sessão + onboarding. | É o único fluxo de identidade publicado como pronto no handoff V2. | y |
| Upload | Usar checksum local, intenção, PUT S3, complete e criação de Moment. | É o fluxo obrigatório e documentado pela V2; multipart V1 é legado. | y |
| Rotas sem equivalente V2 | Mantê-las isoladas no Next/Supabase até decisão explícita. | Removê-las quebraria funcionalidades operacionais existentes. | y |
| Rollback | Conservar adapters/aliases V1 por fluxo até observabilidade confirmar tráfego residual aceitável. | Regra explícita do handoff V2. | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Fundação de contrato e sessão

**User Story**: Como participante, quero entrar com Google e recuperar minha sessão de forma segura para acessar recursos protegidos sem depender do Supabase.

**Why P1**: Todos os fluxos autenticados dependem disso.

**Acceptance Criteria**:

1. WHEN o aplicativo inicia com uma sessão V2 válida THEN o sistema SHALL carregar a identidade e o estado de onboarding sem chamar endpoints V1 ou Supabase.
2. WHEN uma chamada autenticada recebe `401` THEN o sistema SHALL tentar exatamente um `POST /auth/refresh` e repetir uma única vez a chamada original se o refresh obtiver sucesso.
3. WHEN login Google retorna `onboardingComplete=false` THEN o sistema SHALL direcionar o participante ao onboarding antes de recursos protegidos.
4. WHEN uma resposta V2 falha THEN o sistema SHALL preservar e apresentar `code`, `message` e `requestId` do envelope de erro quando disponíveis.

**Independent Test**: login Google, reload com sessão válida, refresh válido e refresh expirado podem ser demonstrados isoladamente.

---

### P1: Experiência participante V2

**User Story**: Como participante, quero usar grupos, agenda, mapa, game, QR, Moments e galeria através da API V2 para que meus dados tenham o comportamento oficial do evento.

**Why P1**: São as jornadas principais presentes no aplicativo.

**Acceptance Criteria**:

1. WHEN o participante abre Game THEN o sistema SHALL buscar `game/overview`, `activity-runs/current` e `participations/current` em paralelo; `204` SHALL renderizar estado vazio, não erro.
2. WHEN o participante valida um QR THEN o sistema SHALL enviar somente `qrToken` no corpo e uma `Idempotency-Key` UUID v4 nova por leitura.
3. WHEN o participante cria uma foto THEN o sistema SHALL calcular checksum, obter intenção de upload, fazer PUT na URL assinada, confirmar o asset e somente depois criar o Moment.
4. WHEN `complete` retorna `409 UPLOAD_INCOMPLETE` THEN o sistema SHALL tratar a resposta como retry seguro com a mesma intenção, não como criação de um novo asset.
5. WHEN o participante abre uma aba da galeria THEN o sistema SHALL usar um único `scope` válido e repassar cursores opacos sem decodificá-los ou reconstruí-los.
6. WHEN o participante executa qualquer escrita V2 THEN o sistema SHALL enviar uma `Idempotency-Key` única para a intenção do usuário e reutilizá-la somente em retry da mesma intenção.

**Independent Test**: QR idempotente, Game sem run, Moment free, Moment challenge, paginação de galeria e curtida podem ser validados contra develop.

---

### P1: Migração segura e limites de responsabilidade

**User Story**: Como responsável técnico, quero trocar cada fluxo sem desligar o legado prematuramente para que o evento não perca capacidade operacional.

**Why P1**: A migração coexistirá com Next/Supabase até a validação em produção.

**Acceptance Criteria**:

1. WHEN um fluxo V2 é disponibilizado THEN o sistema SHALL ter teste de integração ou E2E do frontend cobrindo o caminho feliz, vazio, erro relevante e retry quando aplicável.
2. WHEN uma rota V1 deixa de ser usada por uma tela THEN o sistema SHALL manter rollback para a rota anterior até a métrica de tráfego real comprovar adoção da V2.
3. WHEN um endpoint atual não possui equivalente V2 confirmado THEN o sistema SHALL permanecer fora da remoção de Supabase e ser registrado como pendência de decisão.
4. WHEN o service worker processa uma chamada V2 THEN o sistema SHALL continuar sem armazenar respostas de API ou requisições autenticadas.

**Independent Test**: uma tela migrada pode voltar para o adapter V1 sem migration destrutiva e sem perda de dados.

---

### P2: Capacidades V2 já suportadas pelo produto

**User Story**: Como participante, quero acessar perfil, favoritos, notificações e membros do grupo quando essas superfícies forem incorporadas ao app.

**Why P2**: O backend está pronto, mas algumas dessas superfícies não existem ou não são prioritárias no frontend atual.

**Acceptance Criteria**:

1. WHEN uma superfície existente adotar perfil, favoritos, membros ou notificações THEN o sistema SHALL consumir os endpoints V2 correspondentes e respeitar seus estados vazios e de autorização.
2. WHEN uma notificação é marcada como lida ou um favorito é alterado THEN o sistema SHALL usar idempotência e refletir a resposta canônica do servidor.

---

## Edge Cases

- WHEN uma mutação retorna `409 IDEMPOTENCY_KEY_REUSED` THEN o sistema SHALL informar conflito de intenção e não repetir com payload diferente.
- WHEN a URL assinada de upload expira THEN o sistema SHALL solicitar uma nova intenção, nunca reutilizar ou reconstruir a URL anterior.
- WHEN mídia retornada possui URL assinada expirada THEN o sistema SHALL buscar novamente a representação da API, sem cache persistente da URL.
- WHEN uma operação V2 falha por rede, timeout ou `5xx` THEN o sistema SHALL permitir retry seguro conforme a semântica do fluxo; erros de estado `409` não SHALL receber retry automático.
- WHEN uma resposta traz datas THEN o sistema SHALL transportar UTC e converter somente na apresentação, usando o fuso do dispositivo.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| V2AUTH-01 | P1: Fundação de contrato e sessão | Design | Pending |
| V2AUTH-02 | P1: Fundação de contrato e sessão | Design | Pending |
| V2CORE-01 | P1: Experiência participante V2 | Design | Pending |
| V2CORE-02 | P1: Experiência participante V2 | Design | Pending |
| V2MEDIA-01 | P1: Experiência participante V2 | Design | Pending |
| V2MEDIA-02 | P1: Experiência participante V2 | Design | Pending |
| V2SAFE-01 | P1: Migração segura e limites de responsabilidade | Design | Pending |
| V2SAFE-02 | P1: Migração segura e limites de responsabilidade | Design | Pending |
| V2EXT-01 | P2: Capacidades V2 já suportadas pelo produto | - | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped.

## Success Criteria

- [ ] Todos os fluxos P1 do participante usam V2 sem consultas diretas ao Supabase.
- [ ] Cada escrita V2 é idempotente, e `204`, `409`, timeout e `5xx` possuem comportamento de UI definido.
- [ ] Nenhuma rota legada é desligada sem evidência de tráfego e caminho de rollback.
- [ ] As funcionalidades sem equivalente V2 permanecem explicitamente isoladas e não são removidas por acidente.
