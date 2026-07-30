import { apiClient } from "./client";

export async function listSupplierPayables(params: Record<string, any> = {}) {
	const response = await apiClient.get("/supplier-payables", { params });
	return response.data;
}

export async function paySupplierPayableById(id: string, payload: Record<string, any>) {
	const response = await apiClient.post(`/supplier-payables/${id}/pay`, payload);
	return response.data;
}

export async function createSupplierPurchase(payload: Record<string, any>) {
	const response = await apiClient.post("/supplier-payables", payload);
	return response.data;
}
