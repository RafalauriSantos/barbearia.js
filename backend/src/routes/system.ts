const controller = require("../controllers/systemController");
const { env } = require("../config/env");

const authDebug = async (request: any, reply: any) => {
	if (env.NODE_ENV === "production") {
		return reply.code(404).send({ error: "Not found" });
	}

	const debugKey = request.headers["x-admin-debug-key"];
	const expectedKey = env.ADMIN_DEBUG_KEY;
	if (!expectedKey || debugKey !== expectedKey) {
		return reply.code(401).send({ error: "Unauthorized debug access" });
	}
};

async function routes (fastify: any) {
	fastify.delete("/reset", { preHandler: authDebug }, controller.reset);
	fastify.post("/test-email", { preHandler: authDebug }, controller.sendTestEmail);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
