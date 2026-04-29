const controller = require("../controllers/profileController");

module.exports = async function (fastify) {
	fastify.get("/", controller.get);
	fastify.put("/", controller.update);
};
