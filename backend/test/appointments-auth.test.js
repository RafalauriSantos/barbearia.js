const t = require("tap");

function loadService({ appointmentsRepository, barbersRepository }) {
	const appointmentsPath = require.resolve(
		"../src/repositories/appointmentsRepository",
	);
	const barbersPath = require.resolve("../src/repositories/barbersRepository");
	const servicePath = require.resolve("../src/services/appointmentsService");

	require.cache[appointmentsPath] = { exports: appointmentsRepository };
	require.cache[barbersPath] = { exports: barbersRepository };
	delete require.cache[servicePath];

	return require("../src/services/appointmentsService");
}

const adminUser = {
	id: "user-admin",
	role: "admin",
	barbearia_id: "shop-1",
	barbeiro_id: "barber-admin",
};

const barberUser = {
	id: "user-barber",
	role: "barbeiro",
	barbearia_id: "shop-1",
	barbeiro_id: "barber-1",
};

t.test("admin appointment list respects shop and optional barber filter", async (t) => {
	let capturedFilter;
	const service = loadService({
		appointmentsRepository: {
			findAll: async (filter) => {
				capturedFilter = filter;
				return [];
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
			}),
		},
	});

	await service.listAppointments(
		{ data: "2026-05-17", barbeiro_id: "barber-2" },
		adminUser,
	);

	t.same(capturedFilter, {
		date: "2026-05-17",
		barbeariaId: "shop-1",
		barbeiroId: "barber-2",
	});
});

t.test("barber appointment list ignores requested barber and uses own barber", async (t) => {
	let capturedFilter;
	const service = loadService({
		appointmentsRepository: {
			findAll: async (filter) => {
				capturedFilter = filter;
				return [];
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
	});

	await service.listAppointments(
		{ data: "2026-05-17", barbeiro_id: "barber-2" },
		barberUser,
	);

	t.same(capturedFilter, {
		date: "2026-05-17",
		barbeariaId: "shop-1",
		barbeiroId: "barber-1",
	});
});

t.test("barber create ignores payload barber and uses own barber", async (t) => {
	let capturedPayload;
	let capturedContext;
	const service = loadService({
		appointmentsRepository: {
			create: async (payload, context) => {
				capturedPayload = payload;
				capturedContext = context;
				return { id: "appt-1", ...payload };
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
	});

	await service.createAppointment(
		{ client_name: "Cliente", barbeiro_id: "barber-2" },
		barberUser,
	);

	t.equal(capturedPayload.barbeiro_id, "barber-1");
	t.same(capturedContext, {
		barbeariaId: "shop-1",
		barbeiroId: "barber-1",
	});
});

t.test("barber cannot update another barber appointment", async (t) => {
	const service = loadService({
		appointmentsRepository: {
			findById: async () => ({
				id: "appt-1",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-2",
			}),
			update: async () => {
				throw new Error("update should not run");
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
	});

	await t.rejects(
		service.updateAppointment("appt-1", { value: 50 }, barberUser),
		{ status: 403, code: "APPOINTMENT_FORBIDDEN" },
	);
});
