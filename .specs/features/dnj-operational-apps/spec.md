# DNJ 2K26 — Apps operacionais persistidos

**Status:** In progress

## Objetivo

Entregar app de participante, gestor e Admin operando exclusivamente pela API Next + Supabase, sem estado operacional em `localStorage` ou listas fictícias.

## Requisitos

- **OPS-01 Acesso:** participante usa seu fluxo atual; Admin e gestores entram por e-mail/senha. A conta operacional é persistida, sessão assinada no servidor e cada pessoa enxerga somente seu escopo.
- **OPS-02 Escopos:** gestor de espaço é cronometrista dos espaços atribuídos; gestor de ação opera Radicalidade; gestor de eventos especiais controla somente eventos especiais; Admin tem visão global.
- **OPS-03 Cronograma:** gestor de espaço registra início real, aplica tolerância de 15 min e Flex time, sem criar QR ou pontos.
- **OPS-04 Radicalidade:** criar partida de jogo pré-definido ou novo jogo, abrir QR dinâmico, receber scans, iniciar/pausar/finalizar e distribuir pontos para 1º/2º/3º/restante. Dois dispositivos da mesma conta compartilham a mesma operação.
- **OPS-05 QR:** QR pré-gerado para experiências de espaço; QR novo por partida de Radicalidade e por evento especial. Token bruto só retorna à operação; banco guarda hash. QR de evento especial não permite Momento.
- **OPS-06 Eventos especiais:** gestor cria teaser de 15s, QR, duração/pontos/destino; participante recebe tarja global e resultado persistido.
- **OPS-07 Admin:** gerencia contas/escopos de gestores, experiências sem cronograma, desafios de Momento, eventos especiais, usuários, auditoria e configuração operacional.
- **OPS-08 Moderação:** filas separadas para Momentos gerais e desafio especial. Foto pontua imediatamente; Admin pode retirar pontos por desafio não atendido ou apagar mídia inadequada. Participante recebe motivo correto.
- **OPS-09 Qualidade:** OpenAPI registra endpoints; testes cobrem autorização, transições e resultados. Service key permanece no servidor.

## Critérios de aceite

1. Uma conta de cada escopo consegue entrar e não acessa operação fora da atribuição.
2. Um cronometrista só altera o estado do cronograma que lhe pertence.
3. Uma partida de Radicalidade gera QR real, reúne scans persistidos e concede pontos uma única vez ao encerrar.
4. Evento especial aparece no app participante, usa QR novo e não libera Momento.
5. A moderação consegue reverter pontos sem apagar foto e apagar foto/mídia quando necessário.
6. Não há consumidor operacional de `localStorage`, arrays de participantes, jogos ou QR hardcoded.

