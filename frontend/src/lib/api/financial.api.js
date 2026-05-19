import { apiClient } from "./client";

function normalizeNumber(value) {
	return Number(value || 0);
}

function normalizeBarberSummary(raw) {
	return {
		barbeiro_id: raw.barbeiro_id,
		nome: raw.nome || raw.name || "",
		total_pago: normalizeNumber(raw.total_pago),
		comissao_percent: normalizeNumber(raw.comissao_percent),
		parte_barbeiro: normalizeNumber(raw.parte_barbeiro),
		parte_barbearia: normalizeNumber(raw.parte_barbearia),
		quantidade_atendimentos: Number(raw.quantidade_atendimentos || 0),
	};
}

export function normalizeFinancialSummary(raw) {
	if (Array.isArray(raw.resumo_por_barbeiro)) {
		return {
			type: "admin",
			total_pago_geral: normalizeNumber(raw.total_pago_geral),
			total_barbearia: normalizeNumber(raw.total_barbearia),
			total_barbeiros: normalizeNumber(raw.total_barbeiros),
			quantidade_atendimentos_pagos: Number(
				raw.quantidade_atendimentos_pagos || 0,
			),
			resumo_por_barbeiro: raw.resumo_por_barbeiro.map(normalizeBarberSummary),
		};
	}

	return {
		type: "barbeiro",
		...normalizeBarberSummary(raw),
	};
}

export async function getFinancialSummary(params = {}) {
	const response = await apiClient.get("/financial/summary", { params });
	return normalizeFinancialSummary(response.data);
}
