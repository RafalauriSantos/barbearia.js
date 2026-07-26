const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findGitleaksExecutable() {
	// 1. Check if gitleaks is directly available in PATH
	try {
		const check = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
		if (check.status === 0) {
			return "gitleaks";
		}
	} catch (e) {
		// Not in PATH
	}

	// 2. Check Windows WinGet default installation paths
	if (process.platform === "win32") {
		const localAppData = process.env.LOCALAPPDATA || "";
		if (localAppData) {
			const wingetDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
			if (fs.existsSync(wingetDir)) {
				try {
					const entries = fs.readdirSync(wingetDir);
					for (const entry of entries) {
						if (entry.toLowerCase().includes("gitleaks")) {
							const target = path.join(wingetDir, entry, "gitleaks.exe");
							if (fs.existsSync(target)) {
								return target;
							}
						}
					}
				} catch (err) {
					// Ignore read errors
				}
			}
		}
	}

	return null;
}

function main() {
	const mode = process.argv.includes("detect") ? "detect" : "protect";
	const exe = findGitleaksExecutable();

	if (!exe) {
		console.error("\n❌ [Gitleaks Error] Gitleaks binary not found on your system.");
		console.error("Please install gitleaks to enable secret scanning:");
		console.error("  - Windows (winget): winget install gitleaks");
		console.error("  - macOS (brew): brew install gitleaks");
		console.error("  - Linux / Standalone: https://github.com/gitleaks/gitleaks/releases\n");
		process.exit(1);
	}

	const args =
		mode === "protect"
			? ["protect", "--staged", "--verbose", "--config", ".gitleaks.toml"]
			: ["detect", "--verbose", "--config", ".gitleaks.toml"];

	console.log(`🔒 Running Gitleaks (${mode === "protect" ? "staged files pre-commit scan" : "repository detect scan"})...`);

	const result = spawnSync(exe, args, { stdio: "inherit" });

	if (result.status !== 0) {
		console.error("\n❌ [Gitleaks Alert] Secret scan failed! Commit blocked due to potential exposed secrets.");
		process.exit(result.status || 1);
	}

	console.log("✅ [Gitleaks] No secrets detected.");
}

main();
