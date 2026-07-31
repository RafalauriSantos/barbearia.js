const controller = require("../controllers/supplierPayablesController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: [auth, requireRole(["admin"])] }, controller.list);
	fastify.post("/", { preHandler: [auth, requireRole(["admin"])] }, controller.createPurchase);
	fastify.post("/:id/pay", { preHandler: [auth, requireRole(["admin"])] }, controller.pay);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
