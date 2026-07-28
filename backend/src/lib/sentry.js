const Sentry = require("@sentry/cloudflare");

/**
 * Sanitizes event data before sending to Sentry to prevent PII/secret leaks.
 * @param {import('@sentry/types').Event} event
 * @returns {import('@sentry/types').Event | null}
 */
function sanitizeSentryEvent(event) {
	if (!event) return null;

	// 1. Sanitize Request Headers
	if (event.request && event.request.headers) {
		const headers = event.request.headers;
		for (const key of Object.keys(headers)) {
			const lowerKey = key.toLowerCase();
			if (
				lowerKey === "authorization" ||
				lowerKey === "cookie" ||
				lowerKey === "set-cookie"
			) {
				headers[key] = "[FILTERED]";
			}
		}
	}

	// 2. Sanitize Request Data / Body
	if (event.request && event.request.data) {
		event.request.data = maskSensitiveFields(event.request.data);
	}

	// 3. Sanitize Extra / Context Data
	if (event.extra) {
		event.extra = maskSensitiveFields(event.extra);
	}

	return event;
}

/**
 * Recursively masks sensitive key values (senha, password, token, secret, jwt, etc.)
 */
function maskSensitiveFields(data) {
	if (!data) return data;
	if (typeof data === "string") {
		try {
			const parsed = JSON.parse(data);
			return JSON.stringify(maskSensitiveFields(parsed));
		} catch {
			return data;
		}
	}
	if (typeof data !== "object") return data;

	const sensitiveKeys = [
		"senha",
		"password",
		"token",
		"secret",
		"jwt",
		"authorization",
		"credit_card",
		"cpf",
	];

	if (Array.isArray(data)) {
		return data.map(maskSensitiveFields);
	}

	const copy = { ...data };
	for (const key of Object.keys(copy)) {
		const lowerKey = key.toLowerCase();
		if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
			copy[key] = "[FILTERED]";
		} else if (typeof copy[key] === "object" && copy[key] !== null) {
			copy[key] = maskSensitiveFields(copy[key]);
		}
	}
	return copy;
}

/**
 * Initializes Sentry for Cloudflare Worker context safely.
 */
function initSentry(env) {
	const dsn = env?.SENTRY_DSN || process.env.SENTRY_DSN;
	const nodeEnv = env?.NODE_ENV || process.env.NODE_ENV || "development";

	if (!dsn || nodeEnv === "test") {
		return null;
	}

	try {
		const initFn = Sentry && typeof Sentry.init === "function" ? Sentry.init : null;

		if (typeof initFn === "function") {
			return initFn({
				dsn,
				environment: nodeEnv,
				enabled: true,
				beforeSend: sanitizeSentryEvent,
				tracesSampleRate: 0.1,
			});
		}
		return null;
	} catch (err) {
		console.error("[SENTRY INIT ERROR] Failed initializing Sentry SDK:", err);
		return null;
	}
}

module.exports = {
	Sentry,
	sanitizeSentryEvent,
	maskSensitiveFields,
	initSentry,
	withSentry: Sentry.withSentry || Sentry.default?.withSentry,
};
