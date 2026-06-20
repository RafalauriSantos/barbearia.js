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
					forma_pagamento_id: "pay-pix",
					barbeiros: {
						id: "barber-1",
						nome: "Renan",
						comissao_percent: 50,
					},
					formas_pagamento: {
						id: "pay-pix",
						codigo: "pix",
						nome: "Pix",
					},
				},
				{
					id: "appt-2",
					total: 200,
					barbeiro_id: "barber-2",
					forma_pagamento_id: "pay-credit",
					barbeiros: {
						id: "barber-2",
						nome: "Joao",
						comissao_percent: 60,
					},
					formas_pagamento: {
						id: "pay-credit",
						codigo: "cartao_credito",
						nome: "Credito a vista",
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
	t.equal(summary.resumo_por_forma_pagamento.length, 2);
	t.same(summary.resumo_por_forma_pagamento[0], {
		forma_pagamento_id: "pay-pix",
		codigo: "pix",
		nome: "Pix",
		total_pago: 100,
		total_taxas: 0,
		total_liquido: 100,
		quantidade_atendimentos: 1,
	});
});

t.test("paid manual debt enters consolidated cash on payment date", async (t) => {
	let capturedFilters;
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => [],
			findPaidManualReceivables: async (filters) => {
				capturedFilters = filters;
				return [
					{
						id: "receivable:manual-1",
						total: 60,
						valor_liquido: 60,
						barbeiro_id: "barber-1",
						forma_pagamento_id: "pay-pix",
						barbeiros: {
							id: "barber-1",
							nome: "Renan",
							comissao_percent: 50,
						},
						formas_pagamento: {
							id: "pay-pix",
							codigo: "pix",
							nome: "Pix",
						},
						agendamento_produtos: [],
					},
				];
			},
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({ id: "barber-1" }),
		},
	});

	const summary = await service.getSummary(
		{ start_date: "2026-06-20", end_date: "2026-06-20" },
		adminUser,
	);

	t.equal(summary.total_pago_geral, 60);
	t.equal(summary.total_barbearia, 30);
	t.equal(summary.total_barbeiros, 30);
	t.equal(summary.quantidade_atendimentos_pagos, 1);
	t.same(capturedFilters, {
		barbeariaId: "shop-1",
		barbeiroId: null,
		startDate: "2026-06-20",
		endDate: "2026-06-20",
	});
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
					forma_pagamento_id: "pay-credit",
					barbeiros: {
						id: "barber-1",
						nome: "Renan",
						comissao_percent: 50,
					},
					formas_pagamento: {
						id: "pay-credit",
						codigo: "cartao_credito",
						nome: "Credito a vista",
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
	t.equal(summary.resumo_por_forma_pagamento[0].total_taxas, 1.71);
	t.equal(summary.resumo_por_forma_pagamento[0].total_liquido, 98.29);
});

t.test("financial summary calculates consigned product payable and profit", async (t) => {
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => [
				{
					id: "appt-product-1",
					total: 100,
					barbeiro_id: "barber-1",
					barbeiros: {
						id: "barber-1",
						nome: "Samuel",
						comissao_percent: 50,
					},
					agendamento_produtos: [
						{
							produto_id: "prod-1",
							nome_produto: "Pomada",
							preco_unitario: 50,
							quantidade: 2,
							subtotal: 100,
							tipo_compra: "consignado",
							custo_unitario: 30,
							fornecedor: "Fornecedor A",
							comissao_venda_percentual: 50,
						},
					],
				},
			],
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({ id: "barber-1" }),
		},
	});

	const summary = await service.getSummary({}, adminUser);
	const productSummary = summary.resumo_produtos;

	t.equal(productSummary.quantidade, 2);
	t.equal(productSummary.total_vendido, 100);
	t.equal(productSummary.total_custo, 60);
	t.equal(productSummary.total_lucro, 40);
	t.equal(productSummary.total_fornecedor_pagar, 60);
	t.equal(productSummary.total_comissao_barbeiros, 20);
	t.equal(productSummary.total_lucro_barbearia, 20);
	t.equal(summary.total_barbeiros, 20);
	t.equal(summary.total_barbearia, 20);
	t.same(productSummary.resumo_por_fornecedor[0], {
		fornecedor: "Fornecedor A",
		quantidade: 2,
		total_vendido: 100,
		total_custo: 60,
		total_lucro: 40,
		fornecedor_pagar: 60,
	});
	t.equal(productSummary.resumo_por_produto[0].nome, "Pomada");
});

t.test("product-only sale does not apply service commission to gross revenue", async (t) => {
	const service = loadFinancialService({
		financialRepository: {
			findPaidAppointments: async () => [
				{
					id: "appt-gel-1",
					total: 25,
					barbeiro_id: "barber-1",
					barbeiros: {
						id: "barber-1",
						nome: "Samuel",
						comissao_percent: 50,
					},
					agendamento_produtos: [
						{
							produto_id: "gel-1",
							nome_produto: "Gel",
							preco_unitario: 25,
							quantidade: 1,
							custo_unitario: 13,
							comissao_venda_percentual: 0,
						},
					],
				},
			],
		},
		barbersRepository: {
			findByIdInBarbearia: async () => ({ id: "barber-1" }),
		},
	});

	const summary = await service.getSummary({}, adminUser);

	t.equal(summary.total_pago_geral, 25);
	t.equal(summary.total_barbeiros, 0);
	t.equal(summary.total_barbearia, 12);
	t.equal(summary.resumo_produtos.total_custo, 13);
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
