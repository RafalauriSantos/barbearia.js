/**
 * Generates OWASP-compliant Security Headers and Content-Security-Policy (CSP)
 * tailored for Cloudflare Workers, Hono, Fastify, and React PWA.
 *
 * @param {boolean} [isProduction=false]
 * @returns {Record<string, string>}
 */
function getSecurityHeaders(isProduction = false) {
	const cspDirectives = [
		"default-src 'self'",
		isProduction ?
			"script-src 'self' https://challenges.cloudflare.com"
		:	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https://*.supabase.co",
		isProduction ?
			"connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://api.brevo.com"
		:	"connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* https://*.supabase.co https://challenges.cloudflare.com https://api.brevo.com",
		"frame-src 'self' https://challenges.cloudflare.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		...(isProduction ? ["upgrade-insecure-requests"] : []),
	];

	const headers = {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
		"X-Permitted-Cross-Domain-Policies": "none",
		"X-DNS-Prefetch-Control": "off",
		"Content-Security-Policy": cspDirectives.join("; "),
	};

	if (isProduction) {
		headers["Strict-Transport-Security"] =
			"max-age=31536000; includeSubDomains; preload";
	}

	return headers;
}

module.exports = {
	getSecurityHeaders,
};
