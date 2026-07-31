const controller = require("../controllers/profileController");
const auth = require("../middleware/auth");

export default async function (fastify: any) {
	fastify.get("/", { preHandler: auth }, controller.get);
	fastify.put("/", { preHandler: auth }, controller.update);
};

export {};

