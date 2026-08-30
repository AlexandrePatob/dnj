# Onda 3A — Momentos e desafio ativo

## Objetivo
Entregar a estrutura de Momentos e expor o desafio vigente de forma consistente na Home e no DNJ Game.

## Critérios de aceitação
- O desafio só aparece quando permite momento, está ativo e `startsAt <= agora < endsAt` (fim nulo permitido).
- Desafios futuros, pausados e expirados não aparecem; não há fallback para item antigo.
- O mesmo card reutilizável é usado na Home e no DNJ Game.
- A aba pessoal se chama “Meus Momentos”.
- A consulta de desafios é centralizada em um único módulo de API.
