import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

const storeMock = vi.hoisted(() => ({
	getCachedProfile: vi.fn(),
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
	getCachedProfile: storeMock.getCachedProfile,
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
		barberPhotoUrl: "",
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

		const file = new File(["avatar"], "avatar.png", { type: "image/png" });
		fireEvent.change(screen.getByLabelText("Foto da agenda"), {
			target: { files: [file] },
		});

		expect(await screen.findByText("Ajuste o foco da foto e salve.")).toBeTruthy();
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
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

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
});
