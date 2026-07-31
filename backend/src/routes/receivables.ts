const controller = require("../controllers/receivablesController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: [auth, requireRole(["admin"])] }, controller.create);
	fastify.put("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.update);
	fastify.post("/:id/receive", { preHandler: [auth, requireRole(["admin"])] }, controller.receive);
	fastify.delete("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.cancel);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
