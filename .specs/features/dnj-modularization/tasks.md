# DNJ Modularization Tasks

## Baseline unblock

- [x] B0-01 Isolar aviso de conectividade no teste WebKit para não competir com aviso de atualização; provar reconexão em Chromium e WebKit (`2f231ce`).
- [ ] B0-02 Revisar cada diferença visual atual contra o snapshot versionado; corrigir regressão ou registrar aprovação explícita antes de qualquer snapshot mudar.

## Fase 1

- [ ] R1-01 Extrair tipos, constantes e fixtures de `dnj-app.tsx`.
- [ ] R1-02 Extrair somente componentes UI reutilizados por mais de uma feature.
- [ ] R1-03 Extrair `AppShell`, `TopBar` e `BottomNav` sem alterar estilos.
- [ ] R1-04 Extrair autenticação e cadastro.
- [ ] R1-05 Extrair Home.
- [ ] R1-06 Extrair Game, preservando scanner visual.
- [ ] R1-07 Extrair Fila.
- [ ] R1-08 Extrair Conta.
- [ ] R1-09 Reduzir `DnjApp` a composição, sessão e navegação.
- [ ] R1-10 Executar equivalência visual completa.

## Gate por tarefa

- Executar testes co-localizados, `npm.cmd run typecheck`, `npm.cmd run lint` e testes unitários relevantes.
- Executar `npm.cmd run test:visual` nas tarefas que modificarem layout, conteúdo renderizado ou navegação.
- Nunca atualizar snapshots para fazer o gate passar.
