const controller = require("../controllers/financialController");
const auth = require("../middleware/auth");

export default async function (fastify: any) {
	fastify.get("/summary", { preHandler: auth }, controller.summary);
};

export {};

