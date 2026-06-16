import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

const storeMock = vi.hoisted(() => ({
	getCachedPaymentMethods: vi.fn(),
	getCachedProfile: vi.fn(),
	loadPaymentMethods: vi.fn(),
	loadProfile: vi.fn(),
	savePaymentMethod: vi.fn(),
	saveProfile: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { email: "admin@gestorbarbearia.com", role: "admin" },
		logout: vi.fn(),
	}),
}));

vi.mock("@/lib/store", () => ({
	getCachedPaymentMethods: storeMock.getCachedPaymentMethods,
	getCachedProfile: storeMock.getCachedProfile,
	loadPaymentMethods: storeMock.loadPaymentMethods,
	loadProfile: storeMock.loadProfile,
	savePaymentMethod: storeMock.savePaymentMethod,
	saveProfile: storeMock.saveProfile,
}));

beforeEach(() => {
	vi.clearAllMocks();
	storeMock.loadProfile.mockResolvedValue({
		shopName: "Gestor Barbearia",
		phone: "(11) 99999-9999",
		address: "Rua Central, 100",
		openingTime: "08:00",
		closingTime: "18:00",
		appointmentDuration: 30,
		scheduleInterval: 30,
		barberName: "Rafael",
		barberPhotoUrl: "",
	});
	storeMock.loadPaymentMethods.mockResolvedValue([
		{
			id: "method-debit",
			code: "cartao_debito",
			name: "Debito",
			fee_percent: 0.69,
		},
		{
			id: "method-credit",
			code: "cartao_credito",
			name: "Credito a vista",
			fee_percent: 1.71,
		},
	]);
	storeMock.savePaymentMethod.mockResolvedValue({
		id: "method-debit",
		code: "cartao_debito",
		name: "Debito",
		fee_percent: 0.8,
	});
	storeMock.saveProfile.mockResolvedValue({ barberPhotoUrl: "" });
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function mockAvatarCanvas() {
	const context = {
		fillStyle: "",
		fillRect: vi.fn(),
		drawImage: vi.fn(),
	};

	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
	vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
		"data:image/jpeg;base64,cropped-avatar",
	);
	vi.stubGlobal(
		"Image",
		class {
			constructor() {
				this.naturalWidth = 800;
				this.naturalHeight = 600;
			}

			set src(value) {
				this.source = value;
				queueMicrotask(() => this.onload?.());
			}

			get src() {
				return this.source;
			}
		},
	);

	return context;
}

describe("SettingsPage", () => {
	it("shows operational settings without dev-only actions", async () => {
		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		expect(await screen.findByDisplayValue("Gestor Barbearia")).toBeTruthy();
		expect(screen.queryByText("Horários")).toBeNull();
		expect(screen.queryByLabelText("Duração padrão")).toBeNull();
		expect(await screen.findByText("Recebimento")).toBeTruthy();
		expect(screen.getByLabelText("Telefone")).toBeTruthy();
		expect(screen.queryByText("Email de teste")).toBeNull();
		expect(screen.queryByText("Resetar dados")).toBeNull();
		expect(screen.queryByText(/orafaellauri/i)).toBeNull();
	});

	it("saves payment method fees", async () => {
		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		const debitInput = await screen.findByLabelText("Debito");
		fireEvent.change(debitInput, { target: { value: "0,8" } });
		fireEvent.click(screen.getByRole("button", { name: /salvar taxas/i }));

		await waitFor(() => {
			expect(storeMock.savePaymentMethod).toHaveBeenCalledWith(
				"method-debit",
				{ fee_percent: 0.8 },
			);
		});
	});

	it("saves shop, agenda and account settings through profile", async () => {
		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		fireEvent.change(await screen.findByLabelText("Nome da barbearia"), {
			target: { value: "Gestor Barbearia Prime" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

		await waitFor(() => {
			expect(storeMock.saveProfile).toHaveBeenCalledWith(
				expect.objectContaining({
					shopName: "Gestor Barbearia Prime",
					barberName: "Rafael",
					phone: "(11) 99999-9999",
					address: "Rua Central, 100",
					openingTime: "08:00",
					closingTime: "18:00",
					appointmentDuration: 30,
					scheduleInterval: 30,
				}),
			);
		});
	});

	it("sends selected profile photo with the profile payload", async () => {
		const canvasContext = mockAvatarCanvas();
		storeMock.saveProfile.mockResolvedValue({
			barberPhotoUrl: "https://cdn.example.com/avatar.png",
		});

		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		await screen.findByDisplayValue("Rafael");

		const file = new File([new Uint8Array(3 * 1024 * 1024)], "avatar.png", {
			type: "image/png",
		});
		fireEvent.change(screen.getByLabelText("Foto da agenda"), {
			target: { files: [file] },
		});

		expect(await screen.findByText("Ajuste o foco da foto e salve.")).toBeTruthy();
		expect(screen.getByTestId("avatar-editor-panel").className).toContain(
			"fixed",
		);
		const avatarEditor = screen.getByRole("img", {
			name: "Prévia ajustável da foto",
		});
		const avatarActions = screen.getByTestId("avatar-editor-actions");
		expect(
			avatarEditor.compareDocumentPosition(avatarActions) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Zoom da foto"), {
			target: { value: "1.6" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar foto e alterações" }),
		);

		await waitFor(() => {
			expect(storeMock.saveProfile).toHaveBeenCalledWith(
				expect.objectContaining({
					barberPhoto: expect.objectContaining({
						dataUrl: "data:image/jpeg;base64,cropped-avatar",
						fileName: "avatar-avatar.jpg",
						mimeType: "image/jpeg",
					}),
				}),
			);
		});
		expect(canvasContext.drawImage).toHaveBeenCalled();
	});

	it("edits the framing of the saved profile photo without a new upload", async () => {
		mockAvatarCanvas();
		storeMock.loadProfile.mockResolvedValue({
			shopName: "Gestor Barbearia",
			phone: "(11) 99999-9999",
			address: "Rua Central, 100",
			openingTime: "08:00",
			closingTime: "18:00",
			appointmentDuration: 30,
			scheduleInterval: 30,
			barberName: "Rafael",
			barberPhotoUrl: "https://cdn.example.com/current-avatar.png",
		});
		storeMock.saveProfile.mockResolvedValue({
			barberPhotoUrl: "https://cdn.example.com/current-avatar-edited.png",
		});

		render(
			<MemoryRouter initialEntries={["/settings"]}>
				<SettingsPage />
			</MemoryRouter>,
		);

		await screen.findByDisplayValue("Rafael");

		fireEvent.click(screen.getByRole("button", { name: "Recortar" }));

		expect(await screen.findByText("Enquadramento da agenda")).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Zoom da foto"), {
			target: { value: "1.4" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar foto e alterações" }),
		);

		await waitFor(() => {
			expect(storeMock.saveProfile).toHaveBeenCalledWith(
				expect.objectContaining({
					barberPhoto: expect.objectContaining({
						dataUrl: "data:image/jpeg;base64,cropped-avatar",
						fileName: "foto-atual-avatar.jpg",
						mimeType: "image/jpeg",
					}),
				}),
			);
		});
	});
});
