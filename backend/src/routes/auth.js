const controller = require("../controllers/authController");
const auth = require("../middleware/auth");

module.exports = async function (fastify, opts) {
	fastify.get("/me", { preHandler: auth }, async (request, reply) =>
		controller.me(request, reply),
	);
	fastify.post("/register", async (request, reply) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", async (request, reply) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/login", async (request, reply) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", async (request, reply) =>
		controller.refresh(request, reply),
	);
};
