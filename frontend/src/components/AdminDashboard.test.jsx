import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({
	addBarber: vi.fn(),
	formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
	sendBarberInvite: vi.fn(),
}));

vi.mock("@/components/AppointmentDialog", () => ({
	AppointmentDialog: () => <div>Appointment dialog open</div>,
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

	it("uses the team page state to show the management sheet", () => {
		render(
			<AdminDashboard
				dayKey="2026-06-20"
				barbers={[]}
				appointments={[]}
				isLoading={false}
				errorMessage=""
				onRetry={vi.fn()}
				onReload={vi.fn()}
				teamSheetOpen
				onTeamSheetOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("heading", { name: "Gerenciar equipe" })).toBeTruthy();
	});

	it("renders the approved compact team overview without redundant metrics", () => {
		render(
			<AdminDashboard
				dayKey="2026-06-20"
				barbers={[
					{ id: "barber-1", name: "Samuel", usuario_id: "user-1" },
					{ id: "barber-2", name: "Renan", usuario_id: "user-2" },
					{ id: "barber-3", name: "Lucas", convite_pendente: true },
				]}
				appointments={[
					{
						id: "appointment-1",
						barbeiro_id: "barber-1",
						time_slot: "09:30",
						client_name: "Rafael Souza",
						services: [{ name: "Corte masculino" }],
						status: "normal",
					},
					{
						id: "appointment-2",
						barbeiro_id: "barber-1",
						time_slot: "14:00",
						client_name: "Caio",
						status: "normal",
					},
					{
						id: "appointment-3",
						barbeiro_id: "barber-2",
						time_slot: "11:00",
						client_name: "Bruno Lima",
						status: "normal",
					},
				]}
				isLoading={false}
				errorMessage=""
				onRetry={vi.fn()}
				onReload={vi.fn()}
			/>,
		);

		expect(screen.getByText("3 barbeiros · 3 atendimentos hoje")).toBeTruthy();
		expect(screen.getByText("SA")).toBeTruthy();
		expect(screen.getAllByText("Acesso liberado")).toHaveLength(2);
		expect(screen.getByText("Agenda livre")).toBeTruthy();
		expect(screen.queryByText("Livres")).toBeNull();
		expect(screen.queryByText("Recebido")).toBeNull();
		expect(screen.queryByText("Ver agenda do barbeiro")).toBeNull();

		fireEvent.click(screen.getByLabelText("Adicionar cliente para Samuel"));
		expect(screen.getByText("Appointment dialog open")).toBeTruthy();

		fireEvent.click(screen.getByLabelText("Abrir agenda de Samuel"));
		expect(screen.getByRole("heading", { name: "Samuel" })).toBeTruthy();
	});

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
				teamSheetOpen
				onTeamSheetOpenChange={vi.fn()}
			/>,
		);

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
				teamSheetOpen
				onTeamSheetOpenChange={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

		expect(
			await screen.findByText(/Convite enviado e link pronto para copiar\./),
		).toBeTruthy();
		expect(screen.queryByText("reload failed")).toBeNull();
	});

	it("keeps the new barber form collapsed until requested", () => {
		render(
			<AdminDashboard
				dayKey="2026-06-20"
				barbers={[]}
				appointments={[]}
				isLoading={false}
				errorMessage=""
				onRetry={vi.fn()}
				onReload={vi.fn()}
				teamSheetOpen
				onTeamSheetOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Adicionar barbeiro" })).toBeTruthy();
		expect(screen.queryByPlaceholderText("Ex: João")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Adicionar barbeiro" }));

		expect(screen.getByLabelText("Nome")).toBeTruthy();
		expect(screen.getByLabelText("Email de acesso")).toBeTruthy();
		expect(screen.getByLabelText("Comissão %")).toBeTruthy();
	});
});
