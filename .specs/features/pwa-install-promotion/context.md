# PWA Install Promotion Context

**Gathered:** 2026-07-22
**Spec:** `.specs/features/pwa-install-promotion/spec.md`
**Status:** Implemented and independently verified

---

## Feature Boundary

Adicionar descoberta e acionamento de instalação ao PWA existente, com prompt nativo em navegadores compatíveis, instrução manual em iOS/iPadOS e comportamento não bloqueante em todos os demais casos.

---

## Implementation Decisions

### Hierarquia e posicionamento

- Usar uma promoção compacta na base do shell, acima da navegação principal quando ela existir.
- Offline, reconexão e atualização disponível permanecem visualmente prioritários.
- Não usar modal nem bloquear o fluxo atual do participante.

### Interação

- A CTA do Chromium é **Instalar app** e aciona diretamente o prompt nativo.
- A CTA do iOS/iPadOS é **Como instalar** e expande instruções no mesmo aviso.
- **Agora não** dispensa a promoção por 7 dias.
- A promoção some imediatamente após instalação confirmada.

### Linguagem visual

- Preservar Poppins, tokens de tema e escala tipográfica existentes.
- Usar o laranja da marca somente para a ação principal e um detalhe de progresso/instalação; o restante permanece uma superfície neutra do tema.
- Usar movimento curto de entrada/expansão e respeitar `prefers-reduced-motion`.

### Agent's Discretion

- Escolha exata dos ícones Lucide já disponíveis.
- Ajustes finos de espaçamento para manter legibilidade entre 320 px e o shell máximo de 448 px.

### Declined / Undiscussed Gray Areas → Assumptions

- Não houve entrevista adicional; as decisões registradas na especificação aplicam defaults conservadores compatíveis com a solicitação “implementar tudo isso”.
- Por instrução explícita posterior, a validação não executará testes em browser; a evidência automatizada ficará em testes unitários, typecheck, lint e build.

---

## Specific References

- Reutilizar a linguagem de avisos operacionais de `ConnectivityStatus`.
- Preservar integralmente a identidade documentada em `PRODUCT.md` e implementada em `src/app/theme.css`.

---

## Deferred Ideas

- Analytics de exibição, dispensa e conversão da instalação.
- Uma área permanente “Instalar app” dentro da tela de conta.
