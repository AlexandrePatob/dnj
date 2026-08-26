# Design — DNJ 2K26 API persistida

```mermaid
flowchart LR
  App[Participante Next] --> Api[/api/v1]
  Api --> Session[Sessão de homologação assinada]
  Api --> DB[(Supabase PostgreSQL)]
  DB --> Data[events · spaces · experiences · groups · participations · moments]
  Admin[/admin] --> DB
```

## Decisões

1. O navegador somente chama a API same-origin do Next. A chave `service_role` permanece encapsulada em `supabase-server.ts`.
2. A sessão de homologação é um token assinado pelo servidor, contendo somente o identificador do participante e expiração. Não é uma chave Supabase e não autoriza acesso direto ao banco.
3. A programação usa `experiences` com `kind = schedule`; `spaces` representam os setores do mapa. `starts_at` e `ends_at` são `timestamptz` com offset `-03` no seed.
4. A API calcula o estado de agenda (`live`, `upcoming`, `ended`) no servidor. O recorte da Home contém itens ao vivo e próximos até 15 minutos antes; a agenda completa continua acessível pela tela de cronograma.
5. Grupos pertencem ao evento e a adesão do participante é persistida na coluna relacional já prevista pelo schema, sem criar outro catálogo no cliente.
6. QR, Momentos e curtidas devem reutilizar as entidades canônicas existentes. A transação de pontos permanece no banco/route handler, nunca no React.

## Rotas

| Rota | Função |
| --- | --- |
| `POST /api/v1/auth/sms` | Solicita código de homologação sem envio externo. |
| `POST /api/v1/auth/verification-code` | Valida código e cria/atualiza `test_users`; retorna sessão. |
| `GET /api/v1/groups` | Lista/pesquisa grupos do evento. |
| `POST /api/v1/users/me/group` | Associa participante ao grupo. |
| `GET /api/v1/schedule` | Agenda persistida por espaço/setor e recorte Home. |
| `POST /api/v1/qr/validate` | Valida QR e grava participação idempotente. |
| `GET,POST /api/v1/moments` | Lista e cria Momentos no banco/Storage. |
| `POST /api/v1/gallery/:id/likes` | Alterna curtida persistida. |
| `GET /api/v1/participations/current` | Recupera participação corrente do usuário. |

