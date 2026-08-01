# Projeto TCC (Migração Edge & TypeScript 100%)

Projeto full stack para gestão de barbearia: agenda diária, serviços, produtos, despesas e resumo financeiro. Foco em fluxo operacional, dados persistidos e integração real com Postgres/Supabase.

Recently, the infrastructure underwent a deep architectural migration from Fastify/Render to **Hono/Cloudflare Workers**, alongside a **100% TypeScript Migration** across the core backend and frontend codebases. This transitioned the system from traditional cloud servers to an **Edge Computing Architecture** with near-zero latency, strict type safety, and advanced offline PWA support.

---

## 🎯 O que este projeto entrega

- **Gestão de Agendamentos:** Agenda com criação, edição, cancelamento, alteração de status e exclusão de agendamentos.
- **Autenticação & Segurança:** Cadastro, login com suporte a Bcryptjs/Argon2id, verificação de e-mail por código (OTP), recuperação de senha e suporte a Turnstile anti-bot.
- **Catálogo & Estoque:** Gerenciamento completo de catálogo de serviços e estoque de produtos.
- **Controle Financeiro:** Despesas, contas a receber, contas de fornecedores e resumo financeiro diário ("Recebido" e "A cobrar").
- **Multi-Tenant & Equipe:** Gestão de barbeiros, convites para equipe e isolamento estrito de dados por barbearia (`barbearia_id`).
- **Editor de Avatares:** Fotos de perfil dos barbeiros com crop/enquadramento integrado.
- **Redesign da Agenda (`agenda-compacta-v3`):** Layout ultra-compacto (44px), gestos interativos de swipe (Fiado / Pago) e suporte a Dark/Light Theme.
- **Navegação Instantânea PWA (0ms delay):** Restauração automática da última sessão e aba visitada ao abrir o PWA instalado.
- **Arquitetura de Modais via React Portal:** Modais via `ReactDOM.createPortal` com Focus Trap, trava de scroll e suporte a teclados mobile (iOS Safari / Android).
- **Hardening de Segurança OWASP:** **Rate Limiting** nativo na borda (`AUTH_LIMITER` e `GLOBAL_LIMITER`) e **Security Headers HTTP (Helmet)**.
- **Observabilidade em Tempo Real (Sentry Edge):** Observabilidade com `@sentry/cloudflare` + `@sentry/react`, sanitização LGPD automática de dados sensíveis e gestão de segredos via Cloudflare Secrets.
- **Sobrescrita Dinâmica de Preços:** Preservação de valores customizados de serviços diretamente no banco.
- **Motor de Sincronização Offline:** PWA resiliente com fila de requisições retidas no `localStorage`.

---

## 🌐 App Publicado

- **Frontend (Cloudflare Pages):** [https://barbearia-app.pages.dev](https://barbearia-app.pages.dev)
- **Backend/API (Cloudflare Workers):** [https://barbearia-workers.agenddar.workers.dev](https://barbearia-workers.agenddar.workers.dev)

> **Observação de Performance:** A aplicação roda 100% na borda (Edge) da Cloudflare. O problema de *cold start* de provedores tradicionais foi completamente eliminado, garantindo respostas em milissegundos em qualquer lugar do mundo.

---

## ⚡ Destaques Técnicos

1. **Migração 100% TypeScript:** Todo o código core do backend (`backend/src/`) e frontend (`frontend/src/`) é tipado estritamente em TypeScript, com interfaces bem definidas para entidades, payloads de requisição, respostas de API e repositories.
2. **Padrão Adapter para Hono / Workers:** Aplicação do **Padrão Adapter** (`adaptController`) para executar controladores Node.js no Isolate V8 da Cloudflare, mantendo regras de negócio isoladas de detalhes da plataforma.
3. **Resiliência do Cliente Supabase no Edge (`supabaseProxy`):** Proxy dinâmico que detecta atualizações de credenciais por requisição (`c.env`) e recria o cliente Supabase instantaneamente quando necessário, eliminando falhas de *stale singleton*.
4. **Suíte de Testes de Integração do Worker (`worker-runtime.test.js`):** Testes automatizados executando requisições diretamente contra a aplicação Hono para validar comportamentos em ambiente de produção antes do deploy.
5. **Proteção contra Abuso (Rate Limiting & Lockout):** Proteção nativa na borda contra força bruta (`AUTH_LIMITER` e `GLOBAL_LIMITER`) combinada com bloqueio atômico de conta por e-mail no PostgreSQL (User Identity Lockout).
6. **Observabilidade Não-Bloqueante:** Captura assíncrona de telemetria (Sentry) via `c.executionCtx.waitUntil(...)`, garantindo 0ms de impacto no tempo de resposta do usuário.

---

## 🛠️ Stack Tecnológica

- **Backend:** Cloudflare Workers + Hono + TypeScript + Supabase (Postgres) + `@supabase/supabase-js` + Zod + `@sentry/cloudflare`
- **Frontend:** React + TypeScript + Vite + Cloudflare Pages + React Router v6 + `@sentry/react`
- **Testes:** Node Tap + Vitest + Playwright E2E + Worker Runtime Integration Suite (30/30 testes verdes)
- **Segurança & CI/CD:** OWASP Security Headers + Cloudflare Turnstile + Gitleaks + CodeQL SAST + CycloneDX SBOM

---

## 🏗️ Decisões de Arquitetura

- **Edge Computing & Isolate V8:** Execução descentralizada na borda para unificar entrega de ativos estáticos e API com latência mínima.
- **Tipagem Estrita (TypeScript):** Contratos de dados verificados em tempo de compilação, eliminando erros comuns em runtime (`undefined`, `null` dereferencing, inversão de argumentos).
- **Interoperabilidade Dual CJS/ESM (`supabaseProxy`):** Suporte transparente tanto para `import` ESM nativo quanto para empacotamento bundler via `esbuild`.
- **E-mails via API HTTP (Brevo):** Chamadas HTTP via `fetch` nativo no Worker, evitando bloqueios de portas SMTP tradicionais no Edge.
- **Fail-Closed em Produção:** Caso alguma binding de segurança (como o Rate Limiter) esteja ausente no ambiente de produção, a requisição é rejeitada preventivamente com log de auditoria.

---

## 👁️ Observabilidade & Telemetria em Produção (Sentry)

- **Backend:** `@sentry/cloudflare` integrado no middleware Hono.
- **Frontend:** `@sentry/react` integrado com Error Boundaries e suporte a PWA.
- **Filtro LGPD (`sanitizeSentryEvent`):** Mascaramento automático de senhas, tokens JWT, chaves de API, Turnstile tokens e dados pessoais antes do envio para o Sentry.
- **Estratégia de Cota:** Erros 500 não tratados e falhas de infraestrutura são capturados em 100%. Erros 429 usam amostragem (1/50). Erros esperados de validação (400, 401, 404, 409) são ignorados para focar em problemas reais.

---

## 🛡️ Proteção contra Abuso e Rate Limiting na Borda

| Tier | Endpoints Protegidos | Limite | Código de Resposta |
|---|---|---|---|
| **Strict Tier** (`AUTH_LIMITER`) | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/verify-code`, `/auth/resend-code`, `/auth/reset-password` | 15 req / min | `AUTH_RATE_LIMIT_EXCEEDED` (HTTP 429) |
| **Global Tier** (`GLOBAL_LIMITER`) | Todos os demais endpoints (`/agendamentos`, `/services`, `/products`, `/barbers`, `/profile`, `/financial`, etc.) | 100 req / min | `GLOBAL_RATE_LIMIT_EXCEEDED` (HTTP 429) |

---

## 🤖 Proteção Anti-Bot (Cloudflare Turnstile)

- Integrado nos fluxos públicos de cadastro (`POST /auth/register`), solicitação de recuperação de senha (`POST /auth/forgot-password`) e reenvio de código (`POST /auth/resend-code`).
- Validação server-side via `turnstileService.verifyToken()` diretamente com a API da Cloudflare antes de tocar no banco de dados ou enviar e-mails.

---

## 📁 Estrutura do Repositório

```text
.
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações de ambiente e Zod Schema (env.ts)
│   │   ├── controllers/    # Controladores TypeScript das rotas
│   │   ├── lib/            # Supabase Proxy, erros e utilitários (supabase.ts, errors.ts)
│   │   ├── repositories/   # Camada de acesso a dados (Supabase/Postgres)
│   │   ├── services/       # Regras de negócio, auth, e-mail, turnstile
│   │   └── validators/     # Esquemas de validação Zod
│   └── test/               # Suíte de testes (worker-runtime.test.js, unit & integration)
├── src/                    # Entrypoint do Cloudflare Worker (index.js, rotas Hono)
├── frontend/               # PWA React em TypeScript (Vite + Cloudflare Pages)
├── docs/                   # Documentação detalhada de arquitetura e guias
└── tests/                  # Testes E2E adicionais (Vitest / Integration)
```

---

## 🚀 Como Rodar Localmente

### Requisitos
- Node.js 20+
- Conta no Supabase (ou instância Postgres)
- Wrangler CLI (para desenvolvimento Cloudflare Workers)

### 1. Instalação de Dependências
```bash
# Na raiz do projeto
npm install

# No backend
cd backend
npm install
```

### 2. Configuração de Ambiente Local
Copie o arquivo de exemplo no backend:
```bash
cp backend/.env.example backend/.env
```
Preencha as variáveis necessárias (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, etc.).

### 3. Rodando o Servidor de Desenvolvimento
```bash
# Rodar o backend
cd backend
npm run dev

# Em outro terminal, rodar o frontend React
cd frontend
npm run dev
```

### 4. Executando os Testes Automatizados
```bash
# Rodar todos os testes do backend (30 suítes)
cd backend
npm test
```

---

## 🐳 Rodando com Docker (Opção DX)

Caso prefira executar todo o ambiente (Frontend + Backend) containerizado:

```bash
# Subir toda a stack em segundo plano (porta 3333)
npm run docker:up

# Acompanhar logs
npm run docker:logs

# Parar a stack
npm run docker:down
```

---

## 🔒 CI/CD & Segurança de Código

- **Secret Scanning (Gitleaks):** Análise pre-commit e em workflow do GitHub para impedir o vazamento de tokens ou segredos.
- **CodeQL (SAST):** Análise estática automatizada de código para detectar vulnerabilidades no JavaScript/TypeScript.
- **CycloneDX SBOM:** Emissão automatizada de relatórios Software Bill of Materials.
