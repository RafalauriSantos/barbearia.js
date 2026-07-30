import { apiClient } from "./client";

export interface ApiPaymentMethod {
	id: string;
	code: string;
	name: string;
	fee_percent: number;
	active: boolean;
	order: number;
}

export function normalizePaymentMethod(raw: any): ApiPaymentMethod {
	return {
		id: raw.id,
		code: raw.code || raw.codigo || "",
		name: raw.name || raw.nome || "",
		fee_percent: Number(raw.fee_percent ?? raw.taxa_percentual ?? 0),
		active: raw.active ?? raw.ativo ?? true,
		order: Number(raw.order ?? raw.ordem ?? 100),
	};
}

export async function listPaymentMethods(): Promise<ApiPaymentMethod[]> {
	const response = await apiClient.get("/payment-methods");
	return response.data.map(normalizePaymentMethod);
}

export async function updatePaymentMethodById(id: string, updates: Record<string, any>): Promise<ApiPaymentMethod> {
	const response = await apiClient.patch(`/payment-methods/${id}`, updates);
	return normalizePaymentMethod(response.data);
}
