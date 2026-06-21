import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
	addBarber: vi.fn(),
	formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
	sendBarberInvite: vi.fn(),
}));

vi.mock("@/components/AppointmentDialog", () => ({
	AppointmentDialog: () => null,
}));

import { sendBarberInvite } from "@/lib/store";
import { AdminDashboard } from "@/components/AdminDashboard";

function deferred() {
	let resolve;
	const promise = new Promise((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

describe("AdminDashboard barber invitations", () => {
	beforeEach(() => vi.clearAllMocks());

	it("ignores repeated clicks while an invitation is being sent", async () => {
		const request = deferred();
		sendBarberInvite.mockReturnValue(request.promise);
		render(
			<AdminDashboard
				dayKey="2026-06-20"
				barbers={[
					{
						id: "barber-1",
						name: "Samuel",
						email: "samuel@example.com",
						comissao_percent: 50,
					},
				]}
				appointments={[]}
				isLoading={false}
				errorMessage=""
				onRetry={vi.fn()}
				onReload={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByLabelText("Gerenciar equipe"));
		const inviteButton = screen.getByRole("button", { name: "Enviar convite" });
		fireEvent.click(inviteButton);
		fireEvent.click(inviteButton);

		expect(sendBarberInvite).toHaveBeenCalledTimes(1);
		expect(inviteButton.disabled).toBe(true);
		await act(async () => {
			request.resolve({ inviteUrl: "https://example.com/invite" });
			await request.promise;
		});
	});

	it("keeps invite success feedback when only the list reload fails", async () => {
		sendBarberInvite.mockResolvedValue({
			inviteUrl: "https://example.com/invite",
		});
		render(
			<AdminDashboard
				dayKey="2026-06-20"
				barbers={[
					{
						id: "barber-1",
						name: "Samuel",
						email: "samuel@example.com",
						comissao_percent: 50,
					},
				]}
				appointments={[]}
				isLoading={false}
				errorMessage=""
				onRetry={vi.fn()}
				onReload={vi.fn().mockRejectedValue(new Error("reload failed"))}
			/>,
		);

		fireEvent.click(screen.getByLabelText("Gerenciar equipe"));
		fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

		expect(
			await screen.findByText(/Convite enviado e link pronto para copiar\./),
		).toBeTruthy();
		expect(screen.queryByText("reload failed")).toBeNull();
	});
});
