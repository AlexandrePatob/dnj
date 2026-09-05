# Controle de Atividades DNJ

Fonte de verdade versionada para entregas do DNJ Game.

## Regras de entrega

- Status: `BACKLOG` → `EM IMPLEMENTAÇÃO` → `GATE TÉCNICO` → `HOMOLOGAÇÃO` → `PR ABERTA / DONE`.
- `DONE` significa PR aberta com evidências homologadas; merge é acompanhado separadamente.
- Cada atividade usa checkout isolado e branch `codex/dnj-XXX-descricao`.
- Uma atividade que exigir API abre PR vinculada no front e na API; nenhuma é necessária para uma fila exclusivamente Firebase sem evidência contrária.
- Antes da PR, um subagente independente repete a homologação, executa os testes aplicáveis e registra seu parecer.
- A PR precisa de screenshots automatizados e, para câmera/push/iPhone, evidência manual sem dados pessoais ou fotos reais de participantes.

## Atividades

| ID | Prioridade | Atividade | Repositório(s) | Branch / PR | Status | Homologação e evidências |
| --- | --- | --- | --- | --- | --- | --- |
| DNJ-001 | P0 | Fila Firebase: persistir entrada, restaurar após reconexão, impedir tela vazia, cancelar corretamente e bloquear toques repetidos. | Front | `codex/dnj-001-queue-lifecycle` / PR pendente | PR ABERTA / DONE | Homologação técnica e manual no iPhone aprovadas; refinamento visual do loading fica fora desta atividade. |
| DNJ-002 | P0 | Publicação de Momentos: câmera, loading, upload e bloqueio de duplo envio. | Front + API se necessário | pendente | BACKLOG | Latência/timeout, toque duplo e roteiro no iPhone. |
| DNJ-003 | P0 | Momentos, grupo, remoção de foto, compartilhamento e curtida imediata. | Front + API se necessário | pendente | BACKLOG | Latência, toque duplo e estados vazios. |
| DNJ-004 | P1 | Ranking individual e sincronização automática de dados ativos. | Front + API se necessário | pendente | BACKLOG | Ranking, foco/retorno e atualização controlada. |
| DNJ-005 | P1 | Ativação e deduplicação de notificações, aviso global de fila e push no iPhone. | Front + API se necessário | pendente | BACKLOG | PWA instalada no iPhone, permissão, inscrição e push recebido. |
| DNJ-006 | P1 | Feedback de QR legível e persistente. | Front + API se necessário | pendente | BACKLOG | Leitura, pontuação e novo escaneamento. |
| DNJ-007 | P2 | Design da Home: escadinha de pontos e cruz. | Front | pendente | BLOQUEADA | Aguarda referência visual. |

## Registro de homologação

| ID | Data | Ambiente | Executor | Parecer | Evidências |
| --- | --- | --- | --- | --- | --- |
| DNJ-001 | 04/09/2026 | Checkout local; testes com pendência/falha Firebase simulada | Subagente independente | PASS técnico; PR bloqueada até evidência visual/manual | Testes de tela 4/4, serviço Firebase 6/6, typecheck e lint do escopo aprovados. |
| DNJ-001 | 05/09/2026 | HTTPS temporário no Safari/iPhone | Executor + subagente independente | PASS manual e técnico | Fluxo aprovado pelo executor: entrar → atualizar posição → posição, sem tela transitória; 15 testes, typecheck, lint e diff check aprovados. |
