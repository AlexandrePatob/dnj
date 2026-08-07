# Contexto operacional confirmado — DNJ 2K26

**Registrado:** 2026-08-05  
**Escopo:** participante, gestores, Admin e QR Codes operacionais.

## Gestores e acesso

- Todo gestor entra com **e-mail e senha** próprios, usando uma interface de login visualmente irmã da pessoa participante, com predominância verde.
- A API identifica o escopo da conta e direciona para sua operação. A pessoa não seleciona manualmente o papel no login.
- Os escopos são: **gestor de espaço**, **gestor de ação (Radicalidade)** e **gestor de eventos especiais**.
- Dois gestores podem operar a mesma ação de Radicalidade usando a mesma conta em celulares diferentes; o estado da operação precisa ser compartilhado e persistido.

## QR Codes

- QR já vinculados a experiências de espaços são pré-gerados e persistidos. O gestor de espaço os opera/ativa conforme a experiência, mas não cria QR novo.
- QR dinâmico é gerado para cada atividade/run de **Radicalidade**, para contabilizar sua participação e resultado.
- QR dinâmico também é usado nos eventos/sala de game quando a operação exigir contabilização própria.
- Eventos especiais sempre geram QR próprio, com teaser padrão de 15 segundos, aviso para app/TV/telão e sem liberação de Momento.
- Todo QR conserva janelas independentes de leitura e de Momento (`expiration_time` e `expiration_momento_time`); o token bruto só é apresentado à operação, enquanto o banco guarda seu hash.

## Admin e moderação

- O Admin possui uma fila de **moderação geral de fotos/Momentos**.
- O Admin possui uma fila distinta para **desafios de Momento de evento especial**, em que a foto pode ter uma exigência de contexto (por exemplo, foto com um padre específico).
- A validação de desafio especial é dupla e independente:
  1. elegibilidade para pontos: aprovar ou remover/recusar pontos caso a foto não cumpra o desafio;
  2. segurança/conteúdo: manter ou excluir a foto em caso de conteúdo inadequado.
- Essas três consequências — aprovar pontos, não pontuar e excluir imagem — também existem na moderação geral. Excluir imagem remove o objeto do Storage e a foto do feed; não pontuar mantém o registro para auditoria quando apropriado.

## Limites de interface

- Participante jamais cria QR, pontua terceiros, modera ou altera programação.
- Gestor vê apenas as experiências/operações atribuídas à sua conta.
- Admin vê a operação global, contas e escopos de gestores, experiências sem cronograma, desafios de Momento, moderação e auditoria.

## Refinamentos confirmados

- **Gestor de espaço é cronometrista.** Ele vê somente o cronograma dos espaços atribuídos e registra o início real de cada item. O sistema aplica a tolerância de 15 minutos, conduz o próximo evento e oferece a saída de Flex time. Ele não cria partidas, QR Codes ou regras de pontuação.
- Os QR Codes de experiências de espaço já são pré-gerados e vinculados à programação. O participante pode usá-los para pontuar sem o gestor criar um código novo.
- **Radicalidade** segue sempre este ciclo mínimo: criar partida -> abrir QR -> participantes escaneiam -> iniciar -> jogar -> atribuir posições/pontos -> fechar -> voltar ao início. O gestor pode usar um jogo pré-definido ou criar um novo jogo, dentro dos limites de pontuação.
- **Eventos especiais** sempre recebem QR Code novo.
- Em desafio de Momento, tirar e enviar a foto concede os pontos imediatamente por padrão. O Admin modera em tempo real depois: pode retirar os pontos quando a foto não cumprir o desafio, ou remover a foto quando for inadequada.
- As mensagens pós-moderação distinguem motivo de desafio não atendido ("Sua foto não atendeu o desafio") de conteúdo inadequado ("Sua foto não está apropriada para este momento; ela foi separada").

## Ponto a confirmar antes do design

- “Evento (Sala de game)” será tratado como uma operação com QR dinâmico e contabilização própria; confirmar apenas o nome final do tipo/espaço para o contrato e a interface.
