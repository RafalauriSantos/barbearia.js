import { useEffect, useState } from "react";

const THEME_KEY = "gestor_barbearia_theme";

function getStoredTheme() {
	if (typeof window === "undefined") return "dark";
	try {
		const saved = window.localStorage.getItem(THEME_KEY);
		if (saved === "light" || saved === "dark") return saved;
		return window.matchMedia?.("(prefers-color-scheme: light)").matches ?
				"light"
			:	"dark";
	} catch {
		return "dark";
	}
}

function applyTheme(theme) {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
}

function SunIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className="h-4 w-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className="h-4 w-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round">
			<path d="M20 14.2A7.7 7.7 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
		</svg>
	);
}

export function ThemeToggle({ className = "" }) {
	const [theme, setTheme] = useState(getStoredTheme);
	const isLight = theme === "light";

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		const handleThemeChange = (event) => {
			if (event.detail?.theme) setTheme(event.detail.theme);
		};
		window.addEventListener("gestor-barbearia-theme-change", handleThemeChange);
		return () =>
			window.removeEventListener(
				"gestor-barbearia-theme-change",
				handleThemeChange,
			);
	}, []);

	const toggleTheme = () => {
		const nextTheme = isLight ? "dark" : "light";
		try {
			window.localStorage.setItem(THEME_KEY, nextTheme);
		} catch {
			// If storage is unavailable, the in-memory state still updates.
		}
		applyTheme(nextTheme);
		setTheme(nextTheme);
		window.dispatchEvent(
			new CustomEvent("gestor-barbearia-theme-change", {
				detail: { theme: nextTheme },
			}),
		);
	};

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
			title={isLight ? "Tema escuro" : "Tema claro"}
			className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground-faint transition-colors hover:text-foreground ${className}`}>
			<span>
				{isLight ? <MoonIcon /> : <SunIcon />}
			</span>
		</button>
	);
}
