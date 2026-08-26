# Filas Pastorais no Firestore — Context

**Gathered:** 2026-08-26
**Spec:** `.specs/features/pastoral-queues/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Transformar as telas existentes de Fila, Admin e Gestor em uma operação pastoral em tempo real para Confissão e Direção Espiritual. Firestore mantém o estado efêmero da fila; a API oficial entrega push direcionado; a operação humana do gestor determina conclusão ou ausência.

---

## Implementation Decisions

### Participação e limites

- O participante só pode ter uma entrada pastoral ativa por vez.
- Confissão e Direção Espiritual são atendimentos independentes.
- Cada tipo pode ser concluído uma única vez por participante na edição.
- Sair voluntariamente ou receber `no_show` libera nova tentativa e não consome o atendimento.

### Operação pelo gestor

- O gestor chama a primeira pessoa da fila.
- A chamada inicia contagem de 2 minutos no console operacional.
- Ao fim da contagem, a pessoa não é removida automaticamente; o gestor recebe alerta persistente e decide entre `completed` e `no_show`.
- A operação deve ficar restrita a gestores com escopo pastoral específico.
- O Gestor abre ou fecha as duas filas juntas; fechar bloqueia somente novas entradas.
- Os marcos de aviso permanecem fixos em 10, 5 e chamada.
- O Gestor pode habilitar/desabilitar push e configurar o atraso de entrega, sem alterar os marcos.

### Avisos ao participante

- Cada entrada recebe no máximo três avisos: posição 10, posição 5 e chamada.
- O push é enviado pela API oficial, nunca diretamente pelo navegador/Admin nem pelo Firestore.
- Com o app aberto, a atualização em tempo real também apresenta um modal contextual.
- Push negado, indisponível ou falho não bloqueia nenhuma transição da fila.

### Administração

- O Admin recebe uma aba de acompanhamento em tempo real das duas filas.
- A aba é de supervisão; o gestor é o responsável pelas decisões de chamada, conclusão e ausência.

### Agent's Discretion

- Texto final dos modais e títulos de push, mantendo tom claro e pastoral.
- Forma visual do alerta de dois minutos no console do gestor, respeitando os componentes e tokens existentes.

### Declined / Undiscussed Gray Areas → Assumptions

- O reset ao fim do evento será uma ação operacional explícita e auditável; não haverá expiração silenciosa durante a edição.
- A entrada persistirá somente os dados mínimos para operação: identificador do participante, nome de exibição, tipo, ordem, estado e marcas de aviso. E-mail não será exibido ou replicado no Firestore sem necessidade operacional.
- `notificationDelaySeconds` aceitará de 0 a 300 segundos. `calledTimeoutSeconds` continua regra fixa de 120 segundos, não um controle de configuração nesta versão.

---

## Specific References

- A implementação anterior em `fila-dnj` mantinha as coleções `queue` e `calledPeople`, com listener dos 10 primeiros e aviso de aproximação na posição 5.
- O DNJ Game já possui tela demonstrativa de fila em `src/features/queue/queue-screen.tsx`, Admin em `src/components/admin/admin-dashboard.tsx` e Gestor em `src/components/manager/manager-dashboard.tsx`.
- O cadastro de push atual usa a `externalKey` do participante e encaminha a assinatura à API oficial por `src/app/api/push/subscribe/route.ts`.

---

## Deferred Ideas

- WhatsApp/SMS.
- Agendamento ou escolha de sacerdote/orientador.
- Métricas históricas, relatórios e auditoria aprofundada após o evento.
