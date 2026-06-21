import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: 0,
	reporter: "line",
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "desktop-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile-chromium",
			use: { ...devices["Pixel 7"] },
		},
	],
	webServer: [
		{
			command: "node src/server.js",
			cwd: "../backend",
			url: "http://127.0.0.1:3000/health",
			reuseExistingServer: true,
			timeout: 120000,
		},
		{
			command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
			cwd: ".",
			url: "http://127.0.0.1:5173",
			reuseExistingServer: true,
			timeout: 120000,
		},
	],
});
