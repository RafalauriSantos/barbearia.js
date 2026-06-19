import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

const THEME_KEY = "gestor_barbearia_theme";

afterEach(() => {
	window.localStorage.removeItem(THEME_KEY);
	delete document.documentElement.dataset.theme;
	document.documentElement.style.colorScheme = "";
});

describe("ThemeToggle", () => {
	it("applies and persists the selected theme", () => {
		window.localStorage.setItem(THEME_KEY, "dark");
		render(<ThemeToggle />);

		fireEvent.click(screen.getByRole("button", { name: "Ativar tema claro" }));

		expect(document.documentElement.dataset.theme).toBe("light");
		expect(document.documentElement.style.colorScheme).toBe("light");
		expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
		expect(
			screen.getByRole("button", { name: "Ativar tema escuro" }),
		).toBeTruthy();
	});

	it("restores a saved light theme on mount", () => {
		window.localStorage.setItem(THEME_KEY, "light");
		render(<ThemeToggle />);

		expect(document.documentElement.dataset.theme).toBe("light");
		expect(
			screen.getByRole("button", { name: "Ativar tema escuro" }),
		).toBeTruthy();
	});
});
