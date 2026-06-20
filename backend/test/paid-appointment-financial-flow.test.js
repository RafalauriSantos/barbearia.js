process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");
const jwt = require("jsonwebtoken");
const PIX_METHOD_ID = "11111111-1111-4111-8111-111111111111";

function clearFlowCache() {
	for (const modulePath of [
		"../src/index",
		"../src/app",
		"../src/routes/index",
		"../src/routes/appointments",
		"../src/routes/financial",
		"../src/controllers/appointmentsController",
		"../src/controllers/financialController",
		"../src/services/appointmentsService",
		"../src/services/financialService",
		"../src/services/authService",
		"../src/repositories/paymentMethodsRepository",
		"../src/repositories/supplierPayablesRepository",
	]) {
		delete require.cache[require.resolve(modulePath)];
	}
}

function mockPaymentMethodsRepository() {
	require.cache[require.resolve("../src/repositories/paymentMethodsRepository")] = {
		exports: {
			findById: async (id) => ({
				id,
				active: true,
				fee_percent: 0,
			}),
		},
	};
}

function mockReceivablesRepository() {
	require.cache[require.resolve("../src/repositories/receivablesRepository")] = {
		exports: {
			upsertFromAppointment: async () => null,
			updateByAppointment: async () => null,
		},
	};
}

function mockSupplierPayablesRepository() {
	require.cache[require.resolve("../src/repositories/supplierPayablesRepository")] = {
		exports: {
			syncFromAppointment: async () => null,
		},
	};
}

t.test("paid appointment created from agenda enters same-day financial summary", async (t) => {
	const user = {
		id: "renan-user",
		role: "barbeiro",
		barbearia_id: "shop-1",
		barbeiro_id: "renan-barber",
	};
	const rows = [];

	clearFlowCache();
	mockPaymentMethodsRepository();
	mockReceivablesRepository();
	mockSupplierPayablesRepository();

	require.cache[require.resolve("../src/services/authService")] = {
		exports: {
			getCurrentUser: async () => user,
		},
	};
	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
				nome: "Renan",
				comissao_percent: 50,
			}),
		},
	};
	require.cache[require.resolve("../src/repositories/appointmentsRepository")] = {
		exports: {
			findConflict: async () => null,
			findAll: async ({ date, barbeiroId }) =>
				rows
					.filter((row) => row.data === date)
					.filter((row) => !barbeiroId || row.barbeiro_id === barbeiroId)
					.map((row) => ({
						id: row.id,
						client_name: row.cliente_nome,
						day_key: row.data,
						time_slot: row.hora,
						value: row.total,
						status: row.status_pagamento === "pago" ? "paid" : "normal",
						barbeiro_id: row.barbeiro_id,
						services: row.services,
						products: [],
					})),
			findById: async (id) => rows.find((row) => row.id === id) || null,
			create: async (payload, { barbeariaId, barbeiroId }) => {
				const total =
					payload.value ??
					(payload.services || []).reduce(
						(sum, item) =>
							sum + Number(item.price || 0) * Number(item.quantity || 1),
						0,
					);
				const row = {
					id: "appt-paid-1",
					barbearia_id: barbeariaId,
					barbeiro_id: barbeiroId,
					cliente_nome: payload.client_name,
					data: payload.day_key,
					hora: payload.time_slot,
					total,
					valor_manual: total,
					status_pagamento: payload.status === "paid" ? "pago" : "pendente",
					forma_pagamento_id: payload.payment_method_id || null,
					services: payload.services,
				};
				rows.push(row);
				return {
					id: row.id,
					client_name: row.cliente_nome,
					day_key: row.data,
					time_slot: row.hora,
					value: row.total,
					status: "paid",
					payment_method_id: row.forma_pagamento_id,
					barbeiro_id: row.barbeiro_id,
					services: row.services,
					products: [],
				};
			},
			update: async (id, updates) => {
				const row = rows.find((item) => item.id === id);
				if (!row) return null;
				if (updates.status) {
					row.status_pagamento =
						updates.status === "paid" ? "pago" : updates.status;
				}
				if (updates.value !== undefined) {
					row.total = Number(updates.value);
					row.valor_manual = Number(updates.value);
				}
				return {
					id: row.id,
					client_name: row.cliente_nome,
					day_key: row.data,
					time_slot: row.hora,
					value: row.total,
					status: row.status_pagamento === "pago" ? "paid" : "normal",
					barbeiro_id: row.barbeiro_id,
					services: row.services,
					products: [],
				};
			},
		},
	};
	require.cache[require.resolve("../src/repositories/financialRepository")] = {
		exports: {
			findPaidAppointments: async ({ barbeiroId, startDate, endDate }) =>
				rows
					.filter((row) => row.status_pagamento === "pago")
					.filter((row) => !barbeiroId || row.barbeiro_id === barbeiroId)
					.filter((row) => !startDate || row.data >= startDate)
					.filter((row) => !endDate || row.data <= endDate)
					.map((row) => ({
						id: row.id,
						total: row.total,
						valor_manual: row.valor_manual,
						data: row.data,
						barbearia_id: row.barbearia_id,
						barbeiro_id: row.barbeiro_id,
						status_pagamento: row.status_pagamento,
						barbeiros: {
							id: row.barbeiro_id,
							nome: "Renan",
							comissao_percent: 50,
						},
					})),
		},
	};

	const { env } = require("../src/config/env");
	const { buildApp } = require("../src/index");
	const app = await buildApp();
	const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);

	const createRes = await app.inject({
		method: "POST",
		url: "/agendamentos",
		headers: { authorization: `Bearer ${token}` },
		payload: {
			client_name: "Cliente pago",
			day_key: "2026-06-15",
			time_slot: "10:00",
			status: "paid",
			payment_method_id: PIX_METHOD_ID,
			services: [
				{
					id: "service-cut",
					name: "Corte",
					price: 80,
					quantity: 1,
				},
			],
		},
	});
	t.equal(createRes.statusCode, 201);
	const created = JSON.parse(createRes.payload);
	t.equal(created.status, "paid");
	t.equal(created.value, 80);

	const financialRes = await app.inject({
		method: "GET",
		url: "/financial/summary?start_date=2026-06-15&end_date=2026-06-15",
		headers: { authorization: `Bearer ${token}` },
	});
	t.equal(financialRes.statusCode, 200);
	const summary = JSON.parse(financialRes.payload);
	t.equal(summary.total_pago, 80);
	t.equal(summary.quantidade_atendimentos, 1);

	await app.close();
});

t.test("pending appointment marked as paid enters same-day financial summary", async (t) => {
	const user = {
		id: "renan-user",
		role: "barbeiro",
		barbearia_id: "shop-1",
		barbeiro_id: "renan-barber",
	};
	const rows = [];

	clearFlowCache();
	mockPaymentMethodsRepository();
	mockReceivablesRepository();
	mockSupplierPayablesRepository();

	require.cache[require.resolve("../src/services/authService")] = {
		exports: {
			getCurrentUser: async () => user,
		},
	};
	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
				nome: "Renan",
				comissao_percent: 50,
			}),
		},
	};
	require.cache[require.resolve("../src/repositories/appointmentsRepository")] = {
		exports: {
			findConflict: async () => null,
			findById: async (id) =>
				rows.find((row) => row.id === id) ?
					{
						id,
						barbearia_id: "shop-1",
						barbeiro_id: "renan-barber",
					}
				:	null,
			create: async (payload, { barbeariaId, barbeiroId }) => {
				const row = {
					id: "appt-pending-1",
					barbearia_id: barbeariaId,
					barbeiro_id: barbeiroId,
					cliente_nome: payload.client_name,
					data: payload.day_key,
					hora: payload.time_slot,
					total: Number(payload.value || 0),
					valor_manual: Number(payload.value || 0),
					status_pagamento: "pendente",
					forma_pagamento_id: null,
				};
				rows.push(row);
				return {
					id: row.id,
					client_name: row.cliente_nome,
					day_key: row.data,
					time_slot: row.hora,
					value: row.total,
					status: "normal",
					barbeiro_id: row.barbeiro_id,
				};
			},
			update: async (id, updates) => {
				const row = rows.find((item) => item.id === id);
				row.status_pagamento = updates.status === "paid" ? "pago" : "pendente";
				row.forma_pagamento_id = updates.payment_method_id || null;
				return {
					id: row.id,
					client_name: row.cliente_nome,
					day_key: row.data,
					time_slot: row.hora,
					value: row.total,
					status: "paid",
					payment_method_id: row.forma_pagamento_id,
					barbeiro_id: row.barbeiro_id,
				};
			},
		},
	};
	require.cache[require.resolve("../src/repositories/financialRepository")] = {
		exports: {
			findPaidAppointments: async ({ barbeiroId, startDate, endDate }) =>
				rows
					.filter((row) => row.status_pagamento === "pago")
					.filter((row) => !barbeiroId || row.barbeiro_id === barbeiroId)
					.filter((row) => !startDate || row.data >= startDate)
					.filter((row) => !endDate || row.data <= endDate)
					.map((row) => ({
						id: row.id,
						total: row.total,
						valor_manual: row.valor_manual,
						data: row.data,
						barbearia_id: row.barbearia_id,
						barbeiro_id: row.barbeiro_id,
						status_pagamento: row.status_pagamento,
						barbeiros: {
							id: row.barbeiro_id,
							nome: "Renan",
							comissao_percent: 50,
						},
					})),
		},
	};

	const { env } = require("../src/config/env");
	const { buildApp } = require("../src/index");
	const app = await buildApp();
	const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);

	const createRes = await app.inject({
		method: "POST",
		url: "/agendamentos",
		headers: { authorization: `Bearer ${token}` },
		payload: {
			client_name: "Cliente pendente",
			day_key: "2026-06-15",
			time_slot: "11:00",
			value: 70,
		},
	});
	t.equal(createRes.statusCode, 201);
	const created = JSON.parse(createRes.payload);
	t.equal(created.status, "normal");

	const updateRes = await app.inject({
		method: "PATCH",
		url: `/agendamentos/${created.id}`,
		headers: { authorization: `Bearer ${token}` },
		payload: { status: "paid", payment_method_id: PIX_METHOD_ID },
	});
	t.equal(updateRes.statusCode, 200);
	t.equal(JSON.parse(updateRes.payload).status, "paid");

	const financialRes = await app.inject({
		method: "GET",
		url: "/financial/summary?start_date=2026-06-15&end_date=2026-06-15",
		headers: { authorization: `Bearer ${token}` },
	});
	t.equal(financialRes.statusCode, 200);
	const summary = JSON.parse(financialRes.payload);
	t.equal(summary.total_pago, 70);
	t.equal(summary.quantidade_atendimentos, 1);

	await app.close();
});
