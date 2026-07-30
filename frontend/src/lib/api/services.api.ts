import { apiClient } from "./client";

export async function listServices() {
	const response = await apiClient.get("/services");
	return response.data;
}

export async function createService(service: Record<string, any>) {
	const response = await apiClient.post("/services", service);
	return response.data;
}

export async function updateServiceById(id: string, updates: Record<string, any>) {
	const response = await apiClient.put(`/services/${id}`, updates);
	return response.data;
}

export async function deleteServiceById(id: string): Promise<void> {
	await apiClient.delete(`/services/${id}`);
}
