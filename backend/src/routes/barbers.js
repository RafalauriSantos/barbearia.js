const controller = require("../controllers/barbersController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.patch("/:id", { preHandler: auth }, controller.update);
	fastify.post("/:id/invite", { preHandler: auth }, controller.invite);
};
