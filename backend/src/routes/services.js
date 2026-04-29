const controller = require("../controllers/servicesController");

module.exports = async function (fastify, opts) {
	fastify.get("/", async (request, reply) => controller.list(request, reply));
	fastify.post("/", async (request, reply) =>
		controller.create(request, reply),
	);
	fastify.put("/:id", async (request, reply) =>
		controller.update(request, reply),
	);
	fastify.delete("/:id", async (request, reply) =>
		controller.remove(request, reply),
	);
};
