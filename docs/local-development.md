# Desenvolvimento local integrado

Este comando sobe o frontend, a API Go, PostgreSQL, MinIO e dois túneis
temporários Cloudflare. Ele é exclusivo para desenvolvimento local: não cria
recursos Cloudflare persistentes, não altera `.env` e preserva os volumes ao
parar.

## Pré-requisitos

- Docker Desktop em execução;
- Node 24, Corepack/pnpm 11 e dependências do frontend (`pnpm install`);
- Go 1.24+;
- `cloudflared` no `PATH`;
- os repositórios `dnj-game-front` e `dnj-game-api` como pastas irmãs.

## Iniciar

```powershell
pnpm dev:local
```

O modo padrão é `Goahead`: processos e túneis rodam em segundo plano, com
logs em `.local/logs/`, e o comando informa apenas quando o ambiente estiver
pronto. Para acompanhar tudo em uma única janela de logs:

```powershell
pnpm dev:local:debug
```

O modo Debug não abre uma janela para cada serviço. Para evitar prompts do
Windows Firewall, a API local escuta somente em `127.0.0.1`; o acesso externo
continua sendo feito pelo túnel do frontend.

Se o worktree ainda não tiver dependências, o script executa automaticamente
`pnpm install --frozen-lockfile`. O pnpm reutiliza o store global e cria apenas
links locais compatíveis com a branch.

O comando imprime uma URL `https://…trycloudflare.com` para o frontend e outra
para o MinIO. A URL do frontend é a única que deve ser usada no navegador:

- `https://…trycloudflare.com` → Next.js local;
- `https://…trycloudflare.com/api/v2` → proxy Next.js → API local (`8081`);
- a API assina uploads e downloads para a URL temporária do MinIO;
- PostgreSQL fica em `localhost:55432` e o console MinIO em
  `http://localhost:59001`.

O script injeta os valores temporários somente no processo da API:
`FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` e `S3_PUBLIC_ENDPOINT`. Assim, cookies,
proxy de API e URLs S3 usam o ambiente atual sem gravar a URL aleatória de um
túnel no repositório. Os arquivos de log ficam em `.local/logs/`.

## Parar

```powershell
pnpm dev:local:stop
```

Isso encerra frontend, API e túneis, e executa `docker compose down` no backend.
Os dados locais são preservados. Para apagar dados, use conscientemente
`make db-reset` dentro do backend.

## Limitações locais

Cada execução do Quick Tunnel recebe URLs novas. Não as use em configurações
persistentes. O login Google real exige cadastrar a URL temporária como origem
autorizada no Google; para o fluxo local, mantenha a simulação de autenticação
configurada no `.env.local`. O Service Worker não é validado no `next dev`;
para validar PWA, use uma build local separadamente.
