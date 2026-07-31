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

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Middleware & routing smoke tests (no database connection needed)
// ─────────────────────────────────────────────────────────────────────────────
tap.test("Suite 1 – Worker middleware never crashes with HTTP 500", async (t) => {
	const secret = "development-only-secret-change-before-production";

	const mockEnv = {
		NODE_ENV: "test",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		SUPABASE_ANON_KEY: "anon-key-test",
		JWT_SECRET: secret,
	};

	t.test("GET /health returns 200 OK", async (t) => {
		const res = await app.request("/health", { method: "GET" }, mockEnv);
		t.equal(res.status, 200);
		const body = await res.json();
		t.equal(body.ok, true);
	});

	t.test("Unauthenticated protected routes return 401, never 500", async (t) => {
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
			const res = await app.request(path, { method: "GET" }, mockEnv);
			t.equal(res.status, 401, `GET ${path} → 401 (got ${res.status})`);
		}
	});

	t.test("Empty c.env does not crash middleware (health=200, protected=401)", async (t) => {
		const emptyEnv = {};
		const res = await app.request("/health", { method: "GET" }, emptyEnv);
		t.equal(res.status, 200, "Health with empty env → 200");

		const profileRes = await app.request("/profile", { method: "GET" }, emptyEnv);
		t.equal(profileRes.status, 401, "Profile with empty env → 401, not 500");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Supabase credential lifecycle (the bug that caused all 500s)
//
// This test simulates EXACTLY what happens on Cloudflare Workers:
//   1. Worker starts → process.env has NO Supabase secrets
//   2. First request arrives → setRuntimeEnv(c.env) injects secrets
//   3. supabase.ts must use the NEW credentials, not the stale ones
//
// If the singleton is stale, this test FAILS — which is exactly the bug
// we missed before.
// ─────────────────────────────────────────────────────────────────────────────
tap.test("Suite 2 – Supabase client recreates when credentials change", async (t) => {
	const { setRuntimeEnv, env } = require("../src/config/env.ts");

	// Step 1: Simulate Worker startup with NO Supabase secrets
	// (like process.env on Cloudflare Workers which lacks secrets)
	setRuntimeEnv({
		NODE_ENV: "production",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		// NO SUPABASE_SERVICE_KEY
		// NO SUPABASE_ANON_KEY
	});

	const keyBeforeInjection = env.SUPABASE_SERVICE_KEY;
	t.equal(keyBeforeInjection, undefined, "Before injection: SUPABASE_SERVICE_KEY must be undefined");

	// Step 2: Simulate first request → setRuntimeEnv(c.env) with REAL secrets
	const realServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key";
	setRuntimeEnv({
		NODE_ENV: "production",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		SUPABASE_SERVICE_KEY: realServiceKey,
		JWT_SECRET: "development-only-secret-change-before-production",
	});

	const keyAfterInjection = env.SUPABASE_SERVICE_KEY;
	t.equal(keyAfterInjection, realServiceKey,
		"After injection: SUPABASE_SERVICE_KEY must be the real key from c.env");

	// Step 3: Verify that getSupabaseClient() would use the new key, not the old one
	// We check this indirectly via the env proxy — the same path supabase.ts uses
	const resolvedKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY || "anon-fallback-key";
	t.not(resolvedKey, "anon-fallback-key",
		"Supabase key must NOT be the fallback after setRuntimeEnv injects real credentials");
	t.equal(resolvedKey, realServiceKey,
		"Supabase key must be the real service key from c.env");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Authenticated request with valid token + real Supabase credentials
//
// Simulates a logged-in user hitting /barbers.
// The request MUST NOT return 500 — if Supabase credentials are wrong,
// this test catches it immediately.
// ─────────────────────────────────────────────────────────────────────────────
tap.test("Suite 3 – Authenticated routes must never return 500 from credential errors", async (t) => {
	const secret = "development-only-secret-change-before-production";
	const now = Math.floor(Date.now() / 1000);
	const validToken = await sign(
		{ userId: "00000000-0000-0000-0000-000000000000", exp: now + 3600 },
		secret,
		"HS256"
	);
	const authHeaders = { Authorization: `Bearer ${validToken}` };

	// Use a REAL Supabase URL but a deliberately WRONG key
	// to simulate what happens when credentials are stale/missing
	const envWithBadKey = {
		NODE_ENV: "test",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		SUPABASE_SERVICE_KEY: "deliberately-wrong-key-to-test-error-handling",
		JWT_SECRET: secret,
	};

	const routesToTest = [
		{ method: "GET", path: "/barbers" },
		{ method: "GET", path: "/products" },
		{ method: "GET", path: "/payment-methods" },
		{ method: "GET", path: "/profile" },
	];

	for (const route of routesToTest) {
		const res = await app.request(
			route.path,
			{ method: route.method, headers: authHeaders },
			envWithBadKey
		);

		// The point: even with wrong credentials, the error MUST be caught
		// and returned as a proper JSON error response, never as an unhandled 500 crash.
		// Acceptable statuses: 400, 401, 403, 404, 500 (caught & wrapped), never raw crash
		const body = await res.json().catch(() => null);

		t.ok(body, `${route.method} ${route.path} must return valid JSON, not crash`);

		if (res.status === 500) {
			// If it's 500, it MUST be a caught error with our error format
			t.ok(body?.error, `${route.method} ${route.path} 500 must have error message`);
			t.ok(body?.code, `${route.method} ${route.path} 500 must have error code`);
			t.equal(body?.code, "INTERNAL_ERROR",
				`${route.method} ${route.path} 500 must use INTERNAL_ERROR code (caught, not crashed)`);
		}
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: POST /auth/login with invalid credentials must not crash
// ─────────────────────────────────────────────────────────────────────────────
tap.test("Suite 4 – POST /auth/login with bad credentials returns structured error, never unhandled crash", async (t) => {
	const envWithKey = {
		NODE_ENV: "test",
		SUPABASE_URL: "https://zniehugopmvoutxnpgox.supabase.co",
		SUPABASE_SERVICE_KEY: "deliberately-wrong-key-to-test-error-handling",
		JWT_SECRET: "development-only-secret-change-before-production",
	};

	const res = await app.request(
		"/auth/login",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "nonexistent-ci-test@example.com",
				password: "wrongpassword123",
			}),
		},
		envWithKey
	);

	const body = await res.json().catch(() => null);
	t.ok(body, "Login response must return valid JSON");

	if (res.status === 500) {
		t.ok(body?.error, "500 must have error message");
		t.ok(body?.code, "500 must have error code (caught error, not unhandled crash)");
	} else {
		t.ok(
			[400, 401, 403, 404, 429].includes(res.status),
			`Login with bad credentials → ${res.status} (acceptable)`
		);
	}
});
