# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O usuário principal é o jovem participante do Dia Nacional da Juventude (DNJ) 2026. Ele usa o próprio celular durante o evento, em movimento e sujeito a conexão móvel instável ou indisponível.

## Product Purpose

O DNJ Game acompanha a jornada do participante durante o evento. A aplicação reúne autenticação, vínculo com grupo, missões, pontos, ranking, mapa, espaços e filas em uma experiência mobile-first. Sucesso significa que o participante consegue instalar e abrir o aplicativo rapidamente durante o evento, compreender seu estado e acessar conteúdo previamente carregado mesmo quando a rede oscila.

## Positioning

O produto transforma a programação e a participação no DNJ em uma jornada integrada ao evento, conectando identidade do participante, grupo, espaços, missões, pontuação, ranking e filas em uma única experiência.

## Operating Context

- Uso predominantemente em smartphones durante o DNJ 2026, em Curitiba.
- Conectividade pode ser lenta, intermitente ou ausente.
- O aplicativo instalado deve abrir sem conexão e manter disponível o conteúdo estático ou previamente carregado.
- Login, verificação, ranking, filas e atualizações vindas da API dependem de rede e devem comunicar claramente quando estiverem indisponíveis.
- O frontend se conecta a uma API externa sob o prefixo `/v1`; o modo de mocks permite percorrer o fluxo sem a API durante desenvolvimento.

## Capabilities and Constraints

- O produto continuará sendo uma aplicação web mobile-first hospedada na Vercel.
- A migração para PWA não pode redesenhar a interface, alterar a identidade visual nem quebrar os fluxos existentes.
- A experiência deve ser instalável e usar melhoria progressiva: navegadores sem suporte às capacidades PWA continuam acessando a aplicação web.
- O cache offline não pode apresentar como atualizados dados de autenticação, ranking, filas ou outras respostas dinâmicas da API sem indicar sua condição.
- Notificações push ainda não fazem parte do escopo confirmado da primeira migração PWA.

## Brand Commitments

- Preservar o nome DNJ Game 2K26 e a identidade do Dia Nacional da Juventude 2026.
- Preservar a implementação visual existente, incluindo layouts, tokens de tema claro/escuro, cores, tipografia, assets, animações e comportamento responsivo.
- Preservar os logos oficiais em `src/assets/brand/` e seus usos atuais.
- Manter o português do Brasil como idioma da experiência.

## Evidence on Hand

- Implementação visual mobile-first em `src/components/dnj-app.tsx`.
- Tokens, temas e animações em `src/app/theme.css` e `src/app/globals.css`.
- Logos oficiais em `src/assets/brand/`.
- Fluxos e contratos atuais documentados em `README.md` e implementados em `src/lib/api/`.
- Analytics e Speed Insights da Vercel já integrados no layout da aplicação.
- Não há suíte automatizada de testes ou baseline visual versionada no estado atual do projeto.

## Product Principles

1. Funcionar no contexto real do evento, inclusive sob conectividade instável.
2. Preservar integralmente a identidade e os fluxos já aprovados.
3. Comunicar com honestidade quando uma ação exige conexão ou quando um dado pode estar desatualizado.
4. Tratar instalação e funcionamento offline como melhoria progressiva, sem bloquear o acesso pela web.
5. Evitar mudanças de stack sem benefício mensurável para o participante ou para a operação na Vercel.

## Accessibility & Inclusion

- Manter suporte a `prefers-reduced-motion` já presente na aplicação.
- Preservar legibilidade, contraste e navegação nas dimensões de tela utilizadas atualmente.
- Estados offline, atualização e erro não podem depender apenas de cor para serem compreendidos.
