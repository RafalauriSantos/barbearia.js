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

  it('Teste 6: Esqueci a Senha - Sucesso local (modo dev com resetCode retornado)', async () => {
    const payload = {
      email: "test-login@example.com"
    };

    const devEnv = {
      ...mockEnv,
      NODE_ENV: "development",
      EMAIL_PROVIDER: "smtp"
    };

    const res = await app.request('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, devEnv);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('resetCode');
    expect(body.resetCode).toHaveLength(6);
  });

  it('Teste 7: Esqueci a Senha - Sucesso produção (resetCode ocultado)', async () => {
    const payload = {
      email: "test-login@example.com"
    };

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      const isBrevoUrl = typeof url === 'string' && (() => { try { return new URL(url).hostname.endsWith('brevo.com'); } catch { return false; } })();
      if (isBrevoUrl) {
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ messageId: "message-prod-1" })
        };
      }
      return originalFetch(url, options);
    };

    const prodEnv = {
      ...mockEnv,
      NODE_ENV: "production",
      EMAIL_PROVIDER: "brevo",
      BREVO_API_KEY: "valid_dummy_key"
    };

    try {
      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, prodEnv);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('ok');
      expect(body.ok).toBe(true);
      expect(body).not.toHaveProperty('resetCode');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('Teste 8: Fluxo Completo de Redefinição de Senha (Esqueci -> Redefinir -> Novo Login)', async () => {
    const email = "test-login@example.com";
    const newPassword = "newsupersecretpassword";

    // 1. Forgot password request (in dev mode to capture resetCode)
    const devEnv = {
      ...mockEnv,
      NODE_ENV: "development",
      EMAIL_PROVIDER: "smtp"
    };

    const forgotRes = await app.request('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    }, devEnv);

    expect(forgotRes.status).toBe(200);
    const forgotBody = await forgotRes.json();
    const code = forgotBody.resetCode;
    expect(code).toBeDefined();

    // 2. Reset password request with the code
    const resetRes = await app.request('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code, password: newPassword })
    }, devEnv);

    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody).toHaveProperty('ok');
    expect(resetBody.ok).toBe(true);

    // 3. Try login with new password (should succeed)
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: newPassword })
    }, devEnv);

    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody).toHaveProperty('accessToken');

    // 4. Try login with old password (should fail)
    const badLoginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: "supersecret" }) // old password
    }, devEnv);

    expect(badLoginRes.status).toBe(401);

    // 5. Cleanup: Restore password to "supersecret" to prevent side-effects on other test runs
    const cleanForgotRes = await app.request('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    }, devEnv);
    expect(cleanForgotRes.status).toBe(200);
    const cleanForgotBody = await cleanForgotRes.json();
    const cleanCode = cleanForgotBody.resetCode;

    const restoreRes = await app.request('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code: cleanCode, password: "supersecret" })
    }, devEnv);
    expect(restoreRes.status).toBe(200);
  });
});
