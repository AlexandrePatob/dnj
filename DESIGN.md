# DNJ participante

## Overview

A área do participante segue as referências fornecidas: gramado, mapa e identidade oficial DNJ, com informações pessoais em elementos HTML dinâmicos. Modo Operate, prioritariamente no celular durante o evento.

## Colors

Gramado e verde vêm das imagens oficiais. Usar o laranja do projeto `var(--primary)` (`#e87425`) em pontuação, links e jornada. A cápsula dos pontos usa 88% de opacidade apenas no fundo. Superfícies e texto usam os tokens claro/escuro existentes.

## Typography

Space Grotesk é a fonte global de todas as áreas, incluindo controles e painéis. Carregamento por next/font no elemento html, com o token --font-sans declarado no tema Tailwind para impedir a substituição pela fonte do sistema. Saudação em peso 700, escala responsiva; informações e controles em pesos 500–700. Pontuação com algarismos tabulares.

## Layout

Aplicativo centralizado, até 448px. Topo com avatar à esquerda, marca central e pontos à direita. Na Home, o topo rola junto com a saudação sobre gramado e a jornada sobreposta ao rodapé do banner. Seis etapas visíveis em sequência. Respeitar áreas seguras e navegação inferior.

A arte principal e seu contêiner mantêm a proporção natural 900:530 (`100% auto`). Uma camada de fundo preenche apenas a pequena faixa superior exposta pelo deslocamento da arte. Foto, logo central e pontos usam o mesmo alinhamento superior nas telas Home e internas. A jornada sobrepõe 10,5% da largura ao banner. Ocultar barras de rolagem na área participante sem desativar rolagem por toque, roda ou teclado.

A arte fica de 4 a 10px abaixo do topo, conforme a largura disponível. A altura da imagem é sempre automática, independente da altura necessária para o nome e a saudação.

No topo compacto, os últimos 24px do papel se fundem com `var(--background)` para evitar uma emenda entre a imagem e a tela.

A barra de status do PWA usa verde escuro `#243b17`, coordenado com o gramado, tanto no manifesto quanto no `theme-color` da página.

## Elevation & Depth

Jornada com sombra suave inferior, como o cartão da referência. Texto branco sobre imagem recebe contraste localizado.

## Shapes

Avatar circular com borda branca; pontuação em cápsula laranja; jornada com cantos de 24px e etapas circulares.

## Components

Foto abre Conta; pontuação e Ver evolução abrem DNJ Game. Jornada deriva exclusivamente de DNJ_LEVELS/getDnjLevel, incluindo início, progresso intermediário e nível máximo. Sem foto válida, exibir iniciais. Programação e mapa preservam ações e dados existentes.

## Do's and Don'ts

Usar as artes fornecidas como fundo; nunca incorporar foto, nome, pontuação ou progresso estáticos da imagem de exemplo. Preservar foco visível, redução de movimento, tema e estados da API.
