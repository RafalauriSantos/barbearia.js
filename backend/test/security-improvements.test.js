const t = require("tap");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const jwtSecret = "development-only-secret-change-before-production";

t.test("Security Improvements Suite", async (t) => {
	t.test("Role middleware blocks non-admins", async (t) => {
		const repoPath = require.resolve("../src/repositories/authRepository");
		require.cache[repoPath] = {
			exports: {
				findById: async () => ({
					id: "barber-1",
					role: "barber",
					barbearia_id: "shop-1",
					token_version: 1,
				}),
			},
		};

		delete require.cache[require.resolve("../src/services/authService")];
		delete require.cache[require.resolve("../src/middleware/auth")];
		delete require.cache[require.resolve("../src/routes/services")];
		delete require.cache[require.resolve("../src/routes/products")];
		delete require.cache[require.resolve("../src/routes/expenses")];
		delete require.cache[require.resolve("../src/routes/receivables")];

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		const token = jwt.sign({ userId: "barber-1", tokenVersion: 1 }, jwtSecret);

		const routesToTest = [
			{ method: "POST", url: "/services" },
			{ method: "PUT", url: "/services/1" },
			{ method: "DELETE", url: "/services/1" },
			{ method: "POST", url: "/products" },
			{ method: "PUT", url: "/products/1" },
			{ method: "DELETE", url: "/products/1" },
			{ method: "POST", url: "/expenses" },
			{ method: "PUT", url: "/expenses/1" },
			{ method: "DELETE", url: "/expenses/1" },
			{ method: "POST", url: "/receivables" },
			{ method: "PUT", url: "/receivables/1" },
			{ method: "POST", url: "/receivables/1/receive" },
			{ method: "DELETE", url: "/receivables/1" },
		];

		for (const route of routesToTest) {
			const res = await app.inject({
				method: route.method,
				url: route.url,
				headers: { Authorization: `Bearer ${token}` },
				payload: route.method !== "DELETE" ? { name: "Test", price: 50 } : undefined,
			});
			t.equal(res.statusCode, 403, `Expected 403 for ${route.method} ${route.url}`);
			const body = JSON.parse(res.payload);
			t.equal(body.error, "Forbidden: insufficient permissions");
		}
		await app.close();
	});

	t.test("Token version verification blocks invalid sessions", async (t) => {
		const repoPath = require.resolve("../src/repositories/authRepository");
		require.cache[repoPath] = {
			exports: {
				findById: async () => ({
					id: "user-1",
					role: "admin",
					token_version: 2, // User version is 2
				}),
			},
		};

		delete require.cache[require.resolve("../src/services/authService")];
		delete require.cache[require.resolve("../src/middleware/auth")];
		delete require.cache[require.resolve("../src/routes/services")];

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		// Token has version 1
		const token = jwt.sign({ userId: "user-1", tokenVersion: 1 }, jwtSecret);

		const res = await app.inject({
			method: "GET",
			url: "/services",
			headers: { Authorization: `Bearer ${token}` },
		});

		t.equal(res.statusCode, 401);
		await app.close();
	});

	t.test("OTP code limit blocks code after 5 failed attempts", async (t) => {
		let attempts = 0;
		const verificationRepoPath = require.resolve("../src/repositories/emailVerificationRepository");
		const authRepoPath = require.resolve("../src/repositories/authRepository");

		require.cache[authRepoPath] = {
			exports: {
				findByEmail: async () => ({ id: "u1", email_verificado_em: null }),
			},
		};

		require.cache[verificationRepoPath] = {
			exports: {
				findActiveForUser: async () => {
					return { id: "code-1", code_hash: "different-hash", attempts_count: attempts };
				},
				incrementAttempts: async () => {
					attempts += 1;
					return attempts;
				},
				markUsed: async () => {},
			},
		};

		delete require.cache[require.resolve("../src/services/authService")];
		const authService = require("../src/services/authService");

		// Attempt 1 to 5
		for (let i = 0; i < 4; i++) {
			await t.rejects(
				authService.verifyEmailCode({ email: "test@example.com", code: "000000" }),
				{ code: "INVALID_VERIFICATION_CODE" }
			);
		}

		t.equal(attempts, 4);

		// 5th attempt: should mark used
		await t.rejects(
			authService.verifyEmailCode({ email: "test@example.com", code: "000000" }),
			{ code: "INVALID_VERIFICATION_CODE" }
		);

		t.equal(attempts, 5);
	});

	t.test("Paid appointment financial edit blocked (HTTP 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN)", async (t) => {
		const authRepoPath = require.resolve("../src/repositories/authRepository");
		const appointmentsRepoPath = require.resolve("../src/repositories/appointmentsRepository");

		require.cache[authRepoPath] = {
			exports: {
				findById: async () => ({
					id: "admin-1",
					role: "admin",
					barbearia_id: "shop-1",
					token_version: 1,
				}),
			},
		};

		require.cache[appointmentsRepoPath] = {
			exports: {
				findById: async () => ({
					id: "apt-1",
					barbearia_id: "shop-1",
					status: "paid",
					value: 50,
					payment_method_id: "method-1",
				}),
				update: async (_id, payload) => ({ id: "apt-1", ...payload }),
			},
		};

		const paymentMethodsRepoPath = require.resolve("../src/repositories/paymentMethodsRepository");
		require.cache[paymentMethodsRepoPath] = {
			exports: {
				findById: async () => ({ id: "method-1", active: true, fee_percent: 0 }),
			},
		};

		delete require.cache[require.resolve("../src/services/authService")];
		delete require.cache[require.resolve("../src/middleware/auth")];
		delete require.cache[require.resolve("../src/services/appointmentsService")];
		delete require.cache[require.resolve("../src/controllers/appointmentsController")];
		delete require.cache[require.resolve("../src/routes/appointments")];
		delete require.cache[require.resolve("../src/routes")];
		delete require.cache[require.resolve("../src/app")];

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		const token = jwt.sign({ userId: "admin-1", tokenVersion: 1 }, jwtSecret);

		const res = await app.inject({
			method: "PUT",
			url: "/agendamentos/apt-1",
			headers: { Authorization: `Bearer ${token}` },
			payload: { value: 100, status: "paid" },
		});

		t.equal(res.statusCode, 400, "Should block updating value of paid appointment");
		const body = JSON.parse(res.payload);
		t.equal(body.code, "APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN");

		await app.close();

		// Cleanup mocks to avoid leaking
		delete require.cache[authRepoPath];
		delete require.cache[appointmentsRepoPath];
		delete require.cache[require.resolve("../src/services/authService")];
		delete require.cache[require.resolve("../src/middleware/auth")];
		delete require.cache[require.resolve("../src/services/appointmentsService")];
		delete require.cache[require.resolve("../src/controllers/appointmentsController")];
		delete require.cache[require.resolve("../src/routes/appointments")];
		delete require.cache[require.resolve("../src/routes")];
		delete require.cache[require.resolve("../src/app")];
	});
});
