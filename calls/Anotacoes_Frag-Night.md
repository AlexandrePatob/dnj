---

Momentos DNJ | Meus momentos


-----
Menu debaixo - Trocar Galeria DNJ por Momentos - OK
    - Titulo - Momentos DNJ (Sai galerai) - OK
    - Ver versiculo sobre memoria ou amigo e colocar no SUBTITULO
    - Botao - Momentos DNJ | Meus Momentos
    - 

-- Manter o feed - OK
    - Remover comentario, somente curtida.
    - Aviaozinho do lado direito!
    - Aredondar foto com margin e padding e rounder
    - 

-- Adicionar Botao de + - OK
    - Poder tirar foto e compartilhar (Pontuacao Baixa ou nada)

-- Meus momentos - OK
    - Se, ele tiver grupo de jovens
    - Aparece igual o rankin
        - Eu | Meu Grupo
    - Se nao, nao coloca nenhum botao e so mostra deles.

-- Todas as Fotos do - OK
    - Sua ou do Grupo podem ser compartilhada
    - Reusa quando clicar na foto - Abre modal + Curtida e Compartilhamento.

----------------------------------------

-- Home -

-- Primeiro Acesso - OK
    - Tutorial explicando
    - Rola carrosel explicando tudo sobre o DNJ game
    - Momento, Fila, Gamming, Desafios especiais nas TV, Teloes
    - Compartilhe momentos em QRCodes especificos para pontuar
    - Participe de brincadeiras no radicalidade para pontuar (1,2,3 e restante participacao)

-- AGORA NO DNJ - Layout branco e verde.
- Pegar cronograma por Setor
- Ser possivel ter mais de um evento proximo
- Eventos simultaneos - Ver regra de exemplo, 15 min antes avisa aqui: 30:...
- Botao = Ver cronograma completo

-- Remover Cronograma do evento (Pegar o modelo branco + verde + minimalista)

-- Remover Missao ativa
    - Colocar no lado contrario do Ola Alexandre! 
        - Nivel Iniciante  0/100 Pontos
        - Nivel Peregrino

-- Equalizar em todos os lugares - PONTOS** ao invez de XP.
-- Colocar talvez os pontos no Header (Ver possibilidade).

-- Mapa 
    - 2 possibilidades
        - https://www.google.com/maps/d/u/0/viewer?mid=1aKENTfTvZsi_kiVcJ3UL8M8SLPbue8s&ll=-25.43326446164641%2C-49.356461848246624&z=18
        Ou
        - Foto (Ver se conseguimos deixar 3d, para manipulacao do Usuario e tal).


-- EVENTO ESPECIAL (USUARIO FINAL )
    -- SINALIZAR EM PRIMEIRO - TARJA - EVENTO ESPECIAL + TIMER
        - Clica, vai pra camera (Tirar foto no lugar tal) Desafio 3 minutos.
        - No mesmo lugar talvez do Escanear
        - Em TODAS AS PAGINAS, SOBRE TUDO!!!
        - QUASE QUE UM WARNING GERAL!! (Com timer e tal)
        --- PUSH NOTIFICATION!!


-- QRCode 
    - Timer por tipo
    - Especial nao tem compartilhar momento...
    - expiration_time = Expiracao para bipar QRCODE
    - expiration_post_time = Expiracao para ganhar ponto tirando uma foto do momento (Acoes fica nulo e nao pontua com foto).
    - Modal de Particpacao Confirmada
        - Quer ganhar mais X Pontos? Compartilhe seu momento (Ao invez de continuar)
        - Fechar (HyperLink para fechar)
        - Trocar particpacao confirmada com SubTitle.
    - Quando tiver um QRCODE com expiration_post_time, mostrar Momento DNJ - O Evento e Tire uma foto e ganhe mais pontos compartilhado esse momento.
    - Deixar Usuarios escolher 0.5x, 1x, 2x. (Definir sempre a 1 se possivel)
    - Pular Autorizacao de Publicacao, tirou foto Publicou! Dar feedback de Pontuacao + Publicacao!! (Fireworks)
    - 



--- Trocar Logo Sticker para o HEADER
-- Usar o Sticker para Marca D`Agua.
-- Ver Borda das fotos
-- Verificar porque a Marca D`Agua nao ta sendo salva na IMAGME (Como fazer para quando compartilhar, usar a marca dagua)

---- FILA ----

-- Pensar se utiliza o Mesmo Engine do Ano passado ou cria outro.
-- Mostrar posicao e em qual fila esta em todo o APP!!
-- Melhorar MUITO layout!!
-- Prever: Tiver na fila e Evento especial, Equalizar os dois!!

--- CONTA -- 
Remover Seu Perfil
-- Privacidade.
-- Ativar notificacoes - Perguntar quando instalar ou junto com o PWA.

-- Ver APP inteiro com modo escuro e ajustar textos e etc...
-- Subir a Foto ao invez do Icone com primeira letra do Nome.
-- Alterar para Editar e tal.

--- LOGIN ---

-- Trocar Logo com Sticker - TUFF (Colando na tela)
-- Criar Conta - Manter Logo + Header...
-- 

-- Push Notification
    -- Colocar Icone
    -- Ajustar layout melhor se possivel!!



----------------------------------------------------
--- GESTOR --
Play e pause - Acoes (Corrida do saco)

-------

-- Nome, Cescricao, Pontucao, Timer, Horario, Tipo, (Como se comporta no front)
---- Cronograma + Eventos (Pensando em DB - Talvez uma flag de Experiencia)
-- Amarrados, evento, hora de inicio + Espacos
    - Exemplo
    - Santidade -> Pode ter 13 eventos durante o dia
        - Mas pode haver alteracao de Nome, Pontuacao, Timer e Horario.

-- Experiencias (Sem cronograma) (Nome, Timer e Pontuacao) 
    - Stands da Feira vocacional (50 stands) - 1 Vez por EVENTO (pode fazer 50) (2 min bloqueando para nao bipar outros)
    - Rodas de vivencia (Santo papo) (15 min bloqueando para nao bipar outros)
    - skate
    - Circuito inflavel
    - Prata Fina (Criamos e tal)

-- Acoes (Pensar para ter 2 gestores com mesmo login, em celulares diferentes)
    - Radicalidade (Pre Cadastrar Games)
        - Gestor Lista as atividades
            - Iniciar e parar
            - Iniciar = Ativa o QRCODE
                - Participantes bipam QRCODE
                - Inicia a Atividade.
                - Pausou
                - Lista os participantes
                    - Entrega a pontuacao para 1,2,3. (Restante pontuacao de participacao)
            - Botaozinho de + para Criar atividade na hora (Ideia de nova).
            - Limite de Pontuacao
        - Participante
            - Escaneia o QRcode
            - Ficar em Participando da Atividade x
            - Quando O gestor, finalizar e pontuar
            - Recebemos ou lemos a atividade e damos o feedback visual para ele com pontuacao e tal
    

-- Desafio Momento
    - Galeria - Rodaria no APP.
        - Nome, descricao, Timer, Pontuacao - Foto
    - Enviar PushNotification + Dentro do app.
    - Fazer uma Moderacao das Fotos, para ver se atente o desafio ou nao 
    - Exemplo, Chafariz se o cara mandar foto do pe, nao vale ponto!
    - Se mandou do pe, nao pontua ou nem vai da galeria.
    - No admin - Listar todas as fotos enviadas
    - X para nao pontuar e uma Lixeira para Excluir a foto e nao aparecer na feed para ninguem (Fotos improprias)

-- Eventos Especiais (Gestor) Stand Time - Roda GERAL
    - QRCode (Tv + Telao) 
    - Criar QRCODE com 15seg a mais para Teaser + Contador
        - Dar tempo de Telao Sincronizar Ranking e pessoal prepara celular dentro do app.
        - Pensar em transicao animada do Ranking para QRCode especial
    - Duas Rotas Prontas para ouvir os evento (TV e Telao)
    - Gestor Cria o evento, por padrao colocar 15 segundos de transcisao para teaser.
    - Dando o Start, ja avisa a tv e o telao
    - Terminando, fecha tudo e tchau!
    - Usuario scaneia e Recebe Pontuacao com mais Animacao Especial!!!
    - Nao tem compartilha momento!

- Criar rota de Ranking 
    - TV
    - Telao



---- GESTORES
    - Admin - Sem Cronograma (Experiencias)
    - Admin - Desafio Momento (Fotos + moderacao)
    - Gestor por Espaco - Crongrama (Espacos) (Somente Start do evento para saber quanto comecou, iniciou o proximo, para o anterior)
        - 15 minutos de tolerancia de troca. (podenrar se vale a pena)
            - Exmeplo: Era pra ter terminado 14h, 14:15h troca para proxima atividade.
            - Flex time (Margem) Botao de Fuga para pular ou usar!
    - Gestor - Acao (Radicalidade)
    - Gestor - Eventos Especiais

---- PONTUACAO - 
-- Limite?
-- Nivel Peregrino ate quanto? quantos pontos sobe?


---- 
-- 

----------------------
Obs versao 2.

-- Home -

Header da pagina, ta esquisito, melhorar!!
Mapa nao ta legal...
Nao ta mostrando nada...so espaco em branco.

Primeiro acesso, ja temos um Tutorial mas poderia ser algo navegavel interativo...
Mostrando mesmo a usabilidade e tal...

Ler Anotacoes sobre HOME e equalizar la tambem MUITA Coisa faltando.

-- Momentos --

Momentos DNJ | Meus 
Quando seleciona Meus,
Deve abrir igual o Ranking
Individual | Grupo -- embaixo

Botao de tirar foto tem que estar habilitado SEMPRE.
Quando tiver evento que PONTUA, vai estar no DNJ GAME, Botao que abre a gamera e pontua!!

NO FEED SE A FOTO NAO FOR SUA NEM DE SEU GRUPO, nao pode compartilhar!!
Botao tem que ser fixo dinamico nao travado na tela, o feed vai rolar pra baixo e tal...

-- DNJ Game -- 

Colocar Titulo DNJ Game (logo) centralizada
Ajustar pontuacao em outro lugar ou o mesmo (ver)

Sobre os niveis Mostrar algo mais elaborado, temos bastante espaco
E dai embaixo o historico de pontuacao.
    - Sobre isso, temos que melhorar oq salvamos aqui
    Tipo
        - Corrida do Saco (Radicalidade)  +10 pontos
        - Palco Principal  +5 pontos

Escanerar, quando abrri ver se conseguimos deixar a camera 1x e nao 0.5x.

-- Fila -- 
Redesenhar e plugar na fila antiga...
Pegar layout e instrucoes melhores com o padrao do design system de agora e tal.

-- Conta --
Remover Seu Perfil
-- Privacidade.
-- Ativar notificacoes - Perguntar quando instalar ou junto com o PWA.

-- Ver APP inteiro com modo escuro e ajustar textos e etc...
-- Subir a Foto ao invez do Icone com primeira letra do Nome.
-- Alterar para Editar e tal.