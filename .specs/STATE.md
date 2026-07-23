# STATE

## Decisions

### AD-001
- **Decision**: A primeira versão PWA manterá Next.js 16 e usará um service worker próprio e enxuto, sem migrar para Vite e sem adotar Serwist.
- **Reason**: O projeto já usa App Router e integrações da Vercel; o Next.js suporta manifest e service worker, e a abordagem reduz mudanças de stack e risco de regressão visual.
- **Trade-off**: Estratégias de cache e atualização serão implementadas e testadas explicitamente, sem as abstrações e o precache automático fornecidos por Serwist ou Workbox.
- **Scope**: Arquitetura frontend, build, deploy na Vercel e futuras capacidades PWA.
- **Date**: 2026-07-22
- **Status**: active

### AD-002
- **Decision**: O service worker usará uma allowlist de recursos estáticos same-origin e nunca armazenará respostas de API, requisições autenticadas, métodos diferentes de GET ou recursos cross-origin.
- **Reason**: Uma política positiva e restrita é mais segura que tentar excluir todos os tipos de dados dinâmicos depois que já foram interceptados.
- **Trade-off**: Novas categorias de assets precisarão ser adicionadas conscientemente à política de cache para funcionar offline.
- **Scope**: Service worker, integrações de API, assets e futuras rotas do frontend.
- **Date**: 2026-07-22
- **Status**: active

### AD-003
- **Decision**: Atualizações da PWA não usarão ativação e recarga forçadas durante uma sessão; uma versão em espera será aplicada apenas por ação segura do usuário ou quando não houver clientes antigos ativos.
- **Reason**: Evitar perda de estado e inconsistência entre shell e chunks durante o uso no evento.
- **Trade-off**: Um usuário pode permanecer temporariamente na versão anterior até aceitar a atualização ou fechar as abas existentes.
- **Scope**: Ciclo de vida do service worker e UX de atualização.
- **Date**: 2026-07-22
- **Status**: active

### AD-004
- **Decision**: Assets instaláveis serão derivados da marca oficial em composições específicas para Android `any`, Android `maskable`, iOS `apple-touch-icon` e favicon; nenhum logo retangular será redimensionado diretamente para um quadrado.
- **Reason**: Android e iOS aplicam máscaras e critérios diferentes, e um único arquivo improvisado pode cortar ou deformar a identidade.
- **Trade-off**: A identidade passa a ter vários derivados técnicos que precisam ser mantidos em conjunto.
- **Scope**: Manifest, metadata, instalação Android/iOS, favicons e futuras atualizações da marca.
- **Date**: 2026-07-22
- **Status**: active

## Handoff

- **Feature**: Modularização DNJ / `.specs/features/dnj-modularization/`
- **Phase / Task**: Fase 3; M3-07 é próxima.
- **Completed**: Fase 1 modularizada; Fase 2 aplicou viewport-fit, variáveis únicas de safe area, BottomNav segura, padding de telas e avisos PWA, Conta hierárquica com saída confirmada e CTA grande para scanner. Typecheck, lint e 113 testes unitários aprovados.
- **In-progress** (file:line): none
- **Next step**: M3-07, criar Route Handler de momentos.
- **Blockers**: validação visual automatizada falha 6/8 contra snapshots existentes; usuário assumirá validação manual e orientará eventuais correções.
- **Uncommitted files**: `.gitignore`, `graphify-out/` e `test-results/`; preservar e não incluir em commits desta feature sem revisão separada.
- **Branch**: dev
