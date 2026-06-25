import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const handlers = {};
	const apiClient = vi.fn();
	apiClient.interceptors = {
		request: {
			use: vi.fn((handler) => {
				handlers.request = handler;
			}),
		},
		response: {
			use: vi.fn((_success, failure) => {
				handlers.responseFailure = failure;
			}),
		},
	};

	return {
		handlers,
		apiClient,
		axios: {
			create: vi.fn(() => apiClient),
			get: vi.fn(),
			post: vi.fn(),
		},
	};
});

vi.mock("axios", () => ({ default: mocks.axios }));

import "@/lib/api/client";

function deferred() {
	let resolve;
	const promise = new Promise((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

function setSession(accessToken, refreshToken) {
	localStorage.setItem("gestor_barbearia_access_token", accessToken);
	localStorage.setItem("gestor_barbearia_refresh_token", refreshToken);
}

describe("API client session isolation", () => {
	beforeEach(() => {
		localStorage.clear();
		mocks.apiClient.mockReset();
		mocks.axios.post.mockReset();
	});

	it("does not refresh or expire a new session for an old request", async () => {
		setSession("access-a", "refresh-a");
		const requestConfig = mocks.handlers.request({
			headers: {},
			url: "/profile",
		});
		setSession("access-b", "refresh-b");

		await expect(
			mocks.handlers.responseFailure({
				response: { status: 401, data: { error: "Unauthorized" } },
				config: requestConfig,
			}),
		).rejects.toMatchObject({ status: 401 });

		expect(mocks.axios.post).not.toHaveBeenCalled();
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBe(
			"access-b",
		);
		expect(localStorage.getItem("gestor_barbearia_refresh_token")).toBe(
			"refresh-b",
		);
	});

	it("does not overwrite a new session when the old refresh finishes", async () => {
		const refresh = deferred();
		mocks.axios.post.mockReturnValue(refresh.promise);
		setSession("access-a", "refresh-a");
		const requestConfig = mocks.handlers.request({
			headers: {},
			url: "/profile",
		});
		const pendingResponse = mocks.handlers.responseFailure({
			response: { status: 401, data: { error: "Unauthorized" } },
			config: requestConfig,
		});

		setSession("access-b", "refresh-b");
		refresh.resolve({ data: { accessToken: "refreshed-access-a" } });

		await expect(pendingResponse).rejects.toMatchObject({ status: 401 });
		expect(mocks.apiClient).not.toHaveBeenCalled();
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBe(
			"access-b",
		);
	});

	it("refreshes and retries a request that still belongs to the current session", async () => {
		mocks.axios.post.mockResolvedValue({
			data: { accessToken: "refreshed-access-a" },
		});
		setSession("access-a", "refresh-a");
		const requestConfig = mocks.handlers.request({
			headers: {},
			url: "/profile",
		});

		await mocks.handlers.responseFailure({
			response: { status: 401, data: { error: "Unauthorized" } },
			config: requestConfig,
		});

		expect(mocks.axios.post).toHaveBeenCalledWith(
			expect.stringContaining("/auth/refresh"),
			{ refreshToken: "refresh-a" },
			expect.any(Object),
		);
		expect(mocks.apiClient).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBe(
			"refreshed-access-a",
		);
	});

	it("returns a network-specific error when the API is unreachable", async () => {
		setSession("access-a", "refresh-a");
		const requestConfig = mocks.handlers.request({
			headers: {},
			url: "/profile",
		});

		await expect(
			mocks.handlers.responseFailure({
				code: "ERR_NETWORK",
				message: "Network Error",
				config: requestConfig,
			}),
		).rejects.toMatchObject({
			kind: "network",
			message:
				"Sem conexao com a internet ou a API esta indisponivel. Tente novamente.",
		});
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBe(
			"access-a",
		);
		expect(localStorage.getItem("gestor_barbearia_refresh_token")).toBe(
			"refresh-a",
		);
	});
});
