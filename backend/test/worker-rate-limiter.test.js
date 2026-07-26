const t = require("tap");
const workerApp = require("../src/index");

function createMockRateLimiter(max = 15) {
	const counts = new Map();
	return {
		async limit({ key }) {
			const current = (counts.get(key) || 0) + 1;
			counts.set(key, current);
			return {
				success: current <= max,
			};
		},
	};
}

t.test("Cloudflare Workers Native Rate Limiting Binding Suite", async (t) => {
	t.test("AUTH_LIMITER binding blocks requests after reaching limit on /auth/login", async (t) => {
		const mockAuthLimiter = createMockRateLimiter(15);
		const env = { AUTH_LIMITER: mockAuthLimiter };

		// Make 15 requests allowed by mock binding
		for (let i = 1; i <= 15; i++) {
			const res = await workerApp.request(
				"http://localhost/auth/login",
				{
					method: "POST",
					headers: {
						"CF-Connecting-IP": "203.0.113.10",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ email: `user${i}@example.com`, password: "wrong" }),
				},
				env,
			);
			t.ok(res.status !== 429, `Request ${i} should be allowed`);
		}

		// 16th request must be blocked with HTTP 429
		const blockedRes = await workerApp.request(
			"http://localhost/auth/login",
			{
				method: "POST",
				headers: {
					"CF-Connecting-IP": "203.0.113.10",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: "user16@example.com", password: "wrong" }),
			},
			env,
		);

		t.equal(blockedRes.status, 429);
		t.equal(blockedRes.headers.get("Retry-After"), "60");
		const body = await blockedRes.json();
		t.equal(body.code, "AUTH_RATE_LIMIT_EXCEEDED");
		t.equal(body.error, "Muitas tentativas de autenticação. Por favor, aguarde 1 minuto.");
	});

	t.test("GLOBAL_LIMITER binding blocks requests when limit is exceeded on general endpoints", async (t) => {
		const mockGlobalLimiter = createMockRateLimiter(2);
		const env = { GLOBAL_LIMITER: mockGlobalLimiter };

		// 2 allowed requests
		const res1 = await workerApp.request("http://localhost/health", {}, env);
		t.equal(res1.status, 200);

		const res2 = await workerApp.request("http://localhost/health", {}, env);
		t.equal(res2.status, 200);

		// 3rd request blocked
		const blockedRes = await workerApp.request("http://localhost/health", {}, env);
		t.equal(blockedRes.status, 429);
		t.equal(blockedRes.headers.get("Retry-After"), "60");

		const body = await blockedRes.json();
		t.equal(body.code, "GLOBAL_RATE_LIMIT_EXCEEDED");
	});

	t.test("passes through safely when no rate limiter binding is defined in env", async (t) => {
		const res = await workerApp.request("http://localhost/health", {}, {});
		t.equal(res.status, 200);
	});
});
