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
