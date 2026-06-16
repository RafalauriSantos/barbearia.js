const controller = require("../controllers/paymentMethodsController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.patch("/:id", { preHandler: auth }, controller.update);
};
