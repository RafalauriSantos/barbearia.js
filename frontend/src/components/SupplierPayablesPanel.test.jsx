import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupplierPayablesPanel } from "./SupplierPayablesPanel";

const storeMock = vi.hoisted(() => ({
	loadSupplierPayables: vi.fn(),
	paySupplierPayable: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
	formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
	formatDayKey: () => "2026-06-20",
	loadSupplierPayables: storeMock.loadSupplierPayables,
	paySupplierPayable: storeMock.paySupplierPayable,
}));

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.loadSupplierPayables.mockResolvedValue([
		{
			id: "payable-1",
			supplier_name: "Gerson",
			description: "Gel - 1 un.",
			value: 13,
			origin_date: "2026-06-15",
			status: "aberto",
		},
	]);
	storeMock.paySupplierPayable.mockResolvedValue({
		id: "payable-1",
		status: "pago",
	});
});

describe("SupplierPayablesPanel", () => {
	it("records a supplier payment with the selected date", async () => {
		render(
			<SupplierPayablesPanel
				startDate="2026-06-01"
				endDate="2026-06-30"
			/>,
		);

		expect(await screen.findByText("Gerson")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Dar baixa" }));
		fireEvent.change(screen.getByLabelText("Data do pagamento"), {
			target: { value: "2026-06-18" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirmar baixa" }));

		await waitFor(() => {
			expect(storeMock.paySupplierPayable).toHaveBeenCalledWith("payable-1", {
				payment_date: "2026-06-18",
			});
		});
	});
});
