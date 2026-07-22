# Operação e aceite da PWA

Este documento descreve a PWA do DNJ Game 2K26 em produção, sua política de cache e o aceite em aparelhos reais. A solução permanece em Next.js 16 e Vercel: trocar para Vite não traria benefício suficiente para compensar a perda do App Router, da integração atual de deploy e dos testes existentes.

## Componentes e geração

- `src/app/manifest.ts` publica o Web App Manifest.
- `src/app/icon.png`, `src/app/apple-icon.png` e `src/app/favicon.ico` atendem os metadados do Next.js.
- `public/icons/` contém os ícones declarados no manifest.
- `scripts/build-service-worker.mjs` gera `public/sw.js` antes de `dev` e `build`.
- `src/pwa/` reúne registro, conectividade, atualização e snapshot seguro.

O service worker recebe uma revisão por esta ordem:

1. `VERCEL_GIT_COMMIT_SHA`;
2. `VERCEL_DEPLOYMENT_ID`;
3. hash determinístico dos arquivos locais que formam o worker.

Assim, cada deploy da Vercel pode instalar uma revisão nova, enquanto builds locais idênticas continuam reproduzíveis. `public/sw.js` é um artefato versionado para permitir revisão do código efetivamente entregue ao navegador.

Para regenerá-lo manualmente:

```bash
node scripts/build-service-worker.mjs
```

## Headers e escopo

O worker é servido na raiz (`/sw.js`) e controla todo o app (`/`). A resposta usa `Content-Type: application/javascript`, `Cache-Control: no-cache, no-store, must-revalidate` e `Service-Worker-Allowed: /`, evitando que a CDN esconda uma revisão nova.

A política de segurança permite o script e as conexões same-origin necessárias ao worker. Requisições que não podem ser cacheadas atravessam o service worker diretamente para a rede.

## Matriz de cache

| Recurso/requisição | Estratégia | Pode ficar no cache? |
| --- | --- | --- |
| Navegação HTML same-origin | Network first, fallback para shell previamente aquecido | Sim, sem dados privados |
| `/_next/static/` | Cache first, preenchido pela rede | Sim |
| Assets locais públicos (ícones, imagens, fontes e estilos) | Cache first, preenchido pela rede | Sim |
| `/sw.js` | Rede, sem cache HTTP persistente | Não |
| `/v1/` e demais rotas de API | Network only | Não |
| Requisição com `Authorization` | Network only | Não |
| Métodos diferentes de `GET` | Network only | Não |
| Requisição cross-origin | Network only | Não |

No primeiro acesso sem rede ainda não existe shell aquecido; o worker responde com erro offline explícito e não grava essa resposta no cache. A experiência offline só é esperada depois de pelo menos uma navegação online concluída.

## Dados offline seguros

O snapshot local usa a chave versionada `dnj.pwa.snapshot.v1`. Ele pode conter somente os dados públicos necessários à visualização read-only, como nome de exibição, grupo, pontos, posição, progresso e identificadores públicos da interface.

Nunca grave no snapshot:

- CPF, e-mail ou outro dado pessoal usado na autenticação;
- token, cookie, cabeçalho `Authorization` ou credencial equivalente;
- corpo bruto de resposta da API;
- payload de escrita pendente.

Ao sair da conta, a aplicação remove o snapshot. Em modo offline, a interface sinaliza conteúdo salvo e mantém ações dependentes da API indisponíveis ou com erro claro; não existe fila de escrita nem sincronização em segundo plano.

## Atualizações

Quando uma revisão fica em `waiting`, o app exibe uma confirmação com a ação **Atualizar agora**. Somente essa ação envia o comando de ativação; depois de `controllerchange`, a página recarrega uma única vez. Voltar o app ao primeiro plano também verifica se há uma revisão esperando.

Na ativação, caches antigos com o prefixo da PWA são removidos. Não limpe indiscriminadamente todo o armazenamento do domínio, porque isso pode apagar dados do participante que não pertencem ao worker.

## Deploy na Vercel

1. Confirme que `npm run validate` passa na revisão candidata.
2. Faça o deploy normal do projeto Next.js na Vercel.
3. Confira `https://<dominio>/manifest.webmanifest` e `https://<dominio>/sw.js`.
4. No DevTools, confirme escopo `/`, revisão ativa e ausência de cache persistente para `/sw.js`.
5. Execute os checklists abaixo primeiro em Preview e depois no domínio de produção.

O HTTPS fornecido pela Vercel satisfaz o requisito de contexto seguro para instalação e service worker. Variáveis de revisão são lidas automaticamente durante o build.

## Assets instaláveis

| Plataforma/uso | Arquivo | Requisito |
| --- | --- | --- |
| Android, ícone padrão | `public/icons/icon-192x192.png` e `icon-512x512.png` | PNG quadrado, declarado com purpose `any` |
| Android, ícone adaptativo | `public/icons/icon-maskable-512x512.png` | Elementos essenciais dentro da zona segura central de 40% do raio; purpose `maskable` |
| iPhone/iPad | `src/app/apple-icon.png` | 180×180, fundo opaco e sem cantos arredondados embutidos |
| Metadado genérico | `src/app/icon.png` | 512×512 |
| Aba/favorito | `src/app/favicon.ico` | Variantes pequenas legíveis (16 e 32 px) |

Os arquivos derivam dos assets oficiais em `src/assets/brand`. Se a marca mudar, regenere-os com:

```bash
node scripts/generate-pwa-icons.mjs
```

Revise visualmente todas as saídas. O recorte maskable e o ícone Apple precisam de conferência em aparelho real; um emulador ou screenshot desktop não prova que a launcher do sistema preservará a composição.

## Checklist de aceite — Android/Chrome

Registre modelo, versão do Android, versão do Chrome, URL e revisão testada.

- [ ] Abrir a URL HTTPS online, navegar pelo fluxo principal e aguardar o aquecimento.
- [ ] Usar **Instalar app** no menu do Chrome e confirmar nome e descrição corretos.
- [ ] Confirmar ícone padrão e maskable sem corte da marca em launcher claro e escuro.
- [ ] Abrir pelo ícone e confirmar execução standalone, sem barra do navegador.
- [ ] Conferir layout, tema claro/escuro, safe areas, animações e ausência de redesign.
- [ ] Alternar para offline e confirmar status visível e snapshot read-only, sem dados sensíveis.
- [ ] Tentar uma operação de API e confirmar erro offline claro, sem sucesso falso ou fila oculta.
- [ ] Restaurar a rede e confirmar recuperação do status e das chamadas.
- [ ] Publicar/abrir uma revisão nova, voltar ao app e confirmar o convite de atualização.
- [ ] Escolher **Atualizar agora** e confirmar uma única recarga na revisão nova.

## Checklist de aceite — iPhone/Safari

Registre modelo, versão do iOS, versão do Safari, URL e revisão testada.

- [ ] Abrir a URL HTTPS online, navegar pelo fluxo principal e aguardar o aquecimento.
- [ ] Usar **Compartilhar → Adicionar à Tela de Início** e confirmar o nome.
- [ ] Confirmar o apple-touch-icon sem transparência indesejada, borda duplicada ou marca cortada.
- [ ] Abrir pela Tela de Início e confirmar execução standalone.
- [ ] Conferir status bar, safe areas, teclado, scroll, tema claro/escuro e ausência de redesign.
- [ ] Alternar para offline e confirmar status visível e snapshot read-only, sem dados sensíveis.
- [ ] Tentar uma operação de API e confirmar erro offline claro, sem sucesso falso ou fila oculta.
- [ ] Restaurar a rede e confirmar recuperação do status e das chamadas.
- [ ] Com uma revisão nova disponível, voltar ao app, aceitar a atualização e confirmar uma única recarga.

O projeto automatiza fluxos no WebKit, mas isso não valida o Safari real, o ícone da Tela de Início, o modo standalone nem a status bar do iOS. Esses itens permanecem pendentes até a execução deste checklist em aparelho físico.

## Diagnóstico

- **Instalação não aparece:** confirme HTTPS, manifest sem erro, ícones acessíveis e ausência de erro no registro do worker.
- **Revisão antiga permanece:** confira se `/sw.js` retorna `no-cache, no-store`, feche e reabra o app e procure uma registration em `waiting`.
- **Offline falha no primeiro acesso:** comportamento esperado; faça uma navegação online completa antes do teste.
- **API parece cacheada:** inspecione a requisição; `/v1/`, `Authorization`, métodos não-GET e origens externas precisam estar network-only.
- **Ícone cortado no Android:** verifique a imagem maskable e sua zona segura, não apenas a versão `any`.
- **Ícone errado no iPhone:** limpe somente a instalação de teste, confirme `apple-icon.png` e adicione novamente à Tela de Início.

Em uma URL de Preview usada exclusivamente para teste, pode-se remover a registration e apenas os caches com prefixo `dnj-pwa` pelo DevTools antes de repetir um cenário do zero. Não faça limpeza ampla do armazenamento de participantes em produção.

## Fora de escopo

Esta entrega não inclui notificações push, prompt de instalação customizado, background sync, fila/escrita offline, cache de respostas autenticadas ou migração para Vite.
