# Projeto TCC (Migração Edge Architecture)

Projeto full stack para gestão de barbearia: agenda diária, serviços, produtos, despesas e resumo financeiro. Foco em fluxo operacional, dados persistidos e integração real com Postgres/Supabase.

Recentemente, a infraestrutura passou por uma migração arquitetural profunda (do Fastify/Render para o Hono/Cloudflare), saindo de servidores em nuvem tradicionais para uma **arquitetura de Borda (Edge Computing)** com latência zero e suporte offline avançado.

## O que este projeto entrega

- Agenda com criação, edição e exclusão de agendamentos
- Cadastro, login, verificação por código e recuperação de senha
- Catálogo de serviços e produtos
- Despesas e resumo financeiro diário
- Equipe, convites e separação de dados por barbearia
- Foto de perfil dos barbeiros na agenda, com editor de enquadramento
- **Novo:** Sistema de Modais via React Portal (`ReactDOM.createPortal`) com Focus Trap, trava de scroll e restauração determinística de viewport para teclados mobile (iOS Safari / Android).
- **Novo:** Hardening de segurança no servidor com **Rate Limiting** (proteção contra força bruta) e **Cabeçalhos de Segurança HTTP (Helmet)**.
- **Novo:** Sobrescrita dinâmica de valores de agendamentos com preservação de preços customizados no backend.
- **Novo:** Motor de sincronização offline (PWA) resiliente, com fila de requisições retidas no `localStorage`.
- **Novo:** Cache persistente aprimorado com abertura de sessão usando dados em cache para mascarar o tempo de rede.

## App publicado

- Frontend (Pages): https://barbearia-app.pages.dev
- Backend/API (Workers): https://barbearia-workers.agenddar.workers.dev

> **Observação de Performance:** A aplicação agora roda globalmente na borda (Edge) da Cloudflare. **O antigo problema de "cold start" (demora ao acordar o servidor) do Render foi completamente eliminado.** A API responde em milissegundos.

## Destaques técnicos

- Aplicação do **Padrão Adapter** para migrar controladores Node.js (Fastify) para o runtime V8 da Cloudflare (Hono), mantendo as regras de negócio isoladas.
- Backend estruturado em camadas iterativas (routes/controllers/services/repositories).
- Proteção contra ataques de força bruta com Rate Limiting e injeção de cabeçalhos OWASP via Helmet (`X-Frame-Options`, `nosniff`, `Referrer-Policy`).
- Integração com Supabase/Postgres via Connection Pooling para suportar o ambiente Serverless.
- Frontend React com rotas protegidas (`AuthGate`) e cliente HTTP centralizado com interceptores dinâmicos.
- Suíte de testes de integração E2E extremamente rápida (Vitest) rodando requisições em memória.
- Scripts de raiz para limpar, compilar, testar e publicar a aplicação.

## Stack

- **Backend:** Cloudflare Workers + Hono + Fastify + Knex + Postgres (Supabase) + Zod
- **Frontend:** React + Vite + Cloudflare Pages + React Router v6
- **Testes:** Vitest + Node Tap

## Decisões de arquitetura

- **Edge Computing:** Hospedagem descentralizada na Cloudflare para unificar CDN estática e execução de API com máxima proximidade do usuário final.
- **Arquitetura de Modais via Portal:** Isolamento de overlays do fluxo DOM padrão renderizando diretamente em `document.body` via React Portals, eliminando clipping de `overflow: hidden` e bugs de viewport com teclado no iOS Safari.
- **Segurança Defensiva e Hardening:** Injeção de cabeçalhos de segurança OWASP e controle estrito de Rate Limiting nativo na borda para Cloudflare Workers / Hono (`AUTH_RATE_LIMIT_EXCEEDED` e `GLOBAL_RATE_LIMIT_EXCEEDED`).
- **Micro-tarefas e Níveis:** Migração de arquitetura realizada de forma estruturada e sequencial, garantindo estabilidade antes de avançar para a próxima fase técnica.
- **Criptografia Híbrida:** Adaptação da segurança de senhas na borda mantendo o suporte ao Argon2id legado e implementando Bcryptjs via WebAssembly/APIs nativas.
- **Gerenciamento de Estado Customizado:** Utilização de um motor próprio de cache em memória (`Map`) e `localStorage` no frontend, evitando bibliotecas pesadas de terceiros (como Redux) para focar na resiliência offline do PWA.
- **Comunicação de E-mails:** Uso exclusivo da API HTTP da Brevo (`fetch`) no Edge, descartando o Nodemailer, pois portas SMTP são bloqueadas na arquitetura de borda.

## 🛡️ Proteção contra Abuso e Rate Limiting na Borda (Cloudflare Workers)

### **Como Funciona**
A proteção contra força bruta e excesso de requisições foi implementada via middleware nativo do Hono (`backend/src/middleware/rateLimiter.js`) integrado ao ponto de entrada dos Workers (`backend/src/index.js`). 

O sistema utiliza a técnica de **Sliding Window em memória por IP** (extraído via cabeçalho `CF-Connecting-IP` / `x-forwarded-for`) e injeta os cabeçalhos padrão IETF:
- `RateLimit-Limit`: Limite máximo de requisições permitidas na janela.
- `RateLimit-Remaining`: Quantidade de requisições restantes na janela atual.
- `RateLimit-Reset`: Segundos até a renovação da janela.
- `Retry-After`: Enviado em respostas HTTP `429 Too Many Requests` indicando quando o cliente pode tentar novamente.

### **Tiering de Endpoints Protegidos**

1. **Strict Tier (`/auth/*`)**
   - **Limite:** 15 requisições por minuto por IP.
   - **Rotas:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-code`, `/auth/resend-code`, `/auth/reset-password`.
   - **Objetivo:** Mitigar credential stuffing, brute-force de senhas/código OTP e abuso de envio de e-mails via Brevo.
   - **Código de Erro:** `AUTH_RATE_LIMIT_EXCEEDED` (HTTP 429).

2. **Global Tier (`/*`)**
   - **Limite:** 100 requisições por minuto por IP.
   - **Rotas:** Todos os demais endpoints da API (`/agendamentos`, `/clients`, `/services`, `/products`, `/expenses`, `/financial`, etc.).
   - **Objetivo:** Prevenir DoS, raspagem automatizada de dados e esgotamento de cota do banco de dados.
   - **Código de Erro:** `GLOBAL_RATE_LIMIT_EXCEEDED` (HTTP 429).

### **Configuração em Desenvolvimento e Testes**
- **Desenvolvimento Local / Wrangler:** O middleware Hono gerencia os contadores automaticamente sem necessidade de serviços externos.
- **Suíte de Testes (Vitest / Node Tap):** Requisições com o cabeçalho `x-skip-rate-limit: true` em ambiente de testes (`NODE_ENV=test`) podem ignorar os limites para evitar intermitência em suítes E2E intensivas.

### **Configuração em Produção (Cloudflare WAF)**
Como camada complementar de defesa em profundidade (Layer 7 WAF), recomenda-se configurar regras no painel da Cloudflare:
- **Cloudflare WAF Rate Limiting Rule:** Criar uma regra no painel da Cloudflare para o caminho `/auth/*` bloqueando IPs que excedam 20 req/min antes da chamada atingir a CPU do Worker.

### **Decisão de Arquitetura do Rate Limiter**
- **Por que não utilizar `@fastify/rate-limit` em produção?**  
  O plugin do Fastify é executado apenas quando a API roda via `src/server.js` (Node.js). Em produção, o Cloudflare Worker executa diretamente o runtime Hono em `src/index.js`, ignorando o ciclo de vida do Fastify.
- **Por que escolher Middleware Hono em memória em vez de KV / Durable Objects?**  
  O middleware Hono em memória possui **custo zero**, **latência zero** (sem chamadas assíncronas externas de I/O) e funciona perfeitamente tanto no Wrangler local quanto no Cloudflare Worker publicado.

## Estrutura do repositório

- `backend/` - API Hono, rotas, testes automatizados e integração com banco
- `frontend/` - App web (PWA)
- `tests/` - Suíte de testes automatizados (Vitest)
- `docs/` - Roadmap principal e guias de arquitetura
- `scripts/` - Scripts de desenvolvimento

## Como rodar (local)

Requisitos: Node.js 20+, conta no Supabase e conta na Cloudflare (para o Wrangler).

### Backend (Wrangler)

1. Copie o arquivo de segredos de desenvolvimento:
   - `backend/.dev.vars.example` -> `backend/.dev.vars`

2. Preencha as variáveis principais:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `BREVO_API_KEY`
   - `EMAIL_FROM`, `EMAIL_BRAND_NAME`, `EMAIL_PROVIDER=brevo`

3. Instale e rode:

```bash
cd backend
npm install
npm run dev
