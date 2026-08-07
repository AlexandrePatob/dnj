# Checklist OpenAPI: DNJ 1.1.0 para V2

Consulte a especificação completa em [DNJ V2 — PostgreSQL, S3 e API](../architecture/dnj-v2-postgres-s3-api-spec.md).

## Mudanças que exigem versão maior

- Remover `Participation.event`.
- Fazer `CreateMomentRequest.participationId` opcional.
- Fazer `Moment.participationId` e `Moment.placeName` nullable.
- Declarar `Moment.authorName`, já usado pelo front.
- Trocar `ApiUser.document` por `documentMasked` em respostas.
- Substituir `/gallery/{momentId}/likes` por `/moments/{momentId}/likes`.
- Remover `/gallery`, `/gallery/mine` e comentários legados após o corte.
- Substituir `storageKey` público por `mediaAssetId` ou URL assinada curta.

## Testes de contrato mínimos

- `POST /moments` sem `participationId` retorna `origin: free`, `participationId: null` e `pointsAwarded: 0`.
- `POST /moments` com Participation de outro usuário retorna `403`.
- `POST /moments` com Participation inelegível retorna `409`.
- `GET /moments?scope=group` inclui Moments livres de membros do grupo.
- Like não pode atingir Moment privado/rejeitado e é único por usuário.
- Retry de QR retorna a mesma Participation e não duplica saldo.
- Autenticação nunca devolve documento puro nem código de verificação.
