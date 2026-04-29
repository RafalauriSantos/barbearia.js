const controller = require("../controllers/expensesController");

module.exports = async function (fastify) {
	fastify.get("/", controller.list);
	fastify.post("/", controller.create);
	fastify.put("/:id", controller.update);
	fastify.delete("/:id", controller.remove);
};
