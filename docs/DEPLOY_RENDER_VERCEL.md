# Deploy separado (Render + Vercel)

Este guia descreve o deploy em duas partes: backend no Render e frontend na Vercel.

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
```

Observacoes:

- Use um JWT_SECRET com pelo menos 32 caracteres.
- CORS_ORIGIN e APP_URL serao atualizados depois do deploy do frontend.
- Se precisar, defina PORT=3000 (o Render normalmente injeta PORT automaticamente).
- `AVATAR_BUCKET` e usado para fotos de perfil dos barbeiros no Supabase Storage.

Depois do deploy, copie a URL publica do Render (ex: https://seuapp.onrender.com).

## 2) Preparar variaveis do frontend (Vercel)

Crie um projeto na Vercel apontando para a pasta frontend/.

Build command:

```
npm run build
```

Output directory:

```
dist
```

Variavel de ambiente obrigatoria:

```
VITE_API_URL=https://seuapp.onrender.com
```

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

## 5) Checklist rapido

- [ ] Render: backend respondeu /health
- [ ] Vercel: frontend carregou e recebeu dados
- [ ] CORS configurado com a URL da Vercel
- [ ] APP_URL configurado com a URL da Vercel
- [ ] VITE_API_URL configurado com a URL do Render
