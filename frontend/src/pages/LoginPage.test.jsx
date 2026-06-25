import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import { AppApiError } from "@/lib/api/client";

const authMock = vi.hoisted(() => ({
	login: vi.fn(),
	signup: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		isAuthenticated: false,
		isLoading: false,
		login: authMock.login,
		signup: authMock.signup,
	}),
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe("LoginPage signup feedback", () => {
	it("opens the signup mode from query string", () => {
		render(
			<MemoryRouter initialEntries={["/login?mode=signup"]}>
				<LoginPage />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Criar conta" })).toBeTruthy();
		expect(screen.queryByText("Confirmar senha")).toBeNull();
	});

	it("does not expose verification codes returned by the backend", async () => {
		authMock.signup.mockResolvedValueOnce({
			verificationCode: "123456",
		});

		const { container } = render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Criar acesso" }));

		const inputs = container.querySelectorAll("input");
		fireEvent.change(inputs[0], {
			target: { value: "cliente@example.com" },
		});
		fireEvent.change(inputs[1], {
			target: { value: "SenhaTeste123" },
		});

		fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

		await waitFor(() => {
			expect(
				screen.getByText(
					"Conta criada. Enviamos um codigo de 6 digitos para seu email.",
				),
			).toBeTruthy();
		});

		expect(screen.queryByText(/verify-email/i)).toBeNull();
		expect(screen.queryByText(/123456/i)).toBeNull();
		expect(
			screen.getByRole("link", { name: "Esqueci minha senha" }),
		).toBeTruthy();
	});

	it("shows an offline message when login cannot reach the API", async () => {
		authMock.login.mockRejectedValueOnce(
			new AppApiError("Sem conexao", undefined, undefined),
		);

		const { container } = render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		const inputs = container.querySelectorAll("input");
		fireEvent.change(inputs[0], {
			target: { value: "cliente@example.com" },
		});
		fireEvent.change(inputs[1], {
			target: { value: "SenhaTeste123" },
		});

		fireEvent.click(container.querySelector('button[type="submit"]'));

		await waitFor(() => {
			expect(
				screen.getByText(
					"Sem conexao com a internet ou a API esta indisponivel. Tente novamente.",
				),
			).toBeTruthy();
		});
	});
});
