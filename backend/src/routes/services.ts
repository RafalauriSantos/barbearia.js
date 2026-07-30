const controller = require("../controllers/servicesController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

module.exports = async function (fastify: any, opts?: any) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: [auth, requireRole(["admin"])] }, controller.create);
	fastify.put("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.update);
	fastify.delete("/:id", { preHandler: [auth, requireRole(["admin"])] }, controller.remove);
};

export {};

