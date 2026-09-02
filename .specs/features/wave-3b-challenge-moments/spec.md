# Onda 3B — Momento de Desafio sem QR

**Status**: Proposto — decisão de produto confirmada; aguarda autorização para implementar.

## Problema

`participationId` identifica uma participação em atividade com QR e é criado pela leitura do QR. Um Desafio Momento não tem QR: o participante entra pelo card ou pela notificação, tira uma foto e deve receber a pontuação imediatamente. Reaproveitar a participação cria um fluxo falso, falha quando não há QR e mistura o Momento livre com o pontuado.

## Objetivos

- Separar de forma explícita o envio de um Momento livre do envio de um Momento de Desafio.
- Vincular e pontuar automaticamente a foto enviada a partir de um Desafio Momento ativo.
- Fazer o backend decidir qual desafio está ativo; o cliente não escolhe nem envia um identificador de desafio.
- Impedir segunda pontuação para o mesmo participante e desafio.

## Fora do escopo

| Item | Motivo |
| --- | --- |
| QR Code para desafio de foto | Contraria o fluxo aprovado. |
| Criar ou simular `participationId` para desafio | Mantém a ambiguidade que esta onda elimina. |
| Pontuar fotos abertas pela aba Momentos | São lembranças livres, sem pontos. |
| Alterar a moderação normal de Momentos | Continua sendo responsabilidade do fluxo existente. |

## Decisões confirmadas

| Tema | Decisão |
| --- | --- |
| Entrada do desafio | Notificação “Ir para foto” ou botão “Abrir câmera” no card DNJ Game. |
| Dados enviados pelo app | Somente `mediaAssetId` e `publishConsent`; jamais `challengeId` ou `participationId`. |
| Autoridade do desafio | API encontra o desafio de momento ativo no instante do envio. |
| Entrada da aba Momentos | Abre o composer livre e chama o endpoint normal; não pontua. |
| Após sucesso | Foto fica vinculada ao desafio, pontos/histórico são atualizados e card/notificação desaparecem para aquele participante. |

## Histórias e critérios de aceitação

### P1 — Publicar a foto de um Desafio Momento

Como participante, quero abrir a câmera pelo desafio ativo e publicar a foto para participar sem ler QR Code.

1. **CHM-01** — QUANDO o participante clicar em “Ir para foto” ou “Abrir câmera” de um desafio elegível, ENTÃO o app SHALL abrir o composer no modo desafio, sem consultar `currentParticipation` e sem apresentar mensagem de QR.
2. **CHM-02** — QUANDO o participante confirmar a foto no modo desafio, ENTÃO o app SHALL chamar `POST /v2/moments/challenge` com `mediaAssetId` e `publishConsent`.
3. **CHM-03** — QUANDO a API receber a publicação, ENTÃO SHALL identificar no servidor o desafio com `kind=challenge`, `allowsMoment=true`, status ativo e janela `startsAt <= agora < endsAt` (fim nulo permitido).
4. **CHM-04** — QUANDO houver exatamente um desafio elegível, ENTÃO a API SHALL criar o Momento com origem de desafio, vinculá-lo à atividade, registrar seus pontos e devolver a pontuação concedida na mesma resposta transacional.
5. **CHM-05** — QUANDO a publicação concluir, ENTÃO o app SHALL atualizar o saldo/histórico, inserir o Momento no feed/meus momentos e remover o desafio daquela sessão do participante.

### P1 — Proteger a pontuação

Como operação do evento, quero que um participante não receba pontos duas vezes pelo mesmo desafio.

1. **CHM-06** — QUANDO o participante já possuir um Momento de desafio para a mesma atividade, ENTÃO a API SHALL retornar `409 MOMENT_ALREADY_COMPLETED` e não criar foto, lançamento ou ponto adicional.
2. **CHM-07** — QUANDO duas publicações concorrentes forem enviadas, ENTÃO a restrição do banco SHALL permitir apenas uma criação e uma pontuação.
3. **CHM-08** — QUANDO não existir desafio elegível no instante da publicação, ENTÃO a API SHALL retornar `409 MOMENT_UNAVAILABLE`; não pode converter a publicação em Momento livre.

### P1 — Manter Momento livre separado

Como participante, quero registrar uma memória pela aba Momentos sem entrar em um desafio nem receber pontos.

1. **CHM-09** — QUANDO o composer for aberto pela aba Momentos, ENTÃO SHALL chamar `POST /v2/moments` sem `participationId`, criar origem `free` e conceder zero ponto.
2. **CHM-10** — QUANDO houver desafio ativo e o participante usar a aba Momentos, ENTÃO a foto livre SHALL permanecer livre; a API não pode inferir desafio pela existência de uma atividade ativa.

### P2 — Aviso de início

Como participante, quero receber uma notificação quando um Desafio Momento iniciar para poder entrar diretamente na câmera.

1. **CHM-11** — QUANDO o desafio se tornar elegível, ENTÃO o serviço operacional SHALL emitir uma notificação para os participantes com deep-link para o composer em modo desafio.
2. **CHM-12** — QUANDO o participante concluir a publicação com sucesso, ENTÃO o desafio e a notificação SHALL deixar de ser oferecidos a ele.

## Casos de borda

- A validação de janela ocorre no servidor no momento da confirmação, mesmo se o usuário abriu a câmera antes do fim.
- `Idempotency-Key` idêntica devolve a mesma resposta; uma chave nova após conclusão recebe `MOMENT_ALREADY_COMPLETED`.
- Se a atividade não tem fim, ela permanece elegível enquanto estiver ativa e permitir Momento.
- Se houver mais de um desafio elegível, a API trata isso como erro operacional (`409 MOMENT_UNAVAILABLE`) e registra o conflito; não escolhe um arbitrariamente.
- Upload concluído, mas publicação falhou, permite tentativa novamente sem criar pontos duplicados.

## Rastreabilidade

| Requisito | Fase | Estado |
| --- | --- | --- |
| CHM-01 a CHM-05 | Design e implementação | Pendente |
| CHM-06 a CHM-08 | Design e implementação | Pendente |
| CHM-09 a CHM-10 | Design e implementação | Pendente |
| CHM-11 a CHM-12 | Integração operacional | Pendente |
