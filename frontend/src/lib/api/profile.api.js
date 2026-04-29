import { apiClient } from "./client";

export async function getProfile() {
	const response = await apiClient.get("/profile");
	return response.data;
}

export async function updateProfile(profile) {
	const response = await apiClient.put("/profile", profile);
	return response.data;
}

export async function resetAllData() {
	await apiClient.delete("/reset");
}
