# Git: atualizar os dois repositórios

Este projeto mantém o mesmo histórico em dois repositórios:

- `origin`: `https://github.com/DNJTechTeam/dnj-game-front.git`
  - branch de trabalho: `dev`
- `personal`: `https://github.com/AlexandrePatob/dnj.git`
  - branch de destino: `main`

A branch local deve continuar como `dev`, acompanhando `origin/dev`.

## Fluxo de commit e push

Confira as alterações antes de criar o commit:

```bash
git status
git diff --check
```

Adicione somente os arquivos desejados. Nunca adicione `.env`:

```bash
git add <arquivos>
git commit -m "tipo: descrição objetiva"
```

Envie o mesmo commit para os dois repositórios:

```bash
git push origin dev
git push personal dev:main
```

O segundo comando significa: enviar a branch local `dev` para a branch remota `main` do repositório `personal`.

## Verificação

```bash
git status -sb
git log -1 --oneline --decorate
git remote -v
```

Depois dos dois pushes, o último commit deve aparecer apontado por `origin/dev` e `personal/main`.

## Configuração dos remotes

Caso seja necessário configurar novamente:

```bash
git remote set-url origin https://github.com/DNJTechTeam/dnj-game-front.git
git remote add personal https://github.com/AlexandrePatob/dnj.git
git branch --set-upstream-to=origin/dev dev
```

Se o remote `personal` já existir, atualize a URL em vez de adicioná-lo novamente:

```bash
git remote set-url personal https://github.com/AlexandrePatob/dnj.git
```

## Regra principal

O commit é criado uma única vez na branch local `dev`. Apenas o push é executado duas vezes, direcionando esse mesmo commit para `origin/dev` e `personal/main`.
