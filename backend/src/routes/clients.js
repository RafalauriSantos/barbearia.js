const controller = require("../controllers/clientsController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/fixed", { preHandler: auth }, controller.listFixed);
	fastify.post("/fixed", { preHandler: auth }, controller.createFixed);
	fastify.put("/fixed/:id", { preHandler: auth }, controller.updateFixed);
	fastify.delete("/fixed/:id", { preHandler: auth }, controller.removeFixed);

	fastify.post("/fixed/:id/cuts", { preHandler: auth }, controller.createCut);
	fastify.put(
		"/fixed/:id/cuts/:cutId",
		{ preHandler: auth },
		controller.updateCut,
	);
	fastify.delete(
		"/fixed/:id/cuts/:cutId",
		{ preHandler: auth },
		controller.removeCut,
	);

	fastify.get("/waitlist", { preHandler: auth }, controller.listWaitlist);
	fastify.post("/waitlist", { preHandler: auth }, controller.createWaitlist);
	fastify.put("/waitlist/:id", { preHandler: auth }, controller.updateWaitlist);
	fastify.delete(
		"/waitlist/:id",
		{ preHandler: auth },
		controller.removeWaitlist,
	);
};
