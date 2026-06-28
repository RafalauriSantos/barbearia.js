import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(frontendDir, "..");

const DEFAULT_APP_URL = "http://localhost:5173/app";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000";
const PASSWORD = "PerfCheck123!";

function readArg(name, fallback) {
	const prefix = `${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match ? match.slice(prefix.length) : fallback;
}

function endpointFromUrl(url) {
	try {
		return new URL(url).pathname.replace(/^\/api/, "") || "/";
	} catch {
		return url;
	}
}

function round(value) {
	return Number.isFinite(value) ? Math.round(value) : null;
}

function summarize(values) {
	const numericValues = values.filter(Number.isFinite).sort((a, b) => a - b);
	if (numericValues.length === 0) {
		return { avg: null, median: null, min: null, max: null };
	}

	const sum = numericValues.reduce((total, value) => total + value, 0);
	const middle = Math.floor(numericValues.length / 2);
	const median =
		numericValues.length % 2 ?
			numericValues[middle]
		:	(numericValues[middle - 1] + numericValues[middle]) / 2;

	return {
		avg: round(sum / numericValues.length),
		median: round(median),
		min: round(numericValues[0]),
		max: round(numericValues[numericValues.length - 1]),
	};
}

async function api(apiBaseUrl, pathName, options = {}) {
	const response = await fetch(`${apiBaseUrl}${pathName}`, {
		headers: {
			"content-type": "application/json",
			...(options.headers || {}),
		},
		...options,
	});
	const text = await response.text();
	let body = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = text;
	}
	if (!response.ok) {
		throw new Error(
			`${options.method || "GET"} ${pathName} -> ${response.status}: ${text}`,
		);
	}
	return body;
}

async function createTempUser(apiBaseUrl) {
	const email = `perf-startup-${Date.now()}@example.com`;
	const register = await api(apiBaseUrl, "/auth/register", {
		method: "POST",
		body: JSON.stringify({ email, password: PASSWORD }),
	});
	await api(apiBaseUrl, "/auth/verify-code", {
		method: "POST",
		body: JSON.stringify({ email, code: register.verificationCode }),
	});
	const session = await api(apiBaseUrl, "/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password: PASSWORD }),
	});
	return { email, session };
}

function cleanupTempUser(email) {
	const cleanupScript = path.join(
		rootDir,
		"backend",
		"scripts",
		"cleanup-test-auth-user.js",
	);
	spawnSync(process.execPath, [cleanupScript], {
		cwd: rootDir,
		env: {
			...process.env,
			TEST_AUTH_EMAIL_TO_DELETE: email,
		},
		stdio: "ignore",
	});
}

function latestMark(metrics, name) {
	return [...(metrics?.marks || [])].reverse().find((mark) => mark.name === name);
}

function firstResource(resources, endpoint) {
	return resources.find((entry) => endpointFromUrl(entry.name) === endpoint);
}

function resourcesByBackground(resources) {
	const endpoints = new Set(["/services", "/products", "/payment-methods"]);
	return resources.filter((entry) => endpoints.has(endpointFromUrl(entry.name)));
}

function buildMilestones({ metrics, resources, dashboardUsableMs }) {
	const authMe = firstResource(resources, "/auth/me");
	const appointments = resources.find((entry) =>
		endpointFromUrl(entry.name).startsWith("/agendamentos"),
	);
	const catalog = latestMark(metrics, "background:catalog:start");
	const catalogEnd = latestMark(metrics, "background:catalog:end");
	const paymentMethods = latestMark(metrics, "background:payment-methods:start");
	const paymentMethodsEnd = latestMark(metrics, "background:payment-methods:end");
	const appPage = latestMark(metrics, "app-page:start");
	const backgroundResources = resourcesByBackground(resources);
	const backgroundStart =
		backgroundResources.length ?
			Math.min(...backgroundResources.map((entry) => entry.startTime))
		:	Math.min(
				...[catalog?.at, paymentMethods?.at].filter(Number.isFinite),
			);
	const backgroundEnd =
		backgroundResources.length ?
			Math.max(...backgroundResources.map((entry) => entry.responseEnd))
		:	Math.max(
				...[catalogEnd?.at, paymentMethodsEnd?.at].filter(Number.isFinite),
			);

	return {
		navigationStart: 0,
		authMeEnd: authMe?.responseEnd ?? null,
		appPageStart: appPage?.at ?? null,
		appointmentsStart: appointments?.startTime ?? null,
		appointmentsEnd: appointments?.responseEnd ?? null,
		dashboardUsable: dashboardUsableMs,
		backgroundStart: Number.isFinite(backgroundStart) ? backgroundStart : null,
		backgroundEnd: Number.isFinite(backgroundEnd) ? backgroundEnd : null,
	};
}

function buildSegments(milestones) {
	return {
		infrastructureToAuthEnd: milestones.authMeEnd,
		authToAppPage:
			Number.isFinite(milestones.authMeEnd) &&
			Number.isFinite(milestones.appPageStart) ?
				milestones.appPageStart - milestones.authMeEnd
			:	null,
		appPageToAppointmentsStart:
			Number.isFinite(milestones.appPageStart) &&
			Number.isFinite(milestones.appointmentsStart) ?
				milestones.appointmentsStart - milestones.appPageStart
			:	null,
		appointmentsDuration:
			Number.isFinite(milestones.appointmentsStart) &&
			Number.isFinite(milestones.appointmentsEnd) ?
				milestones.appointmentsEnd - milestones.appointmentsStart
			:	null,
		appPageToDashboard:
			Number.isFinite(milestones.appPageStart) &&
			Number.isFinite(milestones.dashboardUsable) ?
				milestones.dashboardUsable - milestones.appPageStart
			:	null,
		postRenderDelay:
			Number.isFinite(milestones.dashboardUsable) &&
			Number.isFinite(milestones.backgroundStart) ?
				milestones.backgroundStart - milestones.dashboardUsable
			:	null,
		backgroundDuration:
			Number.isFinite(milestones.backgroundStart) &&
			Number.isFinite(milestones.backgroundEnd) ?
				milestones.backgroundEnd - milestones.backgroundStart
			:	null,
	};
}

async function measureRun({ browser, appUrl, session }) {
	const context = await browser.newContext();
	await context.addInitScript(({ accessToken, refreshToken }) => {
		localStorage.clear();
		localStorage.setItem("gestor_barbearia_access_token", accessToken);
		localStorage.setItem("gestor_barbearia_refresh_token", refreshToken);
	}, session);

	const page = await context.newPage();
	const network = [];

	page.on("request", (request) => {
		if (!request.url().includes(":3000/")) return;
		network.push({
			endpoint: endpointFromUrl(request.url()),
			method: request.method(),
			status: null,
			url: request.url(),
		});
	});
	page.on("response", (response) => {
		if (!response.url().includes(":3000/")) return;
		const match = [...network]
			.reverse()
			.find((entry) => entry.url === response.url() && entry.status === null);
		if (match) match.status = response.status();
	});

	await page.goto(appUrl, { waitUntil: "domcontentloaded" });
	await page.getByText("Clientes agendados").waitFor({ timeout: 15000 });
	const dashboardUsableMs = await page.evaluate(() => performance.now());
	await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(300);

	const browserData = await page.evaluate(() => ({
		metrics: window.__GB_STARTUP_METRICS__ || {
			marks: [],
			measures: [],
		},
		resources: performance
			.getEntriesByType("resource")
			.filter((entry) => entry.name.includes(":3000/"))
			.map((entry) => ({
				name: entry.name,
				startTime: entry.startTime,
				responseEnd: entry.responseEnd,
				duration: entry.duration,
			})),
	}));

	await context.close();

	const milestones = buildMilestones({
		metrics: browserData.metrics,
		resources: browserData.resources,
		dashboardUsableMs,
	});

	return {
		milestones,
		segments: buildSegments(milestones),
		metrics: browserData.metrics,
		resources: browserData.resources,
		network,
	};
}

function printTable(title, rows) {
	console.log(`\n${title}`);
	console.table(rows);
}

async function main() {
	const appUrl = readArg("--app-url", DEFAULT_APP_URL);
	const apiBaseUrl = readArg("--api-base-url", DEFAULT_API_BASE_URL);
	const runs = Number(readArg("--runs", "5"));
	const { email, session } = await createTempUser(apiBaseUrl);
	const browser = await chromium.launch({ headless: true });
	const results = [];

	try {
		for (let index = 0; index < runs; index += 1) {
			results.push(
				await measureRun({
					browser,
					appUrl,
					session: {
						accessToken: session.accessToken,
						refreshToken: session.refreshToken,
					},
				}),
			);
		}
	} finally {
		await browser.close();
		cleanupTempUser(email);
	}

	printTable(
		"Marcos por rodada (ms desde o inicio da navegacao no browser)",
		results.map((result, index) => ({
			run: index + 1,
			authMeEnd: round(result.milestones.authMeEnd),
			appPageStart: round(result.milestones.appPageStart),
			appointmentsStart: round(result.milestones.appointmentsStart),
			appointmentsEnd: round(result.milestones.appointmentsEnd),
			dashboardUsable: round(result.milestones.dashboardUsable),
			backgroundStart: round(result.milestones.backgroundStart),
			backgroundEnd: round(result.milestones.backgroundEnd),
		})),
	);

	printTable(
		"Segmentos por rodada (ms)",
		results.map((result, index) => ({
			run: index + 1,
			infraToAuthEnd: round(result.segments.infrastructureToAuthEnd),
			authToAppPage: round(result.segments.authToAppPage),
			appPageToAppointments: round(
				result.segments.appPageToAppointmentsStart,
			),
			appointmentsDuration: round(result.segments.appointmentsDuration),
			appPageToDashboard: round(result.segments.appPageToDashboard),
			postRenderDelay: round(result.segments.postRenderDelay),
			backgroundDuration: round(result.segments.backgroundDuration),
		})),
	);

	printTable("Resumo estatistico", [
		{
			metric: "authMeEnd",
			...summarize(results.map((result) => result.milestones.authMeEnd)),
		},
		{
			metric: "appPageStart",
			...summarize(results.map((result) => result.milestones.appPageStart)),
		},
		{
			metric: "appointmentsEnd",
			...summarize(results.map((result) => result.milestones.appointmentsEnd)),
		},
		{
			metric: "dashboardUsable",
			...summarize(results.map((result) => result.milestones.dashboardUsable)),
		},
		{
			metric: "backgroundStart",
			...summarize(results.map((result) => result.milestones.backgroundStart)),
		},
		{
			metric: "backgroundEnd",
			...summarize(results.map((result) => result.milestones.backgroundEnd)),
		},
	]);
}

main().catch((error) => {
	console.error(error.stack || error.message || error);
	process.exit(1);
});
