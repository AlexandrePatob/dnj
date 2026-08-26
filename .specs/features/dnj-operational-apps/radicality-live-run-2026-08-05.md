# Partida de Radicalidade ao vivo

- R-01: após escanear QR de uma partida, o participante permanece em tela bloqueada, informada pelo status da partida.
- R-02: o gestor recebe participantes recém-escaneados automaticamente, sem recarregar a página.
- R-03: ao iniciar uma partida, seu QR deixa de aceitar novas entradas.
- R-04: pausa, apuração, conclusão e cancelamento atualizam a tela do participante; estados finais retornam ao DNJ Game.

## Verificação

- Rotas testam consulta do estado do participante e bloqueio do QR no início.
- Interface testa o polling operacional e os textos de espera/andamento.
- Typecheck e suíte unitária executados somente ao final.
