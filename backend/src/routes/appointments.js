const controller = require("../controllers/appointmentsController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.put("/:id", controller.update);
	fastify.delete("/:id", controller.remove);
};
