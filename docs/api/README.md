# DNJ API - homologacao

[`dnj-experience.openapi.yaml`](dnj-experience.openapi.yaml) e o contrato executavel das Route Handlers deste Next.

- O servidor `/api/v1` e a API atual de homologacao, persistida no Supabase.
- O servidor `/v1` e o contrato que o backend real deve preservar para os recursos do participante.
- Rotas `/api/admin/*`, `/api/push/*` e `/api/test-users/presence` existem somente neste Next; seus contratos tambem estao no arquivo.
- O inventário de ownership, rollback e gates de remoção da migração V2 está em [dnj-v2-migration-inventory.md](./dnj-v2-migration-inventory.md).
- IDs externos sao strings, datas sao ISO 8601 em UTC, cursores sao opacos e acoes mutaveis usam `idempotencyKey` UUID quando indicado.

Para o backend real PostgreSQL + Amazon S3 e a evolucao V2 do contrato, consulte [`../architecture/dnj-v2-postgres-s3-api-spec.md`](../architecture/dnj-v2-postgres-s3-api-spec.md) e [`dnj-v2-contract-checklist.md`](dnj-v2-contract-checklist.md).

O schema canônico, suas migrations Supabase e as relações estão em [`../../.specs/features/dnj-2k26-event-operations/api-schema-alignment.md`](../../.specs/features/dnj-2k26-event-operations/api-schema-alignment.md).
