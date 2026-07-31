const controller = require("../controllers/financialController");
const auth = require("../middleware/auth");

async function routes (fastify: any) {
	fastify.get("/summary", { preHandler: auth }, controller.summary);
};

export {};


module.exports = routes;
export default routes;
