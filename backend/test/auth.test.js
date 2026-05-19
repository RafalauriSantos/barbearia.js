const t = require("tap");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

t.test("POST /auth/register creates a user", async (t) => {
	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findByEmail: async (email) => null,
		create: async ({ email, password_hash }) => ({
			id: "u1",
			email,
			password_hash,
		}),
		createVerificationToken: async () => ({ id: "vt1" }),
	};
	require.cache[repoPath] = { exports: mock };
	require.cache[require.resolve("../src/services/emailService")] = {
		exports: { sendVerificationEmail: async () => true },
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
	t.match(body.verificationUrl, /\/verify-email\?token=/);

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
