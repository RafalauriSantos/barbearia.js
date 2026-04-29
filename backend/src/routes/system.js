const controller = require("../controllers/systemController");

module.exports = async function (fastify) {
	fastify.delete("/reset", controller.reset);
};
