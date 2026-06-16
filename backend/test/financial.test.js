process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");
const jwt = require("jsonwebtoken");

function clearFinancialCache() {
	for (const modulePath of [
		"../src/index",
		"../src/app",
		"../src/routes/index",
		"../src/routes/financial",
		"../src/controllers/financialController",
		"../src/services/financialService",
		"../src/services/authService",
	]) {
		delete require.cache[require.resolve(modulePath)];
	}
}

function loadFinancialService({ financialRepository, barbersRepository }) {
	require.cache[require.resolve("../src/repositories/financialRepository")] = {
		exports: financialRepository,
	};
	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: barbersRepository,
	};
	delete require.cache[require.resolve("../src/services/financialService")];
	return require("../src/services/financialService");
}

const adminUser = {
	id: "admin-1",
	role: "admin",
	barbearia_id: "shop-1",
	barbeiro_id: "barber-admin",
};

const barberUser = {
	id: "barber-user-1",
	role: "barbeiro",
	barbearia_id: "shop-1",
	barbeiro_id: "barber-1",
};

t.test("admin financial summary splits paid appointments by commission", async (t) => {
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => [
				{
					id: "appt-1",
					total: 100,
					barbeiro_id: "barber-1",
					barbeiros: {
						id: "barber-1",
						nome: "Renan",
						comissao_percent: 50,
					},
				},
				{
					id: "appt-2",
					total: 200,
					barbeiro_id: "barber-2",
					barbeiros: {
						id: "barber-2",
						nome: "Joao",
						comissao_percent: 60,
					},
				},
			],
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({ id: "barber-1" }),
		},
	});

	const summary = await service.getSummary({}, adminUser);

	t.equal(summary.total_pago_geral, 300);
	t.equal(summary.total_barbeiros, 170);
	t.equal(summary.total_barbearia, 130);
	t.equal(summary.quantidade_atendimentos_pagos, 2);
	t.equal(summary.resumo_por_barbeiro.length, 2);
	t.equal(summary.resumo_por_barbeiro[0].parte_barbeiro, 50);
	t.equal(summary.resumo_por_barbeiro[1].parte_barbearia, 80);
});

t.test("barber financial summary only uses own barber", async (t) => {
	let capturedFilter;
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async (filter) => {
				capturedFilter = filter;
				return [
					{
						id: "appt-1",
						total: 80,
						barbeiro_id: "barber-1",
						barbeiros: {
							id: "barber-1",
							nome: "Renan",
							comissao_percent: 50,
						},
					},
				];
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({
				id: "barber-1",
				name: "Renan",
				comissao_percent: 50,
			}),
		},
	});

	const summary = await service.getSummary({}, barberUser);

	t.equal(capturedFilter.barbeiroId, "barber-1");
	t.equal(summary.barbeiro_id, "barber-1");
	t.equal(summary.total_pago, 80);
	t.equal(summary.parte_barbeiro, 40);
	t.equal(summary.parte_barbearia, 40);
});

t.test("financial summary discounts card fees before commission split", async (t) => {
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => [
				{
					id: "appt-card-1",
					total: 100,
					taxa_pagamento_valor: 1.71,
					valor_liquido: 98.29,
					barbeiro_id: "barber-1",
					barbeiros: {
						id: "barber-1",
						nome: "Renan",
						comissao_percent: 50,
					},
				},
			],
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({ id: "barber-1" }),
		},
	});

	const summary = await service.getSummary({}, adminUser);

	t.equal(summary.total_pago_geral, 100);
	t.equal(summary.total_taxas, 1.71);
	t.equal(summary.total_liquido, 98.29);
	t.equal(summary.total_barbeiros, 49.15);
	t.equal(summary.total_barbearia, 49.15);
	t.equal(summary.resumo_por_barbeiro[0].total_liquido, 98.29);
});

t.test("barber cannot request another barber financial summary", async (t) => {
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => {
				throw new Error("query should not run");
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => null,
		},
	});

	await t.rejects(
		service.getSummary({ barbeiro_id: "barber-2" }, barberUser),
		{ status: 403, code: "FINANCIAL_FORBIDDEN" },
	);
});

t.test("GET /financial/summary returns authenticated admin summary", async (t) => {
	require.cache[require.resolve("../src/repositories/authRepository")] = {
		exports: {
			findById: async (id) => ({
				id,
				role: "admin",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-admin",
			}),
		},
	};
	require.cache[require.resolve("../src/repositories/financialRepository")] = {
		exports: {
			findPaidAppointments: async () => [
				{
					id: "appt-1",
					total: 100,
					barbeiro_id: "barber-1",
					barbeiros: {
						id: "barber-1",
						nome: "Renan",
						comissao_percent: 50,
					},
				},
			],
		},
	};
	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: {
			findByIdInBarbearia: async () => ({
				id: "barber-1",
				barbearia_id: "shop-1",
			}),
		},
	};

	clearFinancialCache();
	const { env } = require("../src/config/env");
	const { buildApp } = require("../src/index");
	const app = await buildApp();
	const token = jwt.sign({ userId: "admin-1" }, env.JWT_SECRET);

	const res = await app.inject({
		method: "GET",
		url: "/financial/summary?start_date=2026-05-17&end_date=2026-05-17",
		headers: { authorization: `Bearer ${token}` },
	});

	t.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	t.equal(body.total_pago_geral, 100);
	t.equal(body.total_barbearia, 50);
	t.equal(body.total_barbeiros, 50);

	await app.close();
});
