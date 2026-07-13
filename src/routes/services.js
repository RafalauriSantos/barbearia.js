import { Hono } from 'hono';
import { getSupabase } from '../index.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Hono();

async function getBarbeariaId(supabase, userId, env) {
  // 1. Check if owner of a barbearia
  const { data: owned, error: ownedErr } = await supabase
    .from('barbearias')
    .select('id')
    .eq('usuario_dono_id', userId)
    .maybeSingle();

  if (owned) return owned.id;

  // 2. Check if linked barber
  const { data: linked, error: linkedErr } = await supabase
    .from('barbeiros')
    .select('barbearia_id')
    .eq('usuario_id', userId)
    .eq('ativo', true)
    .maybeSingle();

  if (linked) return linked.barbearia_id;

  // 3. Dev fallback
  if (env.NODE_ENV !== 'production' && env.DEFAULT_BARBEARIA_ID) {
    return env.DEFAULT_BARBEARIA_ID;
  }

  return null;
}

router.get('/', authMiddleware, async (c) => {
  const supabase = getSupabase(c);
  const user = c.get('user'); // Token payload: { userId: user.id }
  const userId = user?.userId;

  if (!userId) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    const barbeariaId = await getBarbeariaId(supabase, userId, c.env);

    if (!barbeariaId) {
      return c.json({
        error: 'Usuario sem barbearia vinculada.',
        code: 'BARBEARIA_CONTEXT_REQUIRED'
      }, 403);
    }

    const { data: services, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    const mapped = (services || []).map(row => ({
      id: row.id,
      name: row.nome,
      price: Number(row.preco || 0),
      active: row.ativo,
      barbearia_id: row.barbearia_id,
    }));

    return c.json(mapped);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default router;
