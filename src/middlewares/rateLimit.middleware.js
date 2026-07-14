const ipRequests = new Map();

function cleanUpMap() {
  const now = Date.now();
  for (const [key, value] of ipRequests.entries()) {
    if (now - value.windowStart > 60000) {
      ipRequests.delete(key);
    }
  }
}

export const rateLimitMiddleware = async (c, next) => {
  if (c.env && c.env.NODE_ENV === 'test') {
    await next();
    return;
  }

  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const now = Date.now();

  cleanUpMap();

  let ipData = ipRequests.get(ip);
  if (!ipData || now - ipData.windowStart > 60000) {
    ipData = {
      windowStart: now,
      count: 0,
    };
  }

  ipData.count += 1;
  ipRequests.set(ip, ipData);

  if (ipData.count > 15) {
    return c.json({
      error: 'Limite de requisicoes excedido. Por favor, tente novamente mais tarde.',
      code: 'RATE_LIMIT_EXCEEDED',
    }, 429);
  }

  await next();
};
