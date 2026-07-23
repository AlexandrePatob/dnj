# DNJ Modularization Tasks

## Baseline unblock

- [x] B0-01 Isolar aviso de conectividade no teste WebKit para não competir com aviso de atualização; provar reconexão em Chromium e WebKit (`2f231ce`).
- [x] B0-02 Revisar diferenças visuais manualmente; o usuário aprovou continuidade sem atualização de snapshots.

## Fase 1

- [x] R1-01 Extrair tipos, constantes e fixtures de `dnj-app.tsx`.
- [x] R1-02 Extrair somente componentes UI reutilizados por mais de uma feature.
- [x] R1-03 Extrair `AppShell`, `TopBar` e `BottomNav` sem alterar estilos.
- [x] R1-04 Extrair autenticação e cadastro.
- [x] R1-05 Extrair Home.
- [x] R1-06 Extrair Game, preservando scanner visual.
- [x] R1-07 Extrair Fila.
- [x] R1-08 Extrair Conta.
- [x] R1-09 Reduzir `DnjApp` a composição, sessão e navegação.
- [x] R1-10 Validação visual manual pendente; snapshots não executados nem atualizados.

## Gate por tarefa

- Executar testes co-localizados, `npm.cmd run typecheck`, `npm.cmd run lint` e testes unitários relevantes.
- Executar `npm.cmd run test:visual` nas tarefas que modificarem layout, conteúdo renderizado ou navegação.
- Nunca atualizar snapshots para fazer o gate passar.
