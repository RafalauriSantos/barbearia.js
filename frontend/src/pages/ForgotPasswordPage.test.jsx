import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";

const authApiMock = vi.hoisted(() => ({
	requestPasswordReset: vi.fn(),
	resetPassword: vi.fn(),
}));

vi.mock("@/lib/api/auth.api", () => ({
	requestPasswordReset: authApiMock.requestPasswordReset,
	resetPassword: authApiMock.resetPassword,
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe("ForgotPasswordPage", () => {
	it("requests a code and resets the password without exposing returned codes", async () => {
		authApiMock.requestPasswordReset.mockResolvedValueOnce({
			ok: true,
			resetCode: "654321",
		});
		authApiMock.resetPassword.mockResolvedValueOnce({ ok: true });

		render(
			<MemoryRouter initialEntries={["/forgot-password?email=cliente@example.com"]}>
				<ForgotPasswordPage />
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Enviar codigo" }));

		await waitFor(() => {
			expect(
				screen.getByText("Enviamos um codigo de 6 digitos para seu email."),
			).toBeTruthy();
		});

		expect(authApiMock.requestPasswordReset).toHaveBeenCalledWith({
			email: "cliente@example.com",
		});
		expect(screen.queryByText(/654321/)).toBeNull();
		expect(screen.queryByLabelText("Email")).toBeNull();
		expect(screen.queryByDisplayValue("cliente@example.com")).toBeNull();

		fireEvent.change(screen.getByLabelText("Codigo de 6 digitos"), {
			target: { value: "123456" },
		});
		fireEvent.change(screen.getByLabelText("Nova senha"), {
			target: { value: "NovaSenha123" },
		});
		expect(screen.queryByLabelText("Confirmar nova senha")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

		await waitFor(() => {
			expect(
				screen.getByText("Senha redefinida. Agora voce ja pode entrar."),
			).toBeTruthy();
		});

		expect(authApiMock.resetPassword).toHaveBeenCalledWith({
			email: "cliente@example.com",
			code: "123456",
			password: "NovaSenha123",
		});
	});
});
