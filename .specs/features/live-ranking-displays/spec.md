# Telas ao vivo de ranking

## Requisitos

- D-01: `/tv` e `/telao` exibem, sem autenticação, o ranking individual e o ranking de grupos persistidos no DNJ 2K26.
- D-02: Sem evento especial destinado à tela, os rankings alternam automaticamente a cada 12 segundos e atualizam os dados a cada 5 segundos.
- D-03: Um evento especial em `teaser` ou `active` substitui temporariamente o ranking apenas no destino selecionado (`tv` ou `screen`); não expõe payload nem imagem de QR.
- D-04: Ao terminar ou ser encerrado o evento especial, a tela volta naturalmente à rotação de rankings.

## Verificação

- A API deriva ambos rankings de grupos e participantes persistidos, filtra gestores/admins e respeita o destino do evento especial.
- A interface mostra rankings sem evento especial e mostra o teaser quando a API informa um evento destinado à tela.
- Typecheck e testes unitários executados somente ao final.
