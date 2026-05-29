import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

const storeMock = vi.hoisted(() => ({
	loadProfile: vi.fn(),
	saveProfile: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { email: "admin@kurt.com", role: "admin" },
		logout: vi.fn(),
	}),
}));

vi.mock("@/lib/store", () => ({
	loadProfile: storeMock.loadProfile,
	saveProfile: storeMock.saveProfile,
}));

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.loadProfile.mockResolvedValue({
		shopName: "Kurt",
		phone: "(11) 99999-9999",
		address: "Rua Central, 100",
		openingTime: "08:00",
		closingTime: "18:00",
		appointmentDuration: 30,
		scheduleInterval: 30,
		barberName: "Rafael",
	});
	storeMock.saveProfile.mockResolvedValue({});
});

describe("SettingsPage", () => {
	it("shows operational settings without dev-only actions", async () => {
		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		expect(await screen.findByDisplayValue("Kurt")).toBeTruthy();
		expect(screen.getByText("Padrões de atendimento")).toBeTruthy();
		expect(screen.getByLabelText("Telefone")).toBeTruthy();
		expect(screen.queryByText("Email de teste")).toBeNull();
		expect(screen.queryByText("Resetar dados")).toBeNull();
		expect(screen.queryByText(/orafaellauri/i)).toBeNull();
	});

	it("saves shop, agenda and account settings through profile", async () => {
		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		fireEvent.change(await screen.findByLabelText("Nome da barbearia"), {
			target: { value: "Kurt Prime" },
		});
		fireEvent.change(screen.getByLabelText("Duração padrão"), {
			target: { value: "45" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

		await waitFor(() => {
			expect(storeMock.saveProfile).toHaveBeenCalledWith(
				expect.objectContaining({
					shopName: "Kurt Prime",
					barberName: "Rafael",
					phone: "(11) 99999-9999",
					address: "Rua Central, 100",
					openingTime: "08:00",
					closingTime: "18:00",
					appointmentDuration: 45,
					scheduleInterval: 30,
				}),
			);
		});
	});
});
