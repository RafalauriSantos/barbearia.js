process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");

function clearAppCache() {
	for (const modulePath of [
		"../src/index",
		"../src/app",
		"../src/routes/index",
		"../src/routes/products",
		"../src/routes/expenses",
		"../src/routes/appointments",
		"../src/routes/profile",
		"../src/routes/system",
		"../src/controllers/productsController",
		"../src/controllers/expensesController",
		"../src/controllers/appointmentsController",
		"../src/controllers/profileController",
		"../src/controllers/systemController",
		"../src/services/productsService",
		"../src/services/expensesService",
		"../src/services/appointmentsService",
		"../src/services/profileService",
		"../src/services/systemService",
	]) {
		delete require.cache[require.resolve(modulePath)];
	}
}

t.test("core CRUD routes respond through layered modules", async (t) => {
	require.cache[require.resolve("../src/repositories/productsRepository")] = {
		exports: {
			findAll: async () => [{ id: "p1", name: "Pomada", price: 35 }],
			findById: async () => ({ id: "p1", name: "Pomada", price: 35 }),
			create: async (payload) => ({ id: "p2", ...payload }),
			update: async (id, payload) => ({ id, ...payload }),
			remove: async () => true,
		},
	};

	require.cache[require.resolve("../src/repositories/expensesRepository")] = {
		exports: {
			findAll: async ({ date } = {}) => [
				{ id: "e1", name: "Aluguel", value: 100, date: date || "2026-04-29" },
			],
			findById: async () => ({ id: "e1", name: "Aluguel", value: 100 }),
			create: async (payload) => ({ id: "e2", ...payload }),
			update: async (id, payload) => ({ id, ...payload }),
			remove: async () => true,
		},
	};

	require.cache[require.resolve("../src/repositories/appointmentsRepository")] = {
		exports: {
			findAll: async ({ date } = {}) => [
				{
					id: "a1",
					cliente_nome: "Rafael",
					data: date || "2026-04-29",
					hora: "10:00",
				},
			],
			findById: async () => ({ id: "a1", cliente_nome: "Rafael" }),
			create: async (payload) => ({ id: "a2", ...payload }),
			update: async (id, payload) => ({ id, ...payload }),
			remove: async () => true,
		},
	};

	require.cache[require.resolve("../src/repositories/profileRepository")] = {
		exports: {
			get: async () => ({ shopName: "Kurt", barberName: "Rafael" }),
			upsert: async (payload) => ({ id: "singleton", ...payload }),
		},
	};

	require.cache[require.resolve("../src/repositories/systemRepository")] = {
		exports: {
			reset: async () => true,
		},
	};

	clearAppCache();
	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const products = await app.inject({ method: "GET", url: "/products" });
	t.equal(products.statusCode, 200);
	t.equal(JSON.parse(products.payload)[0].name, "Pomada");

	const expenses = await app.inject({
		method: "GET",
		url: "/expenses?date=2026-04-29",
	});
	t.equal(expenses.statusCode, 200);
	t.equal(JSON.parse(expenses.payload)[0].date, "2026-04-29");

	const appointment = await app.inject({
		method: "POST",
		url: "/agendamentos",
		payload: {
			client_name: "Cliente",
			day_key: "2026-04-29",
			time_slot: "11:00",
			value: 40,
		},
	});
	t.equal(appointment.statusCode, 201);
	t.equal(JSON.parse(appointment.payload).client_name, "Cliente");

	const profile = await app.inject({ method: "GET", url: "/profile" });
	t.equal(profile.statusCode, 200);
	t.equal(JSON.parse(profile.payload).shopName, "Kurt");

	const reset = await app.inject({ method: "DELETE", url: "/reset" });
	t.equal(reset.statusCode, 204);

	await app.close();
});
