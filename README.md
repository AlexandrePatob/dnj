# DNJ Game 2K26 — Frontend

Aplicação mobile-first do DNJ Game, migrada para Next.js a partir do protótipo visual existente em `../DNJGAME-DESIGN`. O JSX, as classes Tailwind, os tokens, os assets e as animações do protótipo são mantidos sem redesign.

## Stack

- Next.js 16 com App Router
- React 19 e TypeScript estrito
- Tailwind CSS 4 e os tokens originais de tema claro/escuro
- Lucide React para ícones
- ESLint com Core Web Vitals

## Começando

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

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
npm run build
```

## Próximos endpoints

As telas de pontos, ranking, missões, mapa e filas usam mocks isolados. Os próximos contratos podem ser adicionados em `src/lib/api/` sem alterar os componentes de autenticação já conectados.
