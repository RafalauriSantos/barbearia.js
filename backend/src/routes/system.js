const controller = require("../controllers/systemController");

module.exports = async function (fastify) {
	fastify.delete("/reset", controller.reset);
	fastify.post("/test-email", controller.sendTestEmail);
};
