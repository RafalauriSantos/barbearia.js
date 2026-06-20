import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "./ClientsPage";

const storeMock = vi.hoisted(() => ({
	addFixedClient: vi.fn(),
	addFixedClientCut: vi.fn(),
	addWaitlistEntry: vi.fn(),
	deleteFixedClient: vi.fn(),
	deleteFixedClientCut: vi.fn(),
	deleteWaitlistEntry: vi.fn(),
	getCachedFixedClients: vi.fn(),
	getCachedPaymentMethods: vi.fn(),
	getCachedWaitlist: vi.fn(),
	loadFixedClients: vi.fn(),
	loadPaymentMethods: vi.fn(),
	loadWaitlist: vi.fn(),
	saveFixedClient: vi.fn(),
	saveFixedClientCut: vi.fn(),
	saveWaitlistEntry: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
	...storeMock,
	formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
	formatDayKey: () => "2026-06-20",
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: { role: "admin" } }),
}));

const client = {
	id: "client-1",
	name: "Samuel",
	phone: "11999999999",
	interval_days: 15,
	package_total_cuts: 4,
	cuts_count: 0,
	cuts: [],
};

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.getCachedFixedClients.mockReturnValue([client]);
	storeMock.getCachedWaitlist.mockReturnValue([]);
	storeMock.getCachedPaymentMethods.mockReturnValue([
		{ id: "pay-pix", code: "pix", name: "Pix", active: true },
	]);
	storeMock.loadFixedClients.mockResolvedValue([client]);
	storeMock.loadWaitlist.mockResolvedValue([]);
	storeMock.loadPaymentMethods.mockResolvedValue([
		{ id: "pay-pix", code: "pix", name: "Pix", active: true },
	]);
	storeMock.addFixedClientCut.mockResolvedValue(client);
});

describe("ClientsPage", () => {
	it("registers a paid fixed-client cut with payment method and date", async () => {
		render(
			<MemoryRouter>
				<ClientsPage />
			</MemoryRouter>,
		);

		fireEvent.click(await screen.findByRole("button", { name: "Corte" }));
		fireEvent.change(screen.getByLabelText("Valor"), {
			target: { value: "45,00" },
		});
		fireEvent.change(screen.getByLabelText("Pagamento"), {
			target: { value: "paid" },
		});
		fireEvent.change(screen.getByLabelText("Forma"), {
			target: { value: "pay-pix" },
		});
		fireEvent.change(screen.getByLabelText("Data do pagamento"), {
			target: { value: "2026-06-15" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Registrar corte" }));

		await waitFor(() => {
			expect(storeMock.addFixedClientCut).toHaveBeenCalledWith("client-1", {
				date: "2026-06-20",
				time: "09:00",
				value: 45,
				status: "paid",
				payment_method_id: "pay-pix",
				payment_date: "2026-06-15",
				due_date: null,
				notes: "",
			});
		});
	});
});
