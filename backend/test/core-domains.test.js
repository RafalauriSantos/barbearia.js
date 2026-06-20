process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");
const jwt = require("jsonwebtoken");

function clearAppCache() {
	for (const modulePath of [
		"../src/index",
		"../src/app",
		"../src/config/env",
		"../src/routes/index",
		"../src/routes/clients",
		"../src/routes/products",
		"../src/routes/expenses",
		"../src/routes/appointments",
		"../src/routes/barbers",
		"../src/routes/profile",
		"../src/routes/system",
		"../src/controllers/clientsController",
		"../src/controllers/productsController",
		"../src/controllers/expensesController",
		"../src/controllers/appointmentsController",
		"../src/controllers/barbersController",
		"../src/controllers/profileController",
		"../src/controllers/systemController",
		"../src/services/clientsService",
		"../src/services/productsService",
		"../src/services/expensesService",
		"../src/services/appointmentsService",
		"../src/services/barbersService",
		"../src/services/profileService",
		"../src/services/systemService",
		"../src/services/authService",
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

	require.cache[require.resolve("../src/repositories/clientsRepository")] = {
		exports: {
			findFixedClients: async () => [
				{ id: "c1", name: "Cliente fixo", package_total_cuts: 4 },
			],
			findFixedClientById: async () => ({
				id: "c1",
				name: "Cliente fixo",
				package_total_cuts: 4,
			}),
			createFixedClient: async (payload) => ({ id: "c2", ...payload }),
			updateFixedClient: async (id, payload) => ({ id, ...payload }),
			removeFixedClient: async () => true,
			createClientCut: async () => true,
			findClientCutById: async () => ({ id: "cut-1" }),
			updateClientCut: async () => true,
			removeClientCut: async () => true,
			findWaitlist: async () => [{ id: "w1", name: "Aguardando" }],
			findWaitlistEntryById: async () => ({ id: "w1", name: "Aguardando" }),
			createWaitlistEntry: async (payload) => ({ id: "w2", ...payload }),
			updateWaitlistEntry: async (id, payload) => ({ id, ...payload }),
			removeWaitlistEntry: async () => true,
		},
	};

	require.cache[require.resolve("../src/repositories/expensesRepository")] = {
		exports: {
			findAll: async ({ date, startDate } = {}) => [
				{
					id: "e1",
					name: "Aluguel",
					value: 100,
					date: date || startDate || "2026-04-29",
				},
			],
			findById: async () => ({ id: "e1", name: "Aluguel", value: 100 }),
			create: async (payload) => ({ id: "e2", ...payload }),
			update: async (id, payload) => ({ id, ...payload }),
			remove: async () => true,
		},
	};

	require.cache[require.resolve("../src/repositories/appointmentsRepository")] = {
		exports: {
			findConflict: async () => null,
			findAll: async ({ date, barbeariaId, barbeiroId } = {}) => [
				{
					id: "a1",
					cliente_nome: "Rafael",
					data: date || "2026-04-29",
					hora: "10:00",
					barbearia_id: barbeariaId,
					barbeiro_id: barbeiroId,
				},
			],
			findById: async () => ({
				id: "a1",
				cliente_nome: "Rafael",
				barbearia_id: "barbearia-1",
				barbeiro_id: "barber-1",
			}),
			create: async (payload, context) => ({
				id: "a2",
				...payload,
				barbearia_id: context.barbeariaId,
				barbeiro_id: context.barbeiroId,
			}),
			update: async (id, payload) => ({ id, ...payload }),
			remove: async () => true,
		},
	};
	require.cache[require.resolve("../src/repositories/receivablesRepository")] = {
		exports: {
			upsertFromAppointment: async () => null,
			updateByAppointment: async () => null,
		},
	};

	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: {
			findAllByBarbearia: async () => [
				{ id: "barber-1", name: "Renan", nome: "Renan" },
			],
			findByIdInBarbearia: async () => ({
				id: "barber-1",
				name: "Renan",
				nome: "Renan",
				barbearia_id: "barbearia-1",
			}),
		},
	};

	require.cache[require.resolve("../src/repositories/authRepository")] = {
		exports: {
			findById: async (id) => ({
				id,
				nome: "Renan",
				email: "renan@kashflow.com",
				role: "admin",
				barbearia_id: "barbearia-1",
				barbeiro_id: "barber-1",
			}),
		},
	};

	require.cache[require.resolve("../src/repositories/profileRepository")] = {
		exports: {
			get: async () => ({
				shopName: "Gestor Barbearia",
				barberName: "Rafael",
			}),
			upsert: async (payload) => ({ id: "singleton", ...payload }),
		},
	};

	require.cache[require.resolve("../src/repositories/systemRepository")] = {
		exports: {
			reset: async () => true,
		},
	};

	let sentTestEmail;
	require.cache[require.resolve("../src/services/emailService")] = {
		exports: {
			sendCustomEmail: async (payload) => {
				sentTestEmail = payload;
				return { messageId: "test-message" };
			},
		},
	};

	clearAppCache();
	const { env } = require("../src/config/env");
	const { buildApp } = require("../src/index");
	const app = await buildApp();
	const token = jwt.sign({ userId: "user-1" }, env.JWT_SECRET);
	const authHeaders = { authorization: `Bearer ${token}` };

	const products = await app.inject({
		method: "GET",
		url: "/products",
		headers: authHeaders,
	});
	t.equal(products.statusCode, 200);
	t.equal(JSON.parse(products.payload)[0].name, "Pomada");

	const expenses = await app.inject({
		method: "GET",
		url: "/expenses?date=2026-04-29",
		headers: authHeaders,
	});
	t.equal(expenses.statusCode, 200);
	t.equal(JSON.parse(expenses.payload)[0].date, "2026-04-29");

	const expensesPeriod = await app.inject({
		method: "GET",
		url: "/expenses?start_date=2026-04-01&end_date=2026-04-30",
		headers: authHeaders,
	});
	t.equal(expensesPeriod.statusCode, 200);
	t.equal(JSON.parse(expensesPeriod.payload)[0].date, "2026-04-01");

	const fixedClients = await app.inject({
		method: "GET",
		url: "/clients/fixed",
		headers: authHeaders,
	});
	t.equal(fixedClients.statusCode, 200);
	t.equal(JSON.parse(fixedClients.payload)[0].name, "Cliente fixo");

	const createdFixedClient = await app.inject({
		method: "POST",
		url: "/clients/fixed",
		headers: authHeaders,
		payload: {
			name: "Mensalista",
			phone: "(11) 99999-0000",
			interval_days: 15,
			package_total_cuts: 4,
		},
	});
	t.equal(createdFixedClient.statusCode, 201);
	t.equal(JSON.parse(createdFixedClient.payload).name, "Mensalista");

	const createdCut = await app.inject({
		method: "POST",
		url: "/clients/fixed/c1/cuts",
		headers: authHeaders,
		payload: {
			date: "2026-04-29",
			value: 45,
			paid: true,
		},
	});
	t.equal(createdCut.statusCode, 201);
	t.equal(JSON.parse(createdCut.payload).id, "c1");

	const waitlist = await app.inject({
		method: "GET",
		url: "/clients/waitlist",
		headers: authHeaders,
	});
	t.equal(waitlist.statusCode, 200);
	t.equal(JSON.parse(waitlist.payload)[0].name, "Aguardando");

	const appointment = await app.inject({
		method: "POST",
		url: "/agendamentos",
		headers: authHeaders,
		payload: {
			client_name: "Cliente",
			day_key: "2026-04-29",
			time_slot: "11:00",
			value: 40,
			barbeiro_id: "barber-1",
		},
	});
	t.equal(appointment.statusCode, 201);
	t.equal(JSON.parse(appointment.payload).client_name, "Cliente");

	const barbers = await app.inject({
		method: "GET",
		url: "/barbers",
		headers: authHeaders,
	});
	t.equal(barbers.statusCode, 200);
	t.equal(JSON.parse(barbers.payload)[0].name, "Renan");

	const profile = await app.inject({
		method: "GET",
		url: "/profile",
		headers: authHeaders,
	});
	t.equal(profile.statusCode, 200);
	t.equal(JSON.parse(profile.payload).shopName, "Gestor Barbearia");

	const updatedProfile = await app.inject({
		method: "PUT",
		url: "/profile",
		headers: authHeaders,
		payload: {
			shopName: "Gestor Barbearia Prime",
			barberName: "Rafael",
			phone: "(11) 99999-9999",
			address: "Rua Central, 100",
			openingTime: "08:00",
			closingTime: "19:00",
			appointmentDuration: 45,
			scheduleInterval: 15,
		},
	});
	t.equal(updatedProfile.statusCode, 200);
	t.equal(JSON.parse(updatedProfile.payload).appointmentDuration, 45);

	const reset = await app.inject({ method: "DELETE", url: "/reset" });
	t.equal(reset.statusCode, 204);

	const missingRecipient = await app.inject({
		method: "POST",
		url: "/test-email",
		payload: {},
	});
	t.equal(missingRecipient.statusCode, 400);
	t.equal(JSON.parse(missingRecipient.payload).code, "EMAIL_TO_REQUIRED");

	const testEmail = await app.inject({
		method: "POST",
		url: "/test-email",
		payload: {
			to: "rafael@example.com",
			subject: "Teste Brevo",
			text: "Mensagem de teste",
		},
	});
	t.equal(testEmail.statusCode, 200);
	t.equal(JSON.parse(testEmail.payload).ok, true);
	t.same(sentTestEmail, {
		to: "rafael@example.com",
		subject: "Teste Brevo",
		text: "Mensagem de teste",
	});

	await app.close();
});

t.test("system routes are not available in production", async (t) => {
	const previousNodeEnv = process.env.NODE_ENV;
	const previousJwtSecret = process.env.JWT_SECRET;

	process.env.NODE_ENV = "production";
	process.env.JWT_SECRET = "production-test-secret-with-at-least-32-chars";

	t.teardown(() => {
		if (previousNodeEnv === undefined) {
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = previousNodeEnv;
		}

		if (previousJwtSecret === undefined) {
			delete process.env.JWT_SECRET;
		} else {
			process.env.JWT_SECRET = previousJwtSecret;
		}

		clearAppCache();
	});

	clearAppCache();
	const { buildApp } = require("../src/index");
	const app = await buildApp();

	const reset = await app.inject({ method: "DELETE", url: "/reset" });
	t.equal(reset.statusCode, 404);

	const testEmail = await app.inject({ method: "POST", url: "/test-email" });
	t.equal(testEmail.statusCode, 404);

	await app.close();
});
