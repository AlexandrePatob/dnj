

---

Construir tela inicial Login

-- 
Pre validacao token

-- Enviar nome e Email -> 
    -- Verification Code
    -- Nao valido! Erro e retorna.
    -- Valido! -> Valida o Grupo de Jovens
    -- Pegar endpOint de Listagem de Grupos de Jovens -> 
    -- Se Api de login retnrar grupo, valida!
    Se nao... Da a possibilidade de criar
    -- Mandar no update caso nao exista, se existir e ele alterar, ok
        - nao existir, ele escreve o nome, e cria um novo e ja vincula.
    -- Atualizar no localStorage ou Cookie - Grupo selecionado. 
    -- Grupo de Jovem Validado -> Home page.
-- Salvar o token em chave separada.

-- 


------------------------------------

Criar usuarios Admin/Gestores

POST /auth/admin-login
{
    name: Santidade,
    password: 1023nsh123
}

-------------------------------------------

Integrar o que o Tiago fez.
Validar projeto.
Criar ambiente vercel com e-mail dnj
Adicionar ci/cd Vercel

Criar login especial
    - Email e senha

