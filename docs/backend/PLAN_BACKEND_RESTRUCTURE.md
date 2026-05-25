# Plano de migracao do backend

## Visao alvo

Backend Node.js com Fastify, Knex, PostgreSQL/Supabase, validacao forte, erros padronizados, migrations versionadas, testes de integracao e autenticacao com tokens revogaveis.

O Supabase sera usado como Postgres gerenciado. O backend deve acessar o banco via `knex` + `pg` para queries, migrations e transacoes. O `@supabase/supabase-js` fica reservado para recursos especificos do Supabase, como Storage, Realtime ou Auth nativo, caso sejam necessarios.

## Contrato real do Supabase

O schema oficial criado diretamente no Supabase usa nomes em portugues:

- `usuarios`
- `barbearias`
- `barbeiros`
- `servicos`
- `produtos`
- `despesas`
- `agendamentos`
- `agendamento_servicos`
- `agendamento_produtos`

Enquanto o contexto de usuario logado/barbearia ainda nao estiver implementado, o backend usa `DEFAULT_BARBEARIA_ID` e opcionalmente `DEFAULT_BARBEIRO_ID` no `.env`. Essa e uma decisao pragmatica para concluir o MVP sem reescrever todo o fluxo de auth agora.

O backend deve traduzir os nomes do banco para o contrato atual do frontend. Exemplo: `servicos.nome/preco` vira `name/price`, `despesas.descricao/valor` vira `name/value`, e `agendamentos.total/status_pagamento` vira `value/status`.

## Arquitetura desejada

```txt
backend/
  src/
    app.js
    server.js
    index.js
    config/
      env.js
      database.js
    plugins/
      security.js
      docs.js
      auth.js
    modules/
      services/
        services.routes.js
        services.controller.js
        services.service.js
        services.repository.js
        services.schema.js
      auth/
        auth.routes.js
        auth.controller.js
        auth.service.js
        auth.repository.js
        auth.schema.js
    shared/
      errors/
      utils/
  db/
    migrations/
    seeds/
  knexfile.js
```

Durante a migracao, a estrutura atual `routes/controllers/services/repositories/validators` pode continuar existindo. Depois que os dominios estiverem estaveis, migramos para `modules/*` se fizer sentido.

## Decisoes tecnicas

- Fastify como framework HTTP.
- Knex + pg para acesso ao Postgres/Supabase.
- Migrations versionadas em vez de schema SQL manual unico.
- Zod para validar `env`, body, params e query.
- `AppError` para erros esperados de negocio.
- Handler global para mapear `AppError`, `ZodError` e erros inesperados.
- Argon2id para hash de senha.
- Access token curto + refresh token revogavel salvo em banco.
- `crypto.randomUUID()` ou `gen_random_uuid()` no Postgres, nunca `Math.random()` para ids.
- CORS restrito por ambiente, Helmet e Rate Limit.
- Testes com `fastify.inject`.

## Fase 1 - Base segura e testavel

1. Consolidar ponto de entrada:
   - `src/app.js` monta app, plugins, rotas e error handler.
   - `src/server.js` apenas chama `listen`.
   - `src/index.js` reexporta `buildApp/start` por compatibilidade.
   - `server.js` raiz vira wrapper temporario.

2. Centralizar ambiente:
   - Criar `src/config/env.js`.
   - Validar variaveis com Zod.
   - Exigir `JWT_SECRET` em producao.
   - Permitir defaults seguros apenas em `development` e `test`.

3. Padronizar erros:
   - `AppError` para negocio.
   - `ZodError` retorna 400.
   - Erro inesperado retorna 500 sem vazar detalhe interno.

4. Preparar Knex:
   - Adicionar `knexfile.js`.
   - Criar `src/config/database.js`.
   - Adicionar migrations iniciais.
   - Instalar `knex` e `pg`.

## Fase 2 - Banco e repositorios

1. Criar migrations:
   - `services`
   - `products`
   - `expenses`
   - `appointments`
   - `profile`
   - `users`
   - `auth_tokens`

2. Padrao minimo das tabelas:
   - `id uuid primary key default gen_random_uuid()`
   - `created_at timestamptz not null default now()`
   - `updated_at timestamptz not null default now()`
   - constraints de valores numericos positivos
   - indices para campos usados em filtros

3. Migrar repositories:
   - Trocar `supabase.from(...)` por Knex.
   - Usar transacoes onde houver operacoes dependentes.
   - Remover ids gerados por `Math.random()`.

## Fase 3 - Autenticacao de mercado

1. Registro:
   - normalizar email
   - hash Argon2id
   - nunca retornar `password_hash`

2. Login:
   - validar credenciais
   - gerar access token curto
   - gerar refresh token com `jti`
   - persistir hash do refresh token em `auth_tokens`

3. Refresh:
   - verificar token
   - conferir se nao foi revogado
   - rotacionar refresh token

4. Logout:
   - revogar refresh token atual

5. Protecoes:
   - rate limit em login/register
   - segredo JWT obrigatorio em producao
   - cookies HttpOnly/Secure se o frontend migrar para cookie auth

## Fase 4 - Qualidade operacional

1. Documentacao OpenAPI em `/docs` no ambiente de desenvolvimento.
2. Logs estruturados com request id.
3. Health check `/health`.
4. Scripts:
   - `npm run dev`
   - `npm start`
   - `npm test`
   - `npm run migrate`
   - `npm run seed`
5. CI com lint e testes.
6. Dockerfile e docker-compose de desenvolvimento, se necessario.

## Ordem de execucao atual

1. Atualizar plano.
2. Refatorar bootstrap.
3. Criar `env.js` e error handler robusto.
4. Preparar Knex e migrations.
5. Corrigir repositories e auth aos poucos.
6. Rodar testes.

## Roadmap pragmatico de 2 semanas

### Semana 1 - Produto funcionando de ponta a ponta

1. Padronizar backend dos dominios essenciais:
   - `services`
   - `products`
   - `expenses`
   - `appointments` mantendo endpoint `/agendamentos`
   - `profile`

2. Garantir contrato com o frontend:
   - nao quebrar nomes usados hoje pelo React
   - normalizar campos no backend quando existirem nomes legados e novos
   - manter respostas simples e previsiveis

3. Banco e dados:
   - migrations com as colunas que a interface realmente usa
   - seeds minimos para demonstracao
   - `/reset` para facilitar apresentacao e testes locais

4. Integracao:
   - todas as telas consumindo API real
   - loading, erro e estado vazio funcionando
   - financeiro calculando com dados persistidos

### Semana 2 - Seguranca, acabamento e demo

1. Auth minima:
   - register/login
   - JWT
   - middleware de rota protegida
   - esconder `password_hash`

2. Auth melhorada se houver tempo:
   - refresh token revogavel
   - logout
   - rate limit em login/register

3. Estabilidade:
   - testes dos fluxos principais
   - README de setup
   - revisao dos scripts
   - correcao de bugs de integracao

4. Apresentacao:
   - dados de exemplo
   - fluxo feliz ensaiado
   - checklist de demo

## Proximo foco imediato

Completar o backend CRUD em camadas para `products`, `expenses`, `appointments`, `profile` e `/reset`. Essa etapa desbloqueia o frontend e reduz o risco do restante do projeto.

## Criterios de aceite

- `GET /health` responde.
- App pode ser criado em teste com `buildApp()`.
- Payload invalido retorna 400, nao 500.
- Nenhum segredo inseguro e aceito silenciosamente em producao.
- Knex consegue rodar migrations contra Supabase Postgres.
- Auth nao retorna hash de senha.
- Refresh token pode ser revogado.
