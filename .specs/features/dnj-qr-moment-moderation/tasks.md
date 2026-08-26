# Tasks

| ID | Entrega | Dependencia | Verificacao |
| --- | --- | --- | --- |
| T1 | Migration de janelas QR e transicoes de moderacao | - | SQL remoto consulta as novas colunas, funcao e indices |
| T2 | Modulo puro de estados de moderacao e testes | T1 | testes unitarios de cada decisao |
| T3 | Endpoint Admin conectado ao dominio canônico | T1, T2 | testes de request/validacao |
| T4 | Tela Admin “Moderar Momentos” | T3 | testes de interface e typecheck |
| T5 | OpenAPI e documentacao alinhados | T1-T4 | lint OpenAPI |
| T6 | Validacao final | T1-T5 | typecheck, unitarios, build, OpenAPI e consulta Supabase |
| T7 | Regressao SQL de credito idempotente | T1 | chama `moderate_moment` duas vezes e comprova uma entrada / um credito |
