const controller = require("../controllers/authController");

module.exports = async function (fastify, opts) {
	fastify.post("/register", async (request, reply) =>
		controller.register(request, reply),
	);
	fastify.post("/login", async (request, reply) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", async (request, reply) =>
		controller.refresh(request, reply),
	);
};
