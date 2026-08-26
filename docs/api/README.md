# DNJ API - contrato externo V2

> Fonte de verdade: a API HTTP externa definida por `DNJ_V2_UPSTREAM_URL` em `.env.example`.
>
> O DNJ Game não usa Supabase. Não adicionar novas migrations, clientes, variáveis de ambiente ou Route Handlers baseados em Supabase. Qualquer fluxo novo deve apontar para o contrato HTTP da API externa por meio de `src/lib/api/client.ts`.

O servidor `/api/v2` apenas encaminha chamadas para a API externa V2. Não existem Route Handlers locais de domínio neste projeto.

IDs externos são strings, datas são ISO 8601 em UTC, cursores são opacos e ações mutáveis usam `idempotencyKey` UUID quando indicado.

Para o backend real PostgreSQL + Amazon S3 e a evolucao V2 do contrato, consulte [`../architecture/dnj-v2-postgres-s3-api-spec.md`](../architecture/dnj-v2-postgres-s3-api-spec.md) e [`dnj-v2-contract-checklist.md`](dnj-v2-contract-checklist.md).

Documentos de banco e migrations não fazem parte deste frontend.
