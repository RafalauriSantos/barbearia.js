const t = require("tap");
const argon2 = require("argon2");
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
		url: "/auth/register",
		payload: { email: "x@y.com", password: "supersecret" },
	});
	t.equal(res.statusCode, 201);
	const body = JSON.parse(res.payload);
	t.ok(body.user);
	t.equal(body.user.email, "x@y.com");

	await app.close();
});

t.test("POST /auth/login returns tokens for valid credentials", async (t) => {
	const password = "mypassword";
	const hash = await argon2.hash(password, { type: argon2.argon2id });

	const repoPath = require.resolve("../src/repositories/authRepository");
	const mock = {
		findByEmail: async (email) => ({ id: "u2", email, password_hash: hash }),
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
