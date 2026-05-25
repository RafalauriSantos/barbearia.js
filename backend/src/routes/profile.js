const controller = require("../controllers/profileController");
const auth = require("../middleware/auth");

module.exports = async function (fastify) {
	fastify.get("/", { preHandler: auth }, controller.get);
	fastify.put("/", { preHandler: auth }, controller.update);
};
