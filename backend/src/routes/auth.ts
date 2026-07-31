const controller = require("../controllers/authController");
const auth = require("../middleware/auth");

export default async function (fastify: any, opts: any) {
	fastify.get("/me", { preHandler: auth }, async (request: any, reply: any) =>
		controller.me(request, reply),
	);
	fastify.post("/register", async (request: any, reply: any) =>
		controller.register(request, reply),
	);
	fastify.post("/verify-email", async (request: any, reply: any) =>
		controller.verifyEmail(request, reply),
	);
	fastify.post("/verify-code", async (request: any, reply: any) =>
		controller.verifyEmailCode(request, reply),
	);
	fastify.post("/resend-code", async (request: any, reply: any) =>
		controller.resendEmailCode(request, reply),
	);
	fastify.post("/forgot-password", async (request: any, reply: any) =>
		controller.forgotPassword(request, reply),
	);
	fastify.post("/reset-password", async (request: any, reply: any) =>
		controller.resetPassword(request, reply),
	);
	fastify.post("/login", async (request: any, reply: any) =>
		controller.login(request, reply),
	);
	fastify.post("/refresh", async (request: any, reply: any) =>
		controller.refresh(request, reply),
	);
	fastify.post("/logout", { preHandler: auth }, async (request: any, reply: any) =>
		controller.logout(request, reply),
	);
};

export {};

