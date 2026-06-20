const FinancialRepository = require("../repositories/financialRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const { AppError } = require("../lib/errors");

function isAdmin(user) {
	return user?.role === "admin";
}

function roundMoney(value) {
	return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function assertBarbeariaContext(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
}

function assertBarberContext(user) {
	if (!user?.barbeiro_id) {
		throw new AppError(
			403,
			"BARBER_CONTEXT_REQUIRED",
			"Usuario sem barbeiro vinculado.",
		);
	}
}

async function assertBarberBelongsToShop(barbeiroId, barbeariaId) {
	const barber = await BarbersRepository.findByIdInBarbearia(
		barbeiroId,
		barbeariaId,
	);
	if (!barber) {
		throw new AppError(
			403,
			"BARBER_FORBIDDEN",
			"Barbeiro nao pertence a esta barbearia.",
		);
	}
	return barber;
}

function getAppointmentTotal(row) {
	return Number(row.total ?? row.valor_manual ?? 0);
}

function getPaymentFeeValue(row) {
	return Number(row.taxa_pagamento_valor || 0);
}

function getAppointmentNetValue(row) {
	const gross = getAppointmentTotal(row);
	const explicitNet = Number(row.valor_liquido || 0);
	if (explicitNet > 0 || gross === 0) return explicitNet;
	return Math.max(gross - getPaymentFeeValue(row), 0);
}

function getBarberRow(row) {
	if (Array.isArray(row.barbeiros)) return row.barbeiros[0] || null;
	return row.barbeiros || null;
}

function getPaymentMethodRow(row) {
	if (Array.isArray(row.formas_pagamento)) {
		return row.formas_pagamento[0] || null;
	}
	return row.formas_pagamento || null;
}

function getProductRows(row) {
	return Array.isArray(row.agendamento_produtos) ?
			row.agendamento_produtos
		:	[];
}

function getAppointmentDistribution(row) {
	const total = getAppointmentTotal(row);
	const fee = getPaymentFeeValue(row);
	const barber = getBarberRow(row);
	const productSales = getProductRows(row).map(getProductSale);
	const productGross = productSales.reduce(
		(sum, product) => sum + product.total_vendido,
		0,
	);
	const productCost = productSales.reduce(
		(sum, product) => sum + product.total_custo,
		0,
	);
	const productCommission = productSales.reduce(
		(sum, product) => sum + product.comissao_barbeiro,
		0,
	);
	const serviceGross = Math.max(total - productGross, 0);
	const serviceFeeShare = total > 0 ? (fee * serviceGross) / total : 0;
	const serviceNet = Math.max(serviceGross - serviceFeeShare, 0);
	const serviceCommission =
		(serviceNet * Number(barber?.comissao_percent || 0)) / 100;
	const barberShare = serviceCommission + productCommission;
	const shopShare = total - fee - productCost - barberShare;

	return {
		barber,
		total,
		fee,
		net: getAppointmentNetValue(row),
		barberShare,
		shopShare,
	};
}

function getProductSale(item) {
	const quantity = Number(item.quantidade || item.quantity || 1) || 1;
	const unitPrice = Number(item.preco_unitario ?? item.price ?? 0);
	const gross = Number(item.subtotal ?? unitPrice * quantity);
	const unitCost = Number(item.custo_unitario ?? item.cost_price ?? 0);
	const cost = unitCost * quantity;
	const profit = Math.max(gross - cost, 0);
	const commissionPercent = Number(item.comissao_venda_percentual || 0);
	const barberCommission = (profit * commissionPercent) / 100;
	const supplierPayable =
		item.tipo_compra === "consignado" ? cost : 0;

	return {
		produto_id: item.produto_id || item.id || null,
		nome: item.nome_produto || item.name || "Produto",
		tipo_compra: item.tipo_compra || "avista",
		fornecedor: item.fornecedor || "Sem fornecedor",
		quantidade: quantity,
		total_vendido: gross,
		total_custo: cost,
		total_lucro: profit,
		fornecedor_pagar: supplierPayable,
		comissao_percentual: commissionPercent,
		comissao_barbeiro: barberCommission,
		lucro_barbearia: profit - barberCommission,
	};
}

function createBucket({ barbeiroId, nome, comissaoPercent }) {
	return {
		barbeiro_id: barbeiroId,
		nome: nome || "Sem barbeiro",
		total_pago: 0,
		total_taxas: 0,
		total_liquido: 0,
		comissao_percent: Number(comissaoPercent || 0),
		parte_barbeiro: 0,
		parte_barbearia: 0,
		quantidade_atendimentos: 0,
	};
}

function createProductBucket({ produtoId, nome, tipoCompra, fornecedor }) {
	return {
		produto_id: produtoId,
		nome: nome || "Produto",
		tipo_compra: tipoCompra || "avista",
		fornecedor: fornecedor || "Sem fornecedor",
		quantidade: 0,
		total_vendido: 0,
		total_custo: 0,
		total_lucro: 0,
		fornecedor_pagar: 0,
		comissao_barbeiro: 0,
		lucro_barbearia: 0,
	};
}

function createSupplierBucket(fornecedor) {
	return {
		fornecedor: fornecedor || "Sem fornecedor",
		quantidade: 0,
		total_vendido: 0,
		total_custo: 0,
		total_lucro: 0,
		fornecedor_pagar: 0,
	};
}

function createPaymentMethodBucket({ methodId, codigo, nome }) {
	return {
		forma_pagamento_id: methodId,
		codigo: codigo || "sem_forma",
		nome: nome || "Sem forma",
		total_pago: 0,
		total_taxas: 0,
		total_liquido: 0,
		quantidade_atendimentos: 0,
	};
}

function finalizeBucket(bucket) {
	return {
		...bucket,
		total_pago: roundMoney(bucket.total_pago),
		total_taxas: roundMoney(bucket.total_taxas),
		total_liquido: roundMoney(bucket.total_liquido),
		comissao_percent: roundMoney(bucket.comissao_percent),
		parte_barbeiro: roundMoney(bucket.parte_barbeiro),
		parte_barbearia: roundMoney(bucket.parte_barbearia),
	};
}

function finalizePaymentMethodBucket(bucket) {
	return {
		...bucket,
		total_pago: roundMoney(bucket.total_pago),
		total_taxas: roundMoney(bucket.total_taxas),
		total_liquido: roundMoney(bucket.total_liquido),
	};
}

function finalizeProductBucket(bucket) {
	return {
		...bucket,
		quantidade: Number(bucket.quantidade || 0),
		total_vendido: roundMoney(bucket.total_vendido),
		total_custo: roundMoney(bucket.total_custo),
		total_lucro: roundMoney(bucket.total_lucro),
		fornecedor_pagar: roundMoney(bucket.fornecedor_pagar),
		comissao_barbeiro: roundMoney(bucket.comissao_barbeiro),
		lucro_barbearia: roundMoney(bucket.lucro_barbearia),
	};
}

function finalizeSupplierBucket(bucket) {
	return {
		...bucket,
		quantidade: Number(bucket.quantidade || 0),
		total_vendido: roundMoney(bucket.total_vendido),
		total_custo: roundMoney(bucket.total_custo),
		total_lucro: roundMoney(bucket.total_lucro),
		fornecedor_pagar: roundMoney(bucket.fornecedor_pagar),
	};
}

function buildSummaryByBarber(rows) {
	const buckets = new Map();

	for (const row of rows) {
		const distribution = getAppointmentDistribution(row);
		const barber = distribution.barber;
		const barbeiroId = row.barbeiro_id || barber?.id || null;
		const key = barbeiroId || "sem-barbeiro";
		const comissaoPercent = Number(barber?.comissao_percent || 0);

		if (!buckets.has(key)) {
			buckets.set(
				key,
				createBucket({
					barbeiroId,
					nome: barber?.nome,
					comissaoPercent,
				}),
			);
		}

		const bucket = buckets.get(key);
		bucket.total_pago += distribution.total;
		bucket.total_taxas += distribution.fee;
		bucket.total_liquido += distribution.net;
		bucket.parte_barbeiro += distribution.barberShare;
		bucket.parte_barbearia += distribution.shopShare;
		bucket.quantidade_atendimentos += 1;
	}

	return Array.from(buckets.values()).map(finalizeBucket);
}

function buildSummaryByPaymentMethod(rows) {
	const buckets = new Map();

	for (const row of rows) {
		const method = getPaymentMethodRow(row);
		const methodId = row.forma_pagamento_id || method?.id || null;
		const key = methodId || method?.codigo || "sem-forma";

		if (!buckets.has(key)) {
			buckets.set(
				key,
				createPaymentMethodBucket({
					methodId,
					codigo: method?.codigo,
					nome: method?.nome,
				}),
			);
		}

		const bucket = buckets.get(key);
		bucket.total_pago += getAppointmentTotal(row);
		bucket.total_taxas += getPaymentFeeValue(row);
		bucket.total_liquido += getAppointmentNetValue(row);
		bucket.quantidade_atendimentos += 1;
	}

	return Array.from(buckets.values()).map(finalizePaymentMethodBucket);
}

function buildProductSummary(rows) {
	const productBuckets = new Map();
	const supplierBuckets = new Map();
	const totals = {
		total_vendido: 0,
		total_custo: 0,
		total_lucro: 0,
		total_fornecedor_pagar: 0,
		total_comissao_barbeiros: 0,
		total_lucro_barbearia: 0,
		quantidade: 0,
	};

	for (const row of rows) {
		for (const productRow of getProductRows(row)) {
			const sale = getProductSale(productRow);
			const productKey = sale.produto_id || sale.nome;
			const supplierKey = sale.fornecedor || "Sem fornecedor";

			if (!productBuckets.has(productKey)) {
				productBuckets.set(
					productKey,
					createProductBucket({
						produtoId: sale.produto_id,
						nome: sale.nome,
						tipoCompra: sale.tipo_compra,
						fornecedor: sale.fornecedor,
					}),
				);
			}
			if (!supplierBuckets.has(supplierKey)) {
				supplierBuckets.set(supplierKey, createSupplierBucket(supplierKey));
			}

			const productBucket = productBuckets.get(productKey);
			productBucket.quantidade += sale.quantidade;
			productBucket.total_vendido += sale.total_vendido;
			productBucket.total_custo += sale.total_custo;
			productBucket.total_lucro += sale.total_lucro;
			productBucket.fornecedor_pagar += sale.fornecedor_pagar;
			productBucket.comissao_barbeiro += sale.comissao_barbeiro;
			productBucket.lucro_barbearia += sale.lucro_barbearia;

			const supplierBucket = supplierBuckets.get(supplierKey);
			supplierBucket.quantidade += sale.quantidade;
			supplierBucket.total_vendido += sale.total_vendido;
			supplierBucket.total_custo += sale.total_custo;
			supplierBucket.total_lucro += sale.total_lucro;
			supplierBucket.fornecedor_pagar += sale.fornecedor_pagar;

			totals.quantidade += sale.quantidade;
			totals.total_vendido += sale.total_vendido;
			totals.total_custo += sale.total_custo;
			totals.total_lucro += sale.total_lucro;
			totals.total_fornecedor_pagar += sale.fornecedor_pagar;
			totals.total_comissao_barbeiros += sale.comissao_barbeiro;
			totals.total_lucro_barbearia += sale.lucro_barbearia;
		}
	}

	return {
		quantidade: Number(totals.quantidade || 0),
		total_vendido: roundMoney(totals.total_vendido),
		total_custo: roundMoney(totals.total_custo),
		total_lucro: roundMoney(totals.total_lucro),
		total_fornecedor_pagar: roundMoney(totals.total_fornecedor_pagar),
		total_comissao_barbeiros: roundMoney(totals.total_comissao_barbeiros),
		total_lucro_barbearia: roundMoney(totals.total_lucro_barbearia),
		resumo_por_produto: Array.from(productBuckets.values())
			.map(finalizeProductBucket)
			.sort((a, b) => b.total_vendido - a.total_vendido),
		resumo_por_fornecedor: Array.from(supplierBuckets.values())
			.map(finalizeSupplierBucket)
			.filter((row) => row.fornecedor_pagar > 0)
			.sort((a, b) => b.fornecedor_pagar - a.fornecedor_pagar),
	};
}

function buildAdminSummary(rows) {
	const resumoPorBarbeiro = buildSummaryByBarber(rows);
	const resumoPorFormaPagamento = buildSummaryByPaymentMethod(rows);
	const resumoProdutos = buildProductSummary(rows);
	const totalPagoGeral = rows.reduce((sum, row) => sum + getAppointmentTotal(row), 0);
	const totalTaxas = rows.reduce((sum, row) => sum + getPaymentFeeValue(row), 0);
	const totalLiquido = rows.reduce(
		(sum, row) => sum + getAppointmentNetValue(row),
		0,
	);
	const totalBarbeiros = resumoPorBarbeiro.reduce(
		(sum, row) => sum + row.parte_barbeiro,
		0,
	);
	const totalBarbearia = resumoPorBarbeiro.reduce(
		(sum, row) => sum + row.parte_barbearia,
		0,
	);

	return {
		total_pago_geral: roundMoney(totalPagoGeral),
		total_taxas: roundMoney(totalTaxas),
		total_liquido: roundMoney(totalLiquido),
		total_barbearia: roundMoney(totalBarbearia),
		total_barbeiros: roundMoney(totalBarbeiros),
		quantidade_atendimentos_pagos: rows.length,
		resumo_por_barbeiro: resumoPorBarbeiro,
		resumo_por_forma_pagamento: resumoPorFormaPagamento,
		resumo_produtos: resumoProdutos,
	};
}

function buildBarberSummary(rows, fallbackBarber) {
	const [summary] = buildSummaryByBarber(rows);
	if (summary) {
		return {
			...summary,
			resumo_por_forma_pagamento: buildSummaryByPaymentMethod(rows),
			resumo_produtos: buildProductSummary(rows),
		};
	}

	return {
		...createBucket({
			barbeiroId: fallbackBarber.id,
			nome: fallbackBarber.name || fallbackBarber.nome,
			comissaoPercent: fallbackBarber.comissao_percent,
		}),
		resumo_por_forma_pagamento: [],
		resumo_produtos: buildProductSummary(rows),
	};
}

exports.getSummary = async function (query, user) {
	assertBarbeariaContext(user);

	const requestedBarberId = query.barbeiro_id || query.barber_id;
	let targetBarberId = requestedBarberId || null;
	let fallbackBarber = null;

	if (isAdmin(user)) {
		if (targetBarberId) {
			await assertBarberBelongsToShop(targetBarberId, user.barbearia_id);
		}
	} else {
		assertBarberContext(user);
		if (targetBarberId && targetBarberId !== user.barbeiro_id) {
			throw new AppError(
				403,
				"FINANCIAL_FORBIDDEN",
				"Voce nao pode consultar financeiro de outro barbeiro.",
			);
		}
		targetBarberId = user.barbeiro_id;
		fallbackBarber = await assertBarberBelongsToShop(
			user.barbeiro_id,
			user.barbearia_id,
		);
	}

	const filters = {
		barbeariaId: user.barbearia_id,
		barbeiroId: targetBarberId,
		startDate: query.start_date,
		endDate: query.end_date,
	};
	const [appointmentRows, manualReceivableRows] = await Promise.all([
		FinancialRepository.findPaidAppointments(filters),
		Object.prototype.hasOwnProperty.call(
			FinancialRepository,
			"findPaidManualReceivables",
		) ?
			FinancialRepository.findPaidManualReceivables(filters)
		: 	Promise.resolve([]),
	]);
	const rows = [...appointmentRows, ...manualReceivableRows];

	if (isAdmin(user)) {
		return buildAdminSummary(rows);
	}

	return buildBarberSummary(rows, fallbackBarber);
};
