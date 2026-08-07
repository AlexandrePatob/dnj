# DNJ 2K26 — API persistida de homologação: validação (revisão 3)

**Data:** 2026-08-05  
**Spec:** `.specs/features/dnj-supabase-live-api/spec.md`  
**Verificador:** independente do autor  
**Escopo:** working tree (não há commits atômicos que delimitem a feature)

## Veredito: FAIL

O gate está verde e os fluxos participantes agora usam handlers `/api/v1` com Supabase; o mapa também passou a carregar seus espaços pela API. A feature ainda não pode ser declarada pronta porque a cadeia de migrations não sobe em um banco novo: o seed, que é anterior, já depende de uma coluna criada somente na migration seguinte. Há também divergências verificáveis entre handlers e OpenAPI.

## Gate

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run test:unit` | **54 arquivos / 193 testes passaram / 0 falharam** |

Nenhum build foi executado, conforme a orientação do solicitante.

## Critérios ancorados na spec

| ID | Resultado definido | Evidência | Resultado |
| --- | --- | --- |
| API-01 | Seed oficial reaplicável com evento, espaços, agenda e seis grupos. | O seed atual insere os seis grupos por `(event_id,name)`, o que é correto para a base já atualizada. Porém `20260805201500_seed_dnj_2k26_program.sql` executa antes de `20260805210000_event_groups_and_atomic_qr.sql`; a primeira migration cria `groups` apenas com `id,name,created_at`, enquanto o seed já executa `insert into public.groups (event_id, name)`. | ❌ **FAIL** — um banco limpo falha antes de chegar na migration que adiciona `event_id`. |
| API-02 | Agenda persistida, por setor, com estado temporal no servidor. | `schedule/route.ts` deriva `live/upcoming/scheduled/ended`; teste cobre simultaneidade e exatamente 15 min. | ✅ PASS (falta teste direto do filtro `sector`, mas a implementação o aplica). |
| API-03 | Seis grupos do evento por API e escolha autenticada persistida. | `groups` filtra `event_id`; `users/me/group` valida grupo do evento e atualiza só o usuário da sessão. | ✅ PASS para o fluxo principal; 404 de grupo inexistente ainda não tem teste. |
| API-04 | SMS local `123456` persiste participante e entrega token do servidor. | Handlers de SMS/verificação e `participant-session` têm testes de código inválido, assinatura e expiração. | ✅ PASS. |
| API-05 | QR, participações, Momentos e likes usam API/Supabase, sem consumidor participante de `/api/mock`. | QR usa a RPC transacional `validate_dnj_qr`; Momentos/likes e mapa chamam `/api/v1`. | ✅ PASS no fluxo principal; testes dos erros QR/Momento/like ainda são parciais. |
| API-06 | Home sem cards aposentados e agenda Now no DNJ por API, simultâneos/próximos 15 min. | `home-screen` consome `scheduleApi`; teste da Home e teste temporal de rota presentes. | ✅ PASS automatizado (UAT visual permanece do usuário). |
| API-07 | OpenAPI acompanha rotas e resultados/erros de domínio. | O contrato lista as famílias principais, mas há respostas efetivas não documentadas. | ❌ **FAIL** — ver divergências abaixo. |

## Divergências de contrato (API-07)

1. `POST /qr/validate` responde **200** quando a RPC recupera uma participação idempotente (`created: false`), mas o OpenAPI só declara **201** e ainda descreve 201 como “created or recovered”.
2. `POST /gallery/{momentId}/likes` responde `{ likedByCurrentUser: boolean }`; o OpenAPI declara uma resposta `Moment` completa.
3. O handler usado pelas imagens privadas é `GET /api/v1/media/[...storageKey]`, mas não há rota correspondente no OpenAPI. `Moment.imageUrl` depende dela.
4. A suíte não prova os resultados de domínio documentados para QR expirado/limite/cooldown/idempotência, Moment inválido/sem participação/tamanho excedido, nem os dois estados do toggle de like. A spec exige cobertura de resultados e erros definidos.

## Discrimination sensor (scratch, sem editar o worktree)

| Mutação | Teste executado | Resultado |
| --- | --- | --- |
| Trocar o limite de agenda de `<= 15 min` para `< 15 min`. | `schedule/route.test.ts` | **Morta**: o próximo item deixou de aparecer; teste esperava 3 e recebeu 2. |
| Trocar a resposta de QR sem sessão de 401 para 200. | `qr/validate/route.test.ts` | **Morta**: teste esperava 401 e recebeu 200. |

**Sensor:** 2/2 mutações críticas mortas. Ele confirma cobertura para a borda de 15 minutos e autenticação de QR, mas não elimina as lacunas de erro/contrato listadas acima.

## Correções necessárias

1. **Blocker — ordenar a evolução de `groups`:** mover a criação de `groups.event_id`/unicidade para antes do seed, ou fazer o seed original compatível com a estrutura anterior e adicionar os vínculos em uma migration posterior. Validar uma aplicação integral em banco vazio e uma segunda aplicação sem duplicação.
2. **Major — alinhar OpenAPI aos handlers:** documentar 200 idempotente de QR; corrigir o schema do like ou alterar o handler; documentar `/media/{storageKey}` (ou não expô-lo como endpoint do contrato).
3. **Major — completar testes de domínio:** cobrir, no mínimo, grupo inexistente; QR expirado/limite/cooldown/retry idempotente; Moment sem participação/tipo ou tamanho inválido; like sem autenticação e os dois toggles.

## Conclusão

O uso de API real e os dados do evento estão substancialmente implementados, e o gate está limpo. Ainda assim, a migration inicial quebrada torna a base não reprodutível e as divergências OpenAPI tornam os contratos de transição para Go/PostgreSQL imprecisos. Após as três correções acima, é necessária uma nova verificação independente.
