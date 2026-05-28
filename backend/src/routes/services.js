const controller = require("../controllers/servicesController");
const auth = require("../middleware/auth");

module.exports = async function (fastify, opts) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.put("/:id", { preHandler: auth }, controller.update);
	fastify.delete("/:id", { preHandler: auth }, controller.remove);
};
