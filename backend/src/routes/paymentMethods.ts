const controller = require("../controllers/paymentMethodsController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.patch("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.update);
};

export {};


module.exports = routes;
export default routes;
