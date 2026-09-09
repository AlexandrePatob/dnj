# Homologação local do DNJ

Procedimento operacional para agentes subirem o Front e o Back em conjunto, homologarem uma tarefa e entregarem a PR com segurança.

O Front usa `pnpm@11.19.0`. Cada worktree deve executar `pnpm install
--frozen-lockfile`; o store global é compartilhado e o `node_modules` local é
montado por links. O script `pnpm dev:local` faz essa instalação
automaticamente quando necessário. As Functions continuam usando npm por
terem ciclo de deploy independente.

## 1. Identificar o escopo

Antes de alterar qualquer arquivo, registrar:

- card Jira e critérios de aceite;
- PRs e branches da tarefa;
- diretório do Front e diretório do Back;
- portas, URLs locais e túnel HTTPS em uso;
- processos e containers já ativos.

Branches-base do projeto:

| Projeto | Base |
| ---|---|
| Front | `main` |
| Back | `develop` |

## 2. Atualizar as bases

Executar em cada repositório, sem pular o `fetch`:

```powershell
git status --short
git fetch origin --prune
```

No Front:

```powershell
git checkout main
git pull --ff-only origin main
```

No Back:

```powershell
git checkout develop
git pull --ff-only origin develop
```

Depois, atualizar a branch da tarefa com a base correspondente. Se houver conflito, parar e revisar arquivo por arquivo; nunca descartar mudanças da tarefa automaticamente.

## 3. Limpeza e encerramento do ambiente anterior

Preservar alterações da tarefa e remover somente artefatos descartáveis previamente autorizados. Conferir novamente:

```powershell
git status --short
```

Encerrar processos antigos de Next, Go e túneis Cloudflare. Confirmar que não existe outro processo respondendo nas portas do ambiente. Não iniciar um novo túnel antes de parar o anterior, pois o Front pode continuar apontando para uma API antiga.

## 4. Subir o ambiente

Seguir o `docker-compose` e as variáveis definidos pelo projeto do Back. A ordem recomendada é:

1. Postgres, MinIO e demais dependências Docker;
2. migrations e seeds necessários;
3. Back na branch da tarefa;
4. Front na branch da tarefa;
5. túnel HTTPS, se necessário para PWA, cookies ou câmera.

Registrar a URL final da API e conferir se o Front usa exatamente essa URL. Não misturar Front de uma execução com Back ou túnel de outra.

Modos de inicialização:

```powershell
pnpm dev:local        # Goahead: processos ocultos e aviso somente ao ficar pronto
pnpm dev:local:debug  # Debug: uma janela consolidada acompanhando os logs
pnpm dev:local:stop   # encerra processos, túnel e a janela de Debug
```

O modo padrão não abre vários terminais. A API local escuta em `127.0.0.1`,
evitando exposição desnecessária e reduzindo prompts do Windows Firewall. O
túnel público aponta somente para o Front; não criar regra de firewall para
expor a API diretamente.

Validações mínimas:

```powershell
curl.exe http://localhost:<porta-back>/healthcheck
git rev-parse --short HEAD
```

## 5. Checklist obrigatório para o erro 403

Quando aparecer `403`, validar nesta ordem:

1. A requisição está indo para a API da execução atual, não para um túnel antigo?
2. O usuário está autenticado com cookies/token atuais?
3. O token está chegando nos headers esperados?
4. CORS permite a origem atual do Front?
5. O usuário existe, está onboarded e tem o `role` esperado?
6. A permissão exigida pelo endpoint é compatível com o usuário?
7. O `403` é realmente autorização ou o domínio deveria retornar um erro de negócio específico?

Não mascarar o retorno da API com fallback genérico. Diferenciar e exibir mensagens próprias para:

- `FORBIDDEN`: participação ou papel não permitido;
- `SCORING_CLOSED`: pontuação fechada;
- `QR_UNAVAILABLE`: QR inválido, expirado ou indisponível;
- cooldown: usuário deve aguardar o período informado.

No DevTools, conferir `Request URL`, método, status, headers, cookies e Response. No Back, correlacionar `requestId` com os logs.

## 6. Homologar uma tarefa

Para cada card:

1. Ler objetivo, escopo e critérios de aceite.
2. Executar o fluxo principal no Front.
3. Conferir as chamadas no Network e o retorno real da API.
4. Testar estados de sucesso, falha, recarga, reconexão, clique repetido e latência quando aplicável.
5. Confirmar persistência no banco quando o card alterar estado.
6. Registrar evidências e problemas encontrados.
7. Corrigir, testar novamente e só então preparar a PR.

## 7. Validação técnica antes da PR

No Front:

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

No Back, usar os comandos do Makefile/workflow do projeto, incluindo:

```powershell
go test ./...
go test -race ./...
```

Também validar migrations, contrato OpenAPI e demais checks do workflow. Se o ambiente local não tiver ferramentas do race detector, registrar a limitação e deixar a confirmação para o CI; não declarar o check como validado localmente.

## 8. Commit, PR e Jira

- Commitar somente arquivos da tarefa.
- Fazer push da branch correta.
- Confirmar que a PR aponta para `main` no Front ou `develop` no Back.
- Acompanhar todos os checks do GitHub.
- Após aprovação, confirmar que a PR foi realmente mergeada.
- Comentar no Jira a PR, commit, testes e resultado da homologação.
- Mover o card para `Concluída`.
- Buscar o próximo card em revisão e repetir este procedimento.

## 9. Diagnóstico rápido

| Sintoma | Verificação principal |
|---|---|
| Front chama URL antiga | variáveis do Front, cache e túnel ativo |
| `403 FORBIDDEN` | sessão, role, onboarding e regra de participação |
| `SCORING_CLOSED` aparece como cooldown | mapeamento do código de erro no Front |
| `QR_UNAVAILABLE` inesperado | token, validade, status e espaço/evento |
| chamada duplicada | effects, revalidação e Network após abrir a tela |
| Admin sem alteração esperada | branch, migration, API em execução e usuário/role |
| build falha após merge | base atualizada e typecheck local antes do push |

Este documento deve ser atualizado sempre que um erro de ambiente exigir uma etapa adicional permanente.
