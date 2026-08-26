# DNJ Modularization Specification

## Problem

`src/components/dnj-app.tsx` ainda reúne telas, estado de sessão, navegação, fixtures e componentes reutilizáveis. Essa concentração dificulta evolução segura do scanner, participação e galeria.

## Goal

Executar `ARCH-01`: modularizar a experiência atual sem regressão visual ou funcional. `DnjApp` permanece orquestrador de sessão, navegação e composição durante toda a Fase 1.

## Out of Scope

- Redesign visual, safe areas, scanner funcional, galeria, mocks de participação e integração backend.
- Migração da navegação para rotas Next.
- Atualização automática de snapshots.

## Acceptance Criteria

1. **ARCH-01** — Cada extração preserva textos, classes, ordem visual, interações e transições da tela correspondente.
2. **ARCH-02** — Tipos, constantes e fixtures deixam `dnj-app.tsx` antes da extração de telas; DTOs de API continuam fora das features de interface.
3. **ARCH-03** — Componentes globais entram em `components/ui` ou `components/layout` somente quando usados por mais de uma feature; componentes de uso único ficam na feature.
4. **ARCH-04** — Cada tarefa tem testes co-localizados, typecheck, lint, testes unitários relevantes e comparação visual sem diferença não aprovada.
5. **ARCH-05** — Nenhuma tarefa de modularização atualiza snapshots sem revisão explícita da diferença visual.
6. **ARCH-06** — Ao término, `DnjApp` contém apenas bootstrap de sessão, estado/ações de navegação e composição das features extraídas.

## Baseline — 2026-07-22

- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado com 144 warnings preexistentes, incluindo scripts em `.agents` e imports legados em `dnj-app.tsx`.
- `npm.cmd run test:unit`: 113/113 aprovado.
- `npm.cmd run build`: aprovado quando Google Fonts está acessível.
- `npm.cmd run test:e2e`: 5/6 aprovado; WebKit falha em `tests/e2e/pwa-flow.spec.ts:30` porque `getByRole("status")` encontra aviso de atualização em vez de reconexão.
- `npm.cmd run test:visual`: Login 2/2 aprovado; Home, Game, Fila e Conta 6/8 divergem dos snapshots versionados. Nenhum snapshot foi atualizado.

O usuário aprovou continuidade sem bloquear por snapshots. Diferenças visuais serão validadas manualmente e nenhum snapshot será atualizado sem instrução explícita.

## Requirement Traceability

| Requirement | Status |
| --- | --- |
| ARCH-01 | Planned |
| ARCH-02 | Planned |
| ARCH-03 | Planned |
| ARCH-04 | Manual visual validation approved |
| ARCH-05 | Active |
| ARCH-06 | Planned |
