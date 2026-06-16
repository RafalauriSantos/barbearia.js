import { apiClient } from "./client";

function normalizeNumber(value) {
	return Number(value || 0);
}

function normalizeBarberSummary(raw) {
	return {
		barbeiro_id: raw.barbeiro_id,
		nome: raw.nome || raw.name || "",
		total_pago: normalizeNumber(raw.total_pago),
		total_taxas: normalizeNumber(raw.total_taxas),
		total_liquido: normalizeNumber(raw.total_liquido || raw.total_pago),
		comissao_percent: normalizeNumber(raw.comissao_percent),
		parte_barbeiro: normalizeNumber(raw.parte_barbeiro),
		parte_barbearia: normalizeNumber(raw.parte_barbearia),
		quantidade_atendimentos: Number(raw.quantidade_atendimentos || 0),
	};
}

function normalizePaymentMethodSummary(raw) {
	return {
		forma_pagamento_id: raw.forma_pagamento_id || null,
		codigo: raw.codigo || "sem_forma",
		nome: raw.nome || "Sem forma",
		total_pago: normalizeNumber(raw.total_pago),
		total_taxas: normalizeNumber(raw.total_taxas),
		total_liquido: normalizeNumber(raw.total_liquido || raw.total_pago),
		quantidade_atendimentos: Number(raw.quantidade_atendimentos || 0),
	};
}

export function normalizeFinancialSummary(raw) {
	const paymentMethods = Array.isArray(raw.resumo_por_forma_pagamento) ?
		raw.resumo_por_forma_pagamento.map(normalizePaymentMethodSummary)
	:	[];

	if (Array.isArray(raw.resumo_por_barbeiro)) {
		return {
			type: "admin",
			total_pago_geral: normalizeNumber(raw.total_pago_geral),
			total_taxas: normalizeNumber(raw.total_taxas),
			total_liquido: normalizeNumber(
				raw.total_liquido || raw.total_pago_geral,
			),
			total_barbearia: normalizeNumber(raw.total_barbearia),
			total_barbeiros: normalizeNumber(raw.total_barbeiros),
			quantidade_atendimentos_pagos: Number(
				raw.quantidade_atendimentos_pagos || 0,
			),
			resumo_por_barbeiro: raw.resumo_por_barbeiro.map(normalizeBarberSummary),
			resumo_por_forma_pagamento: paymentMethods,
		};
	}

	return {
		type: "barbeiro",
		...normalizeBarberSummary(raw),
		resumo_por_forma_pagamento: paymentMethods,
	};
}

export async function getFinancialSummary(params = {}) {
	const response = await apiClient.get("/financial/summary", { params });
	return normalizeFinancialSummary(response.data);
}
