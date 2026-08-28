# DNJ 2026 — Ordem de Entrega

## Onda 1 — Contratos, entrada e base de estado

P02 Login, P27 Onboarding, P09 Ranking, P05 Nomenclatura e P19 Push.

Saída: identidade, sessão, perfil incompleto, pontos e notificações têm fonte e contratos inequívocos.

## Onda 2 — Programação e experiência do participante

P06 Programação, P07 Home agora, P08 Mapa, P03 Header, P04 Home e P18 Conta.

Saída: navegação do participante reflete dados de programação e pontuação sem duplicação visual.

## Onda 3 — Moments e QR

P13 Desafio ativo, P14 Card reutilizável, P10 Estrutura, P11 Feed/likes, P12 Marca d'água, P20 Moderação e P25 QR.

Saída: foto livre e desafio operam com vínculo explícito, uma única concessão de pontos e moderação rastreável.

## Onda 4 — Operação do evento

P01 Confissões, P17 Filas visual, P15 Radicalidade, P21 Atividades Admin, P22 Administração de eventos, P16 Cronometrista, P23 TV/Telão, P24 Patrocinadores e P26 Auditoria gestores.

Saída: operação de filas, atividades e eventos mantém estados coerentes entre gestor e exibições públicas.

## Onda 5 — Equalização final

P28 Revisão visual final.

Saída: testes funcionais já verdes e consistência visual comprovada, com prioridade em mobile.

## Gates por onda

| Onda | Gate mínimo |
| --- | --- |
| 1–4 | testes unitários afetados, typecheck, lint e teste de integração/e2e do fluxo |
| 3–4 | teste explícito de idempotência/estado para toda mutação |
| 2 e 5 | revisão Playwright/visual em mobile e desktop; snapshots não são atualizados sem revisão |
| Final | `npm run validate`, gates relevantes da API e verificação independente contra P01–P28 |

## Riscos já identificados

| Risco | Evidência | Mitigação |
| --- | --- | --- |
| Frontend monolítico | o grafo aponta `DnjApp()` como nó central; há estado e mocks concentrados | extrair por domínio somente ao tocar cada fluxo, preservando testes e contratos |
| Contrato/implementação antiga | README do front ainda declara mocks, enquanto o handoff V2 já declara fluxos prontos | comparar chamadas reais com OpenAPI/handoff antes de trocar cada fonte |
| Fila fora da V2 | AD-010 exige Firestore e dados mínimos | validar regras e acesso no módulo de fila sem transportar dados pastorais ao backend regular |
| Concorrência de pontos | QR, Moments, likes e ações de gestor são mutações | usar idempotência e testes de repetição/concorrência do contrato V2 |
| TV divergente | tela pública pode consumir filtro/canal diferente | cobrir a cadeia admin → persistência → TV → Telão → encerramento em teste integrado |
