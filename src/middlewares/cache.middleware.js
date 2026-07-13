import { cache } from 'hono/cache';

export const cacheMiddleware = async (c, next) => {
  if (c.env && c.env.NODE_ENV === 'production') {
    const cacheHandler = cache({
      cacheName: 'barbearia-static',
      cacheControl: 'max-age=3600',
    });
    return cacheHandler(c, next);
  }
  await next();
};
