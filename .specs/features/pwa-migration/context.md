# Migração PWA — Contexto

**Coletado em:** 2026-07-22  
**Spec:** `.specs/features/pwa-migration/spec.md`  
**Status:** Approved

---

## Limite da Feature

Transformar o frontend Next.js existente em uma PWA instalável e resiliente a conectividade instável, mantendo integralmente o design e os fluxos atuais. A primeira versão cobre instalação, abertura offline após um primeiro carregamento bem-sucedido, leitura segura do conteúdo local ou previamente disponível, estados honestos de conectividade e atualização segura. Ela não adiciona novas funcionalidades de negócio.

---

## Decisões de Implementação

### Plataforma e hospedagem

- Manter Next.js 16 com App Router.
- Manter o deploy na Vercel e as integrações atuais de Analytics e Speed Insights.
- Não migrar para Vite.
- Não adotar Serwist na primeira versão; usar um service worker próprio, pequeno e auditável.

### Contexto de uso e offline

- O usuário principal é o jovem participante do DNJ usando o celular durante o evento.
- A aplicação deve considerar internet móvel lenta, intermitente ou ausente.
- Após pelo menos uma abertura online bem-sucedida, a aplicação instalada deve conseguir abrir sem conexão.
- Conteúdo estático e conteúdo seguro já disponível localmente podem ser consultados offline.
- Login, verificação, ranking, filas e atualizações da API continuam dependentes de rede.
- Dados dinâmicos não podem parecer atuais quando estiverem indisponíveis ou possivelmente desatualizados.

### Preservação visual

- A migração é técnica, não um redesign.
- Layout, tokens, temas, logos, tipografia Poppins, animações, responsividade e textos existentes permanecem como autoridade visual.
- Novos estados de offline e atualização devem reutilizar os tokens e padrões atuais e ocupar apenas o espaço necessário.
- A fonte deve manter a mesma aparência quando a aplicação estiver offline; a requisição atual ao Google Fonts não pode continuar como dependência de runtime.
- Os ícones instaláveis devem ser derivados dos assets oficiais, sem esticar logos retangulares, redesenhar a marca ou permitir que máscaras do Android/iOS cortem o símbolo.

### Discrição do agente

- Escolher a divisão interna dos módulos PWA sem refatorar telas fora do necessário.
- Definir nomes técnicos de caches, desde que sejam versionados e eliminados com segurança.
- Definir o formato exato dos testes automatizados, sujeito à aprovação posterior da matriz de testes em `tasks.md`.

### Áreas não discutidas → Premissas

- Não haverá notificações push na primeira versão, pois não são necessárias para instalação ou offline e exigem backend, consentimento e política próprios.
- Não haverá botão de instalação customizado na primeira versão; instalação seguirá as capacidades nativas de cada navegador.
- O primeiro acesso sem nunca ter carregado a aplicação online não terá conteúdo para recuperar e deverá apresentar uma mensagem clara do navegador/aplicação.
- A atualização do service worker não interromperá uma sessão ativa; a nova versão será aplicada em um ponto seguro e comunicada ao usuário quando exigir recarga.

---

## Referências Específicas

- Implementação visual: `src/components/dnj-app.tsx`.
- Tema e animações: `src/app/theme.css` e `src/app/globals.css`.
- Metadata atual: `src/app/layout.tsx`.
- Assets oficiais: `src/assets/brand/`.
- Contratos de rede: `src/lib/api/`.
- Contexto durável: `PRODUCT.md`.

---

## Ideias Adiadas

- Notificações push.
- Background Sync para ações realizadas offline.
- Persistência offline de futuros endpoints de ranking, missões, mapa ou filas.
- Migração para Vite ou adoção de Serwist sem evidência de que a implementação manual deixou de atender ao produto.
