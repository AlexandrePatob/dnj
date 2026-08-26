# QR e moderação de Momentos — Validação

**Data**: 2026-08-05  
**Spec**: `.specs/features/dnj-qr-moment-moderation/spec.md`  
**Diff range**: árvore de trabalho sem commits atômicos; revisão limitada aos arquivos da feature  
**Verificador**: subagente independente (autor ≠ verificador)

---

## Conclusão

**⚠️ Issues — a implementação está consistente nas verificações estáticas e nos testes focados, mas não está plenamente verificada contra duas regras persistentes críticas.** Não foi feita mudança de código por este verificador.

## Conclusão das tarefas

| Tarefa | Status | Evidência |
| --- | --- | --- |
| T1 | ✅ Feita | Migration `20260805182007_refine_qr_and_moment_moderation.sql`; consulta remota confirma colunas, RPC e índice. |
| T2 | ✅ Feita | `src/lib/moments/moderation.ts` e quatro testes de política. |
| T3 | ✅ Feita | Rota Admin usa `moments`, RPC canônico e Storage. |
| T4 | ✅ Feita | Painel dedicado e teste de interface das três ações. |
| T5 | ✅ Feita | Contrato OpenAPI atualizado no caminho `/api/admin/moderation`. |
| T6 | ⚠️ Parcial | Typecheck e testes focados passaram; faltam testes de integração da transação de pontos e da retenção/tombstone de mídia. |

## Critérios ancorados na spec

| Requisito | Resultado definido | Evidência independente | Resultado |
| --- | --- | --- | --- |
| QRM-001 | Duas janelas explícitas, sem vencimento generalizado | `supabase/migrations/20260805175529_create_dnj_homologation_schema.sql:76-83`; consulta remota retorna `qr_window_columns = 2` | ✅ Implementado; ⚠️ sem teste automatizado de migration/regra temporal. |
| EXP-001 | `experiences.kind` centraliza schedule, stand, activity, moment_challenge e special | `...create_dnj_homologation_schema.sql:44-64`, `:201` e `:178`; `design.md:14-16` | ✅ Implementado; ⚠️ requisito estrutural não tem teste automatizado. |
| MOD-001 | Somente Momentos têm moderação auditável | `...refine_qr_and_moment_moderation.sql:110-111`; `route.ts:27-34`; `route.test.ts:21-23` verifica consulta `moments` | ✅ PASS |
| MOD-002 | `deny_points`: privado, rejeitado, sem prêmio e arquivo preservado | `moderation.ts:22-28`; `moderation.test.ts:9-11` verifica exatamente `private/rejected/denied/available/false` | ✅ PASS no domínio; ⚠️ sem teste de persistência/Storage. |
| MOD-003 | `delete_photo`: privado, sem prêmio, mídia tombstoned e objeto removido pelo Next | Migration `:92-107`; `moderation.test.ts:13-15`; `route.test.ts:33-43` verifica `DELETE` no Storage e RPC | ✅ PASS no handler/domínio; ⚠️ não há teste de integração que confirme `media_objects.deleted_at`. |
| MOD-004 | `approved` publica e concede pontos exatamente uma vez via `point_entries` | Migration `:80-90` usa lock, `idempotency_key` determinística e `ON CONFLICT DO NOTHING` | ❌ GAP: não há teste que execute `moderate_moment` duas vezes e comprove uma só entrada/um só crédito. |
| MOD-005 | Fila “Moderar Momentos” com Aprovar, Não pontuar e Excluir foto | `admin-dashboard.tsx:80-93`; `admin-dashboard.test.tsx:17-25` | ✅ PASS |

## Gate executado pelo verificador

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ 0 erros |
| `npm exec vitest -- run src/lib/moments/moderation.test.ts src/app/api/admin/moderation/route.test.ts src/components/admin/admin-dashboard.test.tsx` | ✅ 3 arquivos, 8 testes, 0 falhas |
| Consulta SQL remota (colunas QR, RPC, índice e FK de auditoria) | ✅ `2, 1, 1, 1`, respectivamente |

O autor já havia executado o gate mais amplo (typecheck e unitários) antes desta revisão; este verificador não repetiu o build conforme solicitado. A baseline de quantidade de testes antes da feature não foi registrada, então não é possível medir delta com segurança.

## Sensor de discriminação

| Mutação em cópia temporária | Teste executado | Resultado |
| --- | --- | --- |
| Em `moderationOutcome`, trocar `delete_photo` de `photoStatus: "deleted"` para `"available"` | cópia de `moderation.test.ts` via Vitest | ✅ Morta: o caso “deletes inappropriate photos” falhou exatamente em `photoStatus`. |

**Profundidade**: leve (1 mutação de comportamento de maior risco no módulo puro). A cópia temporária foi restaurada com hash idêntico ao arquivo de origem após o teste.

## Qualidade e limites

| Checagem | Status |
| --- | --- |
| Mudanças cirúrgicas / sem escopo extra na rota nova | ✅ |
| Padrões existentes de autenticação Admin e cliente REST preservados | ✅ |
| Testes com valores de estado exatos para as três decisões | ✅ |
| Cobertura de happy/edge/error da rota | ⚠️ parcial: `delete_photo` e entrada inválida são cobertos; faltam `approved`, `deny_points`, 404 e falha do RPC. |
| Idempotência do prêmio no banco | ❌ não exercitada. |
| Consistência entre Storage e banco em falha do RPC | ⚠️ risco conhecido: o objeto é deletado antes do RPC; uma falha do RPC pode deixar a foto fisicamente removida com Momento ainda pendente. O design registra a coordenação pelo handler Next, mas não define compensação/outbox. |

## Planos de correção recomendados

1. **Maior — MOD-004**: criar teste de integração SQL isolado (ou fixture homologação) que chama `moderate_moment(..., 'approved')` duas vezes e afirma uma única `point_entries` positiva e um único incremento em `test_users.points`.
2. **Maior — MOD-002/MOD-003**: testar a função SQL para `deny_points` e `delete_photo`, verificando estados de `moments`, `media_objects.deleted_at` e ausência/reversão correta de ponto.
3. **Médio — rota Admin**: cobrir `approved`, `deny_points`, 404 e erro do RPC; definir estratégia de compensação para a exclusão de Storage caso o RPC falhe.

## Resumo

**Spec-anchored check**: 5 requisitos com evidência verificável de implementação; 2 lacunas de teste persistente (QRM/EXP estruturais) e 1 lacuna crítica de comportamento (MOD-004).  
**Sensor**: 1/1 mutação morta.  
**Gate do verificador**: typecheck e 8 testes focados passaram.  
**Veredito**: ⚠️ pronto para revisão funcional, mas não para declarar a semântica de pontos “exatamente uma vez” como validada até existir o teste de integração recomendado.

## Adendo pós-validação — correção do autor

Após esta revisão independente, o teste recomendado foi criado em
`supabase/tests/moderate_moment_idempotency.sql` e executado contra o Supabase de
homologação. Ele aprova o mesmo Momento duas vezes e afirma exatamente uma
`point_entries` de prêmio e `17` pontos no usuário. Passou e deixou `0` usuários
de fixture no banco.

O teste revelou e a migration `20260805183926_fix_moderate_moment_row_assignment.sql`
corrigiu uma atribuição de linha no RPC (`select m.* into v_moment`). A migration-base
também foi corrigida para instalações novas. A ressalva de coordenação Storage/RPC
permanece conhecida; não altera a semântica de pontuação.
