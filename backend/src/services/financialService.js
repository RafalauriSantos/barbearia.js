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

function buildSummaryByBarber(rows) {
	const buckets = new Map();

	for (const row of rows) {
		const barber = getBarberRow(row);
		const barbeiroId = row.barbeiro_id || barber?.id || null;
		const key = barbeiroId || "sem-barbeiro";
		const total = getAppointmentTotal(row);
		const taxa = getPaymentFeeValue(row);
		const liquido = getAppointmentNetValue(row);
		const comissaoPercent = Number(barber?.comissao_percent || 0);
		const parteBarbeiro = (liquido * comissaoPercent) / 100;
		const parteBarbearia = liquido - parteBarbeiro;

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
		bucket.total_pago += total;
		bucket.total_taxas += taxa;
		bucket.total_liquido += liquido;
		bucket.parte_barbeiro += parteBarbeiro;
		bucket.parte_barbearia += parteBarbearia;
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

function buildAdminSummary(rows) {
	const resumoPorBarbeiro = buildSummaryByBarber(rows);
	const resumoPorFormaPagamento = buildSummaryByPaymentMethod(rows);
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
	};
}

function buildBarberSummary(rows, fallbackBarber) {
	const [summary] = buildSummaryByBarber(rows);
	if (summary) {
		return {
			...summary,
			resumo_por_forma_pagamento: buildSummaryByPaymentMethod(rows),
		};
	}

	return {
		...createBucket({
			barbeiroId: fallbackBarber.id,
			nome: fallbackBarber.name || fallbackBarber.nome,
			comissaoPercent: fallbackBarber.comissao_percent,
		}),
		resumo_por_forma_pagamento: [],
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

	const rows = await FinancialRepository.findPaidAppointments({
		barbeariaId: user.barbearia_id,
		barbeiroId: targetBarberId,
		startDate: query.start_date,
		endDate: query.end_date,
	});

	if (isAdmin(user)) {
		return buildAdminSummary(rows);
	}

	return buildBarberSummary(rows, fallbackBarber);
};
