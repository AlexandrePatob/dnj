# DNJ 2026 — Especificação do Programa de Conclusão

## Problema

Os 28 pedidos descrevem fluxos ligados entre si, mas o frontend ainda mistura integração V2, interfaces legadas e dados isolados. Executá-los fora de ordem criaria regras paralelas para autenticação, pontos, programação, Moments e operação ao vivo.

## Objetivo

Concluir as frentes abaixo usando os contratos oficiais V2 quando disponíveis, sem inventar dados, regras de domínio ou APIs. Cada item original é um épico independente, com requisitos rastreáveis e aceite verificável.

## Restrições de projeto confirmadas

- A API HTTP V2 é a fonte para domínios regulares; o frontend não acessa banco diretamente.
- Confissão e Direção Espiritual permanecem filas pastorais isoladas no Firestore (AD-010), sem conteúdo sensível ou e-mail no estado operacional.
- Pontuação vem do saldo/histórico oficial (`users.points`/`point_entries`), nunca de cálculo no cliente.
- Escritas V2 devem usar `Idempotency-Key`; horários trafegam em UTC e são apresentados no fuso do dispositivo.
- Alterações visuais devem preservar a identidade existente e a segurança da PWA (AD-001 a AD-006).

## Assunções a confirmar antes do Design

| Decisão | Padrão proposto | Por quê |
| --- | --- | --- |
| E-mail sem conta | inicia cadastro passwordless e segue para onboarding após validar o código | o contrato V2 já substitui o fluxo legado que falhava nesse cenário |
| “Concluir escopo” | inclui frontend e os ajustes de API necessários, mas não publica nem cria dados reais em produção | implementação e teste local/staging são seguros; produção exige autorização e credenciais |
| Ordem | fundações de dados e fluxos primeiro; acabamento visual por último | evita retrabalho e UI ligada a regras provisórias |
| TV/Telão | consomem a mesma fonte de atividade/evento do app, com estratégia de atualização explicitamente testada | impede divergência entre telas operacionais |

## Épicos e critérios de aceite

| ID | Prompt | Resultado de aceite | Dependências |
| --- | --- | --- | --- |
| P01 | Confissões | grupos reais listam; participante percorre fila e gestor transiciona o atendimento; estado chega em tempo real; e-mail autenticado funciona | P02, P27, AD-010 |
| P02 | Login | Google é a primeira opção; separador OU e e-mail responsivos; e-mail novo inicia cadastro/onboarding | contrato V2 de auth |
| P03 | Header e pontos | logo centralizada e saldo oficial único no header; duplicações removidas sem nova fórmula | P09 |
| P04 | Home | saudação destacada; cards uniformes; sem título institucional nem pontos locais; mobile e desktop preservam funções | P03, P28 |
| P05 | Nomenclatura | todo texto visível troca Cronograma por Programação; identificadores internos permanecem estáveis | — |
| P06 | Programação | abas Agora/Espaços; quatro espaços na ordem definida; accordion e horários/status reais | P05, contrato agenda |
| P07 | Home agora | somente a Home mostra Acontecendo agora e não renderiza Em seguida/próxima atividade; outras telas mantêm esse conteúdo | P06 |
| P08 | Mapa | usa `MapaIsometrico_DNJ_FINAL.png` como preview oficial ampliável; CTA abre o mapa interativo existente; imagem legível em mobile | ativo/rota de mapa existentes |
| P09 | Ranking e níveis | faixas existentes mapeadas; Home/Header/Perfil/Ranking exibem a mesma regra e progresso | fonte oficial de pontos |
| P10 | Momentos estrutura | abas Momentos DNJ/Meus Momentos; foto livre publica sem desafio/pontos; desafio válido vincula e premia; cards usam o ícone do usuário e, quando houver foto de perfil, exibem-na no canto do card | P13, contrato Moments |
| P11 | Momentos feed | mídia, likes idempotentes, estados de tela e contexto condicional ao desafio funcionam | P10 |
| P12 | Marca d'água | marca consistente, proporcional e não intrusiva em miniatura e lightbox para três proporções | P10 |
| P13 | Desafio fantasma | card inexiste sem desafio ativo; filtros de status e janela temporal eliminam fallback antigo | fonte de desafio ativo |
| P14 | Card de desafio | componente e consulta compartilhados por Home e Game; só renderiza desafio válido | P13 |
| P15 | Gestor Radicalidade | só atividades ativas; desativação confirmada e imediata; pontos são únicos e auditáveis | pontuação oficial |
| P16 | Cronometrista | atividades aparecem; ações temporais confirmadas preservam máquina de estados válida e sincronizam consumidores | P05, P06, P23 |
| P17 | Filas visual | identidade laranja/verde permanece em todos os estados, sem reescrever a lógica | P01, AD-010 |
| P18 | Conta | perfil simples, responsivo, sem dados técnicos de auth e no padrão de cards | P03, P28 |
| P19 | Push/VAPID | SW/subscription/VAPID/associação persistida; permissão não repete; renovação e estados tratados | contrato Push V2, AD-001–003 |
| P20 | Moderação | admin lista pendências, aprova/rejeita sem apagar indevidamente e atualiza lista | P10, P11 |
| P21 | Admin atividades | formulário por tipo usa somente campos pertinentes e valida obrigatórios | tipos de atividade reais |
| P22 | Admin eventos | CRUD, datas, status, ativações e feedback corretos e isolados por domínio | P01, P13, P14, P21 |
| P23 | TV e Telão | evento especial ativo chega à TV/Telão e termina no estado normal; layout de tela grande revisado | P16, P22 |
| P24 | Patrocinadores | dados configuráveis, imagens sem deformação na Home e rotação automática no Telão | P23 |
| P25 | QR | tipo explícito diferencia pontuar de entrar; expiração, invalidez e idempotência tratados | contrato QR V2, P09 |
| P26 | Auditoria gestores | revisão integrada elimina duplicações e falhas de estado/loading/responsividade sem reimplementar domínios | P01, P15, P16, P22, P23 |
| P27 | Onboarding | novo/incompleto/interrompido/concluído seguem os redirecionamentos e permissões corretos | P02, grupos V2 |
| P28 | Equalização visual | tokens, cards, estados e responsividade consistentes; nenhuma regra de negócio alterada | todos os épicos funcionais |

## Casos transversais obrigatórios

1. Toda mutação de QR, Moments, likes, pontuação, atividade ou gestão deve ser idempotente e ter teste de duplicidade/concor­rência quando aplicável.
2. Estados vazio, carregando, erro, sem permissão e dados antigos devem ser tratados nas telas alteradas.
3. Fluxos autenticados devem testar pelo menos o papel correto e a recusa do papel incorreto.
4. Alterações de programação e desafio ativo devem provar a mesma saída em Home, app, gestor e TV/Telão quando estes forem consumidores.
5. Critérios visuais devem ser verificados em viewport mobile e desktop; P28 não pode mudar comportamento de domínio.

## Fora de escopo sem nova autorização

- Publicar, fazer deploy, ativar eventos ou criar contas/dados no ambiente remoto.
- Substituir a arquitetura V2, migrar banco ou recriar o mapa interativo.
- Inventar faixas de nível, tipos de atividade, logos de patrocinador ou dados de teste persistentes.

## Rastreabilidade

Cada épico P01–P28 será detalhado no respectivo `design.md`/`tasks.md` após esta especificação ser aprovada. Um requisito só muda para **Verified** após teste de aceite e verificação independente.
