import { apiClient } from "./client";

export async function login(credentials) {
	const response = await apiClient.post("/auth/login", credentials);
	return response.data;
}

export async function register(credentials) {
	const response = await apiClient.post("/auth/register", credentials);
	return response.data;
}

export async function verifyEmail(token) {
	const response = await apiClient.post("/auth/verify-email", { token });
	return response.data;
}

export async function getInvite(token) {
	const response = await apiClient.get(`/invites/${token}`);
	return response.data;
}

export async function acceptInvite(token, payload) {
	const response = await apiClient.post(`/invites/${token}/accept`, payload);
	return response.data;
}

export async function me() {
	const response = await apiClient.get("/auth/me");
	return response.data;
}
