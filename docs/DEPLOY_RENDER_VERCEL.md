# Deploy separado (Render + Vercel)

Este guia descreve o deploy em duas partes: backend no Render e frontend na Vercel.

## Estado atual do deploy

- Frontend Vercel: https://kurt-barbearia.vercel.app
- Backend Render: https://kurt-api.onrender.com
- `GET /health` no backend publicado respondeu `{"ok":true}` em 2026-05-31.
- O frontend publicado carregou em 2026-05-31 com titulo `Gestor Barbearia - Gestao para Barbearias`.

Observacao importante: no plano Free do Render, o backend pode dormir apos
inatividade. O frontend ja usa timeout maior e uma chamada `/health` em segundo
plano para reduzir erro no primeiro login, mas a primeira abertura ainda pode
demorar alguns segundos.

Depois que o usuario autentica, o frontend tambem faz prefetch e cache
persistente por usuario dos dados operacionais. Na reabertura ou troca entre
Agenda, Catalogo, Custos, Caixa, Equipe e Configuracoes, o app pode exibir os
ultimos dados salvos imediatamente e atualizar em segundo plano. Isso reduz o
loading perceptivel, mas nao elimina o cold start inicial do Render Free quando
o backend esta dormindo.

## 1) Preparar variaveis do backend (Render)

Crie um Web Service no Render apontando para o repositorio. Use os comandos abaixo.

Build command:

```
cd backend && npm install
```

Start command:

```
cd backend && npm run start
```

Variaveis de ambiente obrigatorias:

```
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=...
DATABASE_SSL=true
JWT_SECRET=...
DEFAULT_BARBEARIA_ID=...
CORS_ORIGIN=true
APP_URL=http://localhost:5173
AVATAR_BUCKET=barber-avatars
EMAIL_FROM=Gestor Barbearia <seu-email-verificado@seudominio.com>
EMAIL_BRAND_NAME=Gestor Barbearia
EMAIL_PROVIDER=brevo
BREVO_API_KEY=...
EMAIL_TIMEOUT_MS=10000
```

Observacoes:

- Use um JWT_SECRET com pelo menos 32 caracteres.
- CORS_ORIGIN e APP_URL serao atualizados depois do deploy do frontend.
- Se precisar, defina PORT=3000 (o Render normalmente injeta PORT automaticamente).
- `AVATAR_BUCKET` e usado para fotos de perfil dos barbeiros no Supabase Storage.
- No plano Free do Render, evite SMTP. Configure `EMAIL_PROVIDER=brevo` e
  `BREVO_API_KEY` para enviar codigos por API HTTPS. O remetente de
  `EMAIL_FROM` precisa estar cadastrado e verificado na Brevo.
- `EMAIL_BRAND_NAME` controla o nome usado no assunto e no corpo dos emails.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` podem ficar vazios em
  producao quando a Brevo API estiver ativa.

Depois do deploy, copie a URL publica do Render (ex: https://seuapp.onrender.com).

Para testar localmente antes do deploy, configure `EMAIL_PROVIDER=brevo`,
`BREVO_API_KEY` e um `EMAIL_FROM` verificado na Brevo, suba o backend e chame a
rota de desenvolvimento:

```
POST http://localhost:3000/test-email
{
  "to": "destinatario@example.com",
  "subject": "Teste Brevo",
  "text": "Email de teste enviado pela API Brevo."
}
```

A rota `/test-email` nao e registrada em producao.

Antes do primeiro teste em producao, aplique as migrations no banco de producao:

```
cd backend && npm run migrate
```

Use as mesmas variaveis `DATABASE_URL` e `DATABASE_SSL=true` configuradas no
Render. Isso garante que tabelas e campos novos, incluindo foto de perfil, ja
existam antes do app mobile usar a API publica.

## 2) Preparar variaveis do frontend (Vercel)

Crie um projeto na Vercel apontando para o repositorio e defina o Root Directory
como `frontend`. O arquivo `frontend/vercel.json` ja define a instalacao, build
e pasta publicada corretas.

Install command:

```
npm install
```

Build command:

```
npm run build:artifact
```

Output directory:

```
.output
```

Variavel de ambiente obrigatoria:

```
VITE_API_URL=https://seuapp.onrender.com
VITE_API_TIMEOUT_MS=75000
```

Nota iOS Safari:

- O `frontend/index.html` ja inclui `height=device-height` e `viewport-fit=cover`.
- O layout usa altura sincronizada por `visualViewport`, fallback `100svh` e safe area para evitar espaco preto no fim da tela.

Depois do deploy, copie a URL publica da Vercel (ex: https://seuapp.vercel.app).

## 3) Ajustar CORS e APP_URL no Render

Volte no Render e atualize estas variaveis usando a URL da Vercel:

```
CORS_ORIGIN=https://seuapp.vercel.app
APP_URL=https://seuapp.vercel.app
```

Salve e faca o redeploy do backend.

## 4) Verificacao final

1. Acesse a URL da Vercel e confirme que a landing carrega rapido.
2. Tente fazer login ou cadastro.
3. Abra o DevTools > Network e confirme que as chamadas vao para o backend do Render.
4. Se houver erro de CORS, confira CORS_ORIGIN no Render.
5. Se o cadastro travar ou falhar no envio do codigo, confira se
   `BREVO_API_KEY`, `EMAIL_PROVIDER=brevo` e `EMAIL_FROM` verificado estao
   salvos no Render e faca redeploy.
6. Se o primeiro login der timeout logo depois de longo periodo sem uso, abra
   `https://kurt-api.onrender.com/health`, aguarde `{"ok":true}` e teste de novo.

## 5) Checklist rapido

- [x] Render: backend respondeu /health
- [x] Vercel: frontend carregou
- [x] CORS configurado com a URL da Vercel
- [x] APP_URL configurado com a URL da Vercel
- [x] VITE_API_URL configurado com a URL do Render
- [x] Timeout/warmup do frontend ajustado para Render Free
- [x] Cache/prefetch do frontend ajustado para reduzir loading entre telas
- [x] Cache persistente e sessao cacheada no frontend para abertura mais rapida
- [ ] Brevo API configurada no Render para envio dos codigos por email
- [ ] Cadastro real em producao validado recebendo codigo por email
