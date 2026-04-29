process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";
const t = require("tap");
const path = require("path");

t.test("GET /services returns list", async (t) => {
	const repoPath = require.resolve("../src/repositories/servicesRepository");
	// Mock repository
	const mock = {
		findAll: async () => [{ id: "s1", name: "Corte", price: 40 }],
		findById: async () => null,
		create: async (p) => ({ id: "s2", ...p }),
		update: async (id, u) => ({ id, ...u }),
		remove: async () => true,
	};

	require.cache[repoPath] = { exports: mock };

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({ method: "GET", url: "/services" });
	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.ok(Array.isArray(body));

	await app.close();
});

t.test("POST /services creates service", async (t) => {
	const repoPath = require.resolve("../src/repositories/servicesRepository");
	const mock = {
		findAll: async () => [],
		create: async (p) => ({ id: "s3", ...p }),
	};
	require.cache[repoPath] = { exports: mock };

	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/services",
		payload: { name: "Teste", price: 10 },
	});
	t.equal(res.statusCode, 201);
	const body = JSON.parse(res.payload);
	t.equal(body.name, "Teste");

	await app.close();
});
