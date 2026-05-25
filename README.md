# Barbearia SaaS (TCC)

Projeto full stack para gestao de barbearia: agenda diaria, servicos, produtos, despesas e resumo financeiro. Foco em fluxo operacional, dados persistidos e integracao real com Postgres/Supabase.

## O que este projeto entrega

- Agenda com criacao, edicao e exclusao de agendamentos
- Catalogo de servicos e produtos
- Despesas e resumo financeiro diario
- Backend com API REST e validacao de ambiente

## Destaques tecnicos

- Backend em camadas (routes/controllers/services/repositories)
- Integracao com Supabase/Postgres via Knex
- Frontend React com rotas protegidas e cliente HTTP centralizado
- Scripts de raiz para subir, testar e validar

## Stack

- Backend: Node.js + Fastify + Knex + Postgres (Supabase)
- Frontend: React + Vite

## Decisoes de arquitetura

- Separacao em camadas no backend para manter dominio e infraestrutura isolados
- Knex como camada de acesso ao banco para queries, migrations e seeds
- Supabase usado como Postgres gerenciado, com foco em SQL direto
- Cliente HTTP centralizado no frontend para padronizar erros e autenticao

## Estrutura do repositorio

- backend/ - API, rotas e integracao com banco
- frontend/ - app web
- docs/ - planos, roadmap e guias
- scripts/ - scripts de desenvolvimento

## Como rodar (local)

Requisitos: Node.js LTS e conta no Supabase.

### Backend

1. Copie o .env:
   - [backend/.env.example](backend/.env.example) -> [backend/.env](backend/.env)

2. Preencha as variaveis principais:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `DEFAULT_BARBEARIA_ID`

3. Instale e rode:

```bash
cd backend
npm install
npm run dev
```

### Frontend

1. Crie o .env:
   - [frontend/.env.example](frontend/.env.example) -> [frontend/.env](frontend/.env)

2. Instale e rode:

```bash
cd frontend
npm install
npm run dev
```

## Endpoints principais

- `GET/POST/PUT/DELETE /services`
- `GET/POST/PUT/DELETE /products`
- `GET/POST/PUT/DELETE /expenses`
- `GET/POST/PUT/DELETE /agendamentos`
- `GET/PUT /profile`
- `DELETE /reset`

## Testes

Backend:

```bash
cd backend
npm run test
```

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Scripts de raiz

- `rodar-tudo.cmd` - sobe backend e frontend
- `testar-tudo.cmd` - executa testes principais
- `validar-tudo.cmd` - valida build e testes
- `ver-portas.cmd` - verifica portas locais

## Documentacao

- [docs/PLAN_MVP_SAAS.md](docs/PLAN_MVP_SAAS.md)
- [docs/PLANO_INTEGRACAO_FRONT_BACK.md](docs/PLANO_INTEGRACAO_FRONT_BACK.md)
- [docs/ROADMAP_DESENVOLVIMENTO_TCC.md](docs/ROADMAP_DESENVOLVIMENTO_TCC.md)
- [docs/backend/README.md](docs/backend/README.md)
- [docs/backend/PLAN_BACKEND_RESTRUCTURE.md](docs/backend/PLAN_BACKEND_RESTRUCTURE.md)
- [docs/frontend/README.md](docs/frontend/README.md)
- [docs/frontend/CHECKLIST_FRONTEND_PRE_BACKEND.md](docs/frontend/CHECKLIST_FRONTEND_PRE_BACKEND.md)

## Observacoes

- O backend usa `SUPABASE_SERVICE_KEY` para operacoes administrativas e seed.
- CORS e `APP_URL` podem ser ajustados no .env do backend.
