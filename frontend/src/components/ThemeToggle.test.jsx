import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_KEY } from "@/lib/theme";

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
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
		expect(
			screen.getByRole("button", { name: "Ativar tema escuro" }),
		).toBeTruthy();
	});

	it("uses the applied document theme instead of stale component state", () => {
		window.localStorage.setItem(THEME_KEY, "dark");
		document.documentElement.dataset.theme = "dark";
		render(<ThemeToggle showLabel />);
		document.documentElement.dataset.theme = "light";

		fireEvent.click(screen.getByRole("button", { name: "Ativar tema claro" }));

		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(screen.getByText("Escuro")).toBeTruthy();
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
