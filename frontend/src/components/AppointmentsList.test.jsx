import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentsList } from "./AppointmentsList";

const mockFormatCurrency = vi.hoisted(() => vi.fn());

vi.mock("@/lib/store", () => ({
	formatCurrency: mockFormatCurrency,
}));

const appointments = [
	{
		id: "appt-1",
		client_name: "Cliente Teste",
		time_slot: "09:00",
		value: 40,
		status: "normal",
		services: [{ id: "svc-1", name: "Corte", price: 40, quantity: 1 }],
	},
];

describe("AppointmentsList", () => {
	beforeEach(() => {
		mockFormatCurrency.mockImplementation(
			(value) => `R$ ${Number(value || 0).toFixed(2)}`,
		);
		mockFormatCurrency.mockClear();
	});

	it("renders the empty state and create action when there are no appointments", () => {
		const onCreate = vi.fn();

		render(
			<AppointmentsList
				appointments={[]}
				savingStatusId=""
				onCreate={onCreate}
				onOpen={vi.fn()}
				onStatusChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("Nenhum cliente agendado")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /adicionar cliente/i }));

		expect(onCreate).toHaveBeenCalledTimes(1);
	});

	it("renders appointments and opens the selected row", () => {
		const onOpen = vi.fn();

		render(
			<AppointmentsList
				appointments={appointments}
				savingStatusId=""
				onCreate={vi.fn()}
				onOpen={onOpen}
				onStatusChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("1 na agenda do dia")).toBeTruthy();
		expect(screen.getByText("Cliente Teste")).toBeTruthy();
		expect(screen.getByText(/Corte/)).toBeTruthy();

		const row = screen.getByRole("button", { name: /Cliente Teste/i });
		fireEvent.mouseDown(row, {
			clientX: 120,
			clientY: 30,
			button: 0,
			buttons: 1,
		});
		fireEvent.mouseUp(row, {
			clientX: 120,
			clientY: 30,
			buttons: 0,
		});

		expect(onOpen).toHaveBeenCalledWith(appointments[0]);
	});

	it("keeps appointment rows stable when row props do not change", () => {
		const onCreate = vi.fn();
		const onOpen = vi.fn();
		const onStatusChange = vi.fn();
		const props = {
			appointments,
			savingStatusId: "",
			onCreate,
			onOpen,
			onStatusChange,
		};

		const { rerender } = render(<AppointmentsList {...props} />);

		expect(mockFormatCurrency).toHaveBeenCalledTimes(1);

		rerender(<AppointmentsList {...props} />);

		expect(mockFormatCurrency).toHaveBeenCalledTimes(1);
	});
});
