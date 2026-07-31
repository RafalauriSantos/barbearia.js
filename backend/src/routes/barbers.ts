const controller = require("../controllers/barbersController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: [auth, requireRole(["admin"])] }, controller.create);
	fastify.patch("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.update);
	fastify.post("/:id/invite", { preHandler: [auth, requireRole(["admin"])] }, controller.invite);
	fastify.delete("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.destroy);
};

export {};


module.exports = routes;
export default routes;
