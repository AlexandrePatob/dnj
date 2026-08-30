# Onda 3B — Tarefas do Momento de Desafio

**Design**: `.specs/features/wave-3b-challenge-moments/design.md`
**Status**: Proposto — não iniciar sem aprovação explícita.

## Test Coverage Matrix

> Base: `README.md`, `package.json`, `dnj-game-api/AGENTS.md` e testes existentes. A implementação inclui frontend e API; cada tarefa carrega seus testes.

| Camada | Teste exigido | Cobertura | Gate |
| --- | --- | --- | --- |
| Serviço Go | Unitário | Janela, atividade ausente/múltipla, duplicidade e idempotência | `go test ./...` |
| Handler/rota Go | Integração | Corpo estrito, 201, 409 e autenticação | `go test ./...` |
| Migration/repositório | Migração/integração | Constraints e unicidade em concorrência | `make test-migrations` e `make test-cover-check` |
| Cliente/composer React | Unitário | Rota correta por modo e sem QR no desafio | `npm run test:unit` |
| Fluxo de participante | E2E | Foto de desafio pontua; foto livre não pontua | `npm run test:e2e` |

## Plano de execução

```text
Fase 1: T1 → T2
Fase 2: T3 → T4 → T5
Fase 3: T6 → T7
Fase 4: T8
```

### Fase 1 — Contrato e persistência

#### T1: Registrar endpoint de desafio no contrato V2

**Dependências**: nenhuma
**Requisito**: CHM-02, CHM-03, CHM-08
**Entrega**: DTO estrito e `POST /moments/challenge`; remover a semântica de header de modo do endpoint livre.
**Testes**: handler/rota.
**Gate**: `go test ./...`.

#### T2: Migrar constraints de Momento e pontos

**Dependências**: T1
**Requisito**: CHM-04, CHM-06, CHM-07
**Entrega**: migration idempotente, `participation_id` opcional para desafio e índice único parcial por participante/atividade.
**Testes**: migration e concorrência.
**Gate**: `make test-migrations` e `make test-cover-check`.

### Fase 2 — Regra transacional

#### T3: Resolver o desafio elegível no backend

**Dependências**: T2
**Requisito**: CHM-03, CHM-08
**Entrega**: consulta única por desafio ativo, `allowsMoment` e janela vigente; zero ou múltiplos retornam conflito.
**Testes**: serviço unitário.
**Gate**: `go test ./...`.

#### T4: Criar Momento de desafio e pontuar uma única vez

**Dependências**: T3
**Requisito**: CHM-04, CHM-06, CHM-07
**Entrega**: transação de Momento + lançamento de pontos, conversão de conflito único para erro de domínio.
**Testes**: serviço e integração.
**Gate**: `make test-cover-check`.

#### T5: Retornar estado pós-publicação ao participante

**Dependências**: T4
**Requisito**: CHM-05, CHM-12
**Entrega**: resposta de criação suficiente para saldo/histórico e consulta de desafio que exclui conclusão do usuário.
**Testes**: handler/serviço.
**Gate**: `go test ./...`.

### Fase 3 — Cliente explícito

#### T6: Separar publicação livre e de desafio no cliente

**Dependências**: T1
**Requisito**: CHM-02, CHM-09, CHM-10
**Entrega**: duas funções de API, sem header e sem `participationId` no caminho de desafio.
**Testes**: unitários do cliente.
**Gate**: `npm run test:unit` e `npm run typecheck`.

#### T7: Abrir o composer no modo correto e refletir o sucesso

**Dependências**: T5, T6
**Requisito**: CHM-01, CHM-05, CHM-09, CHM-10
**Entrega**: card/notificação usam modo desafio; aba Momentos usa livre; refresh de pontos/feed/card após sucesso.
**Testes**: unitários e E2E.
**Gate**: `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run test:e2e`.

### Fase 4 — Notificação operacional

#### T8: Notificar o início e suprimir após conclusão

**Dependências**: T5, T7
**Requisito**: CHM-11, CHM-12
**Entrega**: job/ativação de atividade notifica participantes e a conclusão torna a ação indisponível.
**Testes**: serviço/notificação e E2E do deep-link.
**Gate**: gates completos de API e frontend.

## Verificação de granularidade e dependências

| Tarefa | Escopo | Dependências corretas |
| --- | --- | --- |
| T1 | Contrato HTTP | ✅ |
| T2 | Schema/índices | ✅ depende do contrato |
| T3 | Consulta de elegibilidade | ✅ depende do schema |
| T4 | Transação de pontuação | ✅ depende da elegibilidade |
| T5 | Estado de retorno | ✅ depende da criação |
| T6 | Cliente HTTP | ✅ depende do contrato |
| T7 | Integração UI | ✅ depende dos dois lados |
| T8 | Notificação | ✅ depende da conclusão |

## Commits previstos

1. `feat(moments): add dedicated challenge-moment endpoint and schema`
2. `feat(moments): resolve and score active challenge transactionally`
3. `feat(front): separate free and challenge moment publishing`
4. `feat(notifications): announce active moment challenges`
