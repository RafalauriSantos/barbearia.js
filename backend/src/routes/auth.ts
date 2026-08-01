const controller = require("../controllers/authController");
const auth = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

async function routes (fastify: any, opts: any) {
	fastify.get("/me", { preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.me(request, reply),
	);
	fastify.post("/register", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/verify-code", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.verifyEmailCode(request, reply),
	);
	fastify.post("/resend-code", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.resendEmailCode(request, reply),
	);
	fastify.post("/forgot-password", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.forgotPassword(request, reply),
	);
	fastify.post("/reset-password", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.resetPassword(request, reply),
	);
	fastify.post("/login", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", { preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.refresh(request, reply),
	);
	fastify.post("/logout", { preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.logout(request, reply),
	);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
