import fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
const { env } = require("./config/env");
import { AppError } from "./lib/errors";
const supabase = require("./lib/supabase");
const { getSecurityHeaders } = require("./middleware/securityHeaders");

async function registerDocs(app: any) {
	if (env.NODE_ENV === "production") return;

	try {
		const swagger = require("@fastify/swagger");
		const swaggerUi = require("@fastify/swagger-ui");

		await app.register(swagger, {
			openapi: {
				info: { title: "TCC API", version: "1.0.0" },
			},
		});

		await app.register(swaggerUi, {
			routePrefix: "/docs",
			staticCSP: true,
			transformStaticCSP: (header: any) => header,
			exposeRoute: true,
		});
	} catch (err) {
		app.log.info("Swagger plugins not installed; skipping docs setup");
	}
}

function registerErrorHandler(app: any) {
	app.setErrorHandler((err: any, request: any, reply: any) => {
		if (err instanceof AppError) {
			request.log.warn({ err }, "Application error");
			return reply
				.code(err.status)
				.send({ error: err.message, code: err.code });
		}

		if (err instanceof ZodError) {
			return reply.code(400).send({
				error: "Validation error",
				code: "VALIDATION_ERROR",
				issues: err.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			});
		}

		if (err.statusCode >= 400 && err.statusCode < 500) {
			request.log.warn({ err }, "Request error");
			return reply.code(err.statusCode).send({
				error: err.message,
				code: err.code || "BAD_REQUEST",
			});
		}

		request.log.error({ err }, "Unexpected error");
		return reply
			.code(500)
			.send({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
	});
}

export async function buildApp() {
	const app = fastify({
		logger: env.NODE_ENV !== "test",
		bodyLimit: 4 * 1024 * 1024,
	});

	supabase.ensureConfigured();

	let allowedOrigin: any;
	if (env.NODE_ENV !== "production") {
		allowedOrigin = true;
	} else if (!env.CORS_ORIGIN || env.CORS_ORIGIN === "true" || env.CORS_ORIGIN === true) {
		allowedOrigin = "*";
	} else {
		const originsList = String(env.CORS_ORIGIN).split(",").map(o => o.trim()).filter(Boolean);
		allowedOrigin = (origin: string, cb: any) => {
			if (!origin || originsList.includes(origin)) {
				cb(null, true);
			} else {
				cb(new Error("Not allowed by CORS"), false);
			}
		};
	}

	await app.register(require("@fastify/helmet"), {
		contentSecurityPolicy: false,
		crossOriginResourcePolicy: { policy: "cross-origin" },
	});

	await app.register(require("@fastify/rate-limit"), {
		max: 100,
		timeWindow: "1 minute",
		allowList: () => env.NODE_ENV === "test",
	});

	await app.register(cors, {
		origin: allowedOrigin,
	});

	app.addHook("onSend", async (request, reply) => {
		const isProd = env.NODE_ENV === "production";
		const secHeaders = getSecurityHeaders(isProd);
		for (const [key, value] of Object.entries(secHeaders)) {
			reply.header(key, value);
		}
	});

	registerErrorHandler(app);
	await registerDocs(app);
	await app.register(require("./routes"));

	return app;
}

module.exports = { buildApp };
export default module.exports;
