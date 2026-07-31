const controller = require("../controllers/invitesController");

async function routes (fastify: any) {
	fastify.get("/:token", controller.get);
	fastify.post("/:token/accept", controller.accept);
};

export {};


module.exports = routes;
export default routes;
