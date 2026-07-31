const controller = require("../controllers/appointmentsController");
const auth = require("../middleware/auth");

async function routes (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.list);
	fastify.post("/", { preHandler: auth }, controller.create);
	fastify.patch("/:id", { preHandler: auth }, controller.update);
	fastify.put("/:id", { preHandler: auth }, controller.update);
	fastify.delete("/:id", { preHandler: auth }, controller.remove);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
