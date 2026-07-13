import { verify } from 'hono/jwt';

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  
  const token = match[1];
  const secret = c.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is missing from environment bindings.');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  try {
    const payload = await verify(token, secret, 'HS256');
    c.set('user', payload);
    await next();
  } catch (err) {
    console.error("Erro na autenticação:", err.message || err);
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};
