# Verificação independente — partida de Radicalidade ao vivo

**Resultado: PASS após correção dos blockers.**

- R-01: `activity_run_participants` cria a associação no scan; o participante consulta a própria partida e mostra estados bloqueantes.
- R-02: o gestor consulta a visão operacional a cada 2 s enquanto uma partida estiver aberta e exibe a lista de participantes.
- R-03: o QR é desativado ao iniciar; reemissão é aceita apenas em `draft`. A migração remota `lock_radicality_run_checkin` também impede QR ativo fora de `draft` e fecha QR ao sair do estado.
- R-04: estado terminal é retornado pela consulta por `runId`; a interface informa conclusão/cancelamento e fecha após 1,8 s.
- Proteção adicional: todas as operações de Radicalidade restringem a partida a `started_by` e validam a transição anterior.

## Gate

- `npm run typecheck`: passou.
- `npm run test:unit`: 68 arquivos e 219 testes passaram.
- Migração aplicada no Supabase: `20260805222046 lock_radicality_run_checkin`.

Verificador independente: `radicality_flow_verifier`.
