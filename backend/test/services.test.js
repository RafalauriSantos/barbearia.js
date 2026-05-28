process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";
const t = require("tap");
const jwt = require("jsonwebtoken");

function clearAppCache() {
	for (const modulePath of [
		"../src/index",
		"../src/app",
		"../src/routes/index",
		"../src/routes/services",
		"../src/controllers/servicesController",
		"../src/services/servicesService",
		"../src/services/authService",
	]) {
		delete require.cache[require.resolve(modulePath)];
	}
}

function mockAuthRepository() {
	require.cache[require.resolve("../src/repositories/authRepository")] = {
		exports: {
			findById: async (id) => ({
				id,
				email: "user@example.com",
				role: "admin",
				barbearia_id: "barbearia-1",
				barbeiro_id: "barber-1",
			}),
		},
	};
}

function authHeaders() {
	const { env } = require("../src/config/env");
	const token = jwt.sign({ userId: "user-1" }, env.JWT_SECRET);
	return { authorization: `Bearer ${token}` };
}

t.test("GET /services returns list", async (t) => {
	const repoPath = require.resolve("../src/repositories/servicesRepository");
	mockAuthRepository();
	// Mock repository
	const mock = {
		findAll: async ({ barbeariaId }) => [
			{ id: "s1", name: "Corte", price: 40, barbearia_id: barbeariaId },
		],
		findById: async () => null,
		create: async (p) => ({ id: "s2", ...p }),
		update: async (id, u) => ({ id, ...u }),
		remove: async () => true,
	};

	require.cache[repoPath] = { exports: mock };

	clearAppCache();
	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/services",
		headers: authHeaders(),
	});
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.ok(Array.isArray(body));
	t.equal(body[0].barbearia_id, "barbearia-1");

	await app.close();
});

t.test("POST /services creates service", async (t) => {
	const repoPath = require.resolve("../src/repositories/servicesRepository");
	mockAuthRepository();
	const mock = {
		findAll: async () => [],
		create: async (p, { barbeariaId }) => ({
			id: "s3",
			...p,
			barbearia_id: barbeariaId,
		}),
	};
	require.cache[repoPath] = { exports: mock };

	clearAppCache();
	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/services",
		headers: authHeaders(),
		payload: { name: "Teste", price: 10 },
	});
	t.equal(res.statusCode, 201);
	const body = JSON.parse(res.payload);
	t.equal(body.name, "Teste");
	t.equal(body.barbearia_id, "barbearia-1");

	await app.close();
});
