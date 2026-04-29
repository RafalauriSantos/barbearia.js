const fastify = require("fastify");
const cors = require("@fastify/cors");
const { ZodError } = require("zod");
const { env } = require("./config/env");
const { AppError } = require("./lib/errors");

async function registerDocs(app) {
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
			transformStaticCSP: (header) => header,
			exposeRoute: true,
		});
	} catch (err) {
		app.log.info("Swagger plugins not installed; skipping docs setup");
	}
}

function registerErrorHandler(app) {
	app.setErrorHandler((err, request, reply) => {
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

		request.log.error({ err }, "Unexpected error");
		return reply
			.code(500)
			.send({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
	});
}

async function buildApp() {
	const app = fastify({
		logger: env.NODE_ENV !== "test",
	});

	await app.register(cors, {
		origin: env.CORS_ORIGIN,
	});

	registerErrorHandler(app);
	await registerDocs(app);
	await app.register(require("./routes"));

	return app;
}

module.exports = { buildApp };
