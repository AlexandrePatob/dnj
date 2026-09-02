# Macro 4 — Admin e Operações Specification

## Problem Statement

As superfícies operacionais do DNJ — Admin, Radicalidade, Cronometrista, Fila, Evento Momento e Evento Especial — possuem comportamentos e formulários que ainda não estão uniformes. A operação precisa controlar atividades e eventos sem estados ambíguos, pontuação duplicada ou telas que exibam dados desatualizados para participantes, TV e Telão.

## Goals

- [ ] Tornar a criação e gestão de atividades no Admin específica por tipo, com apenas os campos pertinentes.
- [ ] Completar o fluxo operacional de moderação, Radicalidade, Cronometrista, Fila, Evento Momento e Evento Especial.
- [ ] Garantir que alterações operacionais sejam refletidas nas superfícies consumidoras previstas.
- [ ] Padronizar feedback, confirmação de ações irreversíveis, erro, carregamento e autorização.

## Out of Scope

| Item | Razão |
| --- | --- |
| Push/VAPID | Pertence ao Macro 8. |
| TV/Telão e patrocinadores | Pertencem ao Macro 6, embora este macro deva preservar os dados que eles consomem. |
| Fluxo participante de Momentos e Desafio Momento | Pertence ao Macro 3. |
| Redesign visual global | Pertence ao Macro 8/P28; este macro faz somente ajustes necessários às telas operacionais. |
| Exclusão física de atividades ou fotos | O produto trabalha com status e moderação; ações serão reversíveis quando o modelo permitir. |

## Assumptions & Open Questions

| Decisão | Padrão escolhido | Razão | Confirmada? |
| --- | --- | --- | --- |
| Acesso operacional | ADMIN e EVENT_MANAGER usam as permissões já existentes; cada rota preserva sua fronteira atual. | Evita ampliar privilégios durante a revisão. | Sim |
| Remoção de atividade | A ação altera status para inativa/arquivada, nunca apaga o registro. | Preserva auditoria e histórico de pontuação. | Sim |
| Campos por tipo | O formulário apresenta somente campos que o contrato V2 aceitar para o tipo selecionado. | Evita o formulário genérico e dados inválidos. | Sim |
| Evento Momento | É tratado como desafio de foto; não usa QR Code nem `participationId`. | Decisão ativa AD-012. | Sim |
| Eventos concorrentes | A operação deve bloquear transições que produzam dois estados ativos incompatíveis para a mesma atividade/execução. | Integridade de programação e pontuação. | Sim |
| TV/Telão | A entrega completa de renderização será feita no Macro 6. | Mantém o escopo operacional executável e limitado. | Sim |

**Open questions:** nenhuma para especificação. Detalhes de UX e a matriz de tarefas serão confirmados antes de executar.

## User Stories

### P1: Administração de atividades por tipo

Como ADMIN, quero criar, editar, ativar e desativar atividades por tipo para configurar a operação sem campos irrelevantes ou estados inválidos.

**Acceptance Criteria**

1. WHEN o ADMIN seleciona um tipo de atividade THEN o formulário SHALL exibir somente os campos aceitos para aquele tipo.
2. WHEN o ADMIN envia dados obrigatórios ausentes ou incompatíveis THEN o sistema SHALL bloquear o envio e explicar o campo inválido.
3. WHEN o ADMIN desativa uma atividade THEN o sistema SHALL pedir confirmação, persistir a transição de status e atualizar a lista sem recarregar a página.
4. WHEN uma atividade está desativada/arquivada THEN ela SHALL deixar de aparecer nas listagens operacionais normais e nas consultas públicas aplicáveis.

**Independent Test:** criar uma atividade de cada tipo suportado, validar campos inválidos e desativar uma atividade ativa.

### P1: Moderação de Momentos

Como ADMIN, quero moderar fotos pendentes com contexto suficiente para decidir sem apagar informação indevidamente.

**Acceptance Criteria**

1. WHEN o ADMIN abre a moderação THEN o sistema SHALL listar Momentos pendentes com foto, autor, data e desafio vinculado quando existir.
2. WHEN o ADMIN aprova, rejeita ou executa uma ação de moderação permitida THEN o sistema SHALL persistir o novo estado e remover/atualizar o item imediatamente.
3. WHEN uma foto é rejeitada THEN o sistema SHALL preservar o registro e aplicar o status de moderação definido pelo contrato, sem exclusão física automática.

**Independent Test:** moderar um Momento pendente e verificar a mudança no feed/estado administrativo.

### P1: Operação de Radicalidade

Como EVENT_MANAGER de Radicalidade, quero operar somente atividades ativas e pontuar cada participação uma única vez.

**Acceptance Criteria**

1. WHEN o gestor abre Radicalidade THEN o sistema SHALL listar somente atividades ativas elegíveis para a operação.
2. WHEN o gestor registra um resultado THEN o sistema SHALL atribuir a pontuação configurada uma única vez por participante e atividade.
3. WHEN uma pontuação repetida é tentada THEN o sistema SHALL manter o saldo e retornar um conflito compreensível.
4. WHEN o gestor desativa uma atividade THEN o sistema SHALL exigir confirmação e atualizar a lista imediatamente.

**Independent Test:** pontuar, repetir a mesma operação e desativar uma atividade ativa.

### P1: Cronometrista e programação real

Como EVENT_MANAGER de programação, quero controlar o tempo real da agenda sem criar atividades simultâneas impossíveis.

**Acceptance Criteria**

1. WHEN o cronometrista visualiza uma atividade THEN o sistema SHALL apresentar início previsto, término previsto e início real quando existir.
2. WHEN o cronometrista avança +5, +10, +15 ou +20 minutos THEN o sistema SHALL recalcular e persistir o horário operacional correspondente.
3. WHEN o cronometrista pula a próxima atividade ou volta à anterior THEN o sistema SHALL exigir confirmação antes da transição.
4. WHEN uma transição criaria duas atividades mutuamente exclusivas em execução THEN o sistema SHALL rejeitá-la sem alterar o estado atual.
5. WHEN a programação operacional muda THEN as consultas participantes deverão receber o mesmo estado persistido; TV/Telão o consumirão no Macro 6.

**Independent Test:** iniciar, avançar horário, pular, voltar e validar que não há duas atividades incompatíveis ativas.

### P1: Operação de Fila e eventos

Como operador, quero gerir Fila, Evento Momento e Evento Especial com estados, datas e feedback explícitos.

**Acceptance Criteria**

1. WHEN uma configuração de fila ou evento é criada/alterada THEN o sistema SHALL validar datas e estado antes de persistir.
2. WHEN o operador ativa ou desativa um Evento Momento ou Evento Especial THEN o sistema SHALL refletir a alteração no consumidor aplicável e informar sucesso ou erro.
3. WHEN uma ação destrutiva ou de interrupção é solicitada THEN o sistema SHALL exigir confirmação explícita.
4. WHEN o usuário não possui a função permitida THEN o backend SHALL rejeitar a operação e a interface SHALL não oferecer a ação como disponível.

**Independent Test:** ativar e desativar cada configuração com usuário autorizado e não autorizado.

### P2: Auditoria de consistência operacional

Como responsável técnico, quero uma auditoria final das telas de operação para reduzir divergências de nomenclatura, estado e feedback.

**Acceptance Criteria**

1. WHEN cada tela operacional estiver pronta THEN ela SHALL possuir estados de carregamento, vazio e erro coerentes com o app.
2. WHEN uma alteração é concluída THEN ela SHALL produzir feedback visível e atualizar o dado exibido sem estado obsoleto.
3. WHEN uma tela usa nomenclatura operacional THEN ela SHALL usar “Programação” e os nomes de estado oficiais do produto.

**Independent Test:** revisar cada superfície autenticada nos estados inicial, vazio, sucesso e falha.

## Edge Cases

- WHEN o backend retorna conflito de idempotência THEN a interface SHALL manter o estado anterior e explicar que a operação já foi processada.
- WHEN a conexão falha durante uma mutação THEN a interface SHALL informar falha, não apresentar sucesso e permitir nova tentativa segura.
- WHEN um recurso é alterado por outro operador THEN a operação SHALL respeitar a resposta autoritativa do backend e recarregar o estado necessário.
- WHEN nenhuma atividade estiver ativa THEN Radicalidade e Cronometrista SHALL exibir estado vazio, sem dados de exemplo.

## Requirement Traceability

| ID | Origem | Status |
| --- | --- | --- |
| OPS-01 | Admin por tipo | Specified |
| OPS-02 | Desativação segura | Specified |
| OPS-03 | Moderação | Specified |
| OPS-04 | Radicalidade e pontuação única | Specified |
| OPS-05 | Cronometrista e horários | Specified |
| OPS-06 | Transições incompatíveis | Specified |
| OPS-07 | Fila e eventos operacionais | Specified |
| OPS-08 | Autorização e feedback | Specified |
| OPS-09 | Estados de UI e nomenclatura | Specified |

## Success Criteria

- [ ] Cada operação P1 possui teste de fluxo feliz, conflito e autorização quando aplicável.
- [ ] Nenhuma ação operacional cria pontuação duplicada ou estado de execução incompatível.
- [ ] Ativação/desativação é visível de forma consistente no consumidor previsto.
