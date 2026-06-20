import { apiClient } from "./client";

export async function listReceivables(params = {}) {
	const response = await apiClient.get("/receivables", { params });
	return response.data;
}

export async function createReceivable(payload) {
	const response = await apiClient.post("/receivables", payload);
	return response.data;
}

export async function updateReceivableById(id, payload) {
	const response = await apiClient.put(`/receivables/${id}`, payload);
	return response.data;
}

export async function receiveReceivableById(id, payload) {
	const response = await apiClient.post(`/receivables/${id}/receive`, payload);
	return response.data;
}

export async function cancelReceivableById(id) {
	const response = await apiClient.delete(`/receivables/${id}`);
	return response.data;
}
