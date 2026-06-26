import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/services.api", async (importOriginal) => {
	const original = await importOriginal();
	return { ...original, listServices: vi.fn() };
});

vi.mock("@/lib/api/appointments.api", async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		createAppointment: vi.fn(),
		listAppointmentsByDay: vi.fn(),
	};
});

import { listServices } from "@/lib/api/services.api";
import {
	createAppointment,
	listAppointmentsByDay,
} from "@/lib/api/appointments.api";
import { AppApiError } from "@/lib/api/client";
import {
	addAppointment,
	clearAppDataCache,
	configureAppDataCache,
	getAppointmentsForDayWithFilters,
	getCachedServices,
	loadServices,
} from "@/lib/store";

function deferred() {
	let resolve;
	const promise = new Promise((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

describe("scoped application cache", () => {
	beforeEach(() => {
		Object.defineProperty(window.navigator, "onLine", {
			value: true,
			configurable: true,
		});
		localStorage.clear();
		clearAppDataCache();
		vi.clearAllMocks();
	});

	it("discards a response when the authenticated cache scope changes", async () => {
		const request = deferred();
		listServices.mockReturnValueOnce(request.promise);
		configureAppDataCache({
			id: "user-a",
			barbearia_id: "shop-a",
			barbeiro_id: "barber-a",
		});

		const pendingLoad = loadServices({ force: true });
		configureAppDataCache({
			id: "user-b",
			barbearia_id: "shop-b",
			barbeiro_id: "barber-b",
		});
		request.resolve([{ id: "service-a", name: "Corte da conta A" }]);

		await expect(pendingLoad).rejects.toMatchObject({
			code: "STALE_CACHE_REQUEST",
		});
		expect(getCachedServices()).toBeUndefined();
	});

	it("discards a pending response when the authenticated cache is cleared", async () => {
		const request = deferred();
		listServices.mockReturnValueOnce(request.promise);
		configureAppDataCache({
			id: "user-a",
			barbearia_id: "shop-a",
			barbeiro_id: "barber-a",
		});

		const pendingLoad = loadServices({ force: true });
		clearAppDataCache();
		request.resolve([{ id: "service-a", name: "Corte da conta A" }]);

		await expect(pendingLoad).rejects.toMatchObject({
			code: "STALE_CACHE_REQUEST",
		});
		expect(getCachedServices()).toBeUndefined();
	});

	it("queues appointments locally when network is offline", async () => {
		configureAppDataCache({
			id: "user-a",
			barbearia_id: "shop-a",
			barbeiro_id: "barber-a",
		});

		createAppointment.mockRejectedValueOnce(
			new AppApiError("Sem conexao", undefined, undefined),
		);

		const queued = await addAppointment({
			client_name: "Cliente Offline",
			day_key: "2026-06-25",
			time_slot: "09:00",
			barbeiro_id: "barber-a",
			value: 45,
		});

		expect(queued.offline_pending).toBe(true);
		expect(queued.client_name).toBe("Cliente Offline");
		expect(queued.id).toContain("offline-appt-");
	});

	it("returns offline queued appointments when list API is unavailable", async () => {
		configureAppDataCache({
			id: "user-a",
			barbearia_id: "shop-a",
			barbeiro_id: "barber-a",
		});

		createAppointment.mockRejectedValueOnce(
			new AppApiError("Sem conexao", undefined, undefined),
		);
		await addAppointment({
			client_name: "Cliente Offline",
			day_key: "2026-06-25",
			time_slot: "10:00",
			barbeiro_id: "barber-a",
			value: 40,
		});

		listAppointmentsByDay.mockRejectedValueOnce(
			new AppApiError("Sem conexao", undefined, undefined),
		);
		Object.defineProperty(window.navigator, "onLine", {
			value: false,
			configurable: true,
		});

		const list = await getAppointmentsForDayWithFilters(
			"2026-06-25",
			{ barbeiro_id: "barber-a" },
			{ force: true },
		);

		expect(list).toHaveLength(1);
		expect(list[0].offline_pending).toBe(true);
		expect(list[0].client_name).toBe("Cliente Offline");
	});
});
