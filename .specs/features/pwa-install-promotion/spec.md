# PWA Install Promotion Specification

## Problem Statement

O DNJ Game já é tecnicamente instalável, mas não comunica essa possibilidade dentro da experiência. Participantes podem não perceber o ícone ou a opção de instalação do navegador, especialmente em celulares durante o evento.

## Goals

- [ ] Oferecer uma chamada de instalação contextual, acessível e não bloqueante quando o navegador permitir a instalação.
- [ ] Orientar usuários de iPhone e iPad pelo fluxo manual do Safari.
- [ ] Respeitar instalação existente e recusas temporárias sem repetir a promoção de forma insistente.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Publicação em lojas | A instalação continua sendo conduzida pelo navegador. |
| Notificações push | Capacidade independente da promoção de instalação. |
| Analytics de conversão | Não há contrato de eventos confirmado para esta entrega. |
| Redesign do app | A promoção deve preservar a identidade e os fluxos existentes. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Momento da promoção | Exibir assim que houver capacidade real de instalação | O navegador já aplica seus próprios critérios de elegibilidade. | Sim — “implementar tudo isso” após a proposta do fluxo. |
| Persistência da recusa | Ocultar por 7 dias no mesmo navegador | Evita insistência sem remover permanentemente a descoberta. | Assumido. |
| Superfície | Aviso compacto próximo à base do shell, acima da navegação quando presente | Reutiliza o padrão visual e preserva o conteúdo principal. | Assumido. |
| Prioridade | Offline e atualização disponível ocultam temporariamente a promoção | Estados operacionais exigem atenção imediata. | Assumido. |
| iOS/iPadOS | Instrução manual para Safari; em outros navegadores, orientar abertura no Safari | `beforeinstallprompt` não está disponível nessas plataformas. | Assumido. |
| Validação automatizada | Testes unitários, typecheck, lint e build; nenhum teste em browser | Restrição explícita do usuário durante a implementação. | Sim. |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Instalação em navegadores Chromium ⭐ MVP

**User Story**: Como participante em um navegador compatível, quero instalar o DNJ Game por uma ação clara dentro do app para acessá-lo rapidamente durante o evento.

**Why P1**: Torna descobrível a capacidade instalável já entregue pelo produto.

**Acceptance Criteria**:

1. **PWAIP-01** — WHEN o navegador emitir `beforeinstallprompt` e o app não estiver instalado nem temporariamente dispensado THEN o sistema SHALL exibir a promoção com a ação **Instalar app**.
2. **PWAIP-02** — WHEN o participante acionar **Instalar app** THEN o sistema SHALL chamar o prompt nativo exatamente uma vez a partir desse gesto.
3. **PWAIP-03** — WHEN o navegador informar aceitação ou emitir `appinstalled` THEN o sistema SHALL ocultar a promoção e marcar o estado como instalado durante a sessão.
4. **PWAIP-04** — WHEN o participante dispensar o prompt nativo ou escolher **Agora não** THEN o sistema SHALL ocultar a promoção por 7 dias no mesmo navegador.

**Independent Test**: Simular `beforeinstallprompt`, acionar a CTA e verificar chamada única, resultado aceito/dispensado e persistência.

### P1: Instalação manual em iOS/iPadOS ⭐ MVP

**User Story**: Como participante em iPhone ou iPad, quero instruções específicas para instalar o app mesmo sem um prompt nativo programável.

**Why P1**: iOS/iPadOS exige instalação manual e representa parte relevante do público mobile.

**Acceptance Criteria**:

1. **PWAIP-05** — WHEN o app abrir em iOS/iPadOS fora do modo standalone e sem dispensa ativa THEN o sistema SHALL exibir a ação **Como instalar**.
2. **PWAIP-06** — WHEN o participante acionar **Como instalar** no Safari THEN o sistema SHALL mostrar a instrução **Toque em Compartilhar e depois em Adicionar à Tela de Início.**
3. **PWAIP-07** — WHEN o participante estiver em outro navegador do iOS/iPadOS THEN o sistema SHALL incluir a orientação **Abra esta página no Safari** antes da instrução de compartilhamento.

**Independent Test**: Simular user agents Safari e não-Safari no iOS e verificar a cópia precisa de cada orientação.

### P1: Melhoria progressiva e prioridade operacional ⭐ MVP

**User Story**: Como participante, quero continuar usando o app normalmente quando instalação não estiver disponível ou quando houver um aviso operacional mais importante.

**Why P1**: A instalação é uma melhoria progressiva e não pode atrapalhar o evento.

**Acceptance Criteria**:

1. **PWAIP-08** — WHEN o app já estiver em modo standalone THEN o sistema SHALL manter a promoção oculta.
2. **PWAIP-09** — WHEN instalação não for suportada nem houver instrução manual aplicável THEN o sistema SHALL manter a promoção oculta sem bloquear o conteúdo.
3. **PWAIP-10** — WHEN o app estiver offline ou houver atualização disponível THEN o sistema SHALL ocultar temporariamente a promoção de instalação e preservar o aviso operacional.
4. **PWAIP-11** — WHEN a promoção estiver visível THEN o sistema SHALL expor a região com o nome acessível **Instalar DNJ Game**, foco de teclado visível, texto além de cor e transição desativável por `prefers-reduced-motion`.

**Independent Test**: Renderizar cada estado e confirmar prioridade, ausência de bloqueio e semântica acessível.

---

## Edge Cases

- WHEN `beforeinstallprompt` disparar mais de uma vez THEN o sistema SHALL substituir a referência pendente sem exibir promoções duplicadas.
- WHEN `prompt()` rejeitar ou não retornar uma escolha válida THEN o sistema SHALL ocultar a promoção para a sessão sem expor erro técnico ao participante.
- WHEN o armazenamento local estiver indisponível THEN o sistema SHALL continuar permitindo instalar ou dispensar durante a sessão.
- WHEN o componente desmontar THEN o sistema SHALL remover os listeners de instalação registrados no `window`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PWAIP-01–04 | Chromium | Execute | Pending |
| PWAIP-05–07 | iOS/iPadOS | Execute | Pending |
| PWAIP-08–11 | Melhoria progressiva | Execute | Pending |

**Coverage:** 11 total, 11 mapped to the inline execution plan, 0 unmapped.

---

## Success Criteria

- [ ] Os 11 requisitos possuem evidência automatizada com resultados precisos.
- [ ] Testes unitários, typecheck, lint e build de produção continuam aprovados sem executar testes em browser.
- [ ] A promoção cabe no shell mobile claro/escuro sem competir com navegação, offline ou atualização.
