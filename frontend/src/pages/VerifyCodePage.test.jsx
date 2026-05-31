import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import VerifyCodePage from "./VerifyCodePage";

const authApiMock = vi.hoisted(() => ({
	resendEmailCode: vi.fn(),
}));
const authContextMock = vi.hoisted(() => ({
	verifyEmailCode: vi.fn(),
}));

vi.mock("@/lib/api/auth.api", () => authApiMock);
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => authContextMock,
}));

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
		authContextMock.verifyEmailCode.mockResolvedValueOnce({
			ok: true,
			accessToken: "access-token",
			refreshToken: "refresh-token",
		});

		render(
			<MemoryRouter initialEntries={["/verify-code"]}>
				<Routes>
					<Route path="/verify-code" element={<VerifyCodePage />} />
					<Route path="/app" element={<div>Agenda operacional</div>} />
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.queryByLabelText("Email")).toBeNull();
		expect(screen.queryByDisplayValue("cliente@example.com")).toBeNull();

		fireEvent.change(screen.getByLabelText("Codigo de 6 digitos"), {
			target: { value: "123456" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirmar codigo" }));

		await waitFor(() => {
			expect(authContextMock.verifyEmailCode).toHaveBeenCalledWith({
				email: "cliente@example.com",
				code: "123456",
			});
		});
		expect(await screen.findByText("Agenda operacional")).toBeTruthy();
	});
});
