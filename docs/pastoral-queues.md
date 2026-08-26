# Filas pastorais — operação e setup

Este módulo mantém as filas de **Confissão** e **Direção espiritual** no
Firestore, separado dos fluxos padrão do DNJ Game. A identidade (nome, e-mail,
papéis e escopos) continua na API oficial; o Firestore guarda somente os dados
operacionais mínimos da fila.

## Papéis

- **Participante**: entra em uma fila por vez, acompanha a posição e pode sair.
- **Gestor**: usuário `EVENT_MANAGER` com escopo `pastoral_queue`; abre/fecha a
  operação, chama o próximo e registra atendimento ou ausência.
- **Admin**: acompanha as duas filas em modo somente leitura.

O atendimento concluído pode ocorrer uma vez por tipo durante a edição. Um
`no_show` ou cancelamento libera o participante para entrar novamente. Uma
chamada inicia a janela operacional de dois minutos; ao fim, o Gestor decide
manualmente entre atendimento e ausência. O alerta não remove ninguém sozinho.

## Configuração do Gestor

O documento `pastoral_queue/current/config/default` contém somente:

| Campo | Regra |
| --- | --- |
| `isQueueOpen` | Abre ou fecha Confissão e Direção espiritual juntas. Não remove entradas existentes. |
| `pushEnabled` | Habilita ou desabilita a entrega de push. |
| `notificationDelaySeconds` | Inteiro entre `0` e `300`. |

Os marcos são fixos e não devem ser adicionados à configuração: posição **10**,
posição **5** e **sua vez**. Cada marco gera no máximo um aviso por entrada.

## Fluxo operacional

1. Antes de iniciar, confirme que o gestor recebeu o escopo
   `pastoral_queue` na API e que o documento de configuração está aberto.
2. O participante entra em uma das filas pelo app e vê a posição realtime.
3. O Gestor chama o primeiro participante. A entrada sai da posição da fila e
   aparece como chamada com contador de dois minutos.
4. Quando a pessoa chega, use **Confirmar atendimento**. Isso consome o limite
   daquele tipo.
5. Se não chegar, após dois minutos use **Não compareceu**. A entrada é
   encerrada sem consumir o limite e a pessoa pode tentar de novo.
6. Durante a operação, o Admin pode acompanhar totais, próximos e chamadas,
   sem controles de mutação.

## Reset de uma edição

O reset é uma operação de início/fim de evento e deve ser feito somente com o
Firestore Emulator ou por procedimento administrativo revisado. Remova os
documentos sob `pastoral_queue/current/` (entradas, participantes, intenções e
configuração) e recrie `config/default` com:

```json
{
  "isQueueOpen": false,
  "pushEnabled": true,
  "notificationDelaySeconds": 0
}
```

Não apague coleções fora de `pastoral_queue/current/`. Faça uma exportação antes
de um reset manual se houver necessidade de auditoria.

## Firebase e emulador

1. Instale as dependências em `functions/` com `npm install`.
2. Configure as variáveis públicas `NEXT_PUBLIC_FIREBASE_API_KEY`,
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` e `NEXT_PUBLIC_FIREBASE_APP_ID`
   no ambiente do app. Elas não são segredos de service account.
3. Selecione o projeto Firebase correto no ambiente de deploy; não reutilize o
   projeto legado `dnj-fila` sem revisão.
4. Execute `npm --prefix functions run build`.
5. Execute `npm --prefix functions run test` para o gate local.
6. Execute `npm --prefix functions run test:emulator` para validar as regras.

O teste do emulador exige Java disponível no `PATH`. No ambiente desta entrega
o comando foi bloqueado por `Could not spawn java -version`; isso precisa ser
corrigido antes do aceite operacional.

## Deploy

O deploy deve ser feito após o checklist em
[`pastoral-queues-deployment-checklist.md`](pastoral-queues-deployment-checklist.md).
Use `firebase deploy --only firestore,functions` a partir da raiz, com o projeto
explicitamente selecionado. Nunca inclua arquivos `.env`, service accounts ou
tokens no repositório.

## Push: dependência bloqueada

O Firestore cria intenções para os marcos 10, 5 e chamada; o modal realtime do
app continua independente do push. Porém T12/T13 estão bloqueadas: não foi
encontrado em `dnj-game-api` um contrato oficial para envio individual por
`externalKey`, incluindo endpoint, autenticação, chave de idempotência e shape
de resposta/erro.

Até esse contrato ser publicado e revisado:

- não implante uma Function de entrega;
- não use o endpoint de campanha broadcast;
- não armazene tokens de push em Firestore;
- trate `pushEnabled` como configuração preparada, não como garantia de entrega.

## Risco conhecido

As regras aceitam leitura e escrita direta em `pastoral_queue/**`, conforme a
decisão de produto. Assim, o limite de confiança é o app e os dados armazenados
são mínimos; qualquer endurecimento de autorização no Firestore deve ser uma
decisão específica, não uma alteração silenciosa deste módulo.
