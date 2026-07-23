import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "@/lib/theme";

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
