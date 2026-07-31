const controller = require("../controllers/invitesController");

export default async function (fastify: any) {
	fastify.get("/:token", controller.get);
	fastify.post("/:token/accept", controller.accept);
};

export {};

