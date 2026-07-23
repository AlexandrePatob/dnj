# Plano de evolução do DNJ Game 2K26

**Status:** aprovado para execução por fases  
**Estratégia escolhida:** Plano B — reorganizar, corrigir, validar e então entregar os fluxos  
**Modo de execução:** um único agente, tarefas sequenciais e commits atômicos  
**Última atualização:** 22 de julho de 2026

---

## 1. Objetivo

Evoluir o DNJ Game para uma experiência mobile-first funcional durante o evento, preservando a identidade visual existente e preparando contratos claros para o backend.

O trabalho deve entregar:

- código React/Next modular no lugar do componente monolítico atual;
- correção das safe areas do iPhone;
- Conta mais intuitiva;
- scanner de QR Code grande e funcional;
- participação ativa com cooldown;
- captura e compartilhamento de fotos;
- pontuação associada a uma participação válida;
- Galeria DNJ geral e pessoal;
- marca d'água DNJ para compartilhamento;
- mocks completos para experimentar todos os fluxos antes da API real;
- especificação OpenAPI/Swagger simples para orientar o backend;
- plano separado para Web Push.

## 2. Decisões confirmadas

1. O projeto continua em Next.js 16, React 19 e Vercel.
2. A identidade visual atual do DNJ será preservada.
3. A reorganização será mecânica antes de qualquer redesign.
4. O Plano B será entregue em fases verticais e verificáveis.
5. Os fluxos serão mockados antes da integração real.
6. A API esperada será documentada em OpenAPI 3.1, sem infraestrutura complexa.
7. O frontend não confiará no cliente para conceder pontos, validar QR, hora ou local na API definitiva.
8. As fotos aparecerão imediatamente em **Meus registros**; a publicação na galeria geral terá estado de moderação.
9. Pontos de foto serão concedidos uma única vez após o envio ser concluído.
10. O cooldown será devolvido pelo backend por meio de `cooldownEndsAt`.
11. Não serão usados múltiplos agentes. A verificação final será uma revisão isolada de “fresh eyes” pelo mesmo agente.

## 3. Fora do escopo inicial

- Comentários e chat na galeria.
- Reações ou curtidas na primeira versão.
- Edição avançada de imagens.
- Reconhecimento facial.
- Upload offline em background.
- Substituição completa da navegação por rotas Next durante a primeira modularização.
- Backend social definitivo dentro do Next.
- Garantia de que uma notificação foi visualizada por todos.

## 4. Diagnóstico atual

- `src/components/dnj-app.tsx` concentra telas, navegação, estado, fixtures e integrações.
- O scanner atual é uma simulação visual; não acessa nem interpreta a câmera.
- O botão de scanner é pequeno e secundário.
- A navegação inferior possui altura fixa e não incorpora `safe-area-inset-bottom`.
- A tela Conta apresenta dados e opções em uma lista com pouca hierarquia.
- Algumas opções da Conta aparentam ser interativas, mas não possuem fluxo real.
- Pontos, ranking, missões, mapa e filas ainda usam mocks em diferentes níveis.
- O projeto já possui testes unitários, Playwright, snapshots visuais e gate de validação.
- O service worker possui política restritiva e não deve cachear APIs autenticadas ou uploads.

## 5. Princípios de implementação

### 5.1 Preservação antes de evolução

Cada componente será extraído sem mudanças de aparência ou comportamento. Um redesign só pode começar depois que a extração correspondente passar pelos testes e pela comparação visual.

### 5.2 Dependência por contrato

As telas não saberão se os dados vêm de mocks, Route Handlers do Next ou API real.

```text
Tela / hook
    ↓
Contrato de domínio
    ↓
Repository / service
    ├── implementação mock
    └── implementação HTTP real
```

### 5.3 Dados honestos

- Dados dinâmicos offline serão indicados como salvos e somente leitura.
- Upload, check-in e pontuação exigirão conexão.
- O relógio do cliente será usado apenas para renderizar o contador, nunca como autoridade.
- Local e hora virão do QR validado e do servidor na API definitiva.

### 5.4 Performance

- Scanner, decoder de QR, câmera, editor de preview e lightbox serão carregados dinamicamente.
- Bibliotecas pesadas não entrarão no bundle inicial.
- Streams da câmera e valores transitórios ficarão em `useRef`.
- Estado derivável será calculado durante renderização, sem efeitos redundantes.
- Imports serão diretos; não serão criados barrel files genéricos.

## 6. Arquitetura alvo

```text
src/
├── app/
│   ├── api/
│   │   └── mock/v1/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── bottom-nav.tsx
│   │   └── top-bar.tsx
│   └── ui/
│       ├── empty-state.tsx
│       ├── segmented-tabs.tsx
│       └── status-badge.tsx
├── features/
│   ├── account/
│   ├── auth/
│   ├── gallery/
│   ├── game/
│   ├── home/
│   ├── participation/
│   ├── queue/
│   └── scanner/
├── hooks/
├── lib/
│   ├── api/
│   ├── mocks/
│   ├── repositories/
│   └── storage/
└── types/
```

### Limites importantes

- `DnjApp` permanece como orquestrador durante a primeira reorganização.
- Cada feature possui tela, componentes locais, hooks e testes próprios.
- Componentes compartilhados só entram em `components/ui` quando usados por mais de uma feature.
- Tipos de DTO da API não serão importados diretamente pelas telas.
- Mappers convertem DTOs externos para modelos de domínio.

## 7. Estratégia de mocks

### 7.1 Camada mock do domínio

Criar interfaces equivalentes à API esperada:

- `ParticipationRepository`
- `MomentRepository`
- `GalleryRepository`
- `NotificationRepository`, somente na fase de Push

As implementações mock devem simular:

- latência configurável;
- sucesso;
- offline;
- timeout;
- QR inválido;
- QR expirado;
- QR duplicado;
- cooldown ativo;
- falha no upload;
- galeria vazia;
- paginação;
- foto aguardando moderação;
- foto publicada;
- foto recusada.

### 7.2 Route Handlers temporários do Next

Usar `/api/mock/v1/*` para simular o comportamento HTTP esperado. Esses handlers não devem conter regras de UI.

Eles servirão para:

- reproduzir status HTTP;
- testar payloads e validação;
- simular autenticação;
- exercitar o cliente HTTP real;
- permitir que o backend use os mesmos exemplos de contrato.

### 7.3 Persistência local

- Fixtures públicas: arquivos TypeScript/JSON versionados.
- Preferências pequenas: `localStorage` versionado.
- Fotos e registros pessoais mockados: IndexedDB.
- Nenhum token, CPF ou foto será incluído no snapshot offline público.
- Memória de Route Handler não será considerada persistência.

### 7.4 Seleção de fonte de dados

```env
NEXT_PUBLIC_DATA_SOURCE=mock
# ou
NEXT_PUBLIC_DATA_SOURCE=api
```

A troca deve acontecer na composição dos repositories, não dentro dos componentes.

## 8. OpenAPI / Swagger

### Entrega mínima

Criar:

```text
docs/api/dnj-experience.openapi.yaml
docs/api/README.md
```

O YAML será OpenAPI 3.1 e poderá ser aberto diretamente no Swagger Editor. Não é necessário hospedar Swagger UI inicialmente.

### Convenções

- Base real: `/v1`.
- Base mock Next: `/api/mock/v1`.
- Autenticação por cookie HttpOnly e/ou Bearer conforme o contrato atual.
- Datas em ISO 8601 UTC.
- Erro padronizado com `code`, `message` e `details` opcional.
- Paginação por cursor.
- `Idempotency-Key` obrigatório em check-in, criação de momento e concessão de pontos.

### Endpoints planejados

#### `POST /qr/validate`

Valida um QR e cria ou recupera uma participação idempotente.

Request:

```json
{
  "qrToken": "opaque-token",
  "idempotencyKey": "uuid"
}
```

Response `200`:

```json
{
  "participation": {
    "id": "part_123",
    "event": { "id": "event_1", "name": "DNJ Curitiba 2026" },
    "activity": { "id": "activity_1", "name": "Espaço Juventude" },
    "place": { "id": "place_1", "name": "Espaço Juventude" },
    "checkedInAt": "2026-10-18T17:32:00Z",
    "cooldownEndsAt": "2026-10-18T17:47:00Z",
    "status": "active",
    "canShareMoment": true,
    "checkInPoints": 20
  }
}
```

Erros esperados:

- `400 QR_INVALID`
- `401 UNAUTHENTICATED`
- `409 QR_ALREADY_USED`
- `409 COOLDOWN_ACTIVE`
- `410 QR_EXPIRED`
- `429 RATE_LIMITED`

#### `GET /participations/current`

Restaura a badge ativa após reload.

Retorna participação ativa ou `204` quando não existe.

#### `POST /moments`

Cria um momento usando `multipart/form-data` para manter a primeira versão simples.

Campos:

- `participationId`
- `image`
- `publishConsent`
- `idempotencyKey`

Response `201`:

```json
{
  "moment": {
    "id": "moment_123",
    "participationId": "part_123",
    "imageUrl": "https://...",
    "thumbnailUrl": "https://...",
    "shareImageUrl": "https://...",
    "placeName": "Espaço Juventude",
    "capturedAt": "2026-10-18T17:35:00Z",
    "moderationStatus": "pending",
    "publicationStatus": "private",
    "pointsAwarded": 30
  }
}
```

Erros esperados:

- `400 IMAGE_INVALID`
- `401 UNAUTHENTICATED`
- `403 PARTICIPATION_REQUIRED`
- `409 MOMENT_ALREADY_CREATED`
- `413 IMAGE_TOO_LARGE`
- `422 CONSENT_REQUIRED`
- `429 RATE_LIMITED`

#### `GET /gallery`

Query:

- `cursor`
- `limit`
- `eventId`
- `placeId`, opcional

Retorna apenas momentos públicos e aprovados.

#### `GET /gallery/mine`

Retorna registros do usuário, inclusive `pending`, `approved` e `rejected`.

#### `DELETE /moments/{momentId}`

Remove ou solicita remoção de um registro pertencente ao usuário.

### Regras esperadas do backend

- Pontos são concedidos no servidor e apenas uma vez.
- Check-in e momento são idempotentes.
- QR é opaco ou assinado e validado no servidor.
- Local e hora não são aceitos do cliente.
- Upload valida MIME real, extensão, tamanho e dimensões.
- Metadados EXIF sensíveis são removidos.
- Original privado, thumbnail e versão compartilhável possuem URLs distintas.
- Fotos públicas passam por moderação.
- Uma participação expirada não cria novos momentos.
- Assinaturas e tentativas inválidas são observáveis em logs/métricas.

## 9. Experiência planejada

### 9.1 Safe area do iPhone

- Configurar `viewport-fit: cover`.
- Incorporar `env(safe-area-inset-top)` no topo instalado.
- Incorporar `env(safe-area-inset-bottom)` na navegação inferior.
- Definir uma única variável para altura visual da nav + safe area.
- Recalcular padding das telas, badge, scanner e avisos PWA.
- Validar Safari, modo standalone, teclado e aparelhos com/sem indicador inferior.

Critério de aceite: nenhum controle fica atrás da barra preta, notch ou cantos arredondados.

### 9.2 Conta

Ordem visual:

1. Identidade: avatar, nome e grupo.
2. Participação: pontos, ranking e número de registros.
3. Meus dados: e-mail, CPF mascarado e grupo.
4. Preferências realmente funcionais.
5. Privacidade e consentimento da galeria.
6. Sair da conta, isolado e com confirmação.

Não manter botões com chevron que não levam a lugar algum.

### 9.3 Scanner

- Card grande “Escanear QR Code” no início de Meus Pontos.
- Câmera em tela cheia com preferência pela câmera traseira.
- Decoder carregado apenas ao abrir o scanner.
- Fallback “Ler QR de uma imagem”.
- Parar todas as tracks ao fechar, concluir ou navegar.
- Estados: permissão, negado, indisponível, lendo, inválido, expirado, duplicado, cooldown, offline e sucesso.

Não depender exclusivamente de `BarcodeDetector`; usar biblioteca com fallback compatível.

### 9.4 Participação ativa

A badge fixa aparece acima da navegação com:

- “Você está participando”;
- nome da atividade/local;
- horário de entrada;
- contador regressivo;
- ação “Compartilhar momento”.

O contador é derivado de `cooldownEndsAt`. Ao zerar, muda para “Pronto para escanear novamente”.

### 9.5 Captura e momento

```text
QR válido
  → participação ativa
  → Compartilhar momento
  → câmera ou arquivo
  → preview
  → consentimento
  → envio
  → Meus registros
  → pontos
  → moderação para galeria geral
```

Estados mínimos:

- selecionando;
- preview;
- enviando;
- sucesso;
- falha recuperável;
- aguardando moderação;
- publicado;
- recusado.

### 9.6 Marca d'água

- Preservar imagem original.
- Gerar versão de compartilhamento separada.
- Incluir logo DNJ, local, data e hora.
- Primeira versão pode usar Canvas no cliente.
- API definitiva pode gerar uma versão oficial no servidor.
- Usar `navigator.canShare()` e `navigator.share()` quando houver suporte.
- Fallback para download da imagem pronta.

### 9.7 Galeria DNJ

Navegação principal com cinco itens:

- Início
- Jogo
- Fila
- Galeria
- Conta

“DNJ Game” pode ser encurtado para “Jogo” apenas na barra.

A Galeria possui duas abas:

- **Galeria:** mural vivo do evento, fotos aprovadas agrupadas por momento/local.
- **Meus registros:** grade pessoal inspirada em passaporte, incluindo estados de moderação.

Comportamentos:

- paginação por cursor;
- skeleton;
- vazio;
- erro com retry;
- offline honesto;
- imagem ampliada em lightbox;
- swipe entre imagens;
- compartilhar versão com marca d'água;
- remoção do próprio registro.

## 10. Web Push

### Não vem automaticamente com a PWA

A PWA fornece service worker e manifest, mas Web Push ainda exige:

- permissão do usuário;
- `PushSubscription`;
- armazenamento da assinatura;
- chaves VAPID;
- serviço servidor de envio;
- tratamento de `push` e `notificationclick` no service worker;
- limpeza de assinaturas expiradas;
- métricas.

No iPhone, o app precisa estar adicionado à Tela de Início e a permissão deve ser solicitada após uma ação explícita do usuário.

### Quem envia

Qualquer backend pode enviar. Não precisa ser o Next.

Estratégia:

- Mock/teste: Route Handlers Next.
- Produção inicial pequena: função Node protegida.
- Grandes campanhas: backend oficial ou fila durável.
- Agendamento: Cron apenas como gatilho, com idempotência e mecanismo de retry separado.

### O que é possível medir

- audiência selecionada;
- usuários com assinatura ativa;
- envios tentados;
- mensagens aceitas pelo push service;
- endpoints inválidos;
- receipt best-effort do service worker;
- cliques em `notificationclick`;
- abertura da tela de destino.

Não é possível afirmar com certeza que toda notificação foi exibida ou lida.

### Endpoints futuros

- `POST /push/subscriptions`
- `DELETE /push/subscriptions/{subscriptionId}`
- `POST /push/campaigns`, administrativo
- `POST /push/receipts`, best-effort
- `GET /push/campaigns/{campaignId}/metrics`, administrativo

Push será uma trilha posterior à galeria e não bloqueará a experiência principal.

## 11. Plano de execução

### Fase 0 — Baseline e proteção

- [ ] P0-01 Registrar status atual, alterações preexistentes e arquivos que não podem ser sobrescritos.
- [ ] P0-02 Executar typecheck, lint, unitários, build, e2e e visual para estabelecer o baseline real.
- [ ] P0-03 Registrar screenshots de Home, Game, Fila e Conta em 360×800 e 430×932.
- [ ] P0-04 Criar a especificação formal da modularização com critérios de equivalência.
- [ ] P0-05 Confirmar que nenhuma atualização automática de snapshot fará parte da refatoração.

Gate: todos os resultados documentados; falhas preexistentes separadas de regressões.

### Fase 1 — Modularização mecânica

- [ ] R1-01 Extrair tipos, constantes e fixtures do `dnj-app.tsx`.
- [ ] R1-02 Extrair componentes UI realmente compartilhados.
- [ ] R1-03 Extrair `AppShell`, `TopBar` e `BottomNav` sem mudar estilos.
- [ ] R1-04 Extrair o fluxo de autenticação e cadastro.
- [ ] R1-05 Extrair Home.
- [ ] R1-06 Extrair Game, mantendo scanner visual atual.
- [ ] R1-07 Extrair Fila.
- [ ] R1-08 Extrair Conta.
- [ ] R1-09 Reduzir `DnjApp` à composição, sessão e navegação.
- [ ] R1-10 Confirmar equivalência visual completa.

Gate por tarefa: testes co-localizados, typecheck, lint, unitários relevantes e snapshot sem diferença não aprovada.

### Fase 2 — Correções prioritárias

- [x] C2-01 Corrigir viewport e safe areas.
- [x] C2-02 Tornar BottomNav adaptável a cinco itens e safe area.
- [x] C2-03 Ajustar padding de todas as telas e elementos fixos.
- [x] C2-04 Redesenhar Conta com hierarquia e ações honestas.
- [x] C2-05 Criar CTA grande do scanner.
- [x] C2-06 Deixar validação visual manual iPhone/WebKit e Android para o usuário; snapshots não executados.
- [ ] C2-07 Executar checklist manual em iPhone real.

Gate: correções aprovadas em unitários, e2e, snapshots e aparelho real quando disponível.

### Fase 3 — Domínio, mocks e Swagger

- [x] M3-01 Definir modelos de participação, momento, galeria e erros.
- [x] M3-02 Definir interfaces de repositories.
- [x] M3-03 Criar fixtures realistas do evento.
- [x] M3-04 Criar motor de cenários mock e latência.
- [x] M3-05 Criar repositories mock.
- [x] M3-06 Criar Route Handler de participação atual.
- [x] M3-07 Criar Route Handler de momentos.
- [ ] M3-08 Criar Route Handlers de galeria geral e pessoal.
- [ ] M3-09 Criar persistência IndexedDB para registros mockados.
- [ ] M3-10 Criar `docs/api/dnj-experience.openapi.yaml`.
- [ ] M3-11 Validar exemplos do Swagger contra responses dos mocks.

Gate: todo endpoint possui happy path, erro, autenticação e teste de contrato.

### Fase 4 — Scanner e participação

- [ ] S4-01 Fazer spike controlado das bibliotecas de QR em Chrome e WebKit.
- [ ] S4-02 Implementar câmera e lifecycle do stream.
- [ ] S4-03 Implementar decoder e fallback por arquivo.
- [ ] S4-04 Integrar validação QR mockada.
- [ ] S4-05 Implementar todos os estados de permissão e erro.
- [ ] S4-06 Implementar badge de participação.
- [ ] S4-07 Implementar cooldown derivado do servidor.
- [ ] S4-08 Restaurar participação após reload.
- [ ] S4-09 Bloquear ações online quando offline.

Gate: fluxo completo demonstrável em câmera real, QR válido/inválido, reload, cooldown e offline.

### Fase 5 — Momentos e Galeria

- [ ] G5-01 Implementar captura/seleção e preview.
- [ ] G5-02 Implementar consentimento de publicação.
- [ ] G5-03 Implementar envio mock e retry.
- [ ] G5-04 Implementar concessão mock idempotente de pontos.
- [ ] G5-05 Implementar marca d'água.
- [ ] G5-06 Implementar compartilhamento e download fallback.
- [ ] G5-07 Implementar tela Galeria e paginação.
- [ ] G5-08 Implementar Meus registros e estados de moderação.
- [ ] G5-09 Implementar lightbox e swipe.
- [ ] G5-10 Adicionar Galeria à navegação principal.
- [ ] G5-11 Integrar resumo de registros à Conta.

Gate: jornada QR → foto → pontos → Meus registros → Galeria → compartilhar totalmente demonstrável.

### Fase 6 — Integração com backend real

- [ ] A6-01 Validar Swagger com a equipe backend.
- [ ] A6-02 Implementar `ParticipationApiRepository`.
- [ ] A6-03 Implementar `MomentApiRepository`.
- [ ] A6-04 Implementar `GalleryApiRepository`.
- [ ] A6-05 Executar testes de contrato mock versus API.
- [ ] A6-06 Trocar fonte por ambiente, sem alterar telas.
- [ ] A6-07 Executar UAT completo em staging.

Gate: mesmos testes de comportamento passam com `mock` e `api`.

### Fase 7 — Web Push, posterior

- [ ] N7-01 Especificar preferências e casos de uso de notificação.
- [ ] N7-02 Implementar opt-in contextual.
- [ ] N7-03 Persistir subscriptions.
- [ ] N7-04 Implementar push e notification click no service worker.
- [ ] N7-05 Implementar envio de teste protegido.
- [ ] N7-06 Implementar métricas por etapa.
- [ ] N7-07 Validar Android, iOS instalado e revogação de permissão.

## 12. Dependências entre fases

```text
Fase 0
  ↓
Fase 1 — modularização
  ↓
Fase 2 — correções
  ↓
Fase 3 — domínio, mocks e Swagger
  ↓
Fase 4 — scanner e participação
  ↓
Fase 5 — momentos e galeria
  ↓
Fase 6 — backend real
  ↓
Fase 7 — push
```

Não iniciar uma fase se o gate anterior tiver regressão não explicada.

## 13. Requisitos rastreáveis

| ID | Requisito | Prioridade |
|---|---|---|
| ARCH-01 | Modularizar sem regressão visual ou funcional | P1 |
| IOS-01 | Navegação respeita safe areas | P1 |
| ACC-01 | Conta possui hierarquia e ações intuitivas | P1 |
| SCAN-01 | Scanner abre a câmera e lê QR | P1 |
| SCAN-02 | Scanner trata permissões e erros | P1 |
| PART-01 | QR válido cria participação | P1 |
| PART-02 | Badge restaura e mostra cooldown | P1 |
| MOM-01 | Participante captura e envia foto | P1 |
| MOM-02 | Pontos são idempotentes | P1 |
| GAL-01 | Galeria geral mostra aprovados | P1 |
| GAL-02 | Meus registros mostra todos os estados | P1 |
| SHARE-01 | Compartilhamento usa marca d'água | P1 |
| MOCK-01 | Jornada completa funciona sem backend | P1 |
| API-01 | Swagger descreve contratos e erros | P1 |
| PUSH-01 | Usuário pode optar por Web Push | P2 |
| PUSH-02 | Operação mede envio e abertura sem prometer leitura | P2 |

## 14. Matriz de testes

| Camada | Teste | Expectativa | Comando |
|---|---|---|---|
| Regras de domínio | Unitário | Todos os branches, cooldown, estados e idempotência | `npm run test:unit` |
| Componentes | Unitário | Estados principais, erro, acessibilidade e ações | `npm run test:unit` |
| Route Handlers mock | Integração/unitário | Happy path, erro, autenticação e payload | `npm run test:unit` |
| Fluxos completos | Playwright | QR, participação, foto, galeria e Conta | `npm run test:e2e` |
| Safe area/PWA | Playwright + manual | WebKit, standalone e aparelho real | `npm run test:pwa` |
| Aparência | Snapshot visual | 360×800 e 430×932, claro/escuro | `npm run test:visual` |
| Gate total | Completo | Tipos, lint, unit, build e Playwright | `npm run validate` |

Testes são escritos junto com a tarefa que altera a camada; não existe fase posterior exclusiva para “adicionar testes”.

## 15. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Refatorar e redesenhar ao mesmo tempo | Regressão difícil de localizar | Separar Fase 1 e Fase 2 |
| Atualizar snapshots indiscriminadamente | Ocultar regressões | Revisar cada diferença visual |
| Biblioteca de QR pesada | Bundle inicial pior | Dynamic import e spike comparativo |
| Safari interromper câmera | Scanner travado | Cleanup rigoroso e testes WebKit/reais |
| Usar memória do Next como banco | Dados desaparecem | IndexedDB no mock; backend real depois |
| Cliente conceder pontos | Fraude/duplicidade | Autoridade no servidor e idempotência |
| Fotos públicas sem consentimento | Risco de privacidade | Consentimento, moderação e remoção |
| Upload muito grande | Falha e custo | Compressão/limites e feedback |
| Cachear resposta privada | Vazamento | Manter allowlist restritiva do service worker |
| Push em massa por função simples | Timeout e perdas | Fila durável, retry e idempotência |

## 16. Definition of Done global

Uma entrega só está concluída quando:

- [ ] requisitos da tarefa estão cobertos por testes;
- [ ] typecheck passa;
- [ ] lint passa;
- [ ] testes unitários passam;
- [ ] build passa;
- [ ] testes browser relevantes passam;
- [ ] diferenças visuais foram revisadas;
- [ ] estados de loading, vazio, erro, offline e sucesso foram tratados;
- [ ] acessibilidade não depende apenas de cor;
- [ ] `prefers-reduced-motion` continua respeitado;
- [ ] câmera/URLs/listeners são liberados no cleanup;
- [ ] documentação foi atualizada;
- [ ] tarefa possui commit atômico;
- [ ] alterações preexistentes do usuário foram preservadas.

## 17. Como retomar o trabalho

Ao iniciar uma nova sessão:

1. Ler este documento.
2. Ler `.specs/STATE.md` e as decisões ativas.
3. Executar `git status --short` e não sobrescrever alterações preexistentes.
4. Identificar a primeira checkbox pendente da fase ativa.
5. Implementar somente essa tarefa e seus testes.
6. Executar o gate definido.
7. Fazer um commit atômico.
8. Atualizar a checkbox e registrar desvios.
9. Continuar sequencialmente, sempre com um único agente.

---

## Referências técnicas

- [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [WebKit — Web Push em iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [MDN — MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN — BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)
- [MDN — CSS env() e safe areas](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [MDN — Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel — Queues](https://vercel.com/docs/queues)

