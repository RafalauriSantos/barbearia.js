const controller = require("../controllers/invitesController");

module.exports = async function (fastify) {
	fastify.get("/:token", controller.get);
	fastify.post("/:token/accept", controller.accept);
};
