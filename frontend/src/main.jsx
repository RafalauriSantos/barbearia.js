import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import { initializeTheme } from "@/lib/theme";

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
	try {
		Sentry.init({
			dsn: import.meta.env.VITE_SENTRY_DSN,
			environment: "production",
			tracesSampleRate: 0.1,
			beforeSend(event) {
				if (event.request && event.request.headers) {
					delete event.request.headers.Authorization;
					delete event.request.headers.cookie;
				}
				return event;
			},
		});
	} catch (e) {
		console.error("Sentry frontend init error:", e);
	}
}

function syncAppViewportHeight() {
	const height = window.visualViewport?.height || window.innerHeight;
	document.documentElement.style.setProperty("--app-height", `${height}px`);
}

// Mantem o shell do app alinhado a viewport visivel em navegadores mobile.
syncAppViewportHeight();
window.visualViewport?.addEventListener("resize", syncAppViewportHeight);
window.addEventListener("resize", syncAppViewportHeight);
window.addEventListener("orientationchange", () => {
	requestAnimationFrame(syncAppViewportHeight);
	setTimeout(syncAppViewportHeight, 250);
});

// Ponto de entrada da aplicacao React.
initializeTheme();
createRoot(document.getElementById("root")).render(<App />);
