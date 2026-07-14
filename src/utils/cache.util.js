export async function clearStaticCache(c, path) {
  if (c.env && c.env.NODE_ENV === 'production' && typeof globalThis.caches !== 'undefined') {
    try {
      const cache = await globalThis.caches.open('barbearia-static');
      const url = new URL(path, c.req.url).toString();
      const deleted = await cache.delete(url, { ignoreSearch: true });
      console.log(`[Cache Invalidation] Cleared cache for: ${url} (success: ${deleted})`);
    } catch (err) {
      console.error(`[Cache Invalidation] Failed to clear cache for ${path}:`, err.message || err);
    }
  }
}
