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
- **Novo:** Observabilidade em tempo real com **Sentry** na borda (`@sentry/cloudflare` + `@sentry/react`), com mascaramento LGPD automático e gestão de segredos via Cloudflare Secrets.
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
- Observabilidade de alta performance no Edge com amostragem de telemetria, zero ruído e restrição estrita a ambientes de produção.
- Integração com Supabase/Postgres via Connection Pooling para suportar o ambiente Serverless.
- Frontend React com rotas protegidas (`AuthGate`) e cliente HTTP centralizado com interceptores dinâmicos.
- Suíte de testes de integração E2E extremamente rápida (Vitest) rodando requisições em memória.
- Scripts de raiz para limpar, compilar, testar e publicar a aplicação.

## Stack

- **Backend:** Cloudflare Workers + Hono + Fastify + Knex + Postgres (Supabase) + Zod + `@sentry/cloudflare`
- **Frontend:** React + Vite + Cloudflare Pages + React Router v6 + `@sentry/react`
- **Testes:** Vitest + Node Tap + Playwright E2E

## Decisões de arquitetura

- **Edge Computing:** Hospedagem descentralizada na Cloudflare para unificar CDN estática e execução de API com máxima proximidade do usuário final.
- **Observabilidade Não-Bloqueante:** Processamento assíncrono de eventos no Cloudflare Workers via `c.executionCtx.waitUntil(...)`. Falhas no provedor de telemetria (Sentry) jamais afetam ou atrasam a resposta HTTP entregue ao usuário (**0ms de latência perceptível**).
- **Arquitetura de Modais via Portal:** Isolamento de overlays do fluxo DOM padrão renderizando diretamente em `document.body` via React Portals, eliminando clipping de `overflow: hidden` e bugs de viewport com teclado no iOS Safari.
- **Segurança Defensiva e Hardening:** Injeção de cabeçalhos de segurança OWASP e controle estrito de Rate Limiting nativo na borda para Cloudflare Workers / Hono (`AUTH_RATE_LIMIT_EXCEEDED` e `GLOBAL_RATE_LIMIT_EXCEEDED`).
- **Criptografia Híbrida:** Adaptação da segurança de senhas na borda mantendo o suporte ao Argon2id legado e implementando Bcryptjs via WebAssembly/APIs nativas.
- **Gerenciamento de Estado Customizado:** Utilização de um motor próprio de cache em memória (`Map`) e `localStorage` no frontend, evitando bibliotecas pesadas de terceiros (como Redux) para focar na resiliência offline do PWA.
- **Comunicação de E-mails:** Uso exclusivo da API HTTP da Brevo (`fetch`) no Edge, descartando o Nodemailer, pois portas SMTP são bloqueadas na arquitetura de borda.

## 👁️ Observabilidade e Telemetria em Produção (Sentry + Cloudflare Workers)

### **Arquitetura e Coleta**
A aplicação utiliza o SDK oficial `@sentry/cloudflare` no backend e `@sentry/react` no frontend para captura em tempo real de exceções e diagnósticos de saúde.

### **Estratégia de Filtragem e Economia de Cota (Zero Ruído)**
Para evitar o consumo desnecessário da cota gratuita e garantir foco em incidentes reais, a captura de eventos segue a seguinte matriz:
- **`CAPTURAR (100%)`**: Exceções HTTP 500 não tratadas, quedas de banco de dados (Supabase), falhas de integração externa (Asaas, Brevo, Cloudflare) e erros de código V8 (`TypeError`, `ReferenceError`).
- **`SAMPLING (1 em cada 50)`**: Erros HTTP 429 (Rate Limit) para detectar picos de ataques de força bruta no login/OTP sem sobrecarregar o plano.
- **`IGNORAR (0%)`**: Erros HTTP 400, 401, 403, 404, 409 e 422 esperados de regras de negócio ou formulário.
- **`RESTRIÇÃO DE AMBIENTE`**: A telemetria é enviada **exclusivamente em produção** (`NODE_ENV=production`).

### **Privacidade e Mascaramento Automático LGPD**
Todos os eventos passam pelo filtro `beforeSend` (`sanitizeSentryEvent`), que mascara automaticamente qualquer ocorrência de:
- `senha`, `password`, `user_password`
- `jwt`, `token`, `secret`, `bearer`
- `otp`, `auth`, `credentials`, `api_key`, `turnstile`
- `cpf`, `credit_card`
- Cabeçalhos `Authorization`, `Cookie` e `Set-Cookie`

### **Gestão de Segredos e Variáveis de Ambiente**
- **Backend (Cloudflare Worker):** O DSN do Sentry é armazenado de forma criptografada via Cloudflare Secrets (`npx wrangler secret put SENTRY_DSN`).
- **Frontend (Vite PWA):** Consome a variável pública `VITE_SENTRY_DSN`.
- **Documentação de Variáveis:** Consulte o guia completo em [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md).

## 🛡️ Proteção contra Abuso e Rate Limiting na Borda (Cloudflare Workers)

### **Como Funciona**
A proteção contra força bruta e excesso de requisições utiliza **Cloudflare Workers Native Rate Limiting Bindings** declarados no `wrangler.toml` (`AUTH_LIMITER` e `GLOBAL_LIMITER`) e integrados no Hono (`backend/src/index.js`). 

A aplicação utiliza a infraestrutura nativa da Cloudflare na borda para sincronizar a contagem de requisições com latência zero e sem consumo de memória RAM no Isolate V8.

### **Tiering de Endpoints Protegidos**

1. **Strict Tier (`/auth/*`)**
   - **Binding:** `AUTH_LIMITER` (Configurado no `wrangler.toml`: 15 req / min).
   - **Rotas:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-code`, `/auth/resend-code`, `/auth/reset-password`.
   - **Objetivo:** Mitigar credential stuffing, brute-force de senhas/código OTP e abuso de envio de e-mails via Brevo.
   - **Código de Erro:** `AUTH_RATE_LIMIT_EXCEEDED` (HTTP 429 com `Retry-After: 60`).

2. **Global Tier (`/*`)**
   - **Binding:** `GLOBAL_LIMITER` (Configurado no `wrangler.toml`: 100 req / min).
   - **Rotas:** Todos os demais endpoints da API (`/agendamentos`, `/clients`, `/services`, `/products`, `/expenses`, `/financial`, etc.).
   - **Objetivo:** Prevenir DoS, raspagem automatizada de dados e esgotamento de cota do banco de dados.
   - **Código de Erro:** `GLOBAL_RATE_LIMIT_EXCEEDED` (HTTP 429 com `Retry-After: 60`).

### **Política de Segurança e Resiliência (Fail-Closed em Produção)**
- **Ambiente de Produção (`NODE_ENV=production`):**  
  As bindings `AUTH_LIMITER` e `GLOBAL_LIMITER` são **obrigatórias**. Caso alguma binding não esteja configurada no ambiente publicável, o servidor adota a política **FAIL-CLOSED**, registrando um erro crítico no console e rejeitando requisições com HTTP `500` (`SECURITY_BINDING_MISSING`). Isso garante que a aplicação jamais rode desprotegida por falha de deploy.
- **Ambiente de Desenvolvimento (`NODE_ENV=development`):**  
  Caso as bindings nativas da Cloudflare não estejam presentes no dev server local, o sistema registra um aviso único no console (`[DEV WARN]`) e permite o fluxo (`FAIL-SAFE DEV`), garantindo agilidade no desenvolvimento local sem travar testes manuais.

## 🔐 Bloqueio de Conta por Identidade do Usuário (User Login Lockout)

### **Objetivo e Funcionamento**
Para proteger as contas de barbeiros e administradores contra ataques direcionados de força bruta (*Credential Stuffing*) que utilizam rotação de IP ou redes de botnets distribuídas, o sistema implementa o **Login Lockout baseado na Identidade (E-mail)** persistentemente no banco PostgreSQL/Supabase.

### **Regras e Parâmetros:**
- **Contador por Usuário:** O histórico de erros consecutivos é rastreado na coluna `tentativas_login_falhas` da tabela `usuarios`.
- **Limite Máximo:** **5 tentativas incorretas consecutivas**.
- **Duração do Bloqueio:** **15 minutos** (`bloqueado_ate = now() + interval '15 minutes'`).
- **Reset em Sucesso:** Qualquer autenticação bem-sucedida zera imediatamente o contador (`tentativas_login_falhas = 0`) e limpa a trava (`bloqueado_ate = NULL`).
- **Desbloqueio Automático:** Após decorridos 15 minutos do bloqueio, o próximo acesso com a senha correta é liberado normalmente.
- **Proteção contra Enumeração e Timing Attacks:** Se uma solicitação for enviada para um e-mail inexistente, a aplicação executa uma comparação `bcrypt` fictícia de tempo constante (dummy hash), retornando a resposta genérica `401 Unauthorized` ("E-mail ou senha incorretos.").
- **Resistência a Race Conditions:** As atualizações de contadores e bloqueio são executadas via stored procedures atômicas em PostgreSQL (`registrar_falha_login_usuario` e `resetar_falhas_login_usuario`) utilizando `FOR UPDATE` para travar a linha do usuário na transação do banco.

## 🤖 Proteção Anti-Bot com Cloudflare Turnstile

### **Objetivo e Funcionamento**
Para proteger a plataforma contra cadastros em massa automatizados (*Spam Signup*), esgotamento de cotas de envio de e-mail (API da Brevo) e ataques de inundação na recuperação de senha (*Email Flooding*), a aplicação integra a verificação oficial não-intrusiva **Cloudflare Turnstile**.

### **Escopo de Aplicação:**
- **Endpoints Protegidos (Backend):**
  - `POST /auth/register` (Criar conta)
  - `POST /auth/forgot-password` (Solicitar código de recuperação)
  - `POST /auth/resend-code` (Reenviar código de verificação)
- **Endpoints Não Afetados:**
  - `POST /auth/login` (Protegido por Rate Limiting + User Identity Lockout para preservar UX)
  - `POST /auth/verify-code` (Protegido por contador atômico de 5 tentativas por ID de código)
  - Endpoints autenticados (Protegidos por validação JWT Bearer Token)

### **Arquitetura e Validação Server-Side:**
1. **Frontend Component:** Componente isolado `<TurnstileWidget />` ([frontend/src/components/TurnstileWidget.jsx](frontend/src/components/TurnstileWidget.jsx)) que carrega o script oficial assíncrono da Cloudflare e gera o token de resposta.
2. **Backend Service:** Serviço isolado `turnstileService.verifyToken()` ([backend/src/services/turnstileService.js](backend/src/services/turnstileService.js)) que efetua requisição HTTP POST para `https://challenges.cloudflare.com/turnstile/v0/siteverify` com a `TURNSTILE_SECRET_KEY` antes de qualquer toque no banco de dados Supabase ou chamada ao serviço de e-mails Brevo.
3. **Garantia Anti-Bypass:** Se o token for omitido, expirado ou recusado pela Cloudflare, a requisição é rejeitada na hora com `400 Bad Request` (`INVALID_TURNSTILE_TOKEN`).

## 🛡️ Cabeçalhos de Segurança OWASP & Content Security Policy (CSP)

### **Objetivo e Funcionamento**
A aplicação adota a especificação moderna de segurança OWASP recomendada para Cloudflare Workers, Hono e PWA React ([backend/src/middleware/securityHeaders.js](backend/src/middleware/securityHeaders.js)).

### **Cabeçalhos HTTP Injetados em Todas as Respostas:**
- `X-Content-Type-Options: nosniff`: Impede interpretação incorreta de MIME-types.
- `X-Frame-Options: DENY`: Protege contra ataques de Clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restringe o vazamento de caminhos de URL em navegações externas.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`: Desativa APIs de hardware não utilizadas.
- `X-Permitted-Cross-Domain-Policies: none`: Bloqueia clientes legados Flash/Acrobat.
- `X-DNS-Prefetch-Control: off`: Desativa pré-carregamento especulativo de DNS.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` *(Apenas em Produção sobre HTTPS)*: Força comunicação segura por 1 ano.

## 📋 Trilha de Auditoria Imutável (Audit Trail & OWASP Compliance)

### **Objetivo e Funcionamento**
Para atender aos requisitos de não-repúdio, rastreabilidade e segurança do OWASP ASVS V8, o sistema possui uma arquitetura desacoplada de auditoria baseada no padrão Append-Only ([backend/src/services/auditService.js](backend/src/services/auditService.js) e [backend/src/repositories/auditRepository.js](backend/src/repositories/auditRepository.js)).

### **Imutabilidade e Regras da Tabela `audit_logs`:**
- **Exclusivamente INSERT:** O repositório expõe apenas métodos de criação/leitura. Operações `UPDATE` ou `DELETE` não são implementadas.
- **Campos Rasteados:** `id`, `created_at`, `tenant_id`, `user_id`, `user_role`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `request_id`, `success`, `failure_reason`, `metadata`.

## 🛡️ CI/CD Pipeline Hardening & Supply Chain Security (OWASP SAMM & SLSA)

### **Fluxos de Automação e Segurança Implementados:**
- **CodeQL SAST ([.github/workflows/codeql.yml](.github/workflows/codeql.yml)):** Análise estática automatizada em JavaScript/TypeScript com execução em PRs, pushes para `main` e cron diário.
- **Secret Scanning com Gitleaks ([.github/workflows/secret-scanning.yml](.github/workflows/secret-scanning.yml) e [.gitleaks.toml](.gitleaks.toml)):** Bloqueio preventivo contra vazamentos de segredos (JWT, Supabase keys, Cloudflare Tokens, Turnstile secrets, Brevo API Keys, GitHub PATs e arquivos `.env`).
- **Auditoria de Dependências & Dependabot ([.github/dependabot.yml](.github/dependabot.yml) e [.github/workflows/security-audit.yml](.github/workflows/security-audit.yml)):** Verificação periódica de vulnerabilidades críticas/altas no `npm` e atualizações automatizadas.
- **Geração de SBOM CycloneDX ([.github/workflows/security-audit.yml](.github/workflows/security-audit.yml)):** Emissão e publicação de relatórios Software Bill of Materials para o backend e frontend.
- **Proteção dos Deploys de Produção ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):** Restrição estrita de deploys à branch `main`, impedindo acesso a segredos por Pull Requests de forks.

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
```

### Rodando com Docker (DX Recomendado)

Se preferir rodar toda a aplicação (Frontend + Backend) em um ambiente containerizado isolado com um único comando:

```bash
# Subir a stack inteira em segundo plano
npm run docker:up

# Acompanhar os logs dos containers
npm run docker:logs

# Verificar o status da saúde dos containers (healthchecks)
npm run docker:ps

# Desligar a stack
npm run docker:down
```

