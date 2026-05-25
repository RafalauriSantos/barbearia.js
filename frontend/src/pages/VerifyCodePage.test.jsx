import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import VerifyCodePage from "./VerifyCodePage";

const authApiMock = vi.hoisted(() => ({
	verifyEmailCode: vi.fn(),
	resendEmailCode: vi.fn(),
}));

vi.mock("@/lib/api/auth.api", () => authApiMock);

afterEach(() => {
	vi.clearAllMocks();
	window.sessionStorage.clear();
});

describe("VerifyCodePage", () => {
	it("uses the stored email without showing it on the code screen", async () => {
		window.sessionStorage.setItem(
			"kash_flow_pending_verification_email",
			"cliente@example.com",
		);
		authApiMock.verifyEmailCode.mockResolvedValueOnce({ ok: true });

		render(
			<MemoryRouter initialEntries={["/verify-code"]}>
				<VerifyCodePage />
			</MemoryRouter>,
		);

		expect(screen.queryByLabelText("Email")).toBeNull();
		expect(screen.queryByDisplayValue("cliente@example.com")).toBeNull();

		fireEvent.change(screen.getByLabelText("Codigo de 6 digitos"), {
			target: { value: "123456" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirmar codigo" }));

		await waitFor(() => {
			expect(authApiMock.verifyEmailCode).toHaveBeenCalledWith({
				email: "cliente@example.com",
				code: "123456",
			});
		});
	});
});
