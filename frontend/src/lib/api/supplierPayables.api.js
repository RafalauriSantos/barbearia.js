import { apiClient } from "./client";

export async function listSupplierPayables(params = {}) {
	const response = await apiClient.get("/supplier-payables", { params });
	return response.data;
}

export async function paySupplierPayableById(id, payload) {
	const response = await apiClient.post(`/supplier-payables/${id}/pay`, payload);
	return response.data;
}

export async function createSupplierPurchase(payload) {
	const response = await apiClient.post("/supplier-payables", payload);
	return response.data;
}

