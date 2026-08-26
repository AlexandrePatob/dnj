# Refinamento de homologação

## Requisitos

- R-01: cronograma completo mantém passado e evidencia itens `live`; a Home evidencia o que ocorre agora antes dos próximos.
- R-02: Radicalidade lista jogos acionáveis; criação e edição acontecem em modal, sem seletor obrigatório.
- R-03: evento especial usa duração escolhida no momento da criação (1, 3, 5, 10, 15 ou minutos personalizados), sempre a partir de agora.
- R-04: desafio de Momento criado no Admin pode ser iniciado pelo Admin.
- R-05: Admin usa largura e ritmo de painel operacional, sem bloco central estreito em telas grandes.
- R-06: Gestor possui manifesto PWA próprio, `start_url` `/manager` e ícones verdes.
- R-07: textos visíveis não contêm sequências mojibake (`Ã`, `Â`, `â`).

## Verificação

- Testes de rota para iniciar experiência e duração de evento.
- Testes de interface para estado `live` e lista direta de jogos.
- Typecheck e suíte unitária ao final.
