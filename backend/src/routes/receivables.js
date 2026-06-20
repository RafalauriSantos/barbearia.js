const controller = require("../controllers/receivablesController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.put("/:id", { preHandler: auth }, controller.update);
	fastify.post("/:id/receive", { preHandler: auth }, controller.receive);
	fastify.delete("/:id", { preHandler: auth }, controller.cancel);
};
