import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppPage from "./AppPage";

const appointmentsListRenders = vi.hoisted(() => []);

const storeMock = vi.hoisted(() => ({
	deleteAppointment: vi.fn(),
	formatCurrency: vi.fn(),
	formatDateDisplay: vi.fn(),
	formatDayKey: vi.fn(),
	getCachedAppointmentsForDay: vi.fn(),
	getCachedBarbers: vi.fn(),
	getCachedDaySummaryFromAppointments: vi.fn(),
	getCachedPaymentMethods: vi.fn(),
	getCachedProducts: vi.fn(),
	getCachedProfile: vi.fn(),
	getCachedServices: vi.fn(),
	getAppointmentsForDayWithFilters: vi.fn(),
	getDaySummaryFromAppointments: vi.fn(),
	isToday: vi.fn(),
	loadProducts: vi.fn(),
	loadServices: vi.fn(),
	loadBarbers: vi.fn(),
	loadPaymentMethods: vi.fn(),
	loadProfile: vi.fn(),
	updateAppointment: vi.fn(),
}));

vi.mock("@/components/AppointmentsList", () => ({
	AppointmentsList: (props) => {
		appointmentsListRenders.push(props);
		return <div data-testid="appointments-list">{props.children}</div>;
	},
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

function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});
	return { promise, resolve, reject };
}

function makeSummary(list) {
	return {
		totalReceived: 0,
		totalClients: list.length,
		totalIncome: 0,
		totalExpenses: 0,
		paid: 0,
		pending: list.length,
		toCollect: 0,
		overdue: 0,
	};
}

describe("AppPage render stability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appointmentsListRenders.length = 0;
		const appointments = [
			{
				id: "appt-owner",
				client_name: "Cliente Owner",
				time_slot: "09:00",
				value: 100,
				status: "normal",
			},
		];
		storeMock.formatCurrency.mockImplementation(
			(value) => `R$ ${Number(value || 0).toFixed(2)}`,
		);
		storeMock.formatDateDisplay.mockReturnValue("30 mai");
		storeMock.formatDayKey.mockReturnValue("2026-05-30");
		storeMock.isToday.mockReturnValue(true);
		storeMock.getCachedAppointmentsForDay.mockReturnValue(appointments);
		storeMock.getCachedDaySummaryFromAppointments.mockReturnValue(
			makeSummary(appointments),
		);
		storeMock.getCachedProfile.mockReturnValue({
			shopName: "Perfil inicial",
			barberName: "Rafael",
		});
		storeMock.getCachedBarbers.mockReturnValue([]);
		storeMock.getCachedServices.mockReturnValue([]);
		storeMock.getCachedProducts.mockReturnValue([]);
		storeMock.getCachedPaymentMethods.mockReturnValue([]);
		storeMock.getAppointmentsForDayWithFilters.mockResolvedValue(appointments);
		storeMock.getDaySummaryFromAppointments.mockImplementation(
			async (_dayKey, list) => makeSummary(list),
		);
		storeMock.loadBarbers.mockResolvedValue([]);
		storeMock.loadProducts.mockResolvedValue([]);
		storeMock.loadServices.mockResolvedValue([]);
		storeMock.loadPaymentMethods.mockResolvedValue([]);
	});

	it("keeps the status swipe callback stable when only profile changes", async () => {
		const profileRequest = deferred();
		storeMock.loadProfile.mockReturnValue(profileRequest.promise);

		render(
			<MemoryRouter initialEntries={["/app"]}>
				<AppPage />
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(storeMock.getDaySummaryFromAppointments).toHaveBeenCalled();
		});
		const beforeProfileUpdate =
			appointmentsListRenders.at(-1).onStatusChange;

		profileRequest.resolve({
			shopName: "Perfil atualizado",
			barberName: "Rafael",
		});

		expect(await screen.findByText("Perfil atualizado")).toBeTruthy();
		expect(appointmentsListRenders.at(-1).onStatusChange).toBe(
			beforeProfileUpdate,
		);
	});
});
