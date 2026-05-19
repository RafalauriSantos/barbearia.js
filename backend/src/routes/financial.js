const controller = require("../controllers/financialController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/summary", { preHandler: auth }, controller.summary);
};
