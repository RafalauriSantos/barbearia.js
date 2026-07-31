const controller = require("../controllers/profileController");
const auth = require("../middleware/auth");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.get);
	fastify.put("/", { preHandler: auth }, controller.update);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
