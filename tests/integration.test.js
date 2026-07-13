import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { setRuntimeEnv } = require('../backend/src/config/env.js');

// Função auxiliar para carregar arquivos .env / .dev.vars de forma segura
function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value.trim();
    }
  });
  return env;
}

const localVars = loadEnvFile(path.resolve(process.cwd(), '.dev.vars'));

const mockEnv = {
  NODE_ENV: "development",
  SUPABASE_URL: localVars.SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: localVars.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: localVars.JWT_SECRET || process.env.JWT_SECRET || "development-only-secret-change-before-production",
  BREVO_API_KEY: localVars.BREVO_API_KEY || process.env.BREVO_API_KEY,
  EMAIL_FROM: localVars.EMAIL_FROM || process.env.EMAIL_FROM || "Marque’s Barbearia <no-reply@localhost>",
  EMAIL_BRAND_NAME: localVars.EMAIL_BRAND_NAME || process.env.EMAIL_BRAND_NAME || "Marque’s Barbearia",
  EMAIL_PROVIDER: localVars.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER || "brevo"
};

setRuntimeEnv(mockEnv);

import app from '../src/index.js';

describe('Bateria de Testes de Integração da API', () => {
  let token = null;

  it('Teste 1: Autenticação (POST /auth/login) - Usuário Válido', async () => {
    const payload = {
      email: "test-login@example.com",
      password: "supersecret"
    };

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, mockEnv);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    token = body.accessToken;
  });

  it('Teste 2: Acesso protegido (GET /profile) - Token Válido', async () => {
    expect(token).toBeDefined();

    const res = await app.request('/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, mockEnv);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('barbearia_id');
    expect(body).toHaveProperty('barbeiro_id');
  });

  it('Teste 3: Criação de recurso (POST /agendamentos) - Agendamento Válido', async () => {
    expect(token).toBeDefined();

    // Gerar dia e horário randômicos para evitar conflito de agenda (409) entre execuções repetidas do teste
    const randomDay = String(Math.floor(Math.random() * 20) + 10).padStart(2, '0');
    const randomHour = String(Math.floor(Math.random() * 8) + 9).padStart(2, '0');
    const randomMinutes = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
    
    const dayKey = `2026-08-${randomDay}`;
    const timeSlot = `${randomHour}:${randomMinutes}`;

    const payload = {
      client_name: "Cliente Teste Automatizado",
      day_key: dayKey,
      time_slot: timeSlot,
      value: 50,
      status: "normal"
    };

    const res = await app.request('/agendamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }, mockEnv);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.cliente_nome).toBe('Cliente Teste Automatizado');
    expect(body.data).toBe(dayKey);
    expect(body.hora.slice(0, 5)).toBe(timeSlot);
  });

  it('Teste 4: Tratamento de erro - Acesso sem token (401 Unauthorized)', async () => {
    const res = await app.request('/profile', {
      method: 'GET'
    }, mockEnv);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Authorization header');
  });

  it('Teste 5: Recuperação de Senha (POST /auth/forgot-password) - Falha no envio de email detectada', async () => {
    const payload = {
      email: "test-login@example.com"
    };

    // Override the environment to force brevo provider and dummy key to ensure a failure is thrown
    const badKeyEnv = {
      ...mockEnv,
      BREVO_API_KEY: "invalid_key_for_testing_failures",
      EMAIL_PROVIDER: "brevo"
    };

    const res = await app.request('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, badKeyEnv);

    // It must return 500 since we've added error propagation and try/catch instead of failing silently
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(body.code).toBe('EMAIL_SEND_FAILED');
  });
});
