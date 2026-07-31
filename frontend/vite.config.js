import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
	server: {
		host: "::",
		port: 3333,
		hmr: {
			overlay: false,
		},
	},
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(process.cwd(), "./src"),
		},
	},
	build: {
		outDir: ".output",
	},
	define: {
		"import.meta.env.VITE_API_URL": JSON.stringify(
			process.env.VITE_API_URL ||
				(command === "serve"
					? "http://localhost:3000"
					: "https://barbearia-workers.agenddar.workers.dev")
		),
	},
}));
