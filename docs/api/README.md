# DNJ API - contrato externo V2

> Fonte de verdade: a API HTTP externa definida por `NEXT_PUBLIC_API_URL` em `.env.example` (chamada diretamente pelo navegador com bearer token).
>
> O DNJ Game não usa Supabase. Não adicionar novas migrations, clientes, variáveis de ambiente ou Route Handlers baseados em Supabase. Qualquer fluxo novo deve apontar para o contrato HTTP da API externa por meio de `src/lib/api/client.ts`.

Não existe proxy `/api/v2` nem Route Handlers locais de domínio ou sessão neste projeto; as únicas rotas Next são as de Push, que exigem segredo no servidor. Autenticação: `Authorization: Bearer <accessToken>`, refresh via `POST /auth/refresh` com `{ "refreshToken" }` (rotação) e logout via `POST /auth/logout` com o mesmo corpo.

IDs externos são strings, datas são ISO 8601 em UTC, cursores são opacos e ações mutáveis usam `idempotencyKey` UUID quando indicado.

Para o backend real PostgreSQL + Amazon S3 e a evolucao V2 do contrato, consulte [`../architecture/dnj-v2-postgres-s3-api-spec.md`](../architecture/dnj-v2-postgres-s3-api-spec.md) e [`dnj-v2-contract-checklist.md`](dnj-v2-contract-checklist.md).

Documentos de banco e migrations não fazem parte deste frontend.
