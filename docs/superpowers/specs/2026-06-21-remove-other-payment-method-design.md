# Remover a forma de pagamento "Outro"

## Objetivo

Retirar a opcao "Outro" dos fluxos de recebimento porque ela nao representa uma forma de pagamento operacional util.

## Comportamento

- Formas de pagamento com codigo `outro` serao desativadas nas barbearias existentes.
- Novas barbearias nao receberao mais essa forma de pagamento.
- Registros financeiros historicos que ja apontam para `outro` serao preservados.
- A opcao deixara de aparecer nas listas e seletores que exibem apenas formas ativas.

## Implementacao

- Criar uma migration que marque `outro` como inativo e atualize a funcao que cria as formas padrao.
- Remover `outro` do schema inicial e da ordenacao padrao do repositorio.
- Nao excluir linhas fisicamente, evitando quebra de chaves estrangeiras e perda de historico.

## Validacao

- Testar o contrato da migration.
- Rodar os testes de formas de pagamento e os fluxos de recebimento.
- Aplicar a migration no Supabase e confirmar que nenhuma forma `outro` permanece ativa.
