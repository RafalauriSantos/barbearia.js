const t = require("tap");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

t.test("POST /auth/register creates a user", async (t) => {
	const repoPath = require.resolve("../src/repositories/authRepository");
	let createdWorkspace = false;
	const mock = {
		findByEmail: async (email) => null,
		create: async ({ email, password_hash, create_workspace }) => {
			createdWorkspace = create_workspace;
			return {
				id: "u1",
				email,
				password_hash,
			};
		},
	};
	require.cache[repoPath] = { exports: mock };
	require.cache[
		require.resolve("../src/repositories/emailVerificationRepository")
	] = {
		exports: {
			invalidateForUser: async () => true,
			create: async () => ({ id: "vc1" }),
		},
	};
	require.cache[require.resolve("../src/services/emailService")] = {
		exports: { sendVerificationCodeEmail: async () => true },
	};

	// Clear related module cache so they pick up the mocked repository
	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/register",
		payload: { email: "x@y.com", password: "supersecret" },
	});
	t.equal(res.statusCode, 201);
	const body = JSON.parse(res.payload);
	t.ok(body.user);
	t.equal(body.user.email, "x@y.com");
	t.equal(body.email_verification_required, true);
	t.equal(body.verification_method, "code");
	t.match(body.verificationCode, /^\d{6}$/);
	t.notOk(body.verificationUrl);
	t.equal(createdWorkspace, true);

	await app.close();
});

t.test("GET /auth/me returns current user from token", async (t) => {
	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findById: async (id) => ({
			id,
			nome: "Renan",
			email: "renan@kashflow.com",
			role: "admin",
			barbearia_id: "barbearia-1",
			barbeiro_id: null,
			password_hash: "hidden",
		}),
	};
	require.cache[repoPath] = { exports: mock };

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { env } = require("../src/config/env");
	const { buildApp } = require("../src/index");
	const app = await buildApp();
	const token = jwt.sign({ userId: "u3" }, env.JWT_SECRET);

	const res = await app.inject({
		method: "GET",
		url: "/auth/me",
		headers: { authorization: `Bearer ${token}` },
	});

	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.id, "u3");
	t.equal(body.nome, "Renan");
	t.equal(body.email, "renan@kashflow.com");
	t.equal(body.role, "admin");
	t.equal(body.barbearia_id, "barbearia-1");
	t.equal(body.barbeiro_id, null);
	t.notOk(body.password_hash);

	await app.close();
});

t.test("POST /auth/login returns tokens for valid credentials", async (t) => {
	const password = "mypassword";
	const hash = await argon2.hash(password, { type: argon2.argon2id });

	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findByEmail: async (email) => ({
			id: "u2",
			email,
			password_hash: hash,
			email_verificado_em: new Date().toISOString(),
		}),
	};
	require.cache[repoPath] = { exports: mock };

	// Clear related module cache so they pick up the mocked repository
	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "a@b.com", password },
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.ok(body.accessToken);
	t.ok(body.refreshToken);

	await app.close();
});

t.test("POST /auth/login rejects unverified users", async (t) => {
	const password = "mypassword";
	const hash = await argon2.hash(password, { type: argon2.argon2id });

	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findByEmail: async (email) => ({
			id: "u4",
			email,
			password_hash: hash,
			email_verificado_em: null,
		}),
	};
	require.cache[repoPath] = { exports: mock };

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { email: "unverified@kashflow.com", password },
	});
	t.equal(res.statusCode, 403);
	const body = JSON.parse(res.payload);
	t.equal(body.code, "EMAIL_NOT_VERIFIED");

	await app.close();
});

t.test("POST /auth/verify-code marks user as verified", async (t) => {
	const repoPath = require.resolve("../src/repositories/authRepository");
	const verificationRepoPath = require.resolve(
		"../src/repositories/emailVerificationRepository",
	);
	require.cache[repoPath] = {
		exports: {
			findByEmail: async (email) => ({
				id: "u6",
				nome: "Renan",
				email,
				email_verificado_em: null,
			}),
			markEmailVerified: async (id) => ({
				id,
				nome: "Renan",
				email: "renan@kashflow.com",
				role: "admin",
				barbearia_id: "barbearia-1",
				barbeiro_id: null,
				email_verificado_em: new Date().toISOString(),
			}),
		},
	};
	require.cache[verificationRepoPath] = {
		exports: {
			findValidByUserAndHash: async () => ({ id: "code-1" }),
			markUsed: async () => true,
		},
	};

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/verify-code",
		payload: { email: "renan@kashflow.com", code: "123456" },
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.ok, true);
	t.equal(body.user.id, "u6");
	t.notOk(body.user.password_hash);

	await app.close();
});

t.test("POST /auth/forgot-password sends reset code without exposing users", async (t) => {
	let sentCode = null;
	const repoPath = require.resolve("../src/repositories/authRepository");
	const passwordResetRepoPath = require.resolve(
		"../src/repositories/passwordResetRepository",
	);
	require.cache[repoPath] = {
		exports: {
			findByEmail: async (email) => ({
				id: "u7",
				email,
				email_verificado_em: new Date().toISOString(),
			}),
		},
	};
	require.cache[passwordResetRepoPath] = {
		exports: {
			invalidateForUser: async () => true,
			create: async () => ({ id: "reset-1" }),
		},
	};
	require.cache[require.resolve("../src/services/emailService")] = {
		exports: {
			sendPasswordResetCodeEmail: async ({ code }) => {
				sentCode = code;
				return true;
			},
		},
	};

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/forgot-password",
		payload: { email: "renan@kashflow.com" },
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.ok, true);
	t.match(body.resetCode, /^\d{6}$/);
	t.equal(sentCode, body.resetCode);

	await app.close();
});

t.test("POST /auth/reset-password updates password with valid code", async (t) => {
	let updated = null;
	const repoPath = require.resolve("../src/repositories/authRepository");
	const passwordResetRepoPath = require.resolve(
		"../src/repositories/passwordResetRepository",
	);
	require.cache[repoPath] = {
		exports: {
			findByEmail: async (email) => ({
				id: "u8",
				email,
				email_verificado_em: new Date().toISOString(),
			}),
			updatePassword: async (id, password_hash, options) => {
				updated = { id, password_hash, options };
				return { id };
			},
		},
	};
	require.cache[passwordResetRepoPath] = {
		exports: {
			findValidByUserAndHash: async () => ({ id: "reset-2" }),
			markUsed: async () => true,
		},
	};

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/reset-password",
		payload: {
			email: "renan@kashflow.com",
			code: "123456",
			password: "NewPassword123",
		},
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.ok, true);
	t.equal(updated.id, "u8");
	t.same(updated.options, { markEmailVerified: false });
	t.ok(await argon2.verify(updated.password_hash, "NewPassword123"));

	await app.close();
});

t.test("POST /auth/verify-email marks user as verified", async (t) => {
	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findById: async (id) => ({
			id,
			nome: "Renan",
			email: "renan@kashflow.com",
		}),
		markEmailVerified: async (id) => ({
			id,
			nome: "Renan",
			email: "renan@kashflow.com",
			role: "admin",
			barbearia_id: "barbearia-1",
			barbeiro_id: null,
			email_verificado_em: new Date().toISOString(),
		}),
	};
	require.cache[repoPath] = { exports: mock };

	delete require.cache[require.resolve("../src/services/authService")];
	delete require.cache[require.resolve("../src/controllers/authController")];
	delete require.cache[require.resolve("../src/routes/auth")];
	delete require.cache[require.resolve("../src/index")];

	const { buildApp } = require("../src/index");
	const { env } = require("../src/config/env");
	const app = await buildApp();
	const token = jwt.sign(
		{
			type: "email-verification",
			userId: "u5",
			email: "renan@kashflow.com",
		},
		env.JWT_SECRET,
	);

	const res = await app.inject({
		method: "POST",
		url: "/auth/verify-email",
		payload: { token },
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.ok, true);
	t.equal(body.user.id, "u5");
	t.notOk(body.user.password_hash);

	await app.close();
});
