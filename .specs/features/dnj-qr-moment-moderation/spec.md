# QR e moderacao de Momentos

## Objetivo

Tornar as janelas do QR Code explicitas, manter todas as atividades sob uma estrutura central de experiencia e limitar a moderacao ao dominio de Momentos.

## Requisitos

- **QRM-001**: `qr_codes` deve expor `expiration_time` para o prazo de leitura do QR e `expiration_momento_time` para o prazo de envio do Momento. Os dois campos nao podem ser generalizados em um unico vencimento.
- **EXP-001**: `experiences` e a entidade central para cronograma, stand, atividade, desafio de Momento e especial. Cada caso e separado apenas por `kind` e regras operacionais associadas.
- **MOD-001**: Somente `moments` possui moderacao de conteudo. A decisao deve ficar auditada em `moderation_decisions` referenciando um Momento.
- **MOD-002**: A decisao `deny_points` deixa o Momento fora da publicacao, mantem o arquivo para auditoria e garante que ele nao receba pontos.
- **MOD-003**: A decisao `delete_photo` deixa o Momento fora da publicacao, garante que ele nao receba pontos, marca a midia como removida e instrui a API Next a excluir o objeto do Storage.
- **MOD-004**: A decisao `approved` publica o Momento e concede os pontos exatamente uma vez por meio de `point_entries`.
- **MOD-005**: O Admin deve ter uma fila chamada “Moderar Momentos”, com acoes Aprovar, Nao pontuar e Excluir foto.

## Fora de escopo

- Moderar cronogramas, filas, experiencias ou eventos especiais.
- Alterar o backend Go nesta etapa.
