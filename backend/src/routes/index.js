module.exports = async function (fastify, opts) {
	// Health
	fastify.get("/health", async () => ({ ok: true }));
	fastify.get("/teste", async () => ({ ok: true }));

	// Domain routes
	fastify.register(require("./services"), { prefix: "/services" });
	fastify.register(require("./products"), { prefix: "/products" });
	fastify.register(require("./expenses"), { prefix: "/expenses" });
	fastify.register(require("./appointments"), { prefix: "/agendamentos" });
	fastify.register(require("./profile"), { prefix: "/profile" });
	fastify.register(require("./system"));
	fastify.register(require("./auth"), { prefix: "/auth" });
};
