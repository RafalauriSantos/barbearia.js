const t = require("tap");
const turnstileService = require("../src/services/turnstileService");
const workerApp = require("../src/index");

t.test("Cloudflare Turnstile Verification Service & Endpoint Protection Suite", async (t) => {
	t.test("verifyToken succeeds with dummy-turnstile-token in test environment", async (t) => {
		const result = await turnstileService.verifyToken("dummy-turnstile-token", "127.0.0.1", {
			NODE_ENV: "test",
		});
		t.equal(result, true);
	});

	t.test("verifyToken throws 400 when token is missing or empty", async (t) => {
		try {
			await turnstileService.verifyToken("", "127.0.0.1", { NODE_ENV: "production" });
			t.fail("Should have thrown INVALID_TURNSTILE_TOKEN error");
		} catch (err) {
			t.equal(err.status, 400);
			t.equal(err.code, "INVALID_TURNSTILE_TOKEN");
			t.ok(err.message.includes("obrigatória"));
		}
	});

	t.test("verifyToken throws 400 with DUMMY_FAIL_SECRET or dummy-fail-token", async (t) => {
		try {
			await turnstileService.verifyToken("dummy-fail-token", "127.0.0.1", {
				NODE_ENV: "test",
				TURNSTILE_SECRET_KEY: turnstileService.DUMMY_FAIL_SECRET,
			});
			t.fail("Should have thrown INVALID_TURNSTILE_TOKEN error");
		} catch (err) {
			t.equal(err.status, 400);
			t.equal(err.code, "INVALID_TURNSTILE_TOKEN");
		}
	});

	t.test("POST /auth/register blocks request when turnstile token is missing (anti-bypass)", async (t) => {
		const env = {
			NODE_ENV: "test",
			TURNSTILE_SECRET_KEY: turnstileService.DUMMY_FAIL_SECRET,
			AUTH_LIMITER: { limit: async () => ({ success: true }) },
			GLOBAL_LIMITER: { limit: async () => ({ success: true }) },
		};

		const res = await workerApp.request(
			"http://localhost/auth/register",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "bot@example.com", password: "password123" }),
			},
			env,
		);

		t.equal(res.status, 400);
		const body = await res.json();
		t.equal(body.code, "INVALID_TURNSTILE_TOKEN");
	});

	t.test("POST /auth/forgot-password blocks request when turnstile token is missing (anti-bypass)", async (t) => {
		const env = {
			NODE_ENV: "test",
			TURNSTILE_SECRET_KEY: turnstileService.DUMMY_FAIL_SECRET,
			AUTH_LIMITER: { limit: async () => ({ success: true }) },
			GLOBAL_LIMITER: { limit: async () => ({ success: true }) },
		};

		const res = await workerApp.request(
			"http://localhost/auth/forgot-password",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "victim@example.com" }),
			},
			env,
		);

		t.equal(res.status, 400);
		const body = await res.json();
		t.equal(body.code, "INVALID_TURNSTILE_TOKEN");
	});

	t.test("POST /auth/resend-code blocks request when turnstile token is missing (anti-bypass)", async (t) => {
		const env = {
			NODE_ENV: "test",
			TURNSTILE_SECRET_KEY: turnstileService.DUMMY_FAIL_SECRET,
			AUTH_LIMITER: { limit: async () => ({ success: true }) },
			GLOBAL_LIMITER: { limit: async () => ({ success: true }) },
		};

		const res = await workerApp.request(
			"http://localhost/auth/resend-code",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "user@example.com" }),
			},
			env,
		);

		t.equal(res.status, 400);
		const body = await res.json();
		t.equal(body.code, "INVALID_TURNSTILE_TOKEN");
	});
});
