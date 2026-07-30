const controller = require("../controllers/invitesController");

module.exports = async function (fastify: any) {
	fastify.get("/:token", controller.get);
	fastify.post("/:token/accept", controller.accept);
};

export {};

