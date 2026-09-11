# Arquitetura do frontend

## Decisões principais

O App Router é mantido como camada de composição e metadados. Para garantir equivalência visual verificável, `DnjApp` preserva neste momento a composição e todas as classes Tailwind do `App.tsx` original. A separação por feature deve ser feita depois, como refatoração puramente mecânica, com comparação visual antes e depois.

O cliente HTTP centraliza URL base externa, timeout, parsing, bearer token, refresh único e normalização de erros. Os contratos externos ficam separados dos tipos de domínio para impedir que mudanças pequenas no backend se espalhem pela UI.

## Sessão

A API externa devolve `accessToken` (JWT de 15 minutos) e `refreshToken` (opaco, 30 dias). O frontend persiste os dois em `localStorage` (`src/lib/auth-storage.ts`) e envia `Authorization: Bearer` em toda chamada. Um `401` dispara um único refresh compartilhado entre requisições concorrentes (`POST /auth/refresh` com `{ "refreshToken" }`, rotação do par) e repete a requisição original; se a renovação falhar, as credenciais são removidas e o `401` é propagado. O logout envia o refresh token para revogação e limpa o armazenamento local mesmo com a API indisponível. Não há cookies, CSRF nem sessão no Next — Participante, Admin e Gestor restauram a sessão por `GET /auth/session` e validam o papel retornado.

## Novos domínios

Para ranking, pontos, missões, mapa e filas, criar um arquivo de serviço e um arquivo de contratos em `src/lib/api`. A feature deve receber dados de domínio já mapeados, sem importar DTOs diretamente.
