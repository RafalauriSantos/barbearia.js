import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/auth.api", () => ({
	login: vi.fn(),
	me: vi.fn(),
	register: vi.fn(),
	verifyEmailCode: vi.fn(),
	acceptInvite: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
	clearAppDataCache: vi.fn(),
	configureAppDataCache: vi.fn(),
	prefetchAppData: vi.fn(),
}));

import { me } from "@/lib/api/auth.api";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { AppApiError } from "@/lib/api/client";

function AuthState() {
	const { isAuthenticated } = useAuth();
	return <p>{isAuthenticated ? "autenticado" : "anonimo"}</p>;
}

describe("AuthProvider session lifecycle", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		localStorage.setItem("gestor_barbearia_access_token", "token");
		localStorage.setItem(
			"gestor_barbearia_auth_user_v1",
			JSON.stringify({ id: "user-1", role: "admin" }),
		);
		me.mockResolvedValue({ id: "user-1", role: "admin" });
	});

	it("clears the visible user when the API reports an expired session", async () => {
		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);
		await screen.findByText("autenticado");

		act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));

		await waitFor(() => expect(screen.getByText("anonimo")).toBeTruthy());
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBeNull();
		expect(localStorage.getItem("gestor_barbearia_auth_user_v1")).toBeNull();
	});

	it("keeps the cached session when the API is unreachable", async () => {
		me.mockRejectedValue(new AppApiError("Sem conexao", undefined, undefined));

		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText("autenticado")).toBeTruthy());
		expect(localStorage.getItem("gestor_barbearia_access_token")).toBe("token");
		expect(localStorage.getItem("gestor_barbearia_auth_user_v1")).toBe(
			JSON.stringify({ id: "user-1", role: "admin" }),
		);
	});
});
