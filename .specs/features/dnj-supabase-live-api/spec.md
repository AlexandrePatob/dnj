# DNJ 2K26 — API persistida de homologação

**Status:** Em execução  
**Fonte primária da programação:** `C:\Users\Alexandre\Downloads\Programação - DNJ 2k26 - Página1.pdf`

## Objetivo

Substituir os dados em memória usados pelo app participante por Route Handlers do Next que leem e escrevem no Supabase. A API conserva contratos portáveis para o futuro serviço Go + PostgreSQL, mas a homologação passa a usar dados reais já no banco.

## Premissas confirmadas

- A data de homologação do DNJ é **18/10/2026**, já usada pelo projeto; ela fica em um seed central.
- A entrega de SMS continua simulada para não disparar mensagem real, porém a validação cria/atualiza o participante no banco.
- O PDF é a fonte de atividades nomeadas. Horários sem título não recebem conteúdo inventado.
- Grupos de jovens: criar seis opções iniciais.

## Requisitos e critérios de aceitação

| ID | Requisito | Aceitação |
| --- | --- | --- |
| API-01 | Seed oficial | Existe um evento DNJ 2K26, os espaços do mapa, as atividades nomeadas do Palco Principal e Espaço Santidade do PDF e seis grupos. O seed pode ser reaplicado sem duplicar registros. |
| API-02 | Agenda por API | `GET /api/v1/schedule` retorna atividades persistidas, filtráveis por setor/espaço; cada item traz horário, espaço e estado temporal derivado no servidor. |
| API-03 | Grupos por API | `GET /api/v1/groups` pesquisa os seis grupos persistidos e `POST /api/v1/users/me/group` persiste a escolha do participante autenticado. |
| API-04 | Sessão de homologação persistida | Os endpoints de SMS e verificação ficam em `/api/v1/auth/*`; o código `123456` é aceito apenas em homologação e a verificação retorna token de participante emitido pelo servidor. |
| API-05 | Fluxos participantes por API | Scanner/participação, Momentos e curtidas usam `/api/v1`, com dados do Supabase, nunca `/api/mock` nem armazenamento em memória. |
| API-06 | Home de agenda | Home não exibe “Missão ativa” ou o card duplicado “Cronograma do Evento”; exibe “Agora no DNJ” branco/verde a partir da API, suporta itens simultâneos e mostra também o próximo item até 15 minutos antes. |
| API-07 | Contratos e qualidade | O contrato OpenAPI documenta as novas rotas e os testes cobrem os resultados e erros de domínio definidos nesta spec. Serviço de banco e chave de serviço ficam apenas no servidor. |

## Fora de escopo

- Envio real por SMS/e-mail.
- Alterações no repositório `dnj-game-api` ou implementação Go.
- Inventar programação para slots sem conteúdo no PDF.

