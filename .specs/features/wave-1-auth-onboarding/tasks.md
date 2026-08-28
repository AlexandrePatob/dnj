# Onda 1A — Tarefas

| Tarefa | Requisito | Evidência de pronto |
| --- | --- | --- |
| T1 | AUTH-01, AUTH-02 | Concluída — Login renderiza Google → OU → e-mail; botão GIS responde à largura do container. |
| T2 | AUTH-03, AUTH-06 | Concluída — Texto e ações de e-mail seguem o fluxo único de código, com estados de erro/reenvio preservados. |
| T3 | AUTH-04, AUTH-05 | Concluída — Roteamento pós-verificação e retorno de onboarding não levam à verificação sem e-mail. |
| T4 | AUTH-01–06 | Concluída — Testes unitários cobrem ordem, e-mail novo/existente e redirecionamentos. |
| T5 | AUTH-01–06 | Concluída — Typecheck, lint, testes relevantes e validação manual do usuário aprovados. |

**Gate:** `npm run typecheck`, `npm run lint`, testes Vitest afetados e teste manual do usuário antes de marcar a onda como concluída.
