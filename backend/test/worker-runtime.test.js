const tap = require("tap");
const { sign } = require("hono/jwt");

// Import the real Cloudflare Worker entrypoint Hono app
let appModule;
try {
	appModule = require("../../src/index.js");
} catch (e) {
	appModule = require("../src/index.ts");
}
const app = appModule.default || appModule;

tap.test("Cloudflare Worker Production Runtime Integration Suite", async (t) => {
	const secret = "development-only-secret-change-before-production";
	const now = Math.floor(Date.now() / 1000);
	const validToken = await sign(
		{ userId: "00000000-0000-0000-0000-000000000000", exp: now + 3600 },
		secret,
		"HS256"
	);

	const prodMockEnv = {
		NODE_ENV: "test",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		SUPABASE_ANON_KEY: "anon-key-test",
		JWT_SECRET: secret,
	};

	t.test("1. GET /health in production environment returns 200 OK without 500 errors", async (t) => {
		const res = await app.request("/health", { method: "GET" }, prodMockEnv);
		t.equal(res.status, 200, "Health check must return HTTP 200");
		const body = await res.json();
		t.equal(body.ok, true, "Health body must be { ok: true }");
	});

	t.test("2. Unauthenticated protected routes return 401 Unauthorized (never 500 Internal Error)", async (t) => {
		const protectedPaths = [
			"/profile",
			"/barbers",
			"/agendamentos",
			"/products",
			"/payment-methods",
			"/expenses",
			"/receivables",
			"/financial/summary",
		];

		for (const path of protectedPaths) {
			const res = await app.request(path, { method: "GET" }, prodMockEnv);
			t.equal(
				res.status,
				401,
				`GET ${path} without token must return HTTP 401 Unauthorized (got ${res.status})`
			);
			t.not(
				res.status,
				500,
				`GET ${path} must never fail with HTTP 500 when unauthenticated`
			);
		}
	});

	t.test("3. Worker handles requests gracefully even when c.env is completely empty", async (t) => {
		const emptyEnv = {};
		const res = await app.request("/health", { method: "GET" }, emptyEnv);
		t.equal(res.status, 200, "Health check with empty env must still return HTTP 200");

		const profileRes = await app.request("/profile", { method: "GET" }, emptyEnv);
		t.equal(
			profileRes.status,
			401,
			"Unauthenticated /profile with empty env must return 401, not 500"
		);
	});
});
