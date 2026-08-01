const controller = require("../controllers/authController");
const auth = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

async function routes (fastify: any, opts: any) {
	const authRateLimit = { preHandler: rateLimit };

	fastify.get("/me", { preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.me(request, reply),
	);
	fastify.post("/register", authRateLimit, async (request: any, reply: any) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", authRateLimit, async (request: any, reply: any) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/verify-code", authRateLimit, async (request: any, reply: any) =>
		controller.verifyEmailCode(request, reply),
	);
	fastify.post("/resend-code", authRateLimit, async (request: any, reply: any) =>
		controller.resendEmailCode(request, reply),
	);
	fastify.post("/forgot-password", authRateLimit, async (request: any, reply: any) =>
		controller.forgotPassword(request, reply),
	);
	fastify.post("/reset-password", authRateLimit, async (request: any, reply: any) =>
		controller.resetPassword(request, reply),
	);
	fastify.post("/login", authRateLimit, async (request: any, reply: any) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", authRateLimit, async (request: any, reply: any) =>
		controller.refresh(request, reply),
	);
	fastify.post("/logout", { preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.logout(request, reply),
	);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
