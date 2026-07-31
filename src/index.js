import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

import { setRuntimeEnv } from '../backend/src/config/env.js';

const app = new Hono();

app.use('*', async (c, next) => {
  setRuntimeEnv(c.env);
  await next();
});

// Middleware de CORS Nativo do Hono
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return corsMiddleware(c, next);
});

// Helper para instanciar o Supabase utilizando as bindings do Worker
export function getSupabase(c) {
  const url = c.env?.SUPABASE_URL || "https://zniehugopmvoutxnpgox.supabase.co";
  const key = c.env?.SUPABASE_SERVICE_KEY || c.env?.SUPABASE_ANON_KEY || "anon-fallback-key";
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Rotas Básicas
app.get('/health', (c) => c.json({ ok: true }));

app.get('/health/db', async (c) => {
  try {
    const supabase = getSupabase(c);
    const { error } = await supabase.from('barbearias').select('id').limit(1);
    if (error) {
      return c.json({ ok: false, database: false, error: error.message }, 500);
    }
    return c.json({ ok: true, database: true });
  } catch (err) {
    return c.json({ ok: false, database: false, error: err.message }, 500);
  }
});

// Roteadores

import authRouter from './routes/auth.js';
import servicesRouter from './routes/services.js';
import agendamentosRouter from './routes/agendamentos.js';
import migratedRouter from './routes/migrated.js';
app.route('/auth', authRouter);
app.route('/services', servicesRouter);
app.route('/agendamentos', agendamentosRouter);
app.route('/', migratedRouter);

// Exporta o Worker standard
export default app;
