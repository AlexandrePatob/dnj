# Validação — telas ao vivo de ranking

**Resultado:** PASS  
**Escopo:** `/api/display`, `/tv`, `/telao` e `LiveRankingDisplay`.

| Requisito | Evidência | Resultado |
| --- | --- | --- |
| D-01 — rankings individuais e por grupo persistidos | `src/app/api/display/route.test.ts:59` valida os dois rankings derivados; `src/features/display/live-ranking-display.test.tsx:39-41` renderiza nome, grupo e pontos. | Passou |
| D-02 — rotação em 12 s e atualização em 5 s | `src/features/display/live-ranking-display.test.tsx:109-118` valida a troca para grupos e exatamente três leituras (inicial, 5 s e 10 s). | Passou |
| D-03 — evento especial direcionado substitui a tela sem QR | `src/app/api/display/route.test.ts:59-86` valida o evento `tv` e a ausência de `qrPayload`; `src/app/api/display/route.test.ts:112-113` recusa o evento fora do destino; `src/features/display/live-ranking-display.test.tsx:68-71` valida o teaser visível. | Passou |
| D-04 — retorno ao ranking ao encerrar | `src/app/api/display/route.test.ts:139-140` valida que evento expirado retorna `specialEvent: null`. | Passou |

## Gate

- `npm run typecheck`: passou.
- `npm run test:unit`: 70 arquivos e 226 testes passaram.
- `git diff --check`: passou, sem whitespace errors.

## Sensor de discriminação

Revisão independente em modo standalone: a rotação depende de `12_000` ms, o polling de `5_000` ms e a sobreposição depende de `specialEvent`. Alterações nesses comportamentos fariam falhar, respectivamente, as asserções de título/contagem de buscas, teaser visível e evento expirado/não direcionado. Nenhum desvio encontrado.
