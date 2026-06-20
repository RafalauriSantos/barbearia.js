const t = require("tap");

function loadService({
	appointmentsRepository,
	barbersRepository,
	paymentMethodsRepository = { findById: async () => null },
	clientsRepository = { findFixedClientById: async () => null },
	receivablesRepository = {
		upsertFromAppointment: async () => null,
		updateByAppointment: async () => null,
	},
	supplierPayablesRepository = {
		syncFromAppointment: async () => null,
	},
}) {
	const appointmentsPath = require.resolve(
		"../src/repositories/appointmentsRepository",
	);
	const barbersPath = require.resolve("../src/repositories/barbersRepository");
	const paymentMethodsPath = require.resolve(
		"../src/repositories/paymentMethodsRepository",
	);
	const servicePath = require.resolve("../src/services/appointmentsService");
	const clientsPath = require.resolve("../src/repositories/clientsRepository");
	const receivablesPath = require.resolve(
		"../src/repositories/receivablesRepository",
	);
	const supplierPayablesPath = require.resolve(
		"../src/repositories/supplierPayablesRepository",
	);

	require.cache[appointmentsPath] = {
		exports: { findConflict: async () => null, ...appointmentsRepository },
	};
	require.cache[barbersPath] = { exports: barbersRepository };
	require.cache[paymentMethodsPath] = { exports: paymentMethodsRepository };
	require.cache[clientsPath] = { exports: clientsRepository };
	require.cache[receivablesPath] = { exports: receivablesRepository };
	require.cache[supplierPayablesPath] = { exports: supplierPayablesRepository };
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

t.test("fiado appointment creates one linked receivable", async (t) => {
	let capturedReceivable;
	const appointment = {
		id: "appt-fiado-1",
		barbearia_id: "shop-1",
		barbeiro_id: "barber-1",
		client_name: "Cliente Fiado",
		status: "fiado",
		value: 90,
		day_key: "2026-06-20",
		time_slot: "14:00",
	};
	const service = loadService({
		appointmentsRepository: {
			create: async () => appointment,
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
		receivablesRepository: {
			upsertFromAppointment: async (row, context) => {
				capturedReceivable = { row, context };
			},
			updateByAppointment: async () => null,
		},
	});

	const result = await service.createAppointment(
		{
			client_name: "Cliente Fiado",
			status: "fiado",
			data: "2026-06-20",
			hora: "14:00",
			value: 90,
		},
		barberUser,
	);

	t.equal(result.id, appointment.id);
	t.same(capturedReceivable, {
		row: appointment,
		context: { userId: barberUser.id },
	});
});

t.test("appointment creation rejects an occupied barber time", async (t) => {
	const service = loadService({
		appointmentsRepository: {
			findConflict: async () => ({ id: "existing-appointment" }),
			create: async () => {
				throw new Error("create should not run");
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
	});

	await t.rejects(
		service.createAppointment(
			{
				client_name: "Cliente",
				data: "2026-06-20",
				hora: "14:00",
			},
			barberUser,
		),
		{ status: 409, code: "APPOINTMENT_CONFLICT" },
	);
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

t.test("paid appointment stores payment fee snapshot from method", async (t) => {
	let capturedPayload;
	const service = loadService({
		appointmentsRepository: {
			findById: async () => ({
				id: "appt-1",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-1",
				value: 100,
				status: "normal",
			}),
			update: async (_id, payload) => {
				capturedPayload = payload;
				return { id: "appt-1", ...payload };
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
		paymentMethodsRepository: {
			findById: async (id) => ({
				id,
				active: true,
				fee_percent: 1.71,
			}),
		},
	});

	await service.updateAppointment(
		"appt-1",
		{ status: "paid", payment_method_id: "method-credit" },
		barberUser,
	);

	t.equal(capturedPayload.payment_method_id, "method-credit");
	t.equal(capturedPayload.payment_fee_percent, 1.71);
	t.equal(capturedPayload.payment_fee_value, 1.71);
	t.equal(capturedPayload.net_value, 98.29);
});

t.test("paid appointment requires payment method", async (t) => {
	const service = loadService({
		appointmentsRepository: {
			findById: async () => ({
				id: "appt-1",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-1",
				value: 100,
				status: "normal",
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
		service.updateAppointment("appt-1", { status: "paid" }, barberUser),
		{ status: 400, code: "PAYMENT_METHOD_REQUIRED" },
	);
});

t.test("new backdated paid appointment uses appointment date as payment date", async (t) => {
	let capturedPayload;
	let syncedAppointment;
	const service = loadService({
		appointmentsRepository: {
			create: async (payload) => {
				capturedPayload = payload;
				return { id: "appt-backdated", barbearia_id: "shop-1", ...payload };
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
		paymentMethodsRepository: {
			findById: async (id) => ({ id, active: true, fee_percent: 0 }),
		},
		supplierPayablesRepository: {
			syncFromAppointment: async (appointment) => {
				syncedAppointment = appointment;
			},
		},
	});

	await service.createAppointment(
		{
			client_name: "Cliente retroativo",
			day_key: "2026-06-15",
			time_slot: "10:00",
			value: 50,
			status: "paid",
			payment_method_id: "method-pix",
		},
		barberUser,
	);

	t.equal(capturedPayload.payment_date, "2026-06-15");
	t.equal(syncedAppointment.id, "appt-backdated");
});

t.test("paid appointment item update reuses payment method and recalculates value", async (t) => {
	let capturedPayload;
	const service = loadService({
		appointmentsRepository: {
			findById: async () => ({
				id: "appt-1",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-1",
				value: 100,
				status: "paid",
				payment_method_id: "method-pix",
			}),
			update: async (_id, payload) => {
				capturedPayload = payload;
				return { id: "appt-1", ...payload };
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
		paymentMethodsRepository: {
			findById: async (id) => ({
				id,
				active: true,
				fee_percent: 0,
			}),
		},
	});

	await service.updateAppointment(
		"appt-1",
		{
			services: [{ id: "service-1", name: "Corte", price: 80, quantity: 1 }],
			products: [
				{
					id: "product-1",
					name: "Gel",
					price: 25,
					quantity: 1,
					purchase_type: "consignado",
					cost_price: 13,
					supplier_name: "Gerson",
				},
			],
		},
		barberUser,
	);

	t.equal(capturedPayload.value, undefined);
	t.equal(capturedPayload.payment_method_id, "method-pix");
	t.equal(capturedPayload.net_value, 105);
	t.same(capturedPayload.products[0], {
		id: "product-1",
		name: "Gel",
		price: 25,
		quantity: 1,
		purchase_type: "consignado",
		cost_price: 13,
		supplier_name: "Gerson",
	});
});
