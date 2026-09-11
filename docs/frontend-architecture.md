# Arquitetura do frontend

## Decisões principais

O App Router é mantido como camada de composição e metadados. Para garantir equivalência visual verificável, `DnjApp` preserva neste momento a composição e todas as classes Tailwind do `App.tsx` original. A separação por feature deve ser feita depois, como refatoração puramente mecânica, com comparação visual antes e depois.

O cliente HTTP centraliza URL base externa, timeout, parsing, bearer token, refresh único e normalização de erros. Os contratos externos ficam separados dos tipos de domínio para impedir que mudanças pequenas no backend se espalhem pela UI.

## Sessão

A API externa devolve `accessToken` (JWT de 15 minutos) e `csrfToken`, enquanto mantém o refresh em cookie. O frontend persiste o bearer no `localStorage` (`src/lib/auth-storage.ts`), envia `Authorization: Bearer` e inclui as credenciais/CSRF da API. Um `401` dispara um único refresh compartilhado entre requisições concorrentes (`POST /auth/refresh`), persiste o bearer rotacionado e repete a requisição original; se a renovação falhar, as credenciais locais são removidas e o `401` é propagado. O logout limpa o armazenamento local mesmo com a API indisponível. Não há sessão no Next — Participante, Admin e Gestor restauram a sessão por `GET /auth/session` e validam o papel retornado.

## Novos domínios

Para ranking, pontos, missões, mapa e filas, criar um arquivo de serviço e um arquivo de contratos em `src/lib/api`. A feature deve receber dados de domínio já mapeados, sem importar DTOs diretamente.
