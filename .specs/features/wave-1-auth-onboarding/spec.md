# Onda 1A — Login e Onboarding

## Problema

A entrada do participante mantém um caminho visual de cadastro separado, embora a API V2 faça cadastro e login por e-mail na mesma sequência. O botão Google aparece depois do formulário de e-mail e o retorno ao onboarding incompleto pode apontar de volta para uma tela de código sem contexto.

## Requisitos

| ID | Critério de aceite |
| --- | --- |
| AUTH-01 | Google é a primeira opção da tela de entrada, seguido por separador visual `OU` e acesso por e-mail. |
| AUTH-02 | O botão Google ocupa a largura disponível sem transbordar em mobile e mantém largura legível em desktop. |
| AUTH-03 | Todo e-mail válido solicita código pelo mesmo endpoint V2, sem informar se já existia cadastro. |
| AUTH-04 | Após verificar o código ou Google, conta concluída abre Home; conta incompleta abre onboarding. |
| AUTH-05 | Um usuário que abandona o onboarding e retorna com sessão válida é levado novamente ao onboarding, sem tela de verificação vazia. |
| AUTH-06 | Erros, carregamento, reenvio e ausência de configuração Google mantêm uma forma clara de continuar por e-mail. |

## Fora de escopo

- Alterar contrato, cookies, provedor de e-mail ou console OAuth.
- Criar perfil administrativo ou mudar os logins de gestor/admin.
- Publicar em produção.
