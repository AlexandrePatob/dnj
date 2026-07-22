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
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

Os scripts `predev` e `prebuild` geram `public/sw.js` automaticamente. Para testar instalação, cache e atualização como em produção, use uma build local (`npm run build` e `npm run start`) ou uma URL HTTPS da Vercel; o modo de desenvolvimento não substitui esse teste.

Por padrão, `NEXT_PUBLIC_USE_MOCKS=true` permite percorrer o fluxo inteiro sem a API. Qualquer código de seis dígitos é aceito nesse modo.

## Integração com a API

Configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_USE_MOCKS=false
```

O frontend implementa os contratos já existentes:

| Fluxo | Endpoint |
| --- | --- |
| Solicitar código | `POST /auth/onboarding` |
| Validar código | `POST /auth/verification-code` |
| Buscar grupo | `GET /groups?search=` |
| Vincular ou criar grupo | `POST /users/{id}/update-group` |

Todas as chamadas usam `credentials: include`, aceitando o cookie `identity_token` HttpOnly gerado pela API. O Bearer token retornado pela verificação também é persistido em uma chave separada para as rotas protegidas, conforme o fluxo funcional atual. Quando a API disponibilizar um endpoint como `GET /users/me`, é recomendável reconstruir a sessão pelo cookie HttpOnly e deixar de persistir o token acessível ao JavaScript.

No backend, configure `CORS_ALLOWED_ORIGINS=http://localhost:3000` e mantenha `API_PREFIX=/v1` para corresponder à URL acima.

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
npm run typecheck
npm run lint
npm run test:unit
npm run test:pwa
npm run test:e2e
npm run test:visual
npm run build
npm run validate
```

`npm run validate` é o gate completo: tipos, lint, testes unitários, build e toda a matriz Playwright. Os testes visuais usam snapshots versionados e não devem ser atualizados sem revisão deliberada do design.

## Operação PWA

O app pode ser instalado pelo menu do Chrome no Android e por **Compartilhar → Adicionar à Tela de Início** no Safari do iPhone. Depois de uma primeira navegação online, o shell e um snapshot público mínimo da tela autenticada podem ser apresentados sem rede. Autenticação, buscas, gravações e demais chamadas da API continuam explicitamente online-only.

Quando uma versão nova estiver pronta, a interface pede confirmação antes de ativá-la e recarregar. Não fazem parte desta entrega: prompt de instalação próprio, push notifications, background sync, escrita offline ou cache de autenticação/respostas privadas.

Consulte [docs/pwa.md](docs/pwa.md) para a matriz de cache, estratégia de revisão, deploy na Vercel, diagnóstico e os checklists de aceite em Android e iPhone.

## Próximos endpoints

As telas de pontos, ranking, missões, mapa e filas usam mocks isolados. Os próximos contratos podem ser adicionados em `src/lib/api/` sem alterar os componentes de autenticação já conectados.
