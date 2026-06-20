const supabase = require("../lib/supabase");

function isMissingPaymentSnapshotColumn(error) {
	const text = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	return [
		"taxa_pagamento_percentual",
		"taxa_pagamento_valor",
		"valor_liquido",
		"data_pagamento",
	].some((column) => text.includes(column));
}

exports.findPaidAppointments = async function ({
	barbeariaId,
	barbeiroId,
	startDate,
	endDate,
}) {
	let query = supabase
		.from("agendamentos")
		.select(
			"id,total,valor_manual,valor_liquido,taxa_pagamento_valor,taxa_pagamento_percentual,data,data_pagamento,barbearia_id,barbeiro_id,status_pagamento,forma_pagamento_id,barbeiros(id,nome,comissao_percent),formas_pagamento(id,codigo,nome),agendamento_produtos(*)",
		)
		.eq("barbearia_id", barbeariaId)
		.eq("status_pagamento", "pago");

	if (barbeiroId) {
		query = query.eq("barbeiro_id", barbeiroId);
	}
	if (startDate) {
		query = query.gte("data_pagamento", startDate);
	}
	if (endDate) {
		query = query.lte("data_pagamento", endDate);
	}

	const { data, error } = await query.order("data_pagamento", { ascending: true });
	if (error && isMissingPaymentSnapshotColumn(error)) {
		let legacyQuery = supabase
			.from("agendamentos")
			.select(
				"id,total,valor_manual,data,barbearia_id,barbeiro_id,status_pagamento,forma_pagamento_id,barbeiros(id,nome,comissao_percent),formas_pagamento(id,codigo,nome),agendamento_produtos(*)",
			)
			.eq("barbearia_id", barbeariaId)
			.eq("status_pagamento", "pago");

		if (barbeiroId) {
			legacyQuery = legacyQuery.eq("barbeiro_id", barbeiroId);
		}
		if (startDate) {
			legacyQuery = legacyQuery.gte("data", startDate);
		}
		if (endDate) {
			legacyQuery = legacyQuery.lte("data", endDate);
		}

		const legacyResult = await legacyQuery.order("data", { ascending: true });
		if (legacyResult.error) throw legacyResult.error;
		return legacyResult.data || [];
	}
	if (error) throw error;
	return data || [];
};

exports.findPaidManualReceivables = async function (filters) {
	const ReceivablesRepository = require("./receivablesRepository");
	const rows = await ReceivablesRepository.findPaidManual(filters);
	return rows.map(ReceivablesRepository.toFinancialRow);
};
