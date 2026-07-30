import { apiClient } from "./client";

export async function listReceivables(params: Record<string, any> = {}) {
	const response = await apiClient.get("/receivables", { params });
	return response.data;
}

export async function createReceivable(payload: Record<string, any>) {
	const response = await apiClient.post("/receivables", payload);
	return response.data;
}

export async function updateReceivableById(id: string, payload: Record<string, any>) {
	const response = await apiClient.put(`/receivables/${id}`, payload);
	return response.data;
}

export async function receiveReceivableById(id: string, payload: Record<string, any>) {
	const response = await apiClient.post(`/receivables/${id}/receive`, payload);
	return response.data;
}

export async function cancelReceivableById(id: string) {
	const response = await apiClient.delete(`/receivables/${id}`);
	return response.data;
}
