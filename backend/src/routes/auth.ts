const controller = require("../controllers/authController");
const auth = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const rateLimitConfig = {
	config: {
		rateLimit: {
			max: 10,
			timeWindow: "1 minute",
		},
	},
};

async function routes (fastify: any, opts: any) {
	fastify.get("/me", { ...rateLimitConfig, preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.me(request, reply),
	);
	fastify.post("/register", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/verify-code", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.verifyEmailCode(request, reply),
	);
	fastify.post("/resend-code", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.resendEmailCode(request, reply),
	);
	fastify.post("/forgot-password", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.forgotPassword(request, reply),
	);
	fastify.post("/reset-password", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.resetPassword(request, reply),
	);
	fastify.post("/login", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", { ...rateLimitConfig, preHandler: rateLimit }, async (request: any, reply: any) =>
		controller.refresh(request, reply),
	);
	fastify.post("/logout", { ...rateLimitConfig, preHandler: [auth, rateLimit] }, async (request: any, reply: any) =>
		controller.logout(request, reply),
	);
};

export {};

if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
