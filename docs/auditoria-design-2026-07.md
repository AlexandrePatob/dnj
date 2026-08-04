# Auditoria de design — DNJ Game 2K26

**Data:** 23 de julho de 2026  
**Escopo:** revisão de todas as superfícies atuais da aplicação, com foco em uso móvel durante o DNJ, conectividade instável e acessibilidade.

## Como usar este arquivo

- Trate cada item `P1` como requisito para antes do evento.
- Marque os itens concluídos com `[x]` e registre a decisão abaixo do item quando houver mudança de escopo.
- Esta é uma revisão de UX/design e não substitui testes com participantes no evento.

## Cobertura revisada

| Área | Telas ou componentes cobertos | Situação |
|---|---|---|
| Entrada | Login, cadastro, verificação OTP, escolha de grupo | Revisado |
| Experiência principal | Home, navegação inferior, topo, estados de conectividade e instalação | Revisado |
| Jogo | Onboarding, pontos, ranking individual/grupo, scanner QR e resultado | Revisado |
| Fila | Escolha de atendimento, confirmação, acompanhamento e FAQ | Revisado |
| Galeria | Galeria pública, Meus Momentos, curtidas e comentários | Revisado |
| Conta | Perfil, progresso, privacidade, tema e saída | Revisado |
| Estados transversais | Offline, snapshot, tema claro/escuro, movimento reduzido e responsividade | Revisado |

## Diagnóstico geral

O DNJ Game tem identidade visual forte e específica: marca, cores, linguagem católica, grupos, QR e progressão fazem sentido para o evento. A maior oportunidade é transformar essa boa identidade em **confiança operacional**: o participante precisa saber o que é real, o que está indisponível e o que deve fazer agora.

**Nota de saúde de UX: 23/40 — aceitável, com melhorias importantes antes do evento.**

| Heurística de Nielsen | Nota | Síntese |
|---|---:|---|
| Status do sistema | 2/4 | Nem todo dado dinâmico informa origem ou última atualização. |
| Sistema e mundo real | 3/4 | Linguagem do evento é natural; XP, energia e pontos precisam se relacionar melhor. |
| Controle e liberdade | 2/4 | Fila e onboarding precisam de saídas e confirmações mais explícitas. |
| Consistência | 3/4 | Componentes são coesos; cores de ação/estado se sobrepõem. |
| Prevenção de erro | 2/4 | Validações e confirmações ainda são superficiais. |
| Reconhecimento | 3/4 | Navegação clara; alguns elementos parecem clicáveis sem entregar ação. |
| Eficiência | 2/4 | Falta rota alternativa para câmera ou rede indisponíveis. |
| Estética e minimalismo | 3/4 | Design autoral, mas a Home compete por atenção. |
| Recuperação de erro | 2/4 | Falha de rede pode ser confundida com estado vazio. |
| Ajuda contextual | 1/4 | Falta orientação em login, mapa, pontos e offline. |

## Backlog prioritário

### P1 — confiança nos dados e CTAs

- [ ] Trocar simulações e CTAs sem ação por dados reais ou rótulos explícitos: `Em breve`, `Demonstração` e `Atualizado às HH:MM`.
- [ ] Na fila, mostrar confirmação de entrada, última sincronização, estimativa e estado offline. Não apresentar atualização local como serviço ao vivo.
- [ ] Desabilitar o cronograma enquanto não houver destino real ou abrir uma tela honesta de programação em breve.
- [ ] Diferenciar claramente estados `vazio`, `carregando` e `erro ao carregar` na galeria.

**Por quê:** decisões erradas sobre local, fila e programação têm impacto físico no evento.

### P1 — ações dependentes de rede

- [ ] Passar o estado `online/somente leitura` aos CTAs de QR, galeria, fila e demais ações remotas.
- [ ] Antes do toque, explicar: `Conecte-se à internet para validar este QR Code`.
- [ ] Exibir horário do conteúdo salvo quando a pessoa estiver vendo um snapshot offline.

**Por quê:** a pessoa usa o app em rede oscilante e não deve descobrir a limitação apenas depois de iniciar uma ação.

### P1 — login, cadastro e OTP

- [ ] Validar CPF, e-mail e telefone com mensagens específicas por campo.
- [ ] Tornar os termos de uso um link funcional.
- [ ] Após enviar OTP, informar para qual e-mail foi enviado e oferecer reenvio real, com status.
- [ ] Permitir colar o código completo no OTP e preservar dados quando a pessoa volta de uma interrupção.
- [ ] No cadastro, separar melhor busca de grupo, criar grupo e `não tenho grupo` para reduzir decisões simultâneas.

**Por quê:** é a porta de entrada do evento e hoje a recuperação é pouco guiada.

### P2 — Home orientada para o momento do evento

- [ ] Criar no topo um cartão `Agora`: atividade, horário, local e CTA principal.
- [ ] Transformar cronograma e mapa em destinos de verdade; enquanto isso, manter cards compactos e sem falsa interatividade.
- [ ] Evitar que missão, espaços, mapa e programação disputem o mesmo nível de destaque.

**Critério de sucesso:** em dois segundos, a pessoa entende o que fazer, onde e até quando.

### P2 — legibilidade, toque e acessibilidade

- [ ] Elevar labels críticas da navegação e legendas para pelo menos 12px; preferir 14px para informação operacional.
- [ ] Garantir alvos de toque de ao menos 44x44px, especialmente fechar modal e ações secundárias.
- [ ] Confirmar contraste AA nos textos teal/verde em fundo claro e nas bordas sutis.
- [ ] Não comunicar ativo, erro ou sucesso apenas com cor; adicionar texto, ícone ou estado anunciado.
- [ ] Associar corretamente `label` e `input` (`htmlFor`/`id`) e validar foco, Escape e retorno de foco em modais.

## Melhorias por tela

### Login

- [ ] Explicar CPF e e-mail aceitos, com erro perto do campo.
- [ ] Adicionar link funcional para termos e suporte de acesso.

### Cadastro e grupo

- [ ] Reduzir densidade da seleção de grupo; priorizar busca, depois alternativas.
- [ ] Deixar claro o que ocorre quando a pessoa cria um grupo localmente.

### Verificação OTP

- [ ] Confirmar envio, reenvio e tempo de espera honestamente.
- [ ] Suportar colagem do código e erro por dígito/código inválido.

### Home

- [ ] Priorizar `Agora` e reduzir módulos concorrentes.
- [ ] Não usar mapa ou cronograma como decoração se não levam a detalhes/rota.

### Jogo e scanner QR

- [ ] Explicar relação entre pontos, XP e energia.
- [ ] Oferecer alternativa quando a câmera não estiver disponível e bloquear scanner offline antes de abrir.

### Fila

- [ ] Não simular atualização automática como se fosse sincronizada.
- [ ] Confirmar entrada/saída e incluir última atualização/estimativa.
- [ ] Manter tom reservado e não gamificar a espera de confissão.

### Galeria e momentos

- [ ] Diferenciar erro de rede de galeria vazia.
- [ ] Explicitar privacidade, moderação, edição e exclusão dos momentos.
- [ ] Não tratar curtir/comentar local como interação publicada sem avisar.

### Conta

- [ ] Tornar o alternador de tema semanticamente acessível.
- [ ] Manter confirmação de saída com cancelamento visível e foco correto.

## Pontos fortes a preservar

- Identidade DNJ própria e reconhecível.
- Ação de QR como foco natural do jogo.
- Fundamentos PWA/offline, câmera e `prefers-reduced-motion` já presentes.
- Componentes visuais coerentes: cards, botões, tipografia e temas.

## Evidência automática

O detector encontrou 9 achados efetivos no código da aplicação:

- 1 alerta advisory de grade decorativa em `src/app/theme.css`.
- 8 warnings nas molduras decorativas de câmera/QR.

Os oito warnings das molduras são falsos positivos: são guias de enquadramento com `aria-hidden`, não abas/cards genéricos. A grade da missão é contextual e pode ser preservada se continuar exclusiva desse card.

## Limitações da auditoria

- O browser de inspeção não estava disponível nesta execução; não houve overlay nem navegação manual ao vivo.
- A revisão usou código-fonte, snapshots visuais versionados e detector estático.
- Recomenda-se validar os itens P1 em um teste presencial com jovens usando rede móvel real.

## Propostas visuais — todas as telas

### Direção: Peregrinação em movimento

Evoluir o visual atual, sem trocar sua identidade: preservar laranja DNJ, verde de jogo e tom jovem; reduzir a aparência de coleção de cards e organizar cada tela pela sequência **o que acontece agora → onde ir → o que fazer**.

### Sistema visual proposto

| Elemento | Proposta |
|---|---|
| Cor | Laranja para ação principal; verde apenas para progresso/pontos; teal apenas para localização/orientação; vermelho para atenção/saída. |
| Hierarquia | Apenas um hero por tela. O restante usa superfícies leves, borda sutil e pouca sombra. |
| Tipografia | Títulos curtos; corpo entre 14 e 16px; navegação e legenda a partir de 12px. |
| Status | Sempre ícone, texto e horário: `Offline · conteúdo salvo às 10:32`. |
| Movimento | Entradas curtas. Animação contínua somente no hero de missão, respeitando redução de movimento. |

### Entrada: login, cadastro e OTP

- **Login:** hero laranja menor, com logo como selo de chegada; formulário sobe para a primeira dobra. Erros aparecem sob o campo e termos/suporte formam um bloco secundário legível.
- **Cadastro:** indicador compacto `1. Seus dados — 2. Seu grupo`. Busca é a ação primária; grupo escolhido fica fixado; `Não tenho grupo` recebe o mesmo peso visual; criar grupo abre painel separado.
- **OTP:** tela calma com e-mail mascarado, status `Código enviado agora`, campo único de seis casas com colagem e reenvio com feedback real.

### Home

- Substituir a missão como hero absoluto por `Agora no DNJ`: horário, atividade, local, status e CTA `Ver caminho`/`Participar`.
- Missão torna-se o segundo bloco, compacto, com progresso e atalho ao Jogo.
- Cronograma, espaços e mapa tornam-se três atalhos de mesmo peso — não três painéis longos empilhados.
- Na Home, exibir só miniatura do mapa e o próximo local. Mapa completo em tela própria.

### Novas superfícies: cronograma e mapa

- **Cronograma:** linha do tempo vertical; seções `Agora`, `Em seguida`, `Mais tarde`; filtros por espaço e carimbo de atualização.
- **Mapa:** pinos grandes e filtráveis; ao tocar, abrir card inferior com espaço, orientação e CTA `Ir para cá`. Deve ser ferramenta, não ilustração.

### Jogo, ranking e QR

- Cabeçalho com nível, pontos e explicação da próxima conquista.
- Card QR de alto contraste como CTA dominante; remover o FAB redundante quando esse card estiver visível.
- Histórico vira linha do tempo de conquistas, com categoria e horário.
- Ranking fixa a posição do usuário no topo e deixa o top 3 mais legível que decorativo.
- Resultado do QR celebra rapidamente, mostra impacto no nível e oferece uma próxima ação concreta.
- Scanner com moldura limpa, instrução direta e estados próprios para offline, permissão negada e câmera indisponível.

### Fila

- Dois cards iniciais equivalentes, com descrição, local e tempo estimado; visual sereno e discreto para confissão.
- Confirmação mostra número, local, privacidade e `Atualizado às HH:MM`.
- Acompanhamento prioriza posição, previsão e conexão; `Sair da fila` fica separado e menos chamativo.
- FAQ abre em drawer, sem competir com o estado principal da fila.

### Galeria e momentos

- Tratar como mural do evento, não como rede social incompleta.
- Separar visualmente `Galeria DNJ` e `Meus Momentos`, com contexto de moderação e privacidade.
- Cards mostram só local, momento e status; remover ou rotular interações que não persistem.
- Estado vazio inclui CTA: `Registre seu primeiro momento após uma atividade`.
- O compositor declara antes do envio se a publicação é pública, privada ou moderada.

### Conta

- Cabeçalho com avatar, nome, grupo e resumo curto de jornada.
- Substituir três mini-cards por uma faixa de estatísticas com rótulos legíveis.
- Preferências em lista simples; tema sempre apresenta estado textual além do toggle.
- Saída isolada no rodapé, com confirmação clara e cancelamento visível.

### Ordem de implementação

1. Home `Agora`, status de rede e honestidade dos CTAs.
2. Login, cadastro e OTP; campos, validações e acessibilidade.
3. Fila e scanner QR com estados de rede reais.
4. Jogo/ranking e o sistema visual de progresso.
5. Mapa, cronograma e galeria completos.

### Anti-objetivos

- Não tornar o DNJ um dashboard corporativo.
- Não preencher telas com gradientes, badges e animações simultâneas.
- Não usar gamificação para encobrir ausência de dados operacionais reais.
- Não substituir a identidade DNJ por uma UI genérica de app de eventos.
