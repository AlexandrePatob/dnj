# Migração PWA — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/pwa-migration/design.md`  
**Status**: Approved — Execute authorized

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `README.md` (typecheck, lint e build) e `package.json` (comandos existentes). O repositório não possui testes, configuração de cobertura ou CI; a estratégia Vitest + Playwright Chromium/WebKit + UAT real foi aprovada pelo usuário, e os strong defaults do TLC foram aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Política de cache, snapshot e scripts PWA | unit | Todos os branches; mapeamento 1:1 aos ACs aplicáveis; corrupção, quota, revisão e entradas proibidas | `src/**/*.test.ts`, `scripts/**/*.test.ts` | `npm run test:unit` |
| Hooks e componentes client PWA | unit (jsdom/RTL) | Estados suportado/não suportado, online/offline, eventos, cleanup, erro, update waiting e recarga única | `src/**/*.test.tsx` | `npm run test:unit` |
| Manifest, metadata e assets instaláveis | unit + build integration | Todos os campos obrigatórios; dimensões/MIME/opacidade/safe zone; links Apple; referências existentes | `src/app/**/*.test.ts`, `scripts/**/*.test.ts` | `npm run test:unit && npm run build` |
| Service worker no navegador | e2e | Install/activate/fetch/message; shell offline; allowlist; API network-only; cleanup e duas revisões | `tests/pwa/**/*.spec.ts` | `npm run test:pwa` |
| Fluxos e design existentes | visual e2e | Login, home, game, queue e account; claro/escuro; viewports móveis; nenhuma diferença fora de estados novos | `tests/visual/**/*.spec.ts` | `npm run test:visual` |
| Integração completa Next.js/Vercel-like | e2e | Manifest, registro, offline após warmup, reconexão, update, headers e fallback em Chromium/WebKit | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |
| Config, documentação e arquivos gerados | none | Typecheck, lint, build e suíte completa; nenhum artefato gerado desatualizado | — | `npm run validate` |
| Dispositivos reais Android/iOS | manual UAT | Instalação, ícone sem corte, standalone, tema/status bar, abertura offline e atualização | `.specs/features/pwa-migration/validation.md` | checklist UAT durante Validate |

## Gate Check Commands

> Generated from codebase and approved test strategy. T1 materializa os scripts abaixo; antes de T1, permanecem válidos os gates existentes `npm run typecheck`, `npm run lint` e `npm run build`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após módulos, hooks, componentes e scripts cobertos por unit tests | `npm run test:unit` |
| PWA | Após service worker, registro, manifest, offline e atualização | `npm run test:pwa` |
| Visual | Após qualquer alteração em layout, fonte, assets renderizados ou `DnjApp` | `npm run test:visual` |
| Full | Após integração browser/Next.js | `npm run test:unit && npm run test:e2e && npm run test:visual` |
| Build | Após fase, config, metadata, assets ou documentação final | `npm run validate` |

### Planned npm scripts

```json
{
  "test:unit": "vitest run",
  "test:pwa": "npm run build && playwright test tests/pwa --project=chromium",
  "test:e2e": "npm run build && playwright test tests/e2e --project=chromium --project=webkit",
  "test:visual": "npm run build && playwright test tests/visual --project=visual-chromium",
  "validate": "npm run typecheck && npm run lint && npm run test:unit && npm run build && playwright test"
}
```

Playwright usa `next start` como `webServer`; testes que exigem service worker nunca rodam contra `next dev`. WebKit valida comportamento e metadata compatíveis com Safari, mas não substitui UAT em iPhone/iPad real.

---

## Execution Plan

As fases e tasks executam estritamente em sequência.

### Phase 1: Quality Baseline and Installable Assets

```text
T1 → T2 → T3
```

### Phase 2: PWA Foundation

```text
T4 → T5 → T6 → T7 → T8 → T9
```

### Phase 3: Runtime Integration

```text
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Release Documentation

```text
T15
```

### Phase Execution Map

```text
Phase 1 → Phase 2 → Phase 3 → Phase 4

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15
```

Com 15 tasks, as fases formam três batches naturais para uma futura execução assistida: Phase 1 (3), Phase 2 (6), Phases 3–4 (6). O TLC deverá oferecer subagentes antes de Execute; nenhum será iniciado sem autorização explícita.

---

## Task Breakdown

### T1: Add the automated test foundation

**Status**: ✅ Complete — `8139546`

**What**: Instalar e configurar Vitest, Testing Library e Playwright, criar os scripts aprovados e estabelecer servidores/projetos de teste determinísticos.  
**Where**: `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `tests/setup/`  
**Depends on**: None  
**Reuses**: Scripts `dev`, `build`, `start`, `lint` e `typecheck` existentes.  
**Requirement**: PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Dependências de teste estão fixadas no lockfile.
- [ ] Vitest usa ambiente Node por padrão e jsdom apenas para testes React.
- [ ] Playwright define Chromium, WebKit e `visual-chromium`, com `next start` e dados/movimento determinísticos.
- [ ] Scripts `test:unit`, `test:pwa`, `test:e2e`, `test:visual` e `validate` existem exatamente como contratos do projeto.
- [ ] Um smoke test de cada runner passa; total esperado: 2 testes.
- [ ] Gate passa: `npm run validate`.

**Tests**: none — infraestrutura de teste; smoke tests validam o runner, não código de produção.  
**Gate**: build  
**Commit**: `test(pwa): add vitest and playwright foundation`

---

### T2: Capture the pre-migration visual baseline

**Status**: ✅ Complete — `91f7803`

**What**: Criar fixtures de navegação e screenshots determinísticos da interface atual antes de qualquer mudança visual.  
**Where**: `tests/visual/dnj-baseline.spec.ts`, `tests/visual/__snapshots__/`, helpers sob `tests/fixtures/`  
**Depends on**: T1  
**Reuses**: Modo mock atual, telas e temas existentes, `prefers-reduced-motion`.  
**Requirement**: PWA-04, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Baseline cobre login, home, game, queue e account.
- [ ] Home e account cobrem temas claro e escuro.
- [ ] Viewports incluem 360×800 e 430×932.
- [ ] Animações, relógios e dados são estabilizados sem alterar o código produtivo.
- [ ] Exatamente 8 cenários visuais passam e os snapshots iniciais são versionados.
- [ ] Gate passa: `npm run test:visual`.

**Tests**: visual e2e — 8 cenários.  
**Gate**: visual  
**Commit**: `test(visual): capture dnj pre-pwa baseline`

---

### T3: Generate and validate Android/iOS installable assets

**Status**: ✅ Complete — `22cea60`

**What**: Criar pipeline reprodutível com Sharp e encoder ICO para derivar os assets instaláveis oficiais de Android, iOS e favicon sem deformação ou corte da marca.  
**Where**: `scripts/generate-pwa-icons.mjs`, `scripts/generate-pwa-icons.test.ts`, `public/icons/`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`  
**Depends on**: T2  
**Reuses**: `src/assets/brand/DNJ_geral.png` e paleta oficial; não altera assets usados nas telas.  
**Requirement**: PWA-01, PWA-04, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Android possui PNGs 192×192, 512×512 e maskable 512×512 distintos.
- [ ] O conteúdo essencial do maskable permanece dentro do círculo seguro central de raio 40%.
- [ ] iOS possui `apple-icon.png` 180×180 opaco e sem cantos arredondados embutidos.
- [ ] `icon.png` e favicon multirresolução são legíveis e derivados da mesma composição oficial.
- [ ] O script é determinístico e falha se a fonte estiver ausente ou tiver formato inesperado.
- [ ] 7 unit/integration tests validam dimensões, MIME, opacidade, proporção, safe zone, arquivos e determinismo.
- [ ] Gate passa: `npm run test:unit && npm run build`.

**Tests**: unit + build integration — 7 testes.  
**Gate**: build  
**Commit**: `feat(pwa): add android and ios icon assets`

---

### T4: Add manifest and platform metadata

**Status**: ✅ Complete — `dcc4457`

**What**: Criar o manifest App Router e completar metadata para Android, iOS, standalone, theme colors e ícones corretos.  
**Where**: `src/app/manifest.ts`, `src/app/manifest.test.ts`, `src/app/layout.tsx`  
**Depends on**: T3  
**Reuses**: Título, descrição, idioma, viewport e cores já definidos em `layout.tsx` e `PRODUCT.md`.  
**Requirement**: PWA-01, PWA-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Manifest contém `name`, `short_name`, `description`, `lang`, `start_url`, `scope`, `display`, `background_color`, `theme_color` e orientation adequada.
- [ ] Entradas 192/512 usam `purpose: "any"`; maskable referencia apenas o arquivo preparado.
- [ ] Metadata Apple contém `capable`, título e `statusBarStyle`; Next gera `apple-touch-icon` correto.
- [ ] Analytics, Speed Insights, viewport claro/escuro e idioma atuais permanecem intactos.
- [ ] 6 testes validam campos, paths, purposes, tamanhos, metadata Apple e inexistência de referências ausentes.
- [ ] Gate passa: `npm run test:unit && npm run build`.

**Tests**: unit + build integration — 6 testes.  
**Gate**: build  
**Commit**: `feat(pwa): add manifest and platform metadata`

---

### T5: Self-host Poppins through Next.js

**Status**: ✅ Complete — `bf3027c`

**What**: Remover a dependência runtime do Google Fonts e servir exatamente os pesos atuais de Poppins pelo build do Next.js.  
**Where**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/theme.css`  
**Depends on**: T4  
**Reuses**: Variável `--font-sans`, pesos 300–800 e baseline visual atual.  
**Requirement**: PWA-02, PWA-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `@import` de `fonts.googleapis.com` foi removido.
- [ ] `next/font/google` gera variável local usada por `--font-sans` com pesos 300–800.
- [ ] Nenhuma requisição a Google Fonts ocorre em produção.
- [ ] Os 8 cenários da baseline visual continuam passando sem atualização não justificada.
- [ ] Gate passa: `npm run typecheck && npm run lint && npm run test:visual`.

**Tests**: visual e2e — os mesmos 8 cenários devem permanecer aprovados.  
**Gate**: visual  
**Commit**: `perf(font): self-host poppins for offline use`

---

### T6: Define the cache allowlist policy

**Status**: ✅ Complete — `d0979a4`

**What**: Implementar funções puras que classifiquem requests e URLs em navegação, static Next, asset local ou network-only.  
**Where**: `src/pwa/cache-policy.ts`, `src/pwa/cache-policy.test.ts`  
**Depends on**: T5  
**Reuses**: AD-002 e paths definidos no manifest/assets.  
**Requirement**: PWA-02, PWA-03, PWA-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Apenas GET same-origin explicitamente reconhecido pode ser cacheado.
- [ ] `Authorization`, `/v1/**`, cross-origin, analytics, opaque/error e métodos não GET são network-only.
- [ ] Navegação e `/_next/static/**` recebem estratégias diferentes.
- [ ] Extensões e destinations de imagem/fonte/manifest são restritas aos conjuntos aprovados.
- [ ] 12 unit tests cobrem todos os branches e casos de segurança.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit — 12 testes.  
**Gate**: quick  
**Commit**: `feat(pwa): define safe cache policy`

---

### T7: Implement the versioned service worker source

**Status**: ✅ Complete — `997ebfd`

**What**: Implementar install, activate, fetch e message no worker TypeScript usando a política compartilhada e caches prefixados/versionados.  
**Where**: `src/pwa/sw.ts`, `src/pwa/sw.test.ts`  
**Depends on**: T6  
**Reuses**: Classificação e invariantes de `cache-policy.ts`; manifest/icons da T4.  
**Requirement**: PWA-02, PWA-03, PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Install armazena shell mínimo e não chama `skipWaiting()` automaticamente.
- [ ] Activate remove somente caches `dnj-pwa-*` antigos e preserva o atual.
- [ ] Navegação usa network-first com fallback; static/assets allowlisted usam cache-first.
- [ ] `CACHE_URLS` revalida cada URL e responde `CACHE_READY`/`CACHE_ERROR` sem dados sensíveis.
- [ ] `SKIP_WAITING` é aceito apenas como mensagem explícita.
- [ ] Falhas parciais de assets não apagam cache válido nem derrubam o shell inteiro.
- [ ] 14 unit tests exercem lifecycle, estratégias, cleanup, segurança e mensagens.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit — 14 testes.  
**Gate**: quick  
**Commit**: `feat(pwa): implement service worker lifecycle`

---

### T8: Bundle a deployment-revisioned service worker

**Status**: ✅ Complete — `0c79e1c`

**What**: Criar script que use esbuild para empacotar o worker e sua política, injete revisão determinística e produza `public/sw.js` antes de dev/build.  
**Where**: `scripts/build-service-worker.mjs`, `scripts/build-service-worker.test.ts`, `package.json`, `package-lock.json`, `.gitignore`  
**Depends on**: T7  
**Reuses**: Identificadores Vercel quando disponíveis e fallback hash local; scripts npm da T1.  
**Requirement**: PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] esbuild empacota `sw.ts` e `cache-policy.ts` em um único `public/sw.js` sem imports pendentes.
- [ ] `predev` e `prebuild` geram `public/sw.js` antes do Next.js iniciar.
- [ ] Builds idênticas produzem worker idêntico; mudança relevante altera revisão/conteúdo.
- [ ] Placeholders não resolvidos, template ausente ou escrita incompleta falham com exit code não zero.
- [ ] Arquivo gerado tem estratégia explícita de versionamento/ignore e não fica silenciosamente obsoleto.
- [ ] 8 unit tests cobrem revisão Vercel, fallback local, determinismo, falhas e escrita atômica.
- [ ] Gate passa: `npm run test:unit && npm run build`.

**Tests**: unit + build integration — 8 testes.  
**Gate**: build  
**Commit**: `build(pwa): generate revisioned service worker`

---

### T9: Add secure service-worker response headers

**Status**: ✅ Complete — `fc45bbe`

**What**: Configurar headers específicos para `/sw.js` sem alterar os headers/rotas existentes.  
**Where**: `next.config.ts`, `tests/pwa/sw-headers.spec.ts`  
**Depends on**: T8  
**Reuses**: `next.config.ts` atual e recomendações oficiais do Next.js para service workers.  
**Requirement**: PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `/sw.js` responde como JavaScript UTF-8.
- [ ] `Cache-Control` exige revalidação e impede cache HTTP prolongado.
- [ ] CSP do worker restringe scripts à mesma origem.
- [ ] `Service-Worker-Allowed` cobre apenas o scope necessário.
- [ ] 4 testes browser validam headers em build de produção.
- [ ] Gate passa: `npm run test:pwa`.

**Tests**: e2e — 4 testes.  
**Gate**: PWA  
**Commit**: `feat(pwa): secure service worker headers`

---

### T10: Register, warm and update the PWA client

**What**: Criar o registrador client-side com protocolo de warmup, estados tipados, worker waiting e recarga única após confirmação.  
**Where**: `src/components/pwa/pwa-registrar.tsx`, `src/components/pwa/pwa-registrar.test.tsx`  
**Depends on**: T9  
**Reuses**: Mensagens da T7, RootLayout e Resource Timing do navegador.  
**Requirement**: PWA-01, PWA-02, PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Browser sem Service Worker API continua sem erro e entra em `unsupported`.
- [ ] Registro ocorre apenas em contexto elegível e não duplica listeners/registrations.
- [ ] Warmup envia somente URLs same-origin allowlisted já carregadas e aguarda `CACHE_READY`.
- [ ] Worker waiting produz `update-available`; nenhuma recarga automática acontece.
- [ ] Confirmação envia `SKIP_WAITING`; `controllerchange` recarrega no máximo uma vez.
- [ ] Falhas são sanitizadas e não bloqueiam os children.
- [ ] 10 testes jsdom cobrem suporte, registro, warmup, erro, waiting, confirmação, cleanup e guard de reload.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit (jsdom/RTL) — 10 testes.  
**Gate**: quick  
**Commit**: `feat(pwa): add client registration and warmup`

---

### T11: Add connectivity and update status UI

**What**: Implementar hook online/offline e um status discreto que comunique desconexão, reconexão e atualização usando apenas o sistema visual existente.  
**Where**: `src/hooks/use-network-status.ts`, `src/hooks/use-network-status.test.ts`, `src/components/pwa/connectivity-status.tsx`, `src/components/pwa/connectivity-status.test.tsx`  
**Depends on**: T10  
**Reuses**: Tokens de `theme.css`, Poppins, reduced motion, shell `max-w-md` e estado do registrador.  
**Requirement**: PWA-03, PWA-04, PWA-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Hook inicializa com `navigator.onLine`, atualiza eventos e remove listeners no unmount.
- [ ] Status offline usa texto/ícone além de cor e não cobre TopBar/BottomNav/safe areas.
- [ ] Retorno online permite retry; update waiting oferece ação explícita de atualização.
- [ ] Temas claro/escuro e reduced motion são preservados.
- [ ] 9 testes unitários cobrem hook, mensagens, temas, acessibilidade, retry, update e cleanup.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit (jsdom/RTL) — 9 testes.  
**Gate**: quick  
**Commit**: `feat(pwa): add connectivity and update status`

---

### T12: Persist a safe offline snapshot

**What**: Implementar snapshot local versionado, mínimo, validado e sem credenciais para reabrir conteúdo seguro em modo somente leitura.  
**Where**: `src/lib/pwa/offline-snapshot.ts`, `src/lib/pwa/offline-snapshot.test.ts`  
**Depends on**: T11  
**Reuses**: Padrões defensivos e cleanup de `src/lib/storage.ts`; modelo aprovado no design.  
**Requirement**: PWA-02, PWA-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Snapshot contém apenas schema, timestamp, tela principal e campos públicos mínimos aprovados.
- [ ] CPF, e-mail, token, headers e respostas brutas são rejeitados/ausentes.
- [ ] SSR, JSON corrompido, schema futuro, quota e storage indisponível não causam crash.
- [ ] Logout pode remover snapshot idempotentemente.
- [ ] Chave de tema canônica migra a chave legada sem perder a preferência atual.
- [ ] 12 unit tests cobrem leitura, escrita, validação, corrupção, quota, limpeza, SSR, migração e campos proibidos.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit — 12 testes.  
**Gate**: quick  
**Commit**: `feat(pwa): add safe offline snapshot`

---

### T13: Fail API operations clearly while offline

**What**: Estender o cliente de API para erro offline antecipado e recuperável sem mudar contratos ou cachear respostas.  
**Where**: `src/lib/api/client.ts`, `src/lib/api/client.test.ts`  
**Depends on**: T12  
**Reuses**: `ApiError`, timeout, mensagens em português e chamadas existentes.  
**Requirement**: PWA-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Offline conhecido falha antes do timeout com código/estado distinguível e mensagem em português.
- [ ] `navigator.onLine=true` não mascara erro real de fetch, HTTP, timeout ou API.
- [ ] Ao evento online, nova chamada pode funcionar sem reset manual.
- [ ] Nenhum log/test fixture expõe token, CPF ou e-mail real.
- [ ] 8 unit tests cobrem offline, reconexão, HTTP error, timeout, network failure, JSON/não JSON e headers existentes.
- [ ] Gate passa: `npm run test:unit`.

**Tests**: unit — 8 testes.  
**Gate**: quick  
**Commit**: `feat(api): report offline operations clearly`

---

### T14: Wire PWA runtime into the existing application

**What**: Integrar registrador, status, snapshot e bootstrap offline ao layout/shell sem refatorar telas, e provar a experiência completa em browsers.  
**Where**: `src/app/layout.tsx`, `src/components/dnj-app.tsx`, `tests/pwa/pwa-runtime.spec.ts`, `tests/e2e/pwa-flow.spec.ts`, `tests/visual/dnj-baseline.spec.ts`  
**Depends on**: T13  
**Reuses**: Todos os módulos T4–T13, navegação atual, storage/logout, baseline T2 e modo mock.  
**Requirement**: PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] RootLayout monta o registrador sem remover Analytics/Speed Insights ou metadata existente.
- [ ] `DnjApp` grava snapshot apenas em telas principais, restaura-o offline em modo somente leitura e o limpa no logout.
- [ ] Shell recarrega offline após `CACHE_READY`; primeiro acesso sem cache falha explicitamente.
- [ ] API e requests autenticados nunca aparecem nas chaves do Cache Storage.
- [ ] Reconexão reabilita retry; atualização waiting não interrompe a sessão e recarrega uma vez após confirmação.
- [ ] Teste de duas revisões confirma cleanup sem loop e sem mistura de chunks.
- [ ] Chromium cobre instalação/manifest, warmup, offline, API network-only, snapshot, reconexão e update; WebKit cobre metadata Apple, shell e fallback suportado.
- [ ] Exatamente 14 cenários PWA/e2e passam e os 8 cenários visuais originais continuam aprovados.
- [ ] Gate passa: `npm run test:unit && npm run test:e2e && npm run test:visual`.

**Tests**: e2e + visual — 14 cenários PWA/e2e e 8 visuais.  
**Gate**: full  
**Commit**: `feat(pwa): integrate offline runtime`

---

### T15: Document operation, update and real-device UAT

**What**: Documentar instalação, cache, atualização, troubleshooting e checklist de validação em Android/iOS reais para o handoff de produção.  
**Where**: `README.md`, `docs/pwa.md`, `.specs/features/pwa-migration/validation.md` (preparado pelo Verifier no fechamento)  
**Depends on**: T14  
**Reuses**: Comandos reais do package, AD-001–AD-004 e evidências dos testes.  
**Requirement**: PWA-01, PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] README explica setup, testes e limitações offline sem prometer push/background sync.
- [ ] `docs/pwa.md` registra cache matrix, revisão, atualização, limpeza e diagnóstico sem instruções destrutivas genéricas.
- [ ] Checklist real-device cobre Android/Chrome e iPhone/Safari: instalação, ícone sem corte, nome, standalone, status bar/tema, offline pós-warmup, reconexão e update.
- [ ] UAT explicita o que WebKit automatizado não prova em hardware iOS real.
- [ ] Nenhuma credencial, URL secreta ou dado pessoal entra na documentação/evidência.
- [ ] Gate passa: `npm run validate`.

**Tests**: none — documentação; suíte completa é o gate.  
**Gate**: build  
**Commit**: `docs(pwa): add operations and device uat guide`

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Uma fundação de testes | ✅ Granular |
| T2 | Uma baseline visual | ✅ Granular |
| T3 | Um conjunto coeso de assets instaláveis gerado por um pipeline | ✅ Granular |
| T4 | Um manifest/metadata contract | ✅ Granular |
| T5 | Uma migração de fonte | ✅ Granular |
| T6 | Um módulo de política de cache | ✅ Granular |
| T7 | Um service worker template | ✅ Granular |
| T8 | Um gerador de worker | ✅ Granular |
| T9 | Uma regra de headers | ✅ Granular |
| T10 | Um registrador client PWA | ✅ Granular |
| T11 | Um estado coeso de conectividade/update | ✅ Granular |
| T12 | Um repositório de snapshot offline | ✅ Granular |
| T13 | Uma extensão do cliente de API | ✅ Granular |
| T14 | Uma integração vertical final necessária para e2e | ✅ Granular — múltiplos pontos, mas um único wiring executável/testável |
| T15 | Um guia operacional e checklist UAT | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Test tooling/config | none + smoke | none + smoke | ✅ OK |
| T2 | Visual regression suite | visual e2e | visual e2e | ✅ OK |
| T3 | Asset generation/config | unit + build | unit + build | ✅ OK |
| T4 | Manifest/metadata | unit + build | unit + build | ✅ OK |
| T5 | Font/layout/CSS | visual e2e | visual e2e | ✅ OK |
| T6 | Cache policy logic | unit | unit | ✅ OK |
| T7 | Service worker logic | unit | unit | ✅ OK |
| T8 | Build script | unit + build | unit + build | ✅ OK |
| T9 | Next headers config | e2e | e2e | ✅ OK |
| T10 | React client service | unit jsdom/RTL | unit jsdom/RTL | ✅ OK |
| T11 | Hook + UI status | unit jsdom/RTL | unit jsdom/RTL | ✅ OK |
| T12 | Storage/domain logic | unit | unit | ✅ OK |
| T13 | API client | unit | unit | ✅ OK |
| T14 | App/browser integration | e2e + visual | e2e + visual | ✅ OK |
| T15 | Documentation | none; full gate | none; full gate | ✅ OK |

---

## Requirement Traceability

| Requirement | Tasks | Coverage |
| ----------- | ----- | -------- |
| PWA-01 | T3, T4, T10, T14, T15 | Covered |
| PWA-02 | T5, T6, T7, T10, T12, T14 | Covered |
| PWA-03 | T6, T7, T11, T12, T13, T14 | Covered |
| PWA-04 | T2, T3, T4, T5, T11, T14 | Covered |
| PWA-05 | T6, T7, T8, T9, T10, T11, T14, T15 | Covered |
| PWA-06 | T1, T2, T3, T7, T8, T9, T10, T14, T15 | Covered |

**Coverage:** 6 requisitos, 6 mapeados para tasks, 0 não mapeados.

---

## Approval Gate Before Execute

Antes de Execute, confirmar:

1. Matriz de testes e comandos acima.
2. Ferramentas por task: `tlc-spec-driven`, shell/filesystem local e browser automatizado via Playwright; nenhum MCP externo.
3. Uso ou não de subagentes para os três batches planejados; o TLC nunca os inicia sem autorização.
4. Disponibilidade de um Android e um iPhone/iPad reais para o UAT final, ou registro explícito dessa evidência como pendente externa.
