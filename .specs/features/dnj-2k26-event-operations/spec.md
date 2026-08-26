# DNJ 2K26 — Experiência, Operação e Contratos Specification

**Status:** Approved  
**Depends on:** `dnj-event-experience`, `docs/api/dnj-experience.openapi.yaml`  
**Scope:** planejamento e especificação; nenhuma implementação está incluída neste documento.

## Problem Statement

O DNJ Game já possui fluxos mobile, mocks de participação/momentos e uma central administrativa inicial, porém a experiência visual ainda não traduz integralmente a linguagem do DNJ 2K26 e o motor operacional não modela todos os tipos de interação do evento. Precisamos evoluir o frontend com dados mockados que simulem o evento real, sem acoplar a interface ao mock Next/Supabase e deixando contratos e dados prontos para futura implementação em Go + PostgreSQL.

## Goals

- [ ] Consolidar uma jornada participante clara: agora no DNJ, mapa, QR, pontos, fila, momentos e conta.
- [ ] Tornar Momentos um produto visual próprio, com feed enxuto e passaporte pessoal/grupal.
- [ ] Modelar as regras de QR, experiências, ações, desafios e eventos especiais com contratos transportáveis para Go + PostgreSQL.
- [ ] Separar integralmente participante, gestor operacional e administrador do painel.
- [ ] Entregar uma base visual consistente com Space Grotesk, verde DNJ Game, laranja para QR e logo-sticker em fotos compartilhadas.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Implementação da API em Go ou migração para PostgreSQL | Depende do backend responsável; esta feature define compatibilidade e contrato. |
| Integração real com Google My Maps | A decisão entre imagem interativa e integração será tomada após a base visual. |
| Política final de níveis, teto e distribuição de pontos | Depende da programação final e da simulação operacional. |
| Engine final de fila | Primeiro será mantida/representada por mock e validada visualmente. |
| Moderação automática por IA | A moderação inicial é humana e operacional. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tipografia | Space Grotesk será a fonte de interface DNJ. | Referência oficial fornecida. | Sim |
| Logo-sticker | O novo logo em formato sticker substituirá a marca principal atualmente usada em toda a experiência participante, inclusive entrada, cabeçalho, navegação e assets de compartilhamento. | Unifica a identidade visual aprovada. | Sim |
| Marca-d'água | O logo-sticker será aplicado também à imagem compartilhada/exportada. | Mantém a interface limpa e dá identidade ao compartilhamento. | Sim |
| Entrada | A tela inicial terá uma animação única de sticker “colando” na tela; ela será a assinatura de movimento do app. | Cria uma entrada memorável sem espalhar efeitos decorativos. | Sim |
| Celebração de QR | A validação bem-sucedida de QR terá celebração visual com fireworks antes do feedback de pontos. | Dá retorno inequívoco de participação confirmada. | Sim |
| Foto do feed | Somente a foto terá cantos arredondados; o card e os demais elementos preservam sua estrutura atual. | Direção visual explícita. | Sim |
| Meus Momentos | Grade tipo passaporte com três itens por linha, padding interno menor e abas/segmentos Eu e Meu Grupo quando houver grupo. | Equaliza a experiência pessoal e grupal. | Sim |
| Fonte de dados atual | Next Route Handlers e mocks atuais permanecem como adaptadores de desenvolvimento. | Permite validar fluxos antes do backend Go. | Sim |
| Compatibilidade futura | Contratos HTTP, erros, idempotência, cursores e datas UTC não dependerão de APIs internas do Next ou do Supabase. | Facilita a troca para Go + PostgreSQL. | Sim |
| Perfis | Participante, Gestor e Admin serão contextos separados, com rotas, permissões e UI independentes. | Evita misturar uso no evento com operação e governança. | Sim |
| Decisões operacionais pendentes | Visuais e mocks podem avançar; regras finais de pontuação, fila, mapa e moderação serão tratadas em especificações subsequentes. | Diretriz do produto. | Sim |

**Open questions:** registradas como fora do escopo imediato; não bloqueiam o protótipo visual/mock.

## Roles and Boundaries

| Role | Objective | Can do | Must not do |
| --- | --- | --- | --- |
| Participante | Viver e registrar o DNJ no celular | Escanear, entrar em fila, criar momentos, consultar pontos/ranking/mapa | Administrar eventos, moderar conteúdo ou editar programação |
| Gestor | Operar um contexto delimitado no dia do evento | Iniciar/parar atividades autorizadas, acompanhar participantes e aplicar resultado quando previsto | Acessar dados globais ou configurações administrativas fora de sua atribuição |
| Admin | Governar a operação e conteúdo | Moderar momentos, administrar perfis, campanhas e visão global | Ser usado como interface participante ou gestor de campo |

## User Stories and Acceptance Criteria

### P1: Momentos DNJ e passaporte

**User Story:** Como participante, quero registrar e rever momentos meus e do meu grupo em uma experiência bonita e simples, para compartilhar a vivência do DNJ.

1. **DNJ26-MOM-01** — WHEN a pessoa abrir a navegação principal THEN o sistema SHALL exibir o item **Momentos**, substituindo “Galeria DNJ”.
2. **DNJ26-MOM-02** — WHEN o feed renderizar um momento THEN somente a imagem SHALL ter cantos arredondados, margem e respiro visual; o restante do card SHALL preservar a hierarquia atual.
3. **DNJ26-MOM-03** — WHEN o feed renderizar THEN SHALL oferecer curtida e compartilhamento, e SHALL NOT exibir comentários como interação do participante.
4. **DNJ26-MOM-04** — WHEN a pessoa abrir **Meus Momentos** THEN SHALL ver uma grade compacta estilo passaporte com exatamente três colunas em largura mobile compatível.
5. **DNJ26-MOM-05** — WHEN a pessoa possuir grupo THEN Meus Momentos SHALL permitir alternar entre **Eu** e **Meu Grupo**; WHEN não possuir grupo THEN SHALL mostrar apenas os próprios momentos, sem controle vazio.
6. **DNJ26-MOM-06** — WHEN a pessoa abrir qualquer foto em Momentos THEN SHALL ver o detalhe reutilizável com curtida e compartilhamento.
7. **DNJ26-MOM-07** — WHEN uma foto for preparada para compartilhamento THEN o arquivo compartilhado SHALL conter a marca-d'água do logo-sticker fornecido; a imagem exibida no feed SHALL manter sua versão apropriada para a interface.
8. **DNJ26-MOM-08** — WHEN a pessoa adicionar um momento fora de uma experiência elegível THEN o sistema SHALL informar que a publicação pode não gerar pontos, sem impedir a publicação permitida.

### P1: Home, orientação e marca

**User Story:** Como participante em movimento, quero entender rapidamente o que acontece agora e como participar.

1. **DNJ26-HOM-01** — WHEN a pessoa entrar pela primeira vez THEN SHALL receber um tutorial navegável sobre DNJ Game, Momentos, filas, QR Codes, desafios especiais e ações de Radicalidade.
2. **DNJ26-HOM-02** — WHEN a Home abrir THEN SHALL priorizar “Agora no DNJ” em linguagem visual branca e verde, suportando mais de um evento próximo/simultâneo no mock.
3. **DNJ26-HOM-03** — WHEN a pessoa precisar da programação THEN SHALL acessar o cronograma completo por CTA explícito; a Home SHALL NOT duplicar uma tela extensa de cronograma.
4. **DNJ26-HOM-04** — WHEN o produto mostrar pontos THEN SHALL usar o termo “Pontos”, e não “XP”, em toda a experiência participante.
5. **DNJ26-HOM-05** — WHEN a navegação e telas forem renderizadas THEN SHALL usar Space Grotesk e os tokens de marca aprovados, preservando reduced motion, contraste e modo escuro.
6. **DNJ26-HOM-06** — WHEN a tela inicial abrir THEN o logo-sticker SHALL executar uma animação curta de “colar” na interface; WHEN `prefers-reduced-motion` estiver ativo THEN SHALL aparecer sem deslocamento, rotação ou rebote.
7. **DNJ26-HOM-07** — WHEN uma marca DNJ for exibida nas superfícies participantes THEN SHALL usar o logo-sticker aprovado, substituindo os lockups anteriores onde não houver requisito técnico específico de ícone PWA.

### P1: Participação por QR e motor mockável

**User Story:** Como participante, quero escanear uma experiência e entender imediatamente minha participação, tempo e pontuação.

1. **DNJ26-ENG-01** — WHEN um QR válido for lido no app THEN SHALL criar ou recuperar uma participação de modo idempotente e retornar atividade, espaço, janela de validade, estado e pontos.
2. **DNJ26-ENG-02** — WHEN a participação permitir foto pontuável THEN o modal confirmado SHALL oferecer “Ganhe mais X pontos: compartilhe seu momento”, com opção clara de fechar.
3. **DNJ26-ENG-03** — WHEN uma participação tiver `expiration_post_time` THEN o CTA de momento SHALL expirar sem pontuar após esse horário; a publicação permitida SHALL continuar distinguível da publicação pontuável.
4. **DNJ26-ENG-04** — WHEN um QR não puder ser usado por expiração, uso único, cooldown ou contexto incompatível THEN o sistema SHALL comunicar o motivo e não conceder pontos.
5. **DNJ26-ENG-05** — WHEN a câmera padrão não puder ler o QR THEN o scanner SHALL oferecer ajuste de câmera/zoom suportado pelo dispositivo, com padrão 1× quando disponível.
6. **DNJ26-ENG-06** — WHEN uma foto elegível for enviada THEN o mock SHALL representar publicação, feedback visual e pontos concedidos ou pendentes de moderação sem depender de estado local de uma única tela.
7. **DNJ26-ENG-07** — WHEN um QR for validado com sucesso THEN SHALL exibir uma celebração breve de fireworks e pontos, antes de avançar para o estado de participação; WHEN `prefers-reduced-motion` estiver ativo THEN SHALL usar feedback estático equivalente, sem partículas animadas.

### P1: Alertas globais, fila e eventos especiais

**User Story:** Como participante, quero saber de uma fila ou oportunidade especial sem perder o contexto da tela atual.

1. **DNJ26-LIV-01** — WHEN houver evento especial ativo THEN todas as telas principais SHALL exibir uma tarja global com nome, contexto, timer e ação pertinente.
2. **DNJ26-LIV-02** — WHEN um evento especial for do tipo QR de telão/TV THEN SHALL conceder a pontuação definida pela experiência e SHALL NOT oferecer compartilhamento de momento como requisito.
3. **DNJ26-LIV-03** — WHEN a pessoa estiver em uma fila THEN a posição e o nome da fila SHALL permanecer visíveis fora da tela de Fila, respeitando sobreposição legível com alerta especial.
4. **DNJ26-LIV-04** — WHEN o mock estiver offline ou desatualizado THEN fila, ranking e alertas SHALL comunicar seu estado sem se apresentarem como dados ao vivo.

### P2: Gestor operacional

**User Story:** Como gestor autorizado, quero operar somente as experiências sob minha responsabilidade de maneira rápida e segura.

1. **DNJ26-MGR-01** — WHEN um gestor entrar THEN SHALL receber interface distinta da pessoa participante e somente os módulos autorizados por seu papel.
2. **DNJ26-MGR-02** — WHEN operar um espaço com cronograma THEN SHALL iniciar, encerrar ou avançar eventos pré-cadastrados, preservando uma margem/flex time configurável no mock.
3. **DNJ26-MGR-03** — WHEN operar uma experiência fixa THEN SHALL usar QR específico, regra de uso e cooldown próprios, sem exigir cronograma.
4. **DNJ26-MGR-04** — WHEN operar uma ação de Radicalidade THEN SHALL abrir/pausar/finalizar atividade, listar participantes e distribuir pontos de 1º, 2º, 3º e participação conforme configuração.
5. **DNJ26-MGR-05** — WHEN dois gestores autorizados consultarem a mesma ação THEN o mock SHALL representar uma fonte de estado compartilhada, não duas listas locais independentes.

### P2: Admin e moderação

**User Story:** Como administrador, quero administrar conteúdo e a operação sem interferir no fluxo de campo.

1. **DNJ26-ADM-01** — WHEN um admin acessar `/admin` THEN SHALL usar sessão administrativa separada da sessão participante e das permissões de gestor.
2. **DNJ26-ADM-02** — WHEN um desafio de momento estiver ativo THEN o admin SHALL visualizar as fotos vinculadas a ele e decidir entre conceder pontos, recusar pontos ou remover a publicação do feed.
3. **DNJ26-ADM-03** — WHEN uma decisão de moderação ocorrer THEN SHALL registrar decisão, responsável e data em trilha auditável.
4. **DNJ26-ADM-04** — WHEN o admin disparar um evento especial THEN o mock SHALL representar entrega para App, TV, telão ou ambos, com teaser configurável e encerramento automático pelo timer.
5. **DNJ26-ADM-05** — WHEN campanhas de push forem mostradas no painel THEN SHALL deixar explícito se são mockadas, pendentes de permissão ou efetivamente entregues.

## Contract and Data Compatibility

Os mocks Next serão adaptadores do mesmo contrato público que o backend Go oferecerá. O contrato deve manter:

- IDs estáveis (UUID ou equivalente), `createdAt`/`updatedAt` em ISO 8601 UTC e paginação por cursor;
- autenticação e autorização no servidor, nunca apenas pelo papel exibido no cliente;
- `idempotencyKey` em check-in/participação, criação de momento e atribuição de resultado;
- erros estáveis e orientados a domínio (`QR_EXPIRED`, `COOLDOWN_ACTIVE`, `MOMENT_NOT_ELIGIBLE`, `FORBIDDEN` etc.);
- estado de experiência explícito: tipo, espaço, evento, começo/fim, `expiration_time`, `expiration_post_time`, cooldown, regras de uso e política de pontuação;
- entidades separadas para `user`, `role_assignment`, `space`, `schedule_event`, `experience`, `qr_code`, `participation`, `moment`, `moderation_decision`, `queue`, `queue_entry`, `special_event` e `operation_audit`.

O schema PostgreSQL futuro deve materializar essas entidades e impor no banco as regras de unicidade, idempotência, autorização, pontuação e transições críticas. O frontend NÃO deve replicar essas regras como fonte de verdade.

## Edge Cases

- WHEN a pessoa não tiver grupo THEN o passaporte não SHALL expor aba ou conteúdo de grupo.
- WHEN a mesma foto ou envio for reenviado por falha de rede THEN a chave de idempotência SHALL evitar duplicação de momento/pontos.
- WHEN uma foto for recusada para pontuação mas puder permanecer pública THEN o admin SHALL poder escolher “sem pontos”; WHEN for imprópria THEN SHALL poder removê-la do feed.
- WHEN evento especial e fila coexistirem THEN os dois estados SHALL caber sem encobrir ação, título ou safe area.
- WHEN o backend estiver indisponível THEN os mocks/desenvolvimento SHALL sinalizar o estado e nunca se confundir com persistência real.
- WHEN o modo escuro estiver ativo THEN cantos, grids, marca-d’água e texto SHALL preservar contraste e legibilidade.

## Requirement Traceability

| Requirement ID | Area | Priority | Status |
| --- | --- | --- | --- |
| DNJ26-MOM-01..08 | Momentos | P1 | Pending |
| DNJ26-HOM-01..05 | Home e marca | P1 | Pending |
| DNJ26-ENG-01..06 | Motor e QR | P1 | Pending |
| DNJ26-LIV-01..04 | Ao vivo e fila | P1 | Pending |
| DNJ26-MGR-01..05 | Gestor | P2 | Pending |
| DNJ26-ADM-01..05 | Admin | P2 | Pending |

## Success Criteria

- [ ] O participante entende onde está, o que pode fazer e se uma ação gerou pontos.
- [ ] Momentos tem feed enxuto e passaporte 3-colunas coerente com a referência visual.
- [ ] Nenhum fluxo mistura permissões ou interface de Participante, Gestor e Admin.
- [ ] Os mocks exercitam contratos que possam ser implementados sem mudança semântica em Go + PostgreSQL.
- [ ] A especificação recebe aprovação antes de design, tarefas e implementação.
