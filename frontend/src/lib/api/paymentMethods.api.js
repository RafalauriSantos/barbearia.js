import { apiClient } from "./client";

export function normalizePaymentMethod(raw) {
	return {
		id: raw.id,
		code: raw.code || raw.codigo || "",
		name: raw.name || raw.nome || "",
		fee_percent: Number(raw.fee_percent ?? raw.taxa_percentual ?? 0),
		active: raw.active ?? raw.ativo ?? true,
		order: Number(raw.order ?? raw.ordem ?? 100),
	};
}

export async function listPaymentMethods() {
	const response = await apiClient.get("/payment-methods");
	return response.data.map(normalizePaymentMethod);
}

export async function updatePaymentMethodById(id, updates) {
	const response = await apiClient.patch(`/payment-methods/${id}`, updates);
	return normalizePaymentMethod(response.data);
}
