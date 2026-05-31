import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppPage from "./AppPage";

const storeMock = vi.hoisted(() => ({
	deleteAppointment: vi.fn(),
	formatCurrency: vi.fn(),
	formatDateDisplay: vi.fn(),
	formatDayKey: vi.fn(),
	getAppointmentsForDayWithFilters: vi.fn(),
	getDaySummaryFromAppointments: vi.fn(),
	isToday: vi.fn(),
	loadProducts: vi.fn(),
	loadServices: vi.fn(),
	loadBarbers: vi.fn(),
	loadProfile: vi.fn(),
	updateAppointment: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: {
			id: "user-owner",
			role: "admin",
			barbeiro_id: "barber-owner",
			nome: "Rafael",
			email: "rafael@example.com",
		},
	}),
}));

vi.mock("@/lib/store", () => storeMock);

function makeSummary(list) {
	return list.reduce(
		(summary, appointment) => {
			const value = Number(appointment.value || 0);
			if (appointment.status === "paid") summary.totalReceived += value;
			if (appointment.status === "fiado") summary.toCollect += value;
			summary.totalClients += 1;
			return summary;
		},
		{
			totalReceived: 0,
			totalClients: 0,
			totalIncome: 0,
			totalExpenses: 0,
			paid: 0,
			pending: 0,
			toCollect: 0,
			overdue: 0,
		},
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.formatCurrency.mockImplementation(
		(value) => `R$ ${Number(value || 0).toFixed(2)}`,
	);
	storeMock.formatDateDisplay.mockReturnValue("30 mai");
	storeMock.formatDayKey.mockReturnValue("2026-05-30");
	storeMock.isToday.mockReturnValue(true);
	storeMock.loadProfile.mockResolvedValue({
		shopName: "Kurt Prime",
		barberName: "Rafael",
		barberPhotoUrl: "https://cdn.example.com/rafael.png",
	});
	storeMock.loadServices.mockResolvedValue([]);
	storeMock.loadProducts.mockResolvedValue([]);
	storeMock.loadBarbers.mockResolvedValue([
		{
			id: "barber-owner",
			name: "Rafael Owner",
			usuario_id: "user-owner",
		},
		{ id: "barber-bia", name: "Bia Santos" },
		{ id: "barber-caio", name: "Caio Lima" },
	]);
	storeMock.getAppointmentsForDayWithFilters.mockImplementation(
		async (_dayKey, filters = {}) => {
			if (filters.barbeiro_id === "barber-bia") {
				return [
					{
						id: "appt-bia",
						client_name: "Cliente Bia",
						time_slot: "10:00",
						value: 50,
						status: "fiado",
					},
				];
			}

			if (filters.barbeiro_id === "barber-owner") {
				return [
					{
						id: "appt-owner",
						client_name: "Cliente Owner",
						time_slot: "09:00",
						value: 100,
						status: "paid",
					},
				];
			}

			return [];
		},
	);
	storeMock.getDaySummaryFromAppointments.mockImplementation(
		async (_dayKey, list) => makeSummary(list),
	);
});

describe("AppPage barber avatar row", () => {
	it("opens on the user agenda and renders only other barbers", async () => {
		render(
			<MemoryRouter initialEntries={["/app"]}>
				<AppPage />
			</MemoryRouter>,
		);

		expect(await screen.findByText("sua agenda")).toBeTruthy();
		expect(await screen.findByAltText("Rafael")).toBeTruthy();
		await waitFor(() => {
			expect(storeMock.getAppointmentsForDayWithFilters).toHaveBeenCalledWith(
				"2026-05-30",
				{ barbeiro_id: "barber-owner" },
			);
		});

		expect(screen.queryByText("Todos")).toBeNull();
		expect(screen.queryByText("Rafael Owner")).toBeNull();
		expect(await screen.findByText("Bia Santos")).toBeTruthy();
		expect(screen.getByText("Caio Lima")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /minha agenda/i })).toBeNull();
	});

	it("selects an external barber and can return to the user agenda", async () => {
		render(
			<MemoryRouter initialEntries={["/app"]}>
				<AppPage />
			</MemoryRouter>,
		);

		const biaButton = (await screen.findByText("Bia Santos")).closest("button");
		fireEvent.click(biaButton);

		expect(await screen.findByText("agenda de Bia Santos")).toBeTruthy();
		await waitFor(() => {
			expect(
				storeMock.getAppointmentsForDayWithFilters.mock.calls.some(
					([dayKey, filters]) =>
						dayKey === "2026-05-30" &&
						filters?.barbeiro_id === "barber-bia",
				),
			).toBe(true);
		});
		expect(screen.getByText("R$ 50.00")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /minha agenda/i }));

		expect(await screen.findByText("sua agenda")).toBeTruthy();
		await waitFor(() => {
			expect(
				storeMock.getAppointmentsForDayWithFilters.mock.calls.some(
					([dayKey, filters]) =>
						dayKey === "2026-05-30" &&
						filters?.barbeiro_id === "barber-owner",
				),
			).toBe(true);
		});
		expect(screen.queryByRole("button", { name: /minha agenda/i })).toBeNull();
	});

	it("hides the row when there are no other barbers", async () => {
		storeMock.loadBarbers.mockResolvedValueOnce([
			{
				id: "barber-owner",
				name: "Rafael Owner",
				usuario_id: "user-owner",
			},
		]);

		render(
			<MemoryRouter initialEntries={["/app"]}>
				<AppPage />
			</MemoryRouter>,
		);

		expect(await screen.findByText("sua agenda")).toBeTruthy();
		await waitFor(() => {
			expect(storeMock.loadBarbers).toHaveBeenCalled();
		});

		expect(screen.queryByText("Todos")).toBeNull();
		expect(screen.queryByText("Rafael Owner")).toBeNull();
		expect(screen.queryByRole("button", { name: /minha agenda/i })).toBeNull();
	});
});
