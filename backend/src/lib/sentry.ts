const Sentry = require("@sentry/cloudflare");

const SENSITIVE_PATTERN =
	/(password|jwt|token|secret|bearer|otp|auth|credentials|api[_-]?key|turnstile|cookie|senha|cpf|credit[_-]?card)/i;

let rateLimitCounter = 0;

/**
 * Sanitizes event data before sending to Sentry to prevent PII/secret leaks
 * and applies rate limit sampling and fingerprinting.
 * @param {import('@sentry/types').Event} event
 * @returns {import('@sentry/types').Event | null}
 */
function sanitizeSentryEvent(event) {
	if (!event) return null;

	// 1. Rate Limit Sampling (429 Status Code - Sample 1 out of 50 events)
	const isRateLimit = event.tags && String(event.tags.status_code) === "429";
	if (isRateLimit) {
		rateLimitCounter++;
		if (rateLimitCounter % 50 !== 1) {
			return null;
		}
	}

	// 2. Sanitize Request Headers
	if (event.request && event.request.headers) {
		const headers = event.request.headers;
		for (const key of Object.keys(headers)) {
			if (SENSITIVE_PATTERN.test(key)) {
				headers[key] = "[FILTERED]";
			}
		}
	}

	// 3. Sanitize Request Data / Body
	if (event.request && event.request.data) {
		event.request.data = maskSensitiveFields(event.request.data);
	}

	// 4. Sanitize Extra / Context Data
	if (event.extra) {
		event.extra = maskSensitiveFields(event.extra);
	}

	// 5. Automatic Deduplication / Fingerprinting
	event.fingerprint = [
		"{{ default }}",
		event.exception?.values?.[0]?.type || "UnknownError",
		event.request?.url || "global",
	];

	return event;
}

/**
 * Recursively masks sensitive key values matching SENSITIVE_PATTERN.
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

	if (Array.isArray(data)) {
		return data.map(maskSensitiveFields);
	}

	const copy = { ...data };
	for (const key of Object.keys(copy)) {
		if (SENSITIVE_PATTERN.test(key)) {
			copy[key] = "[FILTERED]";
		} else if (typeof copy[key] === "object" && copy[key] !== null) {
			copy[key] = maskSensitiveFields(copy[key]);
		}
	}
	return copy;
}

/**
 * Initializes Sentry for Cloudflare Worker context safely in production.
 */
function initSentry(env) {
	const dsn = env?.SENTRY_DSN || process.env.SENTRY_DSN;
	const nodeEnv = env?.NODE_ENV || process.env.NODE_ENV || "development";

	// Restrict telemetry sending strictly to production
	if (!dsn || nodeEnv !== "production") {
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

function resetRateLimitCounter() {
	rateLimitCounter = 0;
}

module.exports = {
	Sentry,
	sanitizeSentryEvent,
	maskSensitiveFields,
	initSentry,
	resetRateLimitCounter,
	withSentry: Sentry.withSentry,
};
export default module.exports;
