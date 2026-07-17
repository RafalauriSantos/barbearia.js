const controller = require("../controllers/supplierPayablesController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/role");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: [auth, requireRole(["admin"])] }, controller.list);
	fastify.post("/", { preHandler: [auth, requireRole(["admin"])] }, controller.createPurchase);
	fastify.post("/:id/pay", { preHandler: [auth, requireRole(["admin"])] }, controller.pay);
};

