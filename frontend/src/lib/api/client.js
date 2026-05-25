import axios from "axios";
import {
	clearSessionTokens,
	getAccessToken,
	getRefreshToken,
	setAccessToken,
} from "@/lib/auth";

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

function toAppApiError(error, fallbackMessage) {
	if (error instanceof AppApiError) return error;

	const status = error?.response?.status;
	const details = error?.response?.data;
	const message =
		fallbackMessage ||
		details?.erro ||
		details?.error ||
		details?.message ||
		error?.message ||
		"Nao foi possivel concluir a requisicao.";

	return new AppApiError(message, status, details);
}

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
});

let refreshRequest = null;

apiClient.interceptors.request.use((config) => {
	const token = getAccessToken();
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status = error?.response?.status;
		const originalRequest = error?.config;
		const refreshToken = getRefreshToken();
		const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

		if (
			status === 401 &&
			originalRequest &&
			!originalRequest._retry &&
			!isRefreshRequest &&
			refreshToken
		) {
			originalRequest._retry = true;

			try {
				refreshRequest =
					refreshRequest ||
					axios
						.post(
							`${API_BASE_URL}/auth/refresh`,
							{ refreshToken },
							{ timeout: 10000 },
						)
						.finally(() => {
							refreshRequest = null;
						});

				const response = await refreshRequest;
				const newAccessToken = response.data?.accessToken;
				if (!newAccessToken) {
					throw new Error("Refresh response missing accessToken.");
				}

				setAccessToken(newAccessToken);
				originalRequest.headers = originalRequest.headers || {};
				originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				return apiClient(originalRequest);
			} catch (refreshError) {
				clearSessionTokens();
				return Promise.reject(
					toAppApiError(refreshError, "Sessao expirada. Entre novamente."),
				);
			}
		}

		return Promise.reject(toAppApiError(error));
	},
);
