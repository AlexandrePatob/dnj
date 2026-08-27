# Checklist de deploy — filas pastorais

## Pré-deploy

- [ ] Escopo `pastoral_queue` atribuído ao Gestor correto na API.
- [ ] Admin e Gestor conseguem autenticar nas superfícies existentes.
- [ ] Projeto Firebase de destino foi selecionado explicitamente.
- [ ] Nenhum `.env`, service account ou token aparece no diff.
- [ ] `npm --prefix functions run build` passou.
- [ ] `npm --prefix functions run test` passou.
- [ ] (Opcional, QA local) Java está instalado e `npm --prefix functions run test:emulator` passou.
- [ ] Índices e regras correspondem ao `firestore.indexes.json` e
      `firestore.rules` revisados.
- [ ] T12/T13: contrato oficial de push individual revisado; se não estiver
      disponível, a Function de push não deve ser implantada.

## Deploy

- [ ] Executar `firebase deploy --only firestore,functions` na raiz do projeto.
- [ ] Confirmar no Firebase Console que regras, índices e Functions pertencem
      ao projeto correto.
- [ ] Criar/confirmar `pastoral_queue/current/config/default` com
      `isQueueOpen: false`, `pushEnabled: true` e
      `notificationDelaySeconds: 0`.
- [ ] Abrir a operação pelo console do Gestor.

## Smoke test

- [ ] Participante entra em Confissão e recebe posição realtime.
- [ ] Nova entrada em Direção espiritual é bloqueada enquanto houver fila
      ativa, conforme a regra de uma fila por vez.
- [ ] Gestor chama o próximo e o contador de dois minutos aparece.
- [ ] Gestor registra atendimento e confirma que a entrada não pode consumir o
      mesmo tipo novamente.
- [ ] Gestor registra ausência e confirma que o participante pode tentar outra
      vez.
- [ ] Admin visualiza totais e chamada sem controles de mutação.
- [ ] Avisos 10, 5 e chamada não duplicam após recarregar o app.

## Rollback / encerramento

- [ ] Fechar `isQueueOpen` para impedir novas entradas sem remover quem já está
      aguardando ou chamado.
- [ ] Se houver comportamento inesperado, preservar a exportação e interromper
      chamadas; não apagar documentos fora de `pastoral_queue/current/`.
- [ ] Registrar o incidente e o estado das entradas antes de qualquer reset.
