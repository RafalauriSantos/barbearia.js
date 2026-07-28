# Guia de Configuração de Variáveis de Ambiente e Secrets

Este documento descreve como configurar as variáveis de ambiente e segredos (*secrets*) da aplicação **barbearia.js** em Desenvolvimento, Homologação e Produção.

---

## 🔐 1. Backend (Cloudflare Workers & Hono)

### A. Desenvolvimento Local (`backend/.env`)
Crie ou edite o arquivo `backend/.env` (não versionado):
```env
NODE_ENV=development
SENTRY_DSN=https://sua-chave-dsn-dev.ingest.us.sentry.io/1234567
```

### B. Produção / Cloudflare Workers (Secrets Criptografados)
Por boas práticas operacionais de segurança, **nenhuma chave de API ou DSN deve ser mantida hardcoded no arquivo `wrangler.toml`**.

Para registrar ou atualizar o `SENTRY_DSN` em produção no Cloudflare Workers, execute o comando via terminal CLI:

```bash
npx wrangler secret put SENTRY_DSN
```
Ao ser solicitado, cole a URL do seu DSN (ex: `https://xxxx@o12345.ingest.us.sentry.io/67890`).

Para listar as secrets ativas no Worker sem exibir os valores sensíveis:
```bash
npx wrangler secret list
```

---

## 🌐 2. Frontend (React PWA + Vite)

### A. Desenvolvimento Local (`frontend/.env.local`)
No Vite, variáveis expostas ao cliente utilizam o prefixo `VITE_`.
Crie o arquivo `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=https://sua-chave-dsn-frontend.ingest.us.sentry.io/1234567
```

### B. Produção (Cloudflare Pages / Vercel / Netlify)
Configure a variável de ambiente no painel do provedor de hospedagem frontend (ex: Cloudflare Pages -> *Settings -> Environment Variables*):
- **Key:** `VITE_SENTRY_DSN`
- **Value:** `https://xxxx@o12345.ingest.us.sentry.io/67890`

---

## ⚙️ 3. Resumo das Boas Práticas Operacionais
1. **Zero Segredos no Repositório:** O arquivo `wrangler.toml` e os arquivos `.env.example` contêm apenas estruturas e placeholders de exemplo.
2. **Sanitização Nativa:** Todos os eventos capturados pelo Sentry no backend e frontend são purgados de senhas, JWTs e cookies antes do envio.
