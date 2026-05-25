# Plano passo-a-passo — MVP SaaS: Agenda para Barbearias

Resumo: orientação prática para transformar o repositório atual num SaaS gratuito com landing page, registro/login, reset de senha e painel de usuário. Organizado em fases e tarefas acionáveis.

---

## Fase 0 — Definição

1. Especificação do produto
   - Personas: dono de barbearia, barbeiro, administrador.
   - User stories mínimas: cadastro, login, criar/listar agendamentos, editar perfil.
   - KPIs iniciais: signups, logins diários, erros auth.

2. Requisitos não-funcionais
   - Usar Supabase (Postgres) como DB.
   - JWT para access tokens; refresh tokens persistidos.
   - Dev: `NODE_ENV=development`, deploy: usar variáveis de ambiente.

---

## Fase 1 — Landing & Marketing (público)

1. Criar página `GET /` (landing)
   - Hero, benefícios, screenshots, CTA "Começar grátis".
2. Rotas públicas: `/`, `/pricing`, `/docs`, `/contact`.
3. Integrar CTA para `/register` ou modal de registro.

Entrega mínima: `/` com CTA funcional que leva ao formulário de registro.

---

## Fase 2 — Autenticação (backend)

1. Endpoints essenciais (existem testes, revisar):
   - `POST /auth/register` — cria usuário (argon2 hash).
   - `POST /auth/login` — retorna `accessToken` + `refreshToken`.
   - `POST /auth/refresh` — troca refresh por novo access token.

2. Persistir refresh tokens
   - Criar tabela `auth_tokens` (id, user_id, token_hash, expires_at, created_at, revoked boolean).
   - Ao emitir refresh token, salvar hash; ao usar, validar e rotacionar.

3. Middleware de autenticação
   - Novo `src/middleware/auth.js`: valida `Authorization: Bearer <token>`, verifica JWT, carrega `user` e `tenant` e anexa `request.user`.
   - Proteger rotas sensíveis (ex.: `POST/GET /agendamentos`, `POST/expenses`, `PUT /profile`).

4. Retorno/erros padronizados
   - 401 para token inválido/expirado; 403 para acesso sem permissão.

Testes manuais:

```bash
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"secret123"}'
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"secret123"}'
```

---

## Fase 3 — Password Reset e E‑mail

1. Endpoints:
   - `POST /auth/forgot` — gerar token de reset curto e enviar por email.
   - `POST /auth/reset` — aceitar token + nova senha.
2. Templates de email (verify, reset) e integração SMTP (SendGrid/Postmark).

Entrega mínima: reset por link funcional em ambiente dev (usar console/log se SMTP não configurado).

---

## Fase 4 — Frontend (público + auth)

1. Páginas a implementar
   - `Landing` — público.
   - `Register` — formulário, validações, chamando `POST /auth/register`.
   - `Login` — chama `POST /auth/login`, guarda `accessToken` (in-memory) e `refreshToken` (HttpOnly cookie ou localStorage temporário).
   - `Reset Password` — request + form de reset.
   - `Dashboard` — protegido, mostra `AppHeader` com `barberName` e agenda.

2. Token handling
   - Armazenar `accessToken` em memória e `refreshToken` em cookie HttpOnly quando possível.
   - Implementar interceptor axios que detecta 401 e tenta `POST /auth/refresh` automaticamente.

Entrega mínima: login/register+redirect para `/app` com `Authorization` em requests.

---

## Fase 5 — Tenant & Conta (mínimo SaaS)

1. Estrutura de tenant: mapear `usuarios` para `barbearias`.
2. No sign-up, criar `barbearia` ligada ao usuário (owner) ou usar `DEFAULT_BARBEARIA_ID` para MVP.
3. Adicionar campo `plan` (free) e limites básicos.

---

## Fase 6 — Testes & Hardening

1. Unit & integration tests para:
   - Auth flows (register/login/refresh/reset).
   - Profile update (salvamento de `barberName`).
2. E2E tests (Playwright/Cypress) cobrindo signup→login→dashboard.
3. Segurança:
   - Rate limit em rota `/auth`.
   - Lockout temporário após N falhas.
   - Usar secure cookies para refresh quando em produção.

---

## Fase 7 — Deploy & Lançamento

1. Documentar variáveis de ambiente necessárias (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, SMTP creds).
2. Pipeline: build frontend (Vite) + backend (Node). Deploy em VPS/Cloud; conectar domínio e SSL.
3. Monitoramento: health endpoints `/health`, erros via Sentry, métricas básicas.

---

## Critérios de Aceitação (MVP)

- Landing pública com CTA para registro.
- Usuário pode registrar-se, fazer login e acessar `/app` protegido.
- Refresh token persistido e rotacionado no servidor.
- Reset de senha funcional.
- Cabeçalho mostra `barberName` salvo e persistido no banco.

---

## Próximos passos imediatos sugeridos (curto prazo)

1. Implementar middleware de autenticação e proteger `GET/POST /agendamentos`.
2. Criar páginas de `Login` e `Register` no frontend com token flow básico.
3. Adicionar migration para `auth_tokens` e garantir persistência de refresh.

---

## Referências rápidas (comandos)

Testar profile:

```bash
curl http://localhost:3000/profile
curl -X PUT http://localhost:3000/profile -H "Content-Type: application/json" -d '{"shopName":"Minha","barberName":"Eu"}'
```

Testar auth:

```bash
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"secret123"}'
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"secret123"}'
```

---

Se quiser, implemento agora a **Fase 2** (middleware + proteção de rotas). Responda `Sim` para eu começar a codar as mudanças.
