import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/services.api", async (importOriginal) => {
	const original = await importOriginal();
	return { ...original, listServices: vi.fn() };
});

import { listServices } from "@/lib/api/services.api";
import {
	clearAppDataCache,
	configureAppDataCache,
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
});
