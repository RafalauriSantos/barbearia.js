import { apiClient } from "./client";

export async function listFixedClients() {
	const response = await apiClient.get("/clients/fixed");
	return response.data;
}

export async function createFixedClient(client) {
	const response = await apiClient.post("/clients/fixed", client);
	return response.data;
}

export async function updateFixedClientById(id, updates) {
	const response = await apiClient.put(`/clients/fixed/${id}`, updates);
	return response.data;
}

export async function deleteFixedClientById(id) {
	await apiClient.delete(`/clients/fixed/${id}`);
}

export async function createClientCut(clientId, cut) {
	const response = await apiClient.post(`/clients/fixed/${clientId}/cuts`, cut);
	return response.data;
}

export async function updateClientCutById(clientId, cutId, updates) {
	const response = await apiClient.put(
		`/clients/fixed/${clientId}/cuts/${cutId}`,
		updates,
	);
	return response.data;
}

export async function deleteClientCutById(clientId, cutId) {
	const response = await apiClient.delete(
		`/clients/fixed/${clientId}/cuts/${cutId}`,
	);
	return response.data;
}

export async function listWaitlist() {
	const response = await apiClient.get("/clients/waitlist");
	return response.data;
}

export async function createWaitlistEntry(entry) {
	const response = await apiClient.post("/clients/waitlist", entry);
	return response.data;
}

export async function updateWaitlistEntryById(id, updates) {
	const response = await apiClient.put(`/clients/waitlist/${id}`, updates);
	return response.data;
}

export async function deleteWaitlistEntryById(id) {
	await apiClient.delete(`/clients/waitlist/${id}`);
}
