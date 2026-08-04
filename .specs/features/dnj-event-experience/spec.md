# DNJ Event Experience Specification

**Status:** Approved

## Problem Statement

O DNJ Game tem a identidade e os fluxos fundamentais, mas telas importantes não comunicam com precisão o que está disponível, quando os dados foram atualizados e como recuperar uma ação que falhou. Em um evento presencial, no celular e sob rede instável, isso compromete orientação, confiança e conclusão de tarefas.

## Goals

- [ ] Tornar todos os estados de carregamento, vazio, erro, retry e offline claros, consistentes e acessíveis.
- [ ] Implementar as melhorias visuais aprovadas em login, cadastro, OTP, Home, Jogo, scanner, fila, galeria e conta.
- [ ] Criar superfícies de Cronograma e Mapa usando dados mock existentes, sem novo contrato de API.

## Out of Scope

| Feature | Reason |
|---|---|
| Integração com API de produção | Depende de contratos e ambiente externos. |
| Alterar regras de pontos, ranking, fila ou moderação | Esta feature melhora apresentação e recuperação de estados. |
| Persistir comentários ou curtidas | Exige contrato de backend próprio. |
| Redesenhar a identidade DNJ | A identidade existente é um ativo a preservar. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Feedback de erro | Criar componentes reutilizáveis sobre ApiError e ConnectivityStatus, sem instalar biblioteca nova. | O projeto já possui classificação de erro, offline e testes; reduz bundle e dependências. | Sim |
| Dados de mapa e cronograma | Usar fixtures locais e rotulá-los honestamente quando não forem dados ao vivo. | Nenhuma API real está no escopo. | Sim |
| Ordem de entrega | Primeiro estados confiáveis e entrada; depois Home/Jogo/Fila; por último mapa, cronograma, galeria e conta. | Reduz risco para fluxos críticos no evento. | Sim |
| Motion | Manter movimento existente e obedecer prefers-reduced-motion. | Restrição já registrada no produto. | Sim |

**Open questions:** none — all resolved or logged above.

## User Stories

### P1: Feedback confiável de operação

**User Story:** Como participante em rede instável, quero entender claramente se uma ação está carregando, falhou, está indisponível offline ou pode ser tentada novamente para não perder tempo no evento.

**Acceptance Criteria:**

1. WHEN uma requisição usada por uma tela falhar THEN a tela SHALL mostrar mensagem em português, estado visual de erro e ação de retry quando a ação puder ser repetida.
2. WHEN a pessoa estiver offline e uma ação exigir rede THEN o sistema SHALL impedir a ação antes de iniciar a operação e explicar o requisito de conexão.
3. WHEN uma coleção remota falhar THEN o sistema SHALL distinguir erro de carregamento de coleção vazia.
4. WHEN o estado for anunciado dinamicamente THEN o sistema SHALL expô-lo por região acessível sem depender apenas de cor.

### P1: Entrada guiada e acessível

**User Story:** Como participante novo, quero preencher login, cadastro e código de verificação com mensagens específicas para concluir meu acesso sem ajuda externa.

**Acceptance Criteria:**

1. WHEN CPF, e-mail, telefone ou código estiver inválido THEN a tela SHALL mostrar orientação específica junto ao campo afetado.
2. WHEN o código OTP for enviado THEN a tela SHALL informar o e-mail mascarado e o status de envio.
3. WHEN a pessoa colar seis dígitos no OTP THEN o sistema SHALL distribuir os dígitos e permitir verificação.
4. WHEN um label for exibido THEN ele SHALL estar programaticamente associado ao seu campo.
5. WHEN a pessoa criar uma conta THEN o cadastro SHALL separar dados pessoais e escolha de grupo em duas etapas, mantendo os dados preenchidos ao avançar ou voltar.
6. WHEN a primeira etapa estiver incompleta THEN o sistema SHALL manter o avanço desabilitado e indicar os campos inválidos antes de mudar de etapa.

### P1: Home operacional

**User Story:** Como participante em movimento, quero ver em poucos segundos o que acontece agora, onde é e qual a próxima ação.

**Acceptance Criteria:**

1. WHEN a Home abrir THEN ela SHALL priorizar um card Agora no DNJ com atividade, local, horário e CTA contextual usando dados mock.
2. WHEN cronograma, mapa ou espaços ainda não tiverem dado ao vivo THEN a Home SHALL apresentá-los como atalhos honestos, sem CTA sem destino.
3. WHEN a pessoa acionar cronograma ou mapa THEN o sistema SHALL abrir a superfície correspondente.

### P1: Jogo e fila compreensíveis

**User Story:** Como participante, quero validar QR e acompanhar uma fila entendendo o estado e as limitações da operação.

**Acceptance Criteria:**

1. WHEN o scanner estiver offline THEN o sistema SHALL informar a indisponibilidade antes de solicitar câmera.
2. WHEN uma validação QR falhar THEN o scanner SHALL mostrar estado recuperável sem fechar o fluxo inesperadamente.
3. WHEN a fila estiver em mock THEN ela SHALL informar que a posição é demonstrativa e a hora da atualização, sem se apresentar como serviço ao vivo.
4. WHEN a pessoa sair da fila THEN o sistema SHALL pedir confirmação antes de remover o acompanhamento.

### P2: Mapa e cronograma funcionais

**Acceptance Criteria:**

1. WHEN a pessoa abrir o cronograma THEN o sistema SHALL mostrar seções Agora, Em seguida e Mais tarde com horários e locais mock.
2. WHEN a pessoa abrir o mapa THEN o sistema SHALL apresentar pinos acionáveis e detalhe do espaço selecionado.
3. WHEN dados forem mock THEN ambas as telas SHALL informar que a programação exibida é demonstrativa.

### P2: Galeria e conta mais claras

**Acceptance Criteria:**

1. WHEN a galeria falhar THEN ela SHALL exibir erro e retry; WHEN não houver itens THEN SHALL exibir estado vazio com CTA contextual.
2. WHEN um momento for exibido THEN a interface SHALL comunicar publicação/moderação de forma textual.
3. WHEN a preferência de tema mudar THEN a conta SHALL expor seu estado por texto acessível.

## Edge Cases

- WHEN a pessoa alternar de aba durante retry THEN o sistema SHALL não atualizar estado desmontado.
- WHEN conteúdo offline salvo for exibido THEN SHALL indicar que é somente leitura e o horário de captura.
- WHEN lista de mapa, cronograma ou galeria não tiver itens THEN SHALL explicar a situação e não parecer falha silenciosa.
- WHEN a pessoa usar teclado ou leitor de tela THEN SHALL alcançar ações, receber foco visível e ouvir estados dinâmicos.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DNJX-01 | Feedback confiável | Design | Pending |
| DNJX-02 | Entrada guiada | Design | Pending |
| DNJX-03 | Home operacional | Design | Pending |
| DNJX-04 | Jogo e fila | Design | Pending |
| DNJX-05 | Mapa e cronograma | Design | Pending |
| DNJX-06 | Galeria e conta | Design | Pending |

## Visual Direction Addendum

1. WHEN the DNJ Game screen renders THEN its dominant green SHALL be the exact brand green extracted from DNJGAME_01.png: #B2D64D.
2. WHEN the user is on the DNJ Game screen THEN progress, selected game tabs, ranking emphasis and the floating scanner action SHALL use the DNJ Game green consistently.
3. WHEN a QR scan action is available THEN it SHALL use DNJ orange for contrast against the green game surface.
4. WHEN the game overview opens THEN it SHALL not render the large scan QR card; the existing first-access modal SHALL remain the explanatory entry point and the floating orange scanner action SHALL remain available after onboarding.

## Success Criteria

- [ ] Todos os requisitos DNJX têm teste automatizado e gate verde.
- [ ] Nenhuma tela do escopo confunde erro remoto com estado vazio.
- [ ] A experiência continua utilizável em celular com rede indisponível, sem prometer ação que não pode concluir.
