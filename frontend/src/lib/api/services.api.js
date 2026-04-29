import { apiClient } from "./client";

export async function listServices() {
	const response = await apiClient.get("/services");
	return response.data;
}

export async function createService(service) {
	const response = await apiClient.post("/services", service);
	return response.data;
}

export async function updateServiceById(id, updates) {
	const response = await apiClient.put(`/services/${id}`, updates);
	return response.data;
}

export async function deleteServiceById(id) {
	await apiClient.delete(`/services/${id}`);
}
