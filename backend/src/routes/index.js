const supabase = require("../lib/supabase");
const { env } = require("../config/env");

module.exports = async function (fastify, opts) {
	// Health
	fastify.get("/health", async () => ({ ok: true }));
	fastify.get("/health/db", async () => {
		const { error } = await supabase
			.from("barbearias")
			.select("id")
			.limit(1);
		if (error) throw error;
		return { ok: true, database: true };
	});

	// Domain routes
	fastify.register(require("./services"), { prefix: "/services" });
	fastify.register(require("./products"), { prefix: "/products" });
	fastify.register(require("./clients"), { prefix: "/clients" });
	fastify.register(require("./expenses"), { prefix: "/expenses" });
	fastify.register(require("./appointments"), { prefix: "/agendamentos" });
	fastify.register(require("./barbers"), { prefix: "/barbers" });
	fastify.register(require("./financial"), { prefix: "/financial" });
	fastify.register(require("./receivables"), { prefix: "/receivables" });
	fastify.register(require("./supplierPayables"), { prefix: "/supplier-payables" });
	fastify.register(require("./paymentMethods"), { prefix: "/payment-methods" });
	fastify.register(require("./profile"), { prefix: "/profile" });
	fastify.register(require("./invites"), { prefix: "/invites" });
	if (env.NODE_ENV !== "production") {
		fastify.register(require("./system"));
	}
	fastify.register(require("./auth"), { prefix: "/auth" });
};
