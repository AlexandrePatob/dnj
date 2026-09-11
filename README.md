# DNJ Game 2K26 — Frontend

Aplicação mobile-first do DNJ Game, migrada para Next.js a partir do protótipo visual existente em `../DNJGAME-DESIGN`. O JSX, as classes Tailwind, os tokens, os assets e as animações do protótipo são mantidos sem redesign.

## Stack

- Next.js 16 com App Router
- React 19 e TypeScript estrito
- Tailwind CSS 4 e os tokens originais de tema claro/escuro
- Lucide React para ícones
- ESLint com Core Web Vitals
- PWA instalável com service worker próprio, manifest do App Router e assets dedicados para Android e iOS

## Começando

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Abra `http://localhost:3000`.

Para subir também a API, PostgreSQL, MinIO e túneis Cloudflare temporários em
um único comando, consulte [docs/local-development.md](docs/local-development.md)
e execute `pnpm dev:local`.

Os scripts `predev` e `prebuild` geram `public/sw.js` automaticamente. Para testar instalação, cache e atualização como em produção, use uma build local (`npm run build` e `npm run start`) ou uma URL HTTPS da Vercel; o modo de desenvolvimento não substitui esse teste.

## Integração com a API externa

Configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2
# API local: NEXT_PUBLIC_API_URL=http://localhost:8081/v2
DNJ_V2_UPSTREAM_URL=https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2
```

O navegador chama a API HTTP externa diretamente em `NEXT_PUBLIC_API_URL` (URL pública, já com `/v2`). Não existe proxy `/api/v2` nem sessão no Next: o cliente central (`src/lib/api/client.ts`) guarda o `accessToken` no `localStorage` e envia `Authorization: Bearer`. A API mantém o refresh em cookie e devolve `csrfToken`; em um `401`, o cliente faz um único `POST /auth/refresh` compartilhado entre requisições concorrentes, persiste o bearer rotacionado e repete a chamada original. Se a renovação falhar, o access token local é removido e o `401` é propagado. Participante, Admin e Gestor restauram a sessão por `GET /auth/session` e validam o papel retornado. `DNJ_V2_UPSTREAM_URL` só é usada pelas rotas Next que precisam de segredo no servidor (Push/VAPID). A API precisa liberar a origem exata do frontend no CORS, com credenciais e os headers `Authorization`, `Content-Type`, `Idempotency-Key` e `X-CSRF-Token`.

Como o refresh fica em cookie, ele não é exposto ao JavaScript; o access token permanece no `localStorage`. Não há integração com Supabase, acesso direto a banco, migrations ou credenciais `SUPABASE_*` necessárias para executar a aplicação.

O frontend implementa os contratos já existentes:

| Fluxo | Endpoint |
| --- | --- |
| Solicitar código | `POST /auth/onboarding` |
| Validar código | `POST /auth/verification-code` |
| Buscar grupo | `GET /groups?search=` |
| Vincular ou criar grupo | `POST /users/{id}/update-group` |

Todas as chamadas usam `credentials: include` e seguem o contrato da API externa. O frontend não deve criar endpoints paralelos que repliquem o backend nem importar adaptadores de banco.

No backend externo, configure a origem do frontend e mantenha o prefixo `/v2` para corresponder à URL acima.

## Estrutura

```text
src/
├── app/                 # App Router e CSS/Tailwind originais
├── assets/              # Logos originais do protótipo
├── components/
│   └── dnj-app.tsx      # Migração 1:1 do App.tsx de DNJGAME-DESIGN
├── lib/api/             # Cliente e contratos preparados para a API
├── pwa/                 # Registro, conectividade, atualização e snapshot seguro
└── types/               # Tipos de domínio da integração
```

## Identidade visual

- `DNJ_geral.png`: tela inicial.
- `DNJGAME_02.png`: cabeçalho interno no modo claro, sobre o fundo laranja.
- `DNJGAME_DARK.png`: cabeçalho interno no modo escuro.
- `DNJGAME_01.png`: variante oficial para futuras superfícies internas claras.

As cópias utilizadas pela aplicação ficam em `src/assets/brand`; os arquivos da raiz permanecem como originais fornecidos.

## Validação

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:pwa
pnpm test:e2e
pnpm test:visual
pnpm build
pnpm validate
```

`pnpm validate` é o gate completo: tipos, lint, testes unitários, build e toda a matriz Playwright. Os testes visuais usam snapshots versionados e não devem ser atualizados sem revisão deliberada do design.

## Operação PWA

O app pode ser instalado pelo menu do Chrome no Android e por **Compartilhar → Adicionar à Tela de Início** no Safari do iPhone. Depois de uma primeira navegação online, o shell e um snapshot público mínimo da tela autenticada podem ser apresentados sem rede. Autenticação, buscas, gravações e demais chamadas da API continuam explicitamente online-only.

Quando uma versão nova estiver pronta, a interface pede confirmação antes de ativá-la e recarregar. Não fazem parte desta entrega: prompt de instalação próprio, push notifications, background sync, escrita offline ou cache de autenticação/respostas privadas.

Consulte [docs/pwa.md](docs/pwa.md) para a matriz de cache, estratégia de revisão, deploy na Vercel, diagnóstico e os checklists de aceite em Android e iPhone.

## Próximos endpoints

As telas de pontos, ranking, missões, mapa e filas usam mocks isolados. Os próximos contratos podem ser adicionados em `src/lib/api/` sem alterar os componentes de autenticação já conectados.
