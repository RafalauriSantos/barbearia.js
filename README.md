# Projeto TCC

Projeto full stack para gestao de barbearia: agenda diaria, servicos, produtos, despesas e resumo financeiro. Foco em fluxo operacional, dados persistidos e integracao real com Postgres/Supabase.

## O que este projeto entrega

- Agenda com criacao, edicao e exclusao de agendamentos
- Cadastro, login, verificacao por codigo e recuperacao de senha
- Catalogo de servicos e produtos
- Despesas e resumo financeiro diario
- Equipe, convites e separacao de dados por barbearia
- Foto de perfil dos barbeiros na agenda
- Cache persistente, prefetch e abertura com sessao cacheada para reduzir carregamentos visiveis
- Backend com API REST e validacao de ambiente

## App publicado

- Frontend: https://kurt-barbearia.vercel.app
- Backend/API: https://kurt-api.onrender.com

Observacao: o backend esta no plano Free do Render. A primeira chamada depois de
inatividade pode demorar alguns segundos enquanto o servico acorda.

## Destaques tecnicos

- Backend em camadas (routes/controllers/services/repositories)
- Integracao com Supabase/Postgres via Knex
- Frontend React com rotas protegidas e cliente HTTP centralizado
- Cache persistente/prefetch no frontend para agenda, catalogo, despesas, financeiro, equipe e perfil
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
- docs/ - roadmap principal e guia de deploy
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
   - `AVATAR_BUCKET` (opcional; padrao: `barber-avatars`)

3. Instale e rode:

```bash
cd backend
npm install
npm run dev
```

### Frontend

1. Crie o .env:
   - [frontend/.env.example](frontend/.env.example) -> [frontend/.env](frontend/.env)
   - `VITE_API_URL` aponta para o backend
   - `VITE_API_TIMEOUT_MS` pode ficar em `75000` para tolerar cold start do Render Free

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

Gate completo local:

```bash
.\validar-tudo.cmd
```

Quando tudo passa, esse comando tambem sobe backend/frontend, executa os smoke tests e abre o app no navegador.

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

Smoke test com backend e frontend ja rodando:

```bash
.\testar-tudo.cmd
```

## Scripts de raiz

- `rodar-tudo.cmd` - sobe backend e frontend
- `fechar-portas.cmd` - para backend e frontend locais
- `testar-tudo.cmd` - executa smoke tests contra servidores ja rodando
- `validar-tudo.cmd` - roda backend tests, frontend lint, frontend tests e build; se passar, sobe e abre o app

## Documentacao

- [docs/ROADMAP_DESENVOLVIMENTO_TCC.md](docs/ROADMAP_DESENVOLVIMENTO_TCC.md) - fonte unica de verdade do status, backlog e criterios de pronto
- [docs/DEPLOY_RENDER_VERCEL.md](docs/DEPLOY_RENDER_VERCEL.md) - guia de deploy separado em Render + Vercel

## Observacoes

- O backend usa `SUPABASE_SERVICE_KEY` para operacoes administrativas e seed.
- CORS e `APP_URL` podem ser ajustados no .env do backend.
- O frontend aplica viewport dinamico por `visualViewport`, fallback `100svh` e safe area no iOS Safari.
- O frontend mantem cache persistente por usuario dos dados operacionais, abre com dados salvos quando possivel e atualiza em segundo plano para reduzir loading entre abas.
- Em producao gratuita no Render, o envio de email deve usar Brevo API
  (`EMAIL_PROVIDER=brevo`) em vez de SMTP.
