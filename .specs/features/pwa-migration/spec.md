# Migração PWA — Especificação

**Status:** Approved

## Problem Statement

O DNJ Game é uma aplicação mobile-first usada durante um evento, onde a conexão móvel pode oscilar ou desaparecer. Hoje ela depende de carregamento web normal, de uma fonte remota e não possui manifest, service worker, instalação nem contrato explícito de funcionamento offline. A migração deve adicionar essas capacidades sem redesenhar a experiência existente nem trocar desnecessariamente a stack já integrada à Vercel.

## Goals

- [ ] Tornar o DNJ Game instalável como PWA em navegadores compatíveis.
- [ ] Permitir que a aplicação abra após perda de conexão quando já tiver sido carregada online com sucesso.
- [ ] Manter acessível offline o shell, os assets e o conteúdo local seguro necessário para a experiência disponível.
- [ ] Impedir que operações dependentes da API aparentem funcionar ou estar atualizadas quando não houver conexão.
- [ ] Preservar o design existente, inclusive temas, logos, Poppins, animações e responsividade.
- [ ] Entregar e atualizar o service worker com segurança na Vercel.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Migração de Next.js para Vite | Não acrescenta capacidade PWA necessária e amplia o risco de regressão e de deploy. |
| Serwist, Workbox ou `vite-plugin-pwa` | A primeira versão terá escopo pequeno e service worker próprio; a adoção futura depende de necessidade comprovada. |
| Notificações push | Exigem backend, consentimento e política de comunicação próprios. |
| Escritas offline e Background Sync | Exigem modelo de conflitos, idempotência e suporte da API ainda não definidos. |
| Cache offline de respostas autenticadas da API | Pode expor dados, servir conteúdo obsoleto e confundir a integridade da sessão. |
| Redesign ou refatoração ampla de `dnj-app.tsx` | A feature é de plataforma e confiabilidade, não de interface ou arquitetura de telas. |
| Novos endpoints ou novas funcionalidades de negócio | Não são necessários para habilitar a PWA. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Framework | Manter Next.js 16 App Router | Suporte nativo a manifest/service worker, deploy Vercel existente e menor risco | sim |
| Implementação do service worker | Própria e enxuta, sem Serwist | Atende um app de rota única e mantém Turbopack/build atuais simples | sim |
| Público e contexto | Jovens no evento, usando smartphones sob rede instável | Confirmado pelo responsável pelo produto | sim |
| Limite offline | Shell e conteúdo local/seguro disponível após uma abertura online | É útil no evento sem prometer ações de servidor impossíveis offline | sim |
| Dados dinâmicos | Network-only, com estado indisponível/desatualizado explícito | Evita inconsistência e vazamento de dados | sim |
| Instalação customizada | Não criar prompt próprio na primeira versão | O fluxo nativo varia por navegador, especialmente no iOS | sim |
| Atualização da PWA | Não forçar reload no meio de uma sessão | Evita perda de estado e interrupção durante o evento | sim |
| Testes | Criar baseline visual e suíte PWA antes/junto da implementação | O repositório não possui testes automatizados atualmente | sim |

**Open questions:** none — as decisões ainda não confirmadas estão explicitamente propostas como premissas para aprovação neste gate.

---

## User Stories

### P1: Instalar o DNJ Game ⭐ MVP

**User Story**: Como participante do DNJ, quero instalar o DNJ Game no celular para acessá-lo como um aplicativo durante o evento.

**Why P1**: Instalação é a capacidade básica que diferencia a entrega PWA do site atual.

**Acceptance Criteria**:

1. WHEN um navegador compatível carregar a aplicação em HTTPS THEN o sistema SHALL expor um Web App Manifest válido com nome, nome curto, idioma, `start_url`, `scope`, modo `standalone`, cores e ícones exigidos para instalação.
2. WHEN a PWA for instalada no Android THEN o sistema SHALL fornecer PNGs 192×192 e 512×512 e uma variante 512×512 `maskable` cujo símbolo oficial permaneça integralmente dentro da safe zone.
3. WHEN a aplicação for adicionada à Tela de Início no iOS THEN o sistema SHALL fornecer um `apple-touch-icon` PNG 180×180 opaco, nome de aplicativo e metadata de standalone/status bar compatíveis com a identidade DNJ.
4. WHEN a PWA for instalada THEN o sistema SHALL abrir em modo standalone na rota inicial e SHALL usar ícone e identidade DNJ reconhecíveis sem cortes ou deformação.
5. WHEN o navegador não oferecer instalação THEN o sistema SHALL continuar funcionando como aplicação web sem bloquear ou degradar os fluxos existentes.

**Independent Test**: Validar o manifest no build de produção, instalar em um navegador Chromium e abrir pelo ícone gerado.

---

### P1: Abrir sob conectividade instável ⭐ MVP

**User Story**: Como participante que já abriu o aplicativo, quero reabri-lo quando a internet cair para continuar consultando o que estiver disponível localmente.

**Why P1**: Conectividade instável é uma condição central do uso durante o evento.

**Acceptance Criteria**:

1. WHEN a aplicação tiver concluído pelo menos uma carga online e a conexão ficar indisponível THEN uma nova navegação para a rota inicial SHALL carregar o shell da aplicação sem exibir a página genérica de erro de rede do navegador.
2. WHEN a aplicação estiver offline THEN os scripts, estilos, logos e fontes necessários ao shell já carregado SHALL continuar disponíveis.
3. WHEN um recurso estático elegível tiver sido atualizado no deploy THEN o sistema SHALL substituir a entrada antiga segundo a versão do cache sem manter caches órfãos indefinidamente.
4. WHEN for o primeiro acesso do dispositivo e nenhum shell tiver sido armazenado THEN o sistema SHALL falhar de forma explícita e SHALL NOT simular que há conteúdo offline disponível.

**Independent Test**: Carregar a aplicação em produção local, ativar modo offline no navegador, recarregar e verificar o mesmo shell e identidade visual.

---

### P1: Tratar operações que exigem rede com honestidade ⭐ MVP

**User Story**: Como participante offline, quero saber quais dados e ações dependem da internet para não interpretar falhas ou conteúdo antigo como resultado válido.

**Why P1**: Login, verificação, ranking, filas e atualizações não podem ser fabricados nem silenciosamente servidos de cache.

**Acceptance Criteria**:

1. WHEN uma requisição destinada à API externa for realizada THEN o service worker SHALL NOT armazenar nem responder essa requisição a partir de seu cache.
2. WHEN o dispositivo estiver offline e o usuário iniciar uma ação dependente da API THEN o sistema SHALL impedir ou encerrar a tentativa com uma mensagem em português que identifique a falta de conexão.
3. WHEN conteúdo dinâmico não puder ser atualizado THEN o sistema SHALL indicar indisponibilidade ou possível desatualização e SHALL NOT rotulá-lo como atual.
4. WHEN a conexão retornar THEN o sistema SHALL permitir nova tentativa sem exigir limpeza manual de cache ou reinstalação.

**Independent Test**: Interceptar/bloquear a API, exercer login e uma ação de dados e verificar mensagem, ausência de resposta em cache e recuperação após reconexão.

---

### P1: Preservar integralmente o design ⭐ MVP

**User Story**: Como responsável pelo produto, quero que a migração PWA mantenha o design aprovado para que a capacidade técnica não altere a identidade do DNJ Game.

**Why P1**: A implementação atual é uma migração visual 1:1 e não está autorizada a ser redesenhada.

**Acceptance Criteria**:

1. WHEN a versão PWA for comparada à baseline pré-migração THEN as telas e estados existentes SHALL manter layout, cores, tokens, logos, tipografia Poppins, animações, textos e responsividade, exceto pelos novos estados explicitamente aprovados.
2. WHEN os temas claro e escuro forem exercidos online ou offline THEN a aplicação SHALL manter os mesmos tokens, assets e contraste do estado anterior à migração.
3. WHEN `prefers-reduced-motion: reduce` estiver ativo THEN a aplicação SHALL preservar o comportamento reduzido existente.
4. WHEN a aplicação carregar offline THEN a tipografia SHALL manter Poppins e seus pesos usados, sem depender de uma requisição de runtime ao Google Fonts.

**Independent Test**: Comparar screenshots determinísticos antes/depois em viewports móveis representativos, nos temas claro/escuro e nas principais telas.

---

### P1: Atualizar com segurança na Vercel ⭐ MVP

**User Story**: Como participante, quero receber versões novas da aplicação sem ficar preso a arquivos incompatíveis ou perder uma sessão ativa inesperadamente.

**Why P1**: Service workers persistem entre deploys e podem servir combinações inválidas de shell e assets se o ciclo de atualização não for definido.

**Acceptance Criteria**:

1. WHEN a Vercel publicar um novo service worker THEN `/sw.js` SHALL ser servido com tipo JavaScript correto e política que obrigue revalidação, sem cache HTTP prolongado.
2. WHEN uma nova versão for detectada durante uma sessão THEN o sistema SHALL NOT recarregar a página automaticamente no meio da interação.
3. WHEN a nova versão assumir controle THEN caches pertencentes a versões antigas SHALL ser removidos e os caches atuais SHALL permanecer utilizáveis.
4. WHEN shell e chunks pertencerem a versões diferentes THEN o sistema SHALL recuperar uma versão coerente pela rede ou pelo cache e SHALL NOT entrar em loop de reload.

**Independent Test**: Publicar duas builds sequenciais em ambiente de preview/local, manter uma aba antiga aberta e validar atualização, limpeza e recarga segura.

---

### P2: Tornar o comportamento PWA observável

**User Story**: Como mantenedor, quero diagnósticos verificáveis da instalação, cache e atualização para detectar regressões antes do evento.

**Why P2**: A aplicação não possui hoje suíte automatizada ou telemetria específica para service worker.

**Acceptance Criteria**:

1. WHEN o pipeline de validação for executado THEN o sistema SHALL verificar manifest, registro do service worker, abertura offline, exclusão da API do cache e atualização entre versões.
2. WHEN uma falha PWA ocorrer em desenvolvimento THEN o sistema SHALL produzir evidência suficiente no console ou teste para identificar a etapa afetada sem registrar tokens ou dados pessoais.

**Independent Test**: Introduzir uma falha controlada no manifest ou registro do service worker e observar o gate automatizado falhar com causa identificável.

---

## Edge Cases

- WHEN o navegador não suporta service workers THEN a aplicação SHALL continuar operando online como hoje.
- WHEN o usuário limpa os dados do site THEN a próxima abertura offline SHALL se comportar como primeiro acesso, sem assumir caches inexistentes.
- WHEN a API estiver indisponível mas a internet estiver ativa THEN a aplicação SHALL apresentar erro de serviço/conexão e SHALL NOT devolver resposta dinâmica em cache.
- WHEN o modo offline for ativado durante uma animação ou troca de tela THEN a interface SHALL concluir ou reduzir a transição sem travar o shell.
- WHEN o tema estiver escuro antes da perda de conexão THEN a reabertura SHALL preservar o tema conforme a persistência local existente.
- WHEN um asset não tiver sido carregado antes da perda de conexão THEN a aplicação SHALL usar apenas um fallback explicitamente previsto ou indicar indisponibilidade; SHALL NOT bloquear todo o shell.
- WHEN múltiplas abas estiverem abertas durante uma atualização THEN a ativação SHALL manter consistência e SHALL NOT apagar caches ainda necessários pelas abas controladas.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Manifest e caminhos de cache serão validados; não há nova entrada de negócio. |
| Failure / partial-failure states | Offline, API indisponível, asset ausente, primeiro acesso e atualização parcial têm critérios explícitos. |
| Idempotency / retry / duplicate handling | Registro do service worker e limpeza de caches devem ser seguros quando repetidos; ações de API não serão enfileiradas offline. |
| Auth boundaries & rate limits | Respostas autenticadas e tokens não entram no cache do service worker; rate limits da API ficam fora de escopo. |
| Concurrency / ordering | Múltiplas abas e ordem install → activate → claim são cobertas pela estratégia de atualização. |
| Data lifecycle / expiry | Caches são versionados e versões antigas são removidas na ativação; dados dinâmicos não são persistidos pelo service worker. |
| Observability | P2 define gates e diagnóstico sem dados pessoais. |
| External-dependency failure | API e Google Fonts são tratados: API permanece network-only; fonte deixa de depender da rede em runtime. |
| State-transition integrity | Estados online/offline e atualização não podem forçar reload no meio da interação nem simular sucesso. |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PWA-01 | P1: Instalar o DNJ Game | Execute | Implemented — pending verification and real-device UAT |
| PWA-02 | P1: Abrir sob conectividade instável | Execute | Implemented — pending verification |
| PWA-03 | P1: Tratar operações que exigem rede | Execute | Implemented — pending verification |
| PWA-04 | P1: Preservar integralmente o design | Execute | Implemented — pending verification and real-device UAT |
| PWA-05 | P1: Atualizar com segurança na Vercel | Execute | Implemented — pending verification and real-device UAT |
| PWA-06 | P2: Tornar o comportamento observável | Execute | Implemented — pending verification |

**Coverage:** 6 requisitos implementados e mapeados para tarefas; a verificação independente e o UAT físico aplicável permanecem pendentes.

---

## Success Criteria

- [ ] A aplicação passa pelos critérios de instalação PWA em build servido por HTTPS no Android/Chromium e de adição à Tela de Início no iOS/Safari.
- [ ] Depois de uma abertura online, a rota inicial recarrega offline com shell, logos, estilos e Poppins preservados.
- [ ] Nenhuma resposta da API ou credencial aparece no cache do service worker.
- [ ] Todas as ações dependentes de rede testadas apresentam estado offline explícito e recuperam após reconexão.
- [ ] A comparação visual automatizada não encontra mudanças não autorizadas nas telas existentes.
- [ ] Duas versões consecutivas podem ser instaladas/ativadas sem cache órfão, loop de reload ou interrupção forçada da sessão.
- [ ] `npm run typecheck`, `npm run lint` e `npm run build` continuam aprovados.
