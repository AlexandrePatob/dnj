# Tasks — API persistida

## Execution plan

1. [x] **T1 — Seed oficial**: migration/repository de seed idempotente para evento, espaços, programação e seis grupos. *Verificado:* 1 evento, 12 espaços, 40 atividades, 6 grupos e 1 QR no Supabase.
2. [x] **T2 — Sessão persistida**: autenticação de homologação em `/api/v1/auth`, token de participante e testes. *Verificado:* código correto cria/atualiza usuário e emite token assinado.
3. [x] **T3 — Grupos persistidos**: rotas de consulta e adesão, UI de onboarding sem fixtures. *Verificado:* busca e confirmação usam API.
4. [x] **T4 — Agenda persistida**: rota de schedule, tipos/cliente, Home e cronograma renderizam API sem MissionPulse. *Verificado:* simultâneos e próximos 15min estão cobertos.
5. [x] **T5 — QR e participação persistidos**: adaptar rota/cliente de QR e participação corrente. *Verificado:* token e idempotência são validados pela rota.
6. [x] **T6 — Momentos persistidos**: adaptar feed, criação e curtida às rotas `/api/v1`. *Verificado:* consumidores usam `/api/v1`.
7. [x] **T7 — Contrato e limpeza de consumidores**: atualizar OpenAPI, remover uso de `/api/mock` e fixtures de fluxo. *Verificado:* não há consumidor participante de `/api/mock` ou `Bearer mock`.
8. [x] **T8 — Testes e verificação final**: executar typecheck e suíte unitária; validar dados no Supabase, atualizar o grafo. *Verificado:* typecheck e 182 testes unitários passaram; addendum do grafo registrado.

## Gate

Como solicitado, nenhum teste/build intermediário será executado. Ao final: `npm run typecheck; npm run test:unit`.
