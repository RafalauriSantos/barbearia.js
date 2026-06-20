process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");

const adminUser = {
	id: "00000000-0000-4000-8000-000000000001",
	role: "admin",
	barbearia_id: "00000000-0000-4000-8000-000000000010",
	barbeiro_id: "00000000-0000-4000-8000-000000000020",
};

const barberUser = {
	id: "00000000-0000-4000-8000-000000000002",
	role: "barbeiro",
	barbearia_id: adminUser.barbearia_id,
	barbeiro_id: "00000000-0000-4000-8000-000000000021",
};

function mockModule(path, exports) {
	require.cache[require.resolve(path)] = { exports };
}

function loadClientsService({ clientsRepository, barbersRepository }) {
	mockModule("../src/repositories/clientsRepository", clientsRepository);
	mockModule("../src/repositories/barbersRepository", barbersRepository);
	delete require.cache[require.resolve("../src/services/clientsService")];
	return require("../src/services/clientsService");
}

function loadReceivablesService({
	receivablesRepository,
	barbersRepository = {},
	paymentMethodsRepository = {},
	clientsRepository = {},
	appointmentsService = {},
}) {
	mockModule("../src/repositories/receivablesRepository", receivablesRepository);
	mockModule("../src/repositories/barbersRepository", barbersRepository);
	mockModule("../src/repositories/paymentMethodsRepository", paymentMethodsRepository);
	mockModule("../src/repositories/clientsRepository", clientsRepository);
	mockModule("../src/services/appointmentsService", appointmentsService);
	delete require.cache[require.resolve("../src/services/receivablesService")];
	return require("../src/services/receivablesService");
}

t.test("barber only lists clients assigned to their own profile", async (t) => {
	let capturedContext;
	const service = loadClientsService({
		clientsRepository: {
			findFixedClients: async (context) => {
				capturedContext = context;
				return [];
			},
		},
		barbersRepository: {},
	});

	await service.listFixedClients(barberUser, {
		barbeiro_id: adminUser.barbeiro_id,
	});

	t.same(capturedContext, {
		barbeariaId: barberUser.barbearia_id,
		barbeiroId: barberUser.barbeiro_id,
	});
});

t.test("admin can list all clients or filter one barber", async (t) => {
	const contexts = [];
	const service = loadClientsService({
		clientsRepository: {
			findFixedClients: async (context) => {
				contexts.push(context);
				return [];
			},
		},
		barbersRepository: {},
	});

	await service.listFixedClients(adminUser);
	await service.listFixedClients(adminUser, {
		barbeiro_id: barberUser.barbeiro_id,
	});

	t.same(contexts, [
		{ barbeariaId: adminUser.barbearia_id, barbeiroId: null },
		{
			barbeariaId: adminUser.barbearia_id,
			barbeiroId: barberUser.barbeiro_id,
		},
	]);
});

t.test("manual debt payment stores fee snapshot and becomes cash only once", async (t) => {
	const openDebt = {
		id: "debt-1",
		status: "aberto",
		agendamento_id: null,
		value: 100,
	};
	const paidDebt = {
		...openDebt,
		status: "pago",
		payment_date: "2026-06-20",
	};
	let currentDebt = openDebt;
	let updatePayload;
	let paymentLookupCount = 0;
	const service = loadReceivablesService({
		receivablesRepository: {
			findById: async () => currentDebt,
			update: async (_id, payload) => {
				updatePayload = payload;
				currentDebt = { ...paidDebt, ...payload };
				return currentDebt;
			},
		},
		paymentMethodsRepository: {
			findById: async () => {
				paymentLookupCount += 1;
				return { id: "pay-card", code: "cartao_credito", active: true, fee_percent: 2.5 };
			},
		},
	});

	const first = await service.receive(
		"debt-1",
		{ payment_method_id: "pay-card", payment_date: "2026-06-20" },
		adminUser,
	);
	const second = await service.receive(
		"debt-1",
		{ payment_method_id: "pay-card", payment_date: "2026-06-20" },
		adminUser,
	);

	t.same(updatePayload, {
		status: "pago",
		payment_method_id: "pay-card",
		payment_fee_percent: 2.5,
		payment_fee_value: 2.5,
		net_value: 97.5,
		payment_date: "2026-06-20",
	});
	t.equal(first.status, "pago");
	t.equal(second.status, "pago");
	t.equal(paymentLookupCount, 1);
});

t.test("appointment debt is paid through the appointment and keeps one source of truth", async (t) => {
	const debt = {
		id: "debt-appointment",
		status: "aberto",
		agendamento_id: "appointment-1",
		value: 75,
	};
	let appointmentUpdate;
	let findCount = 0;
	const service = loadReceivablesService({
		receivablesRepository: {
			findById: async () => {
				findCount += 1;
				return findCount === 1 ? debt : { ...debt, status: "pago" };
			},
		},
		paymentMethodsRepository: {
			findById: async () => ({
				id: "pay-pix",
				code: "pix",
				active: true,
				fee_percent: 0,
			}),
		},
		appointmentsService: {
			updateAppointment: async (id, payload, user) => {
				appointmentUpdate = { id, payload, user };
			},
		},
	});

	const result = await service.receive(
		debt.id,
		{ payment_method_id: "pay-pix", payment_date: "2026-06-20" },
		adminUser,
	);

	t.same(appointmentUpdate, {
		id: "appointment-1",
		payload: {
			status: "paid",
			payment_method_id: "pay-pix",
			payment_date: "2026-06-20",
		},
		user: adminUser,
	});
	t.equal(result.status, "pago");

	findCount = 0;
	await t.rejects(
		service.update(debt.id, { value: 80 }, adminUser),
		{ status: 409, code: "APPOINTMENT_RECEIVABLE" },
	);
});
