const controller = require("../controllers/invitesController");

async function routes (fastify: any) {
	fastify.get("/:token", controller.get);
	fastify.post("/:token/accept", controller.accept);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
