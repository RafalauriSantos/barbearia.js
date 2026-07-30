import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
const { setRuntimeEnv } = require("./config/env");
const supabase = require("./lib/supabase");
import { AppError } from "./lib/errors";
import { ZodError } from "zod";
const { getSecurityHeaders } = require("./middleware/securityHeaders");
const { initSentry, Sentry, withSentry, sanitizeSentryEvent } = require("./lib/sentry");

const app: any = new Hono();

// Dynamic CORS configuration (MUST BE FIRST FOR PREFLIGHT OPTIONS)
app.use("*", async (c: any, next: any) => {
	const originEnv = c.env ? c.env.CORS_ORIGIN : null;
	const nodeEnv = c.env ? c.env.NODE_ENV : "development";
	
	let allowedOrigin: any;
	if (nodeEnv !== "production") {
		allowedOrigin = (origin: string) => origin || "*";
	} else if (!originEnv || originEnv === "true" || originEnv === true) {
		allowedOrigin = "*";
	} else {
		const originsList = String(originEnv).split(",").map(o => o.trim()).filter(Boolean);
		allowedOrigin = (origin: string) => originsList.includes(origin) ? origin : null;
	}

	const corsMiddleware = cors({
		origin: allowedOrigin,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"X-Request-ID",
			"x-request-id",
			"X-Requested-With",
			"Accept",
			"Origin",
		],
		exposeHeaders: [
			"Content-Type",
			"Authorization",
			"X-Request-ID",
			"x-request-id",
		],
		maxAge: 86400,
	});
	return corsMiddleware(c, next);
});

// X-Request-ID & Correlation Tracing Middleware
app.use("*", async (c: any, next: any) => {
	const reqId =
		c.req.header("x-request-id") ||
		c.req.header("cf-ray") ||
		(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ?
			crypto.randomUUID()
		:	`req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	c.set("requestId", reqId);
	c.header("x-request-id", reqId);
	await next();
});

// Native Hono HTTP Logger Middleware (skipped in test mode)
app.use("*", async (c: any, next: any) => {
	const currentEnv = c.env?.NODE_ENV || process.env.NODE_ENV || "development";
	if (currentEnv === "test") {
		return next();
	}
	const loggerMiddleware = logger();
	return loggerMiddleware(c, next);
});

// Global runtime environment initialization on first request
let envInitialized = false;
app.use("*", async (c: any, next: any) => {
	if (!envInitialized) {
		setRuntimeEnv(c.env);
		envInitialized = true;
		try {
			supabase.ensureConfigured();
			initSentry(c.env);
		} catch (e) {
			console.error("Supabase config check error:", e);
		}
	}
	await next();
});

// OWASP Security Headers Middleware
app.use("*", async (c: any, next: any) => {
	await next();
	const nodeEnv = c.env?.NODE_ENV || process.env.NODE_ENV || "development";
	const secHeaders = getSecurityHeaders(nodeEnv === "production");
	for (const [key, value] of Object.entries(secHeaders)) {
		c.header(key, value);
	}
});

// Set to track logged development warnings once per binding
const loggedDevWarnings = new Set<string>();

// Helper to extract client IP safely from Cloudflare Edge headers
function getClientIp(c: any) {
	return (
		c.req.header("CF-Connecting-IP") ||
		c.req.header("x-real-ip") ||
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
		"127.0.0.1"
	);
}

// Factory function for Cloudflare Rate Limiting Bindings with Fail-Safe / Fail-Closed policy
function createBindingRateLimiterMiddleware(options: { bindingName: string; errorCode: string; errorMessage: string; retryAfterSeconds?: number }) {
	const { bindingName, errorCode, errorMessage, retryAfterSeconds = 60 } = options;

	return async function rateLimiterMiddleware(c: any, next: any) {
		if (c.req.method === "OPTIONS") {
			return next();
		}
		const nodeEnv = c.env?.NODE_ENV || process.env.NODE_ENV || "development";
		const limiter = c.env?.[bindingName];
		const hasValidBinding = limiter && typeof limiter.limit === "function";

		if (!hasValidBinding) {
			if (nodeEnv === "production") {
				console.error(
					`[CRITICAL SECURITY ERROR] Required Cloudflare Rate Limiter binding '${bindingName}' is missing in production environment! Request rejected for security.`,
				);
				return c.json(
					{
						error: "Erro de configuração de segurança do servidor. Contate o administrador.",
						code: "SECURITY_BINDING_MISSING",
					},
					500,
				);
			}

			if (nodeEnv === "development" && !loggedDevWarnings.has(bindingName)) {
				loggedDevWarnings.add(bindingName);
				console.warn(
					`[DEV WARN] Cloudflare Rate Limiter binding '${bindingName}' is missing. Rate limiting is bypassed in local development.`,
				);
			}

			return next();
		}

		const clientIp = getClientIp(c);
		try {
			const result = await limiter.limit({ key: clientIp });
			if (result && result.success === false) {
				c.header("Retry-After", String(retryAfterSeconds));
				return c.json(
					{
						error: errorMessage,
						code: errorCode,
					},
					429,
				);
			}
		} catch (err) {
			console.error(`[RATE LIMIT ERROR] Failed executing ${bindingName}.limit():`, err);
			if (nodeEnv === "production") {
				return c.json(
					{
						error: "Erro interno no serviço de limitação de taxa.",
						code: "RATE_LIMIT_SERVICE_ERROR",
					},
					500,
				);
			}
		}

		return next();
	};
}

app.use(
	"/auth/*",
	createBindingRateLimiterMiddleware({
		bindingName: "AUTH_LIMITER",
		errorCode: "AUTH_RATE_LIMIT_EXCEEDED",
		errorMessage: "Muitas tentativas de autenticação. Por favor, aguarde 1 minuto.",
		retryAfterSeconds: 60,
	}),
);

app.use(
	"*",
	createBindingRateLimiterMiddleware({
		bindingName: "GLOBAL_LIMITER",
		errorCode: "GLOBAL_RATE_LIMIT_EXCEEDED",
		errorMessage: "Muitas requisições ao servidor. Por favor, aguarde alguns instantes.",
		retryAfterSeconds: 60,
	}),
);

function adaptRoute(fastifyHandler: any, options: any = {}) {
	return async (c: any) => {
		let responseStatus = 200;
		let responseBody: any = null;
		let responseSent = false;
		let resolvePromise: () => void;
		const promise = new Promise<void>((resolve) => {
			resolvePromise = resolve;
		});

		const reply = {
			code(status: number) {
				responseStatus = status;
				return this;
			},
			status(status: number) {
				responseStatus = status;
				return this;
			},
			send(body: any) {
				responseBody = body;
				responseSent = true;
				resolvePromise();
				return this;
			},
		};

		const request: any = {
			headers: c.req.header(),
			params: c.req.param(),
			query: c.req.query(),
			method: c.req.method,
			ip: c.req.header("CF-Connecting-IP") || c.req.header("x-real-ip") || c.req.header("x-forwarded-for") || "127.0.0.1",
			user: null,
			body: {},
			log: {
				info: console.log,
				warn: console.warn,
				error: console.error,
			},
		};

		if (c.req.method !== "GET" && c.req.method !== "HEAD") {
			try {
				request.body = await c.req.json();
			} catch (e) {
				try {
					request.body = await c.req.parseBody();
				} catch (err) {
					request.body = {};
				}
			}
		}

		if (options.preHandler) {
			const preHandlers = Array.isArray(options.preHandler)
				? options.preHandler
				: [options.preHandler];
			for (const preHandler of preHandlers) {
				await preHandler(request, reply);
				if (responseSent) {
					break;
				}
			}
		}

		if (responseSent) {
			if (responseBody === null || responseBody === undefined) {
				return c.body(null, responseStatus);
			}
			return c.json(responseBody, responseStatus);
		}

		try {
			const result = await fastifyHandler(request, reply);
			if (!responseSent && result !== undefined) {
				responseBody = result;
			}
		} catch (err) {
			if (err instanceof AppError) {
				return c.json({ error: err.message, code: err.code }, err.status);
			}
			if (err instanceof ZodError) {
				return c.json(
					{
						error: "Validation error",
						code: "VALIDATION_ERROR",
						issues: err.issues.map((issue) => ({
							path: issue.path.join("."),
							message: issue.message,
						})),
					},
					400,
				);
			}
			console.error("Handler error:", err);
			return c.json(
				{ error: "Internal Server Error", code: "INTERNAL_ERROR" },
				500,
			);
		}

		if (responseBody === null || responseBody === undefined) {
			return c.body(null, responseStatus);
		}
		return c.json(responseBody, responseStatus);
	};
}

function createHonoBridge(honoApp: any) {
	return {
		get(path: string, options: any, handler?: any) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.get(path, adaptRoute(realHandler, opts));
		},
		post(path: string, options: any, handler?: any) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.post(path, adaptRoute(realHandler, opts));
		},
		put(path: string, options: any, handler?: any) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.put(path, adaptRoute(realHandler, opts));
		},
		patch(path: string, options: any, handler?: any) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.patch(path, adaptRoute(realHandler, opts));
		},
		delete(path: string, options: any, handler?: any) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.delete(path, adaptRoute(realHandler, opts));
		},
		register(routeFn: any, config: any = {}) {
			const prefix = config.prefix || "";
			const subApp = new Hono();
			const subBridge = createHonoBridge(subApp);
			const result = routeFn(subBridge, config);
			honoApp.route(prefix, subApp);
			return result;
		},
	};
}

const bridge = createHonoBridge(app);

const routesIndex = require("./routes");
routesIndex(bridge);

app.onError((err: any, c: any) => {
	const reqId =
		c.get("requestId") ||
		c.req.header("x-request-id") ||
		c.req.header("cf-ray") ||
		null;

	if (err instanceof AppError) {
		return c.json({ error: err.message, code: err.code }, err.status);
	}
	if (err instanceof ZodError) {
		return c.json(
			{
				error: "Validation error",
				code: "VALIDATION_ERROR",
				issues: err.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			},
			400,
		);
	}

	console.error(
		JSON.stringify({
			level: "error",
			message: err.message || "Unhandled server error",
			stack: err.stack || null,
			requestId: reqId,
			path: c.req.path,
			method: c.req.method,
			timestamp: new Date().toISOString(),
		}),
	);

	if (c.env?.SENTRY_DSN || process.env.SENTRY_DSN) {
		try {
			const sendPromise = Sentry.withScope((scope: any) => {
				if (reqId) scope.setTag("requestId", reqId);
				scope.setExtra("path", c.req.path);
				scope.setExtra("method", c.req.method);
				return Sentry.captureException(err);
			});
			if (c.executionCtx && typeof c.executionCtx.waitUntil === "function" && sendPromise) {
				c.executionCtx.waitUntil(Promise.resolve(sendPromise));
			}
		} catch (sentryErr) {
			console.error("[SENTRY CAPTURE ERROR]", sentryErr);
		}
	}

	return c.json(
		{ error: "Internal Server Error", code: "INTERNAL_ERROR" },
		500,
	);
});

module.exports = typeof withSentry === "function"
	? withSentry(
			(env: any) => ({
				dsn: env?.SENTRY_DSN || process.env.SENTRY_DSN,
				tracesSampleRate: 0.1,
				beforeSend: sanitizeSentryEvent,
			}),
			app,
	  )
	: app;
