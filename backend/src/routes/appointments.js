const controller = require("../controllers/appointmentsController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.patch("/:id", { preHandler: auth }, controller.update);
	fastify.put("/:id", { preHandler: auth }, controller.update);
	fastify.delete("/:id", { preHandler: auth }, controller.remove);
};
