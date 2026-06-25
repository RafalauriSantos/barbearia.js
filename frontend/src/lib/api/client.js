import axios from "axios";
import {
	clearSessionTokens,
	getAccessToken,
	getRefreshToken,
	setAccessToken,
} from "@/lib/auth";

export const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:3000";
export const API_TIMEOUT_MS = Number(
	import.meta.env.VITE_API_TIMEOUT_MS || 75000,
);
export const SESSION_EXPIRED_EVENT = "gestor-barbearia:session-expired";
const NETWORK_ERROR_MESSAGE =
	"Sem conexao com a internet ou a API esta indisponivel. Tente novamente.";

function isNetworkError(error) {
	if (error?.response) return false;
	const code = String(error?.code || "").toUpperCase();
	const message = String(error?.message || "").toLowerCase();
	return (
		code === "ERR_NETWORK" ||
		code === "ERR_INTERNET_DISCONNECTED" ||
		code === "ECONNREFUSED" ||
		code === "ENOTFOUND" ||
		message.includes("network error") ||
		message.includes("internet disconnected") ||
		message.includes("failed to fetch")
	);
}

function expireSession() {
	clearSessionTokens();
	if (typeof window !== "undefined") {
		window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
	}
}

export class AppApiError extends Error {
	constructor(message, status, details) {
		super(message);
		this.name = "AppApiError";
		this.status = status;
		this.details = details;
		this.kind = status == null ? "network" : "http";
	}
}

function toAppApiError(error, fallbackMessage) {
	if (error instanceof AppApiError) return error;

	if (isNetworkError(error)) {
		return new AppApiError(
			fallbackMessage || NETWORK_ERROR_MESSAGE,
			undefined,
			error?.response?.data,
		);
	}

	const status = error?.response?.status;
	const details = error?.response?.data;
	const isTimeout =
		error?.code === "ECONNABORTED" ||
		String(error?.message || "")
			.toLowerCase()
			.includes("timeout");
	const message =
		fallbackMessage ||
		details?.erro ||
		details?.error ||
		details?.message ||
		(isTimeout ?
			"O servidor demorou para responder. Aguarde alguns segundos e tente novamente."
		:	null) ||
		error?.message ||
		"Nao foi possivel concluir a requisicao.";

	return new AppApiError(message, status, details);
}

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: API_TIMEOUT_MS,
});

const refreshRequests = new Map();
let warmUpRequest = null;

export function warmUpApi() {
	if (import.meta.env.MODE === "test") {
		return Promise.resolve(null);
	}

	warmUpRequest =
		warmUpRequest ||
		axios
			.get(`${API_BASE_URL}/health/db`, {
				timeout: API_TIMEOUT_MS,
				validateStatus: () => true,
			})
			.catch(() => null)
			.finally(() => {
				warmUpRequest = null;
			});

	return warmUpRequest;
}

apiClient.interceptors.request.use((config) => {
	const token = getAccessToken();
	config._sessionAccessToken = token;
	config._sessionRefreshToken = getRefreshToken();
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
		const refreshToken = originalRequest?._sessionRefreshToken || "";
		const requestAccessToken = originalRequest?._sessionAccessToken || "";
		const currentRefreshToken = getRefreshToken();
		const sameSession =
			refreshToken ?
				refreshToken === currentRefreshToken
			:	requestAccessToken === getAccessToken();
		const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

		if (status === 401 && originalRequest && !sameSession) {
			return Promise.reject(toAppApiError(error));
		}

		if (
			status === 401 &&
			originalRequest &&
			!originalRequest._retry &&
			!isRefreshRequest &&
			refreshToken
		) {
			originalRequest._retry = true;

			try {
				let refreshRequest = refreshRequests.get(refreshToken);
				if (!refreshRequest) {
					refreshRequest = axios
						.post(
							`${API_BASE_URL}/auth/refresh`,
							{ refreshToken },
							{ timeout: API_TIMEOUT_MS },
						)
						.finally(() => {
							if (refreshRequests.get(refreshToken) === refreshRequest) {
								refreshRequests.delete(refreshToken);
							}
						});
					refreshRequests.set(refreshToken, refreshRequest);
				}

				const response = await refreshRequest;
				if (getRefreshToken() !== refreshToken) {
					return Promise.reject(toAppApiError(error));
				}
				const newAccessToken = response.data?.accessToken;
				if (!newAccessToken) {
					throw new Error("Refresh response missing accessToken.");
				}

				setAccessToken(newAccessToken);
				originalRequest.headers = originalRequest.headers || {};
				originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				return apiClient(originalRequest);
			} catch (refreshError) {
				if (getRefreshToken() === refreshToken) {
					expireSession();
				}
				return Promise.reject(
					toAppApiError(refreshError, "Sessao expirada. Entre novamente."),
				);
			}
		}

		if (status === 401 && sameSession && getAccessToken()) {
			expireSession();
		}

		return Promise.reject(toAppApiError(error));
	},
);
