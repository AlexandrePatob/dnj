# Filas Pastorais no Firestore — Specification

## Problem Statement

As filas de Confissão e Direção Espiritual já existem visualmente no aplicativo, mas hoje são apenas demonstrativas: não guardam entradas, não atualizam a posição em tempo real e não permitem operação pelo time do evento. O DNJ precisa de filas pastorais isoladas dos fluxos V2 normais, com acompanhamento em tempo real, operação por gestor e avisos úteis ao participante.

## Goals

- [ ] Permitir que um participante autenticado entre e acompanhe, em tempo real, uma única fila pastoral por vez.
- [ ] Permitir que um gestor autorizado opere Confissão e Direção Espiritual, com confirmação explícita de atendimento ou ausência.
- [ ] Avisar o participante uma vez ao alcançar as posições 10, 5 e quando for chamado, via push direcionado e modal quando o app estiver aberto.
- [ ] Registrar, para a edição atual, uma conclusão por participante em cada tipo de atendimento.
- [ ] Permitir que o Gestor abra ou feche globalmente as duas filas e configure a entrega de push sem alterar os marcos fixos.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Fila geral, jogos, desafios ou moderação | A funcionalidade é exclusiva de Confissão e Direção Espiritual. |
| WhatsApp/SMS | O canal aprovado é push web pela API oficial, com modal no app. |
| Agendamento de horário, distribuição entre sacerdotes ou prontuário | A fila é estritamente FIFO e não registra conteúdo do atendimento. |
| Nova área visual independente | A tela de Fila, Admin e Gestor existentes serão estendidos. |
| Campanhas globais de notificação | O push desta funcionalidade é individual e ligado ao estado da fila. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Uma pessoa pode aguardar apenas uma fila por vez | Entrada na segunda fila é bloqueada até sair ou concluir a primeira | Decisão explícita do produto. | Sim |
| Limite por atendimento | Uma conclusão de Confissão e uma de Direção Espiritual por participante, por edição | Os limites são independentes e só a conclusão consome o atendimento. | Sim |
| Janela após chamada | Após 2 minutos, o Gestor recebe alerta persistente; ele decide entre concluir e não compareceu | Preserva a decisão operacional humana e evita remoção automática injusta. | Sim |
| Papéis operacionais | `ADMIN` acompanha a fila no Admin; `EVENT_MANAGER` com escopo `pastoral_queue` é quem a opera | Segue a separação pedida entre visualização administrativa e gestor da fila. | Sim |
| Avisos de posição | Um aviso por entrada nas posições 10, 5 e ao ser chamado | Decisão explícita do produto. | Sim |
| Configuração operacional | Um documento global abre/fecha as duas filas; os marcos 10, 5 e chamada são fixos | Decisão explícita do produto; o Gestor configura operação, não a regra pastoral de proximidade. | Sim |
| Falha ou recusa de push | O fluxo da fila continua; o modal somente aparece quando o app está aberto | Push é aviso complementar, não condição para a operação. | Sim |
| Ciclo da fila | A fila pertence à edição atual do DNJ e é encerrada/resetada pela operação ao término do evento | A base atual é edição única; não há requisito de multi-evento. | Não — confirmar no design |
| Envio de push individual | A API oficial disponibilizará um contrato autenticado para enviar a uma `externalKey` específica | O contrato disponível hoje cadastra assinaturas e documenta envio global, não entrega individual. | Não — dependência de API |

**Open questions:** as duas dependências acima serão resolvidas no desenho técnico; nenhuma decisão de produto permanece em aberto.

---

## User Stories

### P1: Entrar e acompanhar uma fila ⭐ MVP

**User Story**: Como participante, quero entrar em Confissão ou Direção Espiritual e acompanhar minha posição real para saber quando devo me aproximar.

**Why P1**: É a finalidade central da fila.

**Acceptance Criteria**:

1. WHEN um participante sem fila ativa e sem conclusão prévia escolhe um atendimento THEN o sistema SHALL criar uma entrada FIFO nesse atendimento e exibir sua posição em tempo real.
2. WHEN um participante já possui entrada ativa em qualquer fila pastoral THEN o sistema SHALL bloquear nova entrada e informar qual fila precisa ser encerrada primeiro.
3. WHEN um participante sai voluntariamente antes da conclusão THEN o sistema SHALL remover sua entrada, liberar nova entrada e não consumir seu limite de atendimento.
4. WHEN o participante já concluiu o tipo de atendimento escolhido nesta edição THEN o sistema SHALL bloquear nova entrada nesse mesmo tipo e explicar o motivo.

**Independent Test**: Entrar em Confissão, observar uma alteração de posição, sair e entrar novamente; concluir Confissão e verificar o bloqueio específico desse tipo.

---

### P1: Operar a fila pelo Gestor ⭐ MVP

**User Story**: Como gestor de fila pastoral, quero chamar e finalizar o atendimento de uma pessoa para manter a fila organizada.

**Why P1**: Sem operação confiável, participantes não avançam nem os limites podem ser aplicados.

**Acceptance Criteria**:

1. WHEN um gestor com escopo `pastoral_queue` chama o próximo THEN o sistema SHALL mover atomicamente apenas a primeira entrada FIFO para o estado `called` e atualizar os demais participantes.
2. WHEN uma entrada permanece em `called` por 2 minutos THEN o sistema SHALL destacar no console do gestor que a pessoa ainda não compareceu, sem removê-la automaticamente.
3. WHEN o gestor confirma o atendimento THEN o sistema SHALL marcar a entrada como `completed`, consumir somente o limite daquele tipo e impedir nova entrada nesse tipo nesta edição.
4. WHEN o gestor registra `no_show` THEN o sistema SHALL encerrar a entrada sem consumir limite e permitir nova tentativa do participante.
5. WHEN dois gestores tentam chamar o próximo simultaneamente THEN o sistema SHALL chamar pessoas distintas ou rejeitar uma das ações; a mesma pessoa nunca pode ser chamada duas vezes.

**Independent Test**: Criar duas entradas, chamar a primeira, registrar ausência e confirmar a segunda; verificar os efeitos independentes nos limites e posições.

---

### P1: Avisos de aproximação e chamada ⭐ MVP

**User Story**: Como participante na fila, quero ser avisado quando estiver próximo ou for chamado para não perder o atendimento.

**Why P1**: O participante pode não manter a tela aberta durante o evento.

**Acceptance Criteria**:

1. WHEN a posição de uma entrada muda para 10 ou 5 pela primeira vez THEN o sistema SHALL criar um aviso direcionado para aquele participante, uma única vez por marco e por entrada.
2. WHEN um gestor chama a entrada THEN o sistema SHALL criar um aviso direcionado de “sua vez”.
3. WHEN o aplicativo do participante está aberto e recebe uma atualização de marco ou chamada THEN o sistema SHALL mostrar modal contextual, além do push quando houver permissão.
4. WHEN o push não puder ser enviado ou a permissão estiver negada THEN a fila SHALL continuar consistente e o gestor não receberá erro operacional por isso.

**Independent Test**: Simular avanço até 10 e 5, recarregar a tela e confirmar que não há duplicidade; chamar a pessoa e confirmar o aviso de chamada.

---

### P2: Acompanhar a operação no Admin

**User Story**: Como Admin, quero visualizar o estado das duas filas e seus gestores para acompanhar a operação sem operar acidentalmente.

**Why P2**: Dá supervisão sem misturar a função de gestão pastoral com a administração global.

**Acceptance Criteria**:

1. WHEN um Admin abre a aba de filas pastorais THEN o sistema SHALL mostrar em tempo real os totais, os próximos da fila e a pessoa atualmente chamada em cada tipo.
2. WHEN um usuário sem papel `ADMIN` acessa a superfície administrativa THEN o sistema SHALL manter a proteção administrativa já existente.

**Independent Test**: Alterar uma fila pelo console do gestor e observar a atualização imediata na aba Admin.

---

### P2: Configurar a operação pastoral

**User Story**: Como gestor de fila pastoral, quero abrir ou fechar as duas filas e controlar a entrega de push para organizar o atendimento durante o evento.

**Why P2**: O início, a pausa e a comunicação operacional precisam ser controlados no local pelo responsável da fila.

**Acceptance Criteria**:

1. WHEN o Gestor alterna `isQueueOpen` THEN o sistema SHALL abrir ou fechar simultaneamente a entrada de Confissão e Direção Espiritual, sem remover quem já está aguardando ou chamado.
2. WHEN as filas estão fechadas THEN o participante SHALL visualizar o status operacional e não poderá criar nova entrada.
3. WHEN o Gestor alterna `pushEnabled` ou ajusta `notificationDelaySeconds` THEN novas intenções de push SHALL respeitar a configuração global, mantendo os marcos 10, 5 e chamada imutáveis.
4. WHEN uma configuração inválida é enviada THEN o sistema SHALL rejeitar os valores fora dos limites documentados e preservar a última configuração válida.

**Independent Test**: Fechar a operação com uma pessoa já aguardando, confirmar que ela permanece na fila e que nova entrada é bloqueada; reabrir e validar o ingresso.

---

## Edge Cases

- WHEN a fila está vazia e o gestor chama o próximo THEN o sistema SHALL informar estado vazio sem criar chamada.
- WHEN a mesma ação é repetida por perda de conexão ou recarga THEN o sistema SHALL ser idempotente e não duplicar entrada, chamada, conclusão ou aviso.
- WHEN um participante abre o aplicativo em outro dispositivo THEN o sistema SHALL recuperar sua entrada ativa e sua posição pela identidade do usuário.
- WHEN Firestore estiver indisponível THEN o sistema SHALL mostrar erro recuperável e não apresentar posição demonstrativa como real.
- WHEN uma entrada já foi encerrada THEN o Gestor SHALL receber conflito ao tentar concluí-la ou marcá-la como ausência novamente.
- WHEN um aviso de posição já foi registrado para uma entrada THEN o sistema SHALL não reenviá-lo se a posição oscilar ou a tela for recarregada.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PQUEUE-01 | P1: Entrar e acompanhar | Design | Pending |
| PQUEUE-02 | P1: Entrar e acompanhar | Design | Pending |
| PQUEUE-03 | P1: Entrar e acompanhar | Design | Pending |
| PQUEUE-04 | P1: Entrar e acompanhar | Design | Pending |
| PQUEUE-05 | P1: Operar pelo Gestor | Design | Pending |
| PQUEUE-06 | P1: Operar pelo Gestor | Design | Pending |
| PQUEUE-07 | P1: Operar pelo Gestor | Design | Pending |
| PQUEUE-08 | P1: Operar pelo Gestor | Design | Pending |
| PQUEUE-09 | P1: Operar pelo Gestor | Design | Pending |
| PQUEUE-10 | P1: Avisos | Design | Pending |
| PQUEUE-11 | P1: Avisos | Design | Pending |
| PQUEUE-12 | P1: Avisos | Design | Pending |
| PQUEUE-13 | P1: Avisos | Design | Pending |
| PQUEUE-14 | P2: Admin | Design | Pending |
| PQUEUE-15 | P2: Admin | Design | Pending |
| PQUEUE-16 | P2: Configurar a operação | Design | Pending |
| PQUEUE-17 | P2: Configurar a operação | Design | Pending |
| PQUEUE-18 | P2: Configurar a operação | Design | Pending |
| PQUEUE-19 | P2: Configurar a operação | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped pending design.

---

## Success Criteria

- [ ] A posição exibida ao participante corresponde à ordem persistida da sua fila.
- [ ] Nenhum participante consegue concluir mais de uma vez cada tipo de atendimento na edição atual.
- [ ] Cada marco 10, 5 e chamada produz no máximo um aviso por entrada.
- [ ] Gestores operam a fila sem duplicar chamadas, mesmo em concorrência.
