const controller = require("../controllers/supplierPayablesController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.createPurchase);
	fastify.post("/:id/pay", { preHandler: auth }, controller.pay);
};

