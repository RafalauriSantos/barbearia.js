import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { getSupabase } from '../index.js';
import { authMiddleware } from '../middlewares/auth.js';
import { verifyPassword } from 'worker-password-auth';
import authController from '../../backend/src/controllers/authController.js';
import { adaptController } from './migrated.js';

const router = new Hono();

async function resolveUserContext(user, supabase, env) {
  const { data: ownedBarbearia, error } = await supabase
    .from("barbearias")
    .select("id")
    .eq("usuario_dono_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  if (ownedBarbearia) {
    const { data: ownedBarber } = await supabase
      .from("barbeiros")
      .select("id")
      .eq("barbearia_id", ownedBarbearia.id)
      .eq("usuario_id", user.id)
      .maybeSingle();
    
    return {
      role: "admin",
      barbearia_id: ownedBarbearia.id,
      barbeiro_id: ownedBarber?.id || null,
    };
  }

  const { data: linkedBarber } = await supabase
    .from("barbeiros")
    .select("id, barbearia_id")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (linkedBarber) {
    return {
      role: "barbeiro",
      barbearia_id: linkedBarber.barbearia_id,
      barbeiro_id: linkedBarber.id,
    };
  }

  if (env.NODE_ENV !== "production" && env.DEFAULT_BARBEARIA_ID) {
    return {
      role: env.DEFAULT_BARBEIRO_ID ? "barbeiro" : "admin",
      barbearia_id: env.DEFAULT_BARBEARIA_ID,
      barbeiro_id: env.DEFAULT_BARBEIRO_ID || null,
    };
  }

  return {
    role: "admin",
    barbearia_id: null,
    barbeiro_id: null,
  };
}

router.post('/login', async (c) => {
  const supabase = getSupabase(c);
  
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { email, password } = body || {};

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  try {
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return c.json({ error: error.message }, 500);
    }

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    let isMatch = false;
    if (user.senha_hash && user.senha_hash.startsWith('$argon2id$')) {
      isMatch = await verifyPassword(password, user.senha_hash);
    } else {
      isMatch = await bcrypt.compare(password, user.senha_hash);
    }

    if (!isMatch) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!user.email_verificado_em) {
      return c.json({
        error: "Confirme seu email antes de entrar.",
        code: "EMAIL_NOT_VERIFIED"
      }, 403);
    }

    // Resolve Context
    const context = await resolveUserContext(user, supabase, c.env);

    // Sign Tokens
    const secret = c.env.JWT_SECRET;
    
    const nowInSecs = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      userId: user.id,
      exp: nowInSecs + 15 * 60
    }, secret, 'HS256');

    const refreshToken = await sign({
      userId: user.id,
      type: "refresh",
      exp: nowInSecs + 30 * 24 * 60 * 60
    }, secret, 'HS256');

    return c.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome || email.split("@")[0],
        email: user.email,
        role: user.role || context.role,
        barbearia_id: user.barbearia_id || context.barbearia_id,
        barbeiro_id: user.barbeiro_id || context.barbeiro_id,
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user');
  const supabase = getSupabase(c);
  try {
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userPayload.userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return c.json({ error: error.message }, 500);
    }

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const context = await resolveUserContext(user, supabase, c.env);

    return c.json({
      id: user.id,
      nome: user.nome || user.email.split("@")[0],
      email: user.email,
      role: user.role || context.role,
      barbearia_id: user.barbearia_id || context.barbearia_id,
      barbeiro_id: user.barbeiro_id || context.barbeiro_id,
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /auth/refresh
router.post('/refresh', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { refreshToken } = body || {};
  if (!refreshToken) {
    return c.json({ error: "refreshToken required" }, 400);
  }

  try {
    const secret = c.env.JWT_SECRET;
    const decoded = await verify(refreshToken, secret, 'HS256');

    if (decoded.type !== "refresh") {
      return c.json({ error: "Invalid token" }, 400);
    }

    const nowInSecs = Math.floor(Date.now() / 1000);
    const accessToken = await sign({
      userId: decoded.userId,
      exp: nowInSecs + 15 * 60
    }, secret, 'HS256');

    return c.json({ accessToken });
  } catch (err) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

// Mapeamento das rotas restantes do authController
router.post('/register', adaptController(authController.register));
router.post('/verify-email', adaptController(authController.verifyEmail));
router.post('/verify-code', adaptController(authController.verifyEmailCode));
router.post('/resend-code', adaptController(authController.resendEmailCode));
router.post('/forgot-password', adaptController(authController.forgotPassword));
router.post('/reset-password', adaptController(authController.resetPassword));

export default router;
