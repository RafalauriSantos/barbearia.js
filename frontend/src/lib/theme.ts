export type AppTheme = "light" | "dark";

export const THEME_KEY = "gestor_barbearia_theme";
export const THEME_CHANGE_EVENT = "gestor-barbearia-theme-change";

function isTheme(value: unknown): value is AppTheme {
	return value === "light" || value === "dark";
}

function getSystemTheme(): AppTheme {
	return window.matchMedia?.("(prefers-color-scheme: light)").matches ?
			"light"
		: 	"dark";
}

export function getTheme(): AppTheme {
	if (typeof window === "undefined") return "dark";

	const appliedTheme = document.documentElement.dataset.theme;
	if (isTheme(appliedTheme)) return appliedTheme;

	try {
		const savedTheme = window.localStorage.getItem(THEME_KEY);
		if (isTheme(savedTheme)) return savedTheme;
	} catch {
		// The system preference remains available when storage is blocked.
	}

	return getSystemTheme();
}

export interface ApplyThemeOptions {
	persist?: boolean;
	notify?: boolean;
}

export function applyTheme(theme: AppTheme, { persist = true, notify = true }: ApplyThemeOptions = {}): void {
	if (typeof window === "undefined" || !isTheme(theme)) return;

	const root = document.documentElement;
	root.dataset.theme = theme;
	root.style.colorScheme = theme;
	root.classList.toggle("dark", theme === "dark");

	const themeColor = document.querySelector("meta[name='theme-color']");
	if (themeColor) {
		themeColor.setAttribute(
			"content",
			theme === "light" ? "#FFFFFF" : "#16181a",
		);
	}

	if (persist) {
		try {
			window.localStorage.setItem(THEME_KEY, theme);
		} catch {
			// The theme still applies for the current session.
		}
	}

	if (notify) {
		window.dispatchEvent(
			new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }),
		);
	}
}

export function initializeTheme(): void {
	applyTheme(getTheme(), { persist: false, notify: false });
}

export function subscribeToTheme(callback: (theme: AppTheme) => void): () => void {
	const handleThemeChange = (event: Event) => {
		const customEvent = event as CustomEvent<{ theme: AppTheme }>;
		if (isTheme(customEvent.detail?.theme)) callback(customEvent.detail.theme);
	};
	const handleStorage = (event: StorageEvent) => {
		if (event.key !== THEME_KEY || !isTheme(event.newValue)) return;
		applyTheme(event.newValue, { persist: false, notify: false });
		callback(event.newValue);
	};

	window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
	window.addEventListener("storage", handleStorage);

	return () => {
		window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
		window.removeEventListener("storage", handleStorage);
	};
}
