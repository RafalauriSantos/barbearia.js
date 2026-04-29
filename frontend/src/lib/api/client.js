import axios from "axios";

export const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:3000";

export class AppApiError extends Error {
	constructor(message, status, details) {
		super(message);
		this.name = "AppApiError";
		this.status = status;
		this.details = details;
	}
}

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
});

apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error?.response?.status;
		const details = error?.response?.data;
		const message =
			details?.erro ||
			details?.message ||
			error?.message ||
			"Nao foi possivel concluir a requisicao.";

		return Promise.reject(new AppApiError(message, status, details));
	},
);
