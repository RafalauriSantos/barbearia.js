import { apiClient } from "./client";

export async function listFixedClients() {
	const response = await apiClient.get("/clients/fixed");
	return response.data;
}

export async function createFixedClient(client: Record<string, any>) {
	const response = await apiClient.post("/clients/fixed", client);
	return response.data;
}

export async function updateFixedClientById(id: string, updates: Record<string, any>) {
	const response = await apiClient.put(`/clients/fixed/${id}`, updates);
	return response.data;
}

export async function deleteFixedClientById(id: string): Promise<void> {
	await apiClient.delete(`/clients/fixed/${id}`);
}

export async function createClientCut(clientId: string, cut: Record<string, any>) {
	const response = await apiClient.post(`/clients/fixed/${clientId}/cuts`, cut);
	return response.data;
}

export async function updateClientCutById(clientId: string, cutId: string, updates: Record<string, any>) {
	const response = await apiClient.put(
		`/clients/fixed/${clientId}/cuts/${cutId}`,
		updates,
	);
	return response.data;
}

export async function deleteClientCutById(clientId: string, cutId: string) {
	const response = await apiClient.delete(
		`/clients/fixed/${clientId}/cuts/${cutId}`,
	);
	return response.data;
}

export async function listWaitlist() {
	const response = await apiClient.get("/clients/waitlist");
	return response.data;
}

export async function createWaitlistEntry(entry: Record<string, any>) {
	const response = await apiClient.post("/clients/waitlist", entry);
	return response.data;
}

export async function updateWaitlistEntryById(id: string, updates: Record<string, any>) {
	const response = await apiClient.put(`/clients/waitlist/${id}`, updates);
	return response.data;
}

export async function deleteWaitlistEntryById(id: string): Promise<void> {
	await apiClient.delete(`/clients/waitlist/${id}`);
}
