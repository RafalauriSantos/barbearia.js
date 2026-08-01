const controller = require("../controllers/authController");
const auth = require("../middleware/auth");

let rateLimit: any = null;
try {
	rateLimit = require("../middleware/rateLimit");
} catch {
	rateLimit = null;
}

async function routes (fastify: any, opts: any) {
	const rateLimitedOpts = rateLimit ? { preHandler: [rateLimit] } : {};

	fastify.get("/me", { preHandler: auth }, async (request: any, reply: any) =>
		controller.me(request, reply),
	);
	fastify.post("/register", rateLimitedOpts, async (request: any, reply: any) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", rateLimitedOpts, async (request: any, reply: any) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/verify-code", rateLimitedOpts, async (request: any, reply: any) =>
		controller.verifyEmailCode(request, reply),
	);
	fastify.post("/resend-code", rateLimitedOpts, async (request: any, reply: any) =>
		controller.resendEmailCode(request, reply),
	);
	fastify.post("/forgot-password", rateLimitedOpts, async (request: any, reply: any) =>
		controller.forgotPassword(request, reply),
	);
	fastify.post("/reset-password", rateLimitedOpts, async (request: any, reply: any) =>
		controller.resetPassword(request, reply),
	);
	fastify.post("/login", rateLimitedOpts, async (request: any, reply: any) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", rateLimitedOpts, async (request: any, reply: any) =>
		controller.refresh(request, reply),
	);
	fastify.post("/logout", { preHandler: auth }, async (request: any, reply: any) =>
		controller.logout(request, reply),
	);
};

export {};


if (typeof module !== "undefined" && module.exports) { module.exports = routes; }
export default routes;
