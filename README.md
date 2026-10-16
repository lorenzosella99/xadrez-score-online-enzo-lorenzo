# Xadrez Score Online

Página de ranking de pontuação de xadrez.

## Recursos
- Menu inicial: **Jogador** ou **Administrador**.
- Ranking público com **Top 10**.
- Jogador consulta sua pontuação e a dos demais.
- Administrador adiciona, edita e exclui jogadores.
- Toda alteração administrativa pede a senha novamente.
- Interface responsiva para computador e celular.

## Armazenamento
Esta versão usa `localStorage`: as alterações ficam no navegador/dispositivo em que foram feitas e não sincronizam entre dispositivos.

Para um ranking verdadeiramente compartilhado entre todos, será necessário um backend/banco de dados. A senha não deve ser tratada como segredo em JavaScript público.

A senha fornecida foi convertida para SHA-256 e o texto da senha não fica no código.


## Conta de jogador (Supabase Auth)

- Cadastro/entrada por e-mail com código OTP.
- O perfil vincula o usuário autenticado ao nome de jogador em `xadrez_perfis`.
- A sessão do Supabase é mantida no armazenamento local do navegador e restaurada ao atualizar a página.
- A tabela `xadrez_perfis` usa RLS para que cada usuário só leia/edite o próprio perfil.

### Ativar o código numérico no e-mail

No painel do Supabase, abra **Authentication → Email Templates → Magic Link** e use um modelo que inclua `{{ .Token }}`, por exemplo:

```html
<h2>Código de acesso ao Xadrez Score</h2>
<p>Use este código para confirmar sua conta: <strong>{{ .Token }}</strong></p>
```

O Supabase usa o mesmo fluxo para Magic Link e OTP; sem `{{ .Token }}` no modelo, o e-mail pode conter um link em vez do código que o site pede.
