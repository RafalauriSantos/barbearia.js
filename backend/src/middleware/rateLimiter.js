/**
 * Rate Limiting Middleware for Hono / Cloudflare Workers
 *
 * Provides in-memory sliding window rate limiting per IP address.
 * Sets standard RateLimit HTTP headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After).
 */

function defaultKeyGenerator(c) {
	return (
		c.req.header("CF-Connecting-IP") ||
		c.req.header("x-real-ip") ||
		c.req.header("x-forwarded-for") ||
		"127.0.0.1"
	);
}

/**
 * Creates a Hono rate limiter middleware instance.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - Window size in milliseconds (default 1 min)
 * @param {number} [options.max=100] - Maximum requests allowed per IP within the window
 * @param {Function} [options.keyGenerator] - Function returning rate limit key (e.g. IP)
 * @param {Function} [options.skip] - Optional function returning true to bypass rate limiting
 * @param {string} [options.message] - Custom error message for HTTP 429
 * @param {string} [options.code="TOO_MANY_REQUESTS"] - Custom error code for HTTP 429
 */
function createRateLimiter(options = {}) {
	const windowMs = options.windowMs || 60 * 1000;
	const max = options.max || 100;
	const keyGenerator = options.keyGenerator || defaultKeyGenerator;
	const skip = options.skip || (() => false);
	const message =
		options.message ||
		"Muitas requisições. Por favor, tente novamente em alguns instantes.";
	const code = options.code || "TOO_MANY_REQUESTS";

	// In-memory store: key -> { count, resetTime }
	const store = new Map();

	let lastCleanup = Date.now();
	function cleanup() {
		const now = Date.now();
		if (now - lastCleanup < windowMs) return;
		lastCleanup = now;
		for (const [k, data] of store.entries()) {
			if (data.resetTime <= now) {
				store.delete(k);
			}
		}
	}

	return async function rateLimiterMiddleware(c, next) {
		if (skip(c)) {
			return next();
		}

		cleanup();

		const key = keyGenerator(c);
		const now = Date.now();
		let record = store.get(key);

		if (!record || record.resetTime <= now) {
			record = {
				count: 0,
				resetTime: now + windowMs,
			};
		}

		record.count += 1;
		store.set(key, record);

		const remaining = Math.max(0, max - record.count);
		const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

		c.header("RateLimit-Limit", String(max));
		c.header("RateLimit-Remaining", String(remaining));
		c.header("RateLimit-Reset", String(resetSeconds));

		if (record.count > max) {
			c.header("Retry-After", String(resetSeconds));
			return c.json(
				{
					error: message,
					code: code,
				},
				429,
			);
		}

		return next();
	};
}

module.exports = {
	createRateLimiter,
	defaultKeyGenerator,
};
