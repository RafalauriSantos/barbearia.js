const { Hono } = require("hono");
const { cors } = require("hono/cors");
const { setRuntimeEnv } = require("./config/env");
const supabase = require("./lib/supabase");
const { AppError } = require("./lib/errors");
const { ZodError } = require("zod");

const app = new Hono();

// Global runtime environment initialization on first request
let envInitialized = false;
app.use("*", async (c, next) => {
	if (!envInitialized) {
		setRuntimeEnv(c.env);
		envInitialized = true;
		try {
			supabase.ensureConfigured();
		} catch (e) {
			console.error("Supabase config check error:", e);
		}
	}
	await next();
});

// Dynamic CORS configuration using the env Proxy
app.use("*", async (c, next) => {
	const originEnv = c.env ? c.env.CORS_ORIGIN : null;
	const nodeEnv = c.env ? c.env.NODE_ENV : "development";
	
	let allowedOrigin;
	if (nodeEnv !== "production") {
		allowedOrigin = (origin) => origin || "*";
	} else if (!originEnv || originEnv === "true" || originEnv === true) {
		allowedOrigin = "*";
	} else {
		const originsList = String(originEnv).split(",").map(o => o.trim()).filter(Boolean);
		allowedOrigin = (origin) => originsList.includes(origin) ? origin : null;
	}

	const corsMiddleware = cors({
		origin: allowedOrigin,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
		allowHeaders: ["Content-Type", "Authorization"],
	});
	return corsMiddleware(c, next);
});

// Adapter to bridge Fastify controllers and middlewares (preHandlers) to Hono
function adaptRoute(fastifyHandler, options = {}) {
	return async (c) => {
		let responseStatus = 200;
		let responseBody = null;
		let responseSent = false;
		let resolvePromise;
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const reply = {
			code(status) {
				responseStatus = status;
				return this;
			},
			status(status) {
				responseStatus = status;
				return this;
			},
			send(body) {
				responseBody = body;
				responseSent = true;
				resolvePromise();
				return this;
			},
		};

		const request = {
			headers: c.req.header(),
			params: c.req.param(),
			query: c.req.query(),
			method: c.req.method,
			ip: c.req.header("CF-Connecting-IP") || c.req.header("x-real-ip") || c.req.header("x-forwarded-for") || "127.0.0.1",
			user: null, // Populated by auth middleware
			body: {},
			log: {
				info: console.log,
				warn: console.warn,
				error: console.error,
			},
		};

		// Parse body if method has body
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

		// Run preHandlers (like auth middleware)
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

		// If preHandler sent a response (e.g. auth failed), return it immediately
		if (responseSent) {
			if (responseBody === null || responseBody === undefined) {
				return c.body(null, responseStatus);
			}
			return c.json(responseBody, responseStatus);
		}

		// Run actual controller handler
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

// Router Bridge helper mapping Fastify-style routing to Hono
function createHonoBridge(honoApp) {
	return {
		get(path, options, handler) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.get(path, adaptRoute(realHandler, opts));
		},
		post(path, options, handler) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.post(path, adaptRoute(realHandler, opts));
		},
		put(path, options, handler) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.put(path, adaptRoute(realHandler, opts));
		},
		patch(path, options, handler) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.patch(path, adaptRoute(realHandler, opts));
		},
		delete(path, options, handler) {
			const realHandler = typeof options === "function" ? options : handler;
			const opts = typeof options === "function" ? {} : options;
			honoApp.delete(path, adaptRoute(realHandler, opts));
		},
		async register(routeFn, config = {}) {
			const prefix = config.prefix || "";
			const subApp = new Hono();
			const subBridge = createHonoBridge(subApp);
			await routeFn(subBridge, config);
			honoApp.route(prefix, subApp);
		},
	};
}

// Initialize routes bridge
const bridge = createHonoBridge(app);

// Load all Fastify route plugins onto the Hono app
const routesIndex = require("./routes");
routesIndex(bridge).catch((e) => {
	console.error("Error loading routes onto Hono bridge:", e);
});

// Export the default handler for Cloudflare Workers
module.exports = app;
