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

### AD-005
- **Decision**: A área DNJ Game usará exclusivamente o verde oficial extraído da marca DNJGAME_01.png (#B2D64D) para progresso e destaques de jogo; ações de QR Code usarão o laranja institucional para contraste.
- **Reason**: A cor atual do jogo diverge da marca. A separação verde para progresso e laranja para scan fortalece reconhecimento e hierarquia móvel.
- **Trade-off**: O verde deixa de ser uma cor genérica de sucesso dentro da área de jogo; estados de erro e indisponibilidade permanecem semânticos e textuais.
- **Scope**: Tema, componentes e telas vinculadas ao DNJ Game.
- **Date**: 2026-07-24
- **Status**: active

### AD-006
- **Decision**: O logo-sticker DNJ 2K26 será a marca visual principal das superfícies participantes; o arquivo sem sombra é a referência para marca-d'água e composições sobre foto. Ícones instaláveis PWA continuam usando suas composições técnicas próprias.
- **Reason**: A marca-sticker é a direção visual aprovada e cria uma assinatura reconhecível em entrada, cabeçalho e compartilhamento sem comprometer as áreas seguras de ícones.
- **Trade-off**: Lockups anteriores deixam de ser a escolha-padrão em UI e precisam ser mantidos apenas onde forem tecnicamente ou historicamente necessários.
- **Scope**: Assets de marca, layouts participantes, Momentos, onboarding e compartilhamento.
- **Date**: 2026-08-05
- **Status**: active

### AD-007
- **Decision**: Participante, Gestor e Admin terão superfícies e fronteiras de autorização separadas; mocks Next implementarão contratos de domínio portáveis para o futuro backend Go + PostgreSQL.
- **Reason**: A operação do evento exige menor carga cognitiva e permissões verificáveis, enquanto a migração de backend não deve alterar a semântica do produto.
- **Trade-off**: Serão necessários modelos, rotas e testes de papel/estado adicionais antes de unificar dados reais.
- **Scope**: Navegação, rotas, mocks, contratos HTTP e modelagem futura de dados.
- **Date**: 2026-08-05
- **Status**: active

### AD-008
- **Decision**: QR Codes terão `expiration_time` para leitura e `expiration_momento_time` para o envio de Momento; toda atividade do DNJ permanece centralizada em `experiences.kind`; moderacao existe somente em Momentos.
- **Reason**: Check-in e foto possuem janelas e consequencias independentes. Uma base de experiencia comum evita esquemas duplicados, enquanto a moderacao de conteudo nao deve contaminar filas, cronogramas ou eventos especiais.
- **Trade-off**: A decisao de excluir foto exige coordenacao entre a transacao de banco e a exclusao do objeto privado no Storage.
- **Scope**: QR, participacoes, Momentos, Admin e schema Supabase de homologacao.
- **Date**: 2026-08-05
- **Status**: superseded by AD-009

### AD-009
- **Decision**: O backend real do DNJ usarÃ¡ o modelo V2 de ediÃ§Ã£o Ãºnica: `activities` substitui `experiences`, nÃ£o existirÃ¡ tabela `events` nem `event_id`, filas ficam fora do produto, e `moments` pode ser livre ou vinculado a uma participation de desafio. MÃ­dia ficarÃ¡ no S3 com metadados no PostgreSQL.
- **Reason**: A ediÃ§Ã£o atual nÃ£o requer reuso multi-evento; a semÃ¢ntica separa local, aÃ§Ã£o, participaÃ§Ã£o e memÃ³ria, reduzindo tabelas, FKs redundantes e complexidade operacional.
- **Trade-off**: Reuso entre futuras ediÃ§Ãµes exigirÃ¡ novo deployment, evoluÃ§Ã£o do schema ou uma decisÃ£o futura de reintroduzir tenancy; OpenAPI 1.1.0 precisarÃ¡ de versÃ£o maior para Moments livres e remoÃ§Ã£o de `event`.
- **Scope**: Backend PostgreSQL/S3 futuro, contratos pÃºblicos V2 e migraÃ§Ã£o do front.
- **Date**: 2026-08-06
- **Status**: superseded by AD-010

### AD-010
- **Decision**: Confissão e Direção Espiritual serão filas pastorais isoladas no Firestore, fora dos fluxos V2 regulares; a identidade e os papéis continuam na API/banco DNJ existente, e o Firestore mantém somente o estado operacional mínimo da fila.
- **Reason**: A operação exige atualização em tempo real e já possui telas, participantes, gestores e Admin no DNJ. Um módulo isolado reaproveita esses dados sem transformar a fila em domínio dos fluxos padrão.
- **Trade-off**: As operações diretas no Firestore não aplicam por si só os papéis da API; o produto aceita esse risco operacional limitado e não armazena e-mail ou conteúdo sensível na fila.
- **Scope**: Filas pastorais, Firestore, Cloud Functions de aviso, telas de Fila/Admin/Gestor e integração de push individual.
- **Date**: 2026-08-26
- **Status**: active

## Handoff

- **Feature**: Onda 1A — Login e Onboarding / `.specs/features/wave-1-auth-onboarding/`
- **Phase / Task**: Onda 1A concluída — validada manualmente e verificada de forma independente.
- **Completed**: Google antes do e-mail, separador OU, mensagem de primeiro acesso, largura responsiva do botão GIS, conta nova via código, nome/CPF/WhatsApp/grupo no onboarding, criação real de grupo e remoção de todas as simulações de runtime. Testes relevantes: 20 aprovados; typecheck e lint aprovados.
- **In-progress** (file:line): none
- **Next step**: iniciar a Onda 2 após direcionamento do usuário; P10 registra o ajuste pendente do avatar em Momentos.
- **Blockers**: nenhum conhecido.
- **Uncommitted files**: alterações prévias de Home/Mapa, specs e Onda 1A; `functions.pre-main-update-20260827/` e `test-results/` devem ser preservados e excluídos de commits.
- **Branch**: dev

## Handoff update — 2026-07-23

- **Phase / Task**: Fases 4–5 implementadas parcialmente; preparação para API real.
- **Completed**: QR com decoder dinâmico, fallback por imagem, rota mock e badge de participação; captura com consentimento; Galeria, Meus registros, lightbox, compartilhamento/download e navegação com cinco itens. Commit: `682e2b9`.
- **Remaining**: spike manual Chrome/WebKit, participação/cooldown persistido no cliente, retry explícito, paginação e swipe. A6 depende do backend/staging.
- **Validation**: typecheck e 126 testes unitários aprovados. Snapshot visual continua sob revisão manual do usuário.
