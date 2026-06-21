import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const user = {
	id: "user-e2e",
	email: "admin@example.com",
	nome: "Admin E2E",
	role: "admin",
	barbearia_id: "shop-e2e",
	barbeiro_id: "barber-owner",
};

function json(route, body, status = 200) {
	return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installSession(page) {
	await page.addInitScript((snapshot) => {
		localStorage.setItem("gestor_barbearia_access_token", "access-e2e");
		localStorage.setItem("gestor_barbearia_refresh_token", "refresh-e2e");
		localStorage.setItem(
			"gestor_barbearia_auth_user_v1",
			JSON.stringify(snapshot),
		);
	}, user);
}

async function installApi(page, { expandedTeam = false } = {}) {
	const state = {
		appointmentStatus: "normal",
		inviteCalls: 0,
		statusCalls: [],
	};

	await page.route("http://localhost:3000/**", async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname;
		const method = request.method();

		if (path === "/health/db") return json(route, { ok: true, database: true });
		if (path === "/auth/login" && method === "POST") {
			return json(route, { accessToken: "access-e2e", refreshToken: "refresh-e2e" });
		}
		if (path === "/auth/me") return json(route, user);
		if (path === "/profile") {
			return json(route, { shopName: "Barbearia E2E", barberName: "Admin E2E" });
		}
		if (path === "/barbers" && method === "GET") {
			return json(route, [
				{
					id: "barber-owner",
					nome: "Admin E2E",
					email: "admin@example.com",
					usuario_id: "user-e2e",
					barbearia_id: "shop-e2e",
				},
				{
					id: "barber-2",
					nome: "Samuel",
					email: "samuel@example.com",
					usuario_id: null,
					barbearia_id: "shop-e2e",
					comissao_percent: 50,
				},
				...(expandedTeam ?
					[
						{
							id: "barber-3",
							nome: "Renan",
							email: "renan@example.com",
							usuario_id: "user-renan",
							barbearia_id: "shop-e2e",
							comissao_percent: 50,
						},
						{
							id: "barber-4",
							nome: "Lucas",
							email: "lucas@example.com",
							usuario_id: null,
							convite_pendente: true,
							barbearia_id: "shop-e2e",
							comissao_percent: 45,
						},
					]
				: []),
			]);
		}
		if (path === "/barbers/barber-2/invite" && method === "POST") {
			state.inviteCalls += 1;
			await new Promise((resolve) => setTimeout(resolve, 150));
			return json(route, { inviteUrl: "https://example.com/accept-invite?token=e2e" });
		}
		if (path === "/agendamentos" && method === "GET") {
			return json(route, [
				{
					id: "appointment-e2e",
					client_name: "Cliente E2E",
					day_key: url.searchParams.get("data"),
					time_slot: "10:00",
					value: 50,
					status: state.appointmentStatus,
					barbeiro_id: "barber-owner",
					services: [{ id: "service-1", name: "Corte", price: 50, quantity: 1 }],
					products: [],
				},
				...(expandedTeam ?
					[
						{
							id: "appointment-samuel",
							client_name: "Rafael Souza",
							day_key: url.searchParams.get("data"),
							time_slot: "09:30",
							value: 50,
							status: "normal",
							barbeiro_id: "barber-2",
							services: [{ id: "service-1", name: "Corte masculino", price: 50, quantity: 1 }],
							products: [],
						},
						{
							id: "appointment-renan",
							client_name: "Bruno Lima",
							day_key: url.searchParams.get("data"),
							time_slot: "11:00",
							value: 40,
							status: "paid",
							barbeiro_id: "barber-3",
							services: [{ id: "service-2", name: "Barba", price: 40, quantity: 1 }],
							products: [],
						},
					]
				: []),
			]);
		}
		if (path === "/agendamentos/appointment-e2e" && method === "PATCH") {
			const payload = request.postDataJSON();
			state.appointmentStatus = payload.status || state.appointmentStatus;
			state.statusCalls.push(payload);
			return json(route, {
				id: "appointment-e2e",
				client_name: "Cliente E2E",
				day_key: payload.day_key || "2026-06-21",
				time_slot: "10:00",
				value: 50,
				status: state.appointmentStatus,
				payment_method_id: payload.payment_method_id,
				barbeiro_id: "barber-owner",
				services: [{ id: "service-1", name: "Corte", price: 50, quantity: 1 }],
				products: [],
			});
		}
		if (path === "/payment-methods") {
			return json(route, [
				{ id: "pix-e2e", code: "pix", name: "Pix", fee_percent: 0, active: true },
			]);
		}
		if (["/services", "/products", "/clients/fixed", "/clients/waitlist"].includes(path)) {
			return json(route, []);
		}
		if (path.startsWith("/financial/summary")) return json(route, {});
		if (path.startsWith("/expenses")) return json(route, []);
		if (path.startsWith("/receivables")) return json(route, []);
		if (path.startsWith("/supplier-payables")) return json(route, []);

		return json(route, []);
	});

	return state;
}

async function dragAppointment(page, deltaX) {
	const row = page.getByRole("button", { name: /Cliente E2E\. arraste/ });
	await expect(row).toBeVisible();
	await expect(row).toBeEnabled();
	const box = await row.boundingBox();
	const startX = box.x + box.width / 2;
	const startY = box.y + box.height / 2;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + deltaX, startY, { steps: 8 });
	await page.mouse.up();
}

test("public entry leads to a working authenticated agenda", async ({ page }) => {
	await installApi(page);
	await page.goto("/");
	await page.getByRole("link", { name: "Entrar na conta" }).click();
	await expect(page).toHaveURL(/\/login$/);
	await page.locator('input[type="email"]').fill("admin@example.com");
	await page.locator('input[type="password"]').fill("senha-segura");
	await page.locator("form").getByRole("button", { name: "Entrar", exact: true }).click();
	await expect(page).toHaveURL(/\/app$/);
	await expect(page.getByRole("button", { name: /Cliente E2E\. arraste/ })).toBeVisible();
});

test("barber invitation ignores a repeated click while pending", async ({ page }) => {
	await installSession(page);
	const captureTeam = Boolean(process.env.CAPTURE_TEAM_SCREEN);
	if (captureTeam) {
		await page.addInitScript(() => {
			localStorage.setItem("gestor_barbearia_theme", "dark");
		});
		await page.clock.setFixedTime(new Date("2026-06-21T08:00:00"));
	}
	const state = await installApi(page, { expandedTeam: captureTeam });
	if (captureTeam) {
		await page.setViewportSize({ width: 390, height: 844 });
	}
	await page.goto("/team");
	if (captureTeam) {
		await expect(page.getByText(/barbeiros · .* atendimentos hoje/)).toBeVisible();
		await page.screenshot({
			path: "test-results/team-screen-390x844.png",
			fullPage: false,
		});
	}
	await page.getByLabel("Gerenciar equipe").first().click();
	await page.getByRole("button", { name: "Enviar convite" }).first().dblclick();
	await expect(page.getByText(/Convite enviado e link pronto para copiar/)).toBeVisible();
	expect(state.inviteCalls).toBe(1);

	if (captureTeam) {
		const sourceImage = readFileSync(
			"C:\\Users\\Rafael lauri\\.codex\\generated_images\\019e8ab7-deef-7e21-a026-15c311161326\\exec-57207ac2-2707-48c9-a194-eb023aee6277.png",
			"base64",
		);
		const implementationImage = readFileSync(
			"test-results/team-screen-390x844.png",
			"base64",
		);
		await page.setViewportSize({ width: 820, height: 900 });
		await page.setContent(`
			<style>
				body { margin: 0; background: #050a08; color: #f5f3eb; font: 14px sans-serif; }
				main { display: grid; grid-template-columns: 390px 390px; gap: 16px; padding: 12px; }
				figure { margin: 0; }
				figcaption { height: 28px; font-weight: 700; }
				img { display: block; width: 390px; height: 844px; object-fit: cover; object-position: top; }
			</style>
			<main>
				<figure><figcaption>Referencia aprovada</figcaption><img src="data:image/png;base64,${sourceImage}" /></figure>
				<figure><figcaption>Implementacao 390 x 844</figcaption><img src="data:image/png;base64,${implementationImage}" /></figure>
			</main>
		`);
		await page.screenshot({
			path: "test-results/team-design-comparison.png",
			fullPage: true,
		});
	}
});

test("agenda drag marks fiado and confirms a paid method", async ({ page }) => {
	await installSession(page);
	const state = await installApi(page);
	await page.goto("/app");

	await dragAppointment(page, -100);
	await expect.poll(() => state.statusCalls.some((call) => call.status === "fiado")).toBe(true);

	await dragAppointment(page, 100);
	await expect(page.getByText("Receber atendimento")).toBeVisible();
	await page.getByRole("button", { name: "Confirmar pagamento" }).click();
	await expect.poll(() => state.statusCalls.some((call) => call.status === "paid")).toBe(true);
	expect(state.statusCalls.find((call) => call.status === "paid").payment_method_id).toBe("pix-e2e");
});
