import { useEffect, useState } from "react";
import { applyTheme, getTheme, subscribeToTheme } from "@/lib/theme";

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

export function ThemeToggle({ className = "", showLabel = false }) {
	const [theme, setTheme] = useState(getTheme);
	const isLight = theme === "light";

	useEffect(() => {
		const currentTheme = getTheme();
		applyTheme(currentTheme, { persist: false, notify: false });
		setTheme(currentTheme);
		return subscribeToTheme(setTheme);
	}, []);

	const toggleTheme = () => {
		const nextTheme = getTheme() === "light" ? "dark" : "light";
		applyTheme(nextTheme);
	};
	const nextThemeLabel = isLight ? "escuro" : "claro";

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={`Ativar tema ${nextThemeLabel}`}
			aria-pressed={isLight}
			title={`Ativar tema ${nextThemeLabel}`}
			className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-2.5 text-foreground-faint transition-colors hover:bg-muted hover:text-foreground ${showLabel ? "min-w-[92px]" : "w-9 px-0"} ${className}`}>
			<span aria-hidden="true">
				{isLight ? <MoonIcon /> : <SunIcon />}
			</span>
			{showLabel && (
				<span className="font-mono-ui text-[10px] uppercase">
					{isLight ? "Claro" : "Escuro"}
				</span>
			)}
		</button>
	);
}
