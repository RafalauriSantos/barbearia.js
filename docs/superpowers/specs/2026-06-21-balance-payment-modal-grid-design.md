# Equilibrar a grade do modal de pagamento

## Objetivo

Eliminar o espaco vazio no modal de recebimento depois da remocao da forma de pagamento `outro`.

## Comportamento

- A grade continua com duas colunas.
- Quando houver quantidade impar de formas, o ultimo botao ocupa as duas colunas.
- Quando houver quantidade par, todos os botoes mantem a mesma largura.
- Selecao, taxas e confirmacao do pagamento nao mudam.

## Validacao

- Testar o modal com cinco formas de pagamento.
- Confirmar que o ultimo botao recebe largura total.
- Rodar testes de frontend e Playwright em desktop e mobile.
