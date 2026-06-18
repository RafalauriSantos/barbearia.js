import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpensesPage from "./ExpensesPage";

const storeMock = vi.hoisted(() => ({
	addExpense: vi.fn(),
	updateExpense: vi.fn(),
	deleteExpense: vi.fn(),
	getCachedExpenses: vi.fn(),
	loadExpenses: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: { role: "admin" } }),
}));

vi.mock("@/lib/store", () => ({
	formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
	formatDayKey: () => "2026-05-28",
	formatDateDisplay: () => "28 mai",
	addExpense: storeMock.addExpense,
	updateExpense: storeMock.updateExpense,
	deleteExpense: storeMock.deleteExpense,
	getCachedExpenses: storeMock.getCachedExpenses,
	loadExpenses: storeMock.loadExpenses,
}));

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.loadExpenses.mockResolvedValue([
		{ id: "expense-1", name: "Aluguel", value: 120, date: "2026-05-28" },
	]);
});

describe("ExpensesPage", () => {
	it("edits an existing expense from the card action", async () => {
		storeMock.updateExpense.mockResolvedValue({
			id: "expense-1",
			name: "Internet",
			value: 150,
			date: "2026-05-28",
		});

		render(
			<MemoryRouter initialEntries={["/expenses"]}>
				<ExpensesPage />
			</MemoryRouter>,
		);

		expect(await screen.findByText("Aluguel")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Editar" }));

		expect(screen.getByRole("heading", { name: "Editar custo" })).toBeTruthy();

		fireEvent.change(screen.getByDisplayValue("Aluguel"), {
			target: { value: "Internet" },
		});
		fireEvent.change(screen.getByDisplayValue("120"), {
			target: { value: "150,00" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => {
			expect(storeMock.updateExpense).toHaveBeenCalledWith("expense-1", {
				name: "Internet",
				value: 150,
				date: "2026-05-28",
			});
		});
	});
});
