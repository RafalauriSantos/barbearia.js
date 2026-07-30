import { apiClient } from "./client";

export async function getProfile() {
	const response = await apiClient.get("/profile");
	return response.data;
}

export async function updateProfile(profile: Record<string, any>) {
	const response = await apiClient.put("/profile", profile);
	return response.data;
}

export async function resetAllData(): Promise<void> {
	await apiClient.delete("/reset");
}
