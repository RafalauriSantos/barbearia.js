import { expect, test } from "@playwright/test";

function json(route, body, status = 200) {
	return route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(body)
	});
}

test.describe("Forgot Password E2E Flow", () => {
	test("successful password reset flow", async ({ page }) => {
		let forgotPasswordCalled = false;
		let resetPasswordCalled = false;

		// Intercept API calls using wildcard routes to match VITE_API_URL configurations (local or deployed)
		await page.route("**/auth/forgot-password", async (route) => {
			forgotPasswordCalled = true;
			const request = route.request();
			const payload = request.postDataJSON();
			expect(payload.email).toBe("cliente@example.com");
			return json(route, { ok: true });
		});

		await page.route("**/auth/reset-password", async (route) => {
			resetPasswordCalled = true;
			const request = route.request();
			const payload = request.postDataJSON();
			expect(payload.email).toBe("cliente@example.com");
			expect(payload.code).toBe("123456");
			expect(payload.password).toBe("newpassword123");
			return json(route, { ok: true });
		});

		await page.route("**/health/db", async (route) => {
			return json(route, { ok: true, database: true });
		});

		// Go to forgot password page
		await page.goto("/forgot-password");

		// Step 1: Request Code
		await page.locator('input[type="email"]').fill("cliente@example.com");
		await page.getByRole("button", { name: "Enviar codigo" }).click();

		// Wait for step transition
		await expect(page.getByText("Enviamos um codigo de 6 digitos para seu email.")).toBeVisible();
		expect(forgotPasswordCalled).toBe(true);

		// Step 2: Redefine Password
		await page.locator('input[id="password-reset-code"]').fill("123456");
		await page.locator('input[id="password-reset-new-password"]').fill("newpassword123");
		await page.getByRole("button", { name: "Salvar nova senha" }).click();

		// Verify success message
		await expect(page.getByText("Senha alterada com sucesso. Agora voce ja pode entrar.")).toBeVisible();
		expect(resetPasswordCalled).toBe(true);
	});

	test("handles API errors gracefully during code request", async ({ page }) => {
		let forgotPasswordCalled = false;

		await page.route("**/auth/forgot-password", async (route) => {
			forgotPasswordCalled = true;
			return json(route, {
				error: "Falha de comunicacao com o Brevo.",
				code: "EMAIL_SEND_FAILED"
			}, 500);
		});

		await page.route("**/health/db", async (route) => {
			return json(route, { ok: true, database: true });
		});

		await page.goto("/forgot-password");

		// Fill email and submit
		await page.locator('input[type="email"]').fill("cliente@example.com");
		await page.getByRole("button", { name: "Enviar codigo" }).click();

		// Expect error message to be shown
		await expect(page.getByText("Falha de comunicacao com o Brevo.")).toBeVisible();
		expect(forgotPasswordCalled).toBe(true);

		// Expect email field to still be active and visible
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[id="password-reset-code"]')).not.toBeVisible();
	});
});
