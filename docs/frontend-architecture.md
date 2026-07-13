# Arquitetura do frontend

## Decisões principais

O App Router é mantido como camada de composição e metadados. Para garantir equivalência visual verificável, `DnjApp` preserva neste momento a composição e todas as classes Tailwind do `App.tsx` original. A separação por feature deve ser feita depois, como refatoração puramente mecânica, com comparação visual antes e depois.

O cliente HTTP centraliza URL base, timeout, parsing, cookie, Bearer e normalização de erros. Os contratos externos ficam separados dos tipos de domínio para impedir que mudanças pequenas no backend se espalhem pela UI.

## Sessão

A API atual cria um cookie HttpOnly e também retorna o token no corpo. O cookie é o transporte preferencial. Como ainda não existe um endpoint de sessão (`/users/me`), o frontend persiste temporariamente usuário e token em chaves separadas e versionadas. Quando esse endpoint existir:

1. Remover a persistência do token no `localStorage`.
2. Buscar o usuário atual no carregamento usando apenas `credentials: include`.
3. Tratar `401` no cliente HTTP limpando apenas o estado local da sessão.

## Novos domínios

Para ranking, pontos, missões, mapa e filas, criar um arquivo de serviço e um arquivo de contratos em `src/lib/api`. A feature deve receber dados de domínio já mapeados, sem importar DTOs diretamente.
