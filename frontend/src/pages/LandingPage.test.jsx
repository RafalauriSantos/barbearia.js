import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
	it("shows the product pitch before login", () => {
		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("heading", { name: "Marque’s Barbearia", level: 1 }),
		).toBeTruthy();
		expect(screen.getByText(/Agenda, caixa e equipe/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe(
			"/login",
		);
		expect(screen.getByRole("link", { name: "Criar acesso" }).getAttribute("href")).toBe(
			"/login?mode=signup",
		);
		expect(
			screen.getByRole("link", { name: "Entrar na conta" }).getAttribute("href"),
		).toBe("/login");
		expect(
			screen.getByRole("link", { name: "Começar agora" }).getAttribute("href"),
		).toBe("/login?mode=signup");
	});
});
