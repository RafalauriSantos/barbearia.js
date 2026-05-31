const supabase = require("../lib/supabase");
const { env } = require("../config/env");
const { getDefaultBarbeariaId } = require("../lib/tenant");

module.exports = async function (fastify, opts) {
	// Health
	fastify.get("/health", async () => ({ ok: true }));
	fastify.get("/health/db", async () => {
		const barbeariaId = getDefaultBarbeariaId();
		const { data, error } = await supabase
			.from("barbearias")
			.select("id")
			.eq("id", barbeariaId)
			.maybeSingle();
		if (error) throw error;
		return { ok: true, barbearia_id: barbeariaId, barbearia_found: !!data };
	});

	// Domain routes
	fastify.register(require("./services"), { prefix: "/services" });
	fastify.register(require("./products"), { prefix: "/products" });
	fastify.register(require("./expenses"), { prefix: "/expenses" });
	fastify.register(require("./appointments"), { prefix: "/agendamentos" });
	fastify.register(require("./barbers"), { prefix: "/barbers" });
	fastify.register(require("./financial"), { prefix: "/financial" });
	fastify.register(require("./profile"), { prefix: "/profile" });
	fastify.register(require("./invites"), { prefix: "/invites" });
	if (env.NODE_ENV !== "production") {
		fastify.register(require("./system"));
	}
	fastify.register(require("./auth"), { prefix: "/auth" });
};
