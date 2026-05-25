# Plano de Integracao Frontend + Backend

Este plano organiza o caminho para fazer o frontend e o backend conversarem corretamente, primeiro em ambiente local e depois com Supabase real.

## Objetivo

Garantir que:

- O frontend aponte para a URL correta do backend.
- O backend esteja configurado com as variaveis corretas.
- As rotas usadas pelo frontend existam no backend.
- Os payloads enviados pelo frontend sejam aceitos pelo backend.
- As respostas do backend venham no formato que o frontend espera.
- Os dados persistam corretamente no Supabase.

## Estado Atual

O contrato principal ja esta bem alinhado:

- Frontend usa `VITE_API_URL=http://localhost:3000`.
- Backend sobe por padrao na porta `3000`.
- Rotas principais:
  - `GET/POST/PUT/DELETE /services`
  - `GET/POST/PUT/DELETE /products`
  - `GET/POST/PUT/DELETE /expenses`
  - `GET/POST/PUT/DELETE /agendamentos`
  - `GET/PUT /profile`
  - `DELETE /reset`
- Backend traduz nomes do Supabase em portugues para o contrato em ingles usado pelo frontend.

Ainda falta validar tudo contra o Supabase real.

## Fase 1 - Configurar Ambiente

### Backend

1. Criar `backend/.env` a partir de `backend/.env.example`.
2. Preencher:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `DEFAULT_BARBEARIA_ID`
   - opcionalmente `DEFAULT_BARBEIRO_ID`
3. Confirmar que `DEFAULT_BARBEARIA_ID` existe na tabela `barbearias`.
4. Confirmar que `DEFAULT_BARBEIRO_ID`, se usado, existe na tabela `barbeiros`.
5. Rodar o backend:

```powershell
cd backend
node src/server.js
```

6. Testar health check:

```powershell
curl http://localhost:3000/health
```

Resultado esperado:

```json
{ "ok": true }
```

### Frontend

1. Criar `frontend/.env` a partir de `frontend/.env.example`.
2. Confirmar:

```env
VITE_API_URL=http://localhost:3000
```

3. Rodar o frontend:

```powershell
cd frontend
node node_modules\vite\bin\vite.js --host 127.0.0.1
```

## Fase 2 - Validar Rotas Manualmente

Antes de testar pela interface, validar a API diretamente.

### Services

```powershell
curl http://localhost:3000/services
```

Criar servico:

```powershell
curl -X POST http://localhost:3000/services `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Corte\",\"price\":40}"
```

### Products

```powershell
curl http://localhost:3000/products
```

Criar produto:

```powershell
curl -X POST http://localhost:3000/products `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Pomada\",\"price\":35}"
```

### Expenses

```powershell
curl "http://localhost:3000/expenses?date=2026-04-29"
```

Criar despesa:

```powershell
curl -X POST http://localhost:3000/expenses `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Aluguel\",\"value\":100,\"date\":\"2026-04-29\"}"
```

### Appointments

```powershell
curl "http://localhost:3000/agendamentos?data=2026-04-29"
```

Criar agendamento:

```powershell
curl -X POST http://localhost:3000/agendamentos `
  -H "Content-Type: application/json" `
  -d "{\"client_name\":\"Cliente Teste\",\"day_key\":\"2026-04-29\",\"time_slot\":\"10:00\",\"value\":40,\"status\":\"normal\"}"
```

## Fase 3 - Validar Pela Interface

Com backend e frontend rodando:

1. Abrir o frontend no navegador.
2. Ir para Catalogo.
3. Criar um servico.
4. Criar um produto.
5. Voltar para Agenda.
6. Criar um agendamento usando:
   - botao `+`
   - input rapido inferior
7. Editar um agendamento.
8. Excluir um agendamento.
9. Ir para Despesas.
10. Criar e excluir uma despesa.
11. Ir para Financeiro.
12. Conferir se:
    - faturamento considera agendamentos do dia;
    - despesas aparecem no total;
    - lucro estimado muda corretamente.

## Fase 4 - Conferir Persistencia no Supabase

Depois de criar dados pela interface, abrir o Supabase e conferir:

- `servicos`
  - coluna `nome` preenchida;
  - coluna `preco` preenchida;
  - `barbearia_id` correto.
- `produtos`
  - coluna `nome` preenchida;
  - coluna `preco` preenchida;
  - `barbearia_id` correto.
- `despesas`
  - coluna `descricao` preenchida;
  - coluna `valor` preenchida;
  - coluna `data` preenchida;
  - `barbearia_id` correto.
- `agendamentos`
  - `cliente_nome`;
  - `data`;
  - `hora`;
  - `total`;
  - `valor_manual`;
  - `status_pagamento`;
  - `barbearia_id`.
- `agendamento_servicos`, se o agendamento foi criado com servico.

## Fase 5 - Corrigir Desalinhamentos

Se algo falhar, investigar nesta ordem:

1. Console do navegador.
2. Aba Network do navegador.
3. Log do backend.
4. Resposta da API.
5. Dados salvos no Supabase.

Problemas comuns:

- `404`: rota errada ou backend nao subiu.
- `400`: payload invalido.
- `500`: erro interno, geralmente variavel `.env`, Supabase ou coluna inexistente.
- Lista vazia: `DEFAULT_BARBEARIA_ID` diferente do `barbearia_id` dos dados.
- CORS: ajustar `CORS_ORIGIN` no backend.

## Fase 6 - Automatizar Garantias

Depois do fluxo manual funcionar:

1. Criar testes de contrato no backend para:
   - criar servico;
   - criar produto;
   - criar despesa;
   - criar agendamento;
   - listar resumo do dia.
2. Criar testes no frontend para:
   - validacao de formularios;
   - renderizacao de estados de loading;
   - tratamento de erro da API.
3. Criar um script de verificacao:

```powershell
cd frontend
node node_modules\eslint\bin\eslint.js .
node node_modules\vitest\vitest.mjs run
node node_modules\vite\bin\vite.js build

cd ..\backend
node node_modules\tap\bin\run.js --no-coverage "test/**/*.test.js"
```

## Criterios de Pronto

Marcar a integracao como pronta quando:

- Backend responde `/health`.
- Frontend carrega sem erro de API.
- Catalogo cria/lista/edita/exclui servicos e produtos.
- Agenda cria/lista/edita/exclui agendamentos.
- Despesas cria/lista/exclui despesas.
- Financeiro calcula com dados reais.
- Dados aparecem no Supabase com `barbearia_id` correto.
- Testes de frontend e backend passam.
- Build do frontend passa.

## Proxima Acao Recomendada

Comecar pela Fase 1:

1. Configurar `backend/.env`.
2. Confirmar `DEFAULT_BARBEARIA_ID` no Supabase.
3. Subir backend.
4. Testar `/health`.
5. Subir frontend apontando para `http://localhost:3000`.
