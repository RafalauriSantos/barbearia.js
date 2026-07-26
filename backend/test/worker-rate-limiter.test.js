const t = require("tap");
const { createRateLimiter } = require("../src/middleware/rateLimiter");
const { Hono } = require("hono");

t.test("Worker Edge Rate Limiter Unit Suite", async (t) => {
	t.test("allows requests within limit and sets RateLimit headers", async (t) => {
		const app = new Hono();
		const limiter = createRateLimiter({
			windowMs: 60 * 1000,
			max: 3,
		});

		app.use("*", limiter);
		app.get("/test", (c) => c.text("ok"));

		// Request 1
		const res1 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "192.0.2.1" },
		});
		t.equal(res1.status, 200);
		t.equal(res1.headers.get("RateLimit-Limit"), "3");
		t.equal(res1.headers.get("RateLimit-Remaining"), "2");
		t.ok(res1.headers.get("RateLimit-Reset"));

		// Request 2
		const res2 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "192.0.2.1" },
		});
		t.equal(res2.status, 200);
		t.equal(res2.headers.get("RateLimit-Remaining"), "1");

		// Request 3
		const res3 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "192.0.2.1" },
		});
		t.equal(res3.status, 200);
		t.equal(res3.headers.get("RateLimit-Remaining"), "0");
	});

	t.test("blocks requests exceeding limit with HTTP 429 and Retry-After header", async (t) => {
		const app = new Hono();
		const limiter = createRateLimiter({
			windowMs: 60 * 1000,
			max: 2,
			message: "Limite atingido.",
			code: "TEST_LIMIT_REACHED",
		});

		app.use("*", limiter);
		app.get("/test", (c) => c.text("ok"));

		// 2 allowed requests
		await app.request("http://localhost/test", { headers: { "CF-Connecting-IP": "192.0.2.2" } });
		await app.request("http://localhost/test", { headers: { "CF-Connecting-IP": "192.0.2.2" } });

		// 3rd request should be blocked
		const blockedRes = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "192.0.2.2" },
		});
		t.equal(blockedRes.status, 429);
		t.ok(blockedRes.headers.get("Retry-After"));
		
		const body = await blockedRes.json();
		t.equal(body.code, "TEST_LIMIT_REACHED");
		t.equal(body.error, "Limite atingido.");
	});

	t.test("isolates rate limits per IP address", async (t) => {
		const app = new Hono();
		const limiter = createRateLimiter({
			windowMs: 60 * 1000,
			max: 1,
		});

		app.use("*", limiter);
		app.get("/test", (c) => c.text("ok"));

		// IP A - 1st request ok
		const resA1 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "198.51.100.1" },
		});
		t.equal(resA1.status, 200);

		// IP A - 2nd request blocked
		const resA2 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "198.51.100.1" },
		});
		t.equal(resA2.status, 429);

		// IP B - 1st request ok (different IP is not blocked)
		const resB1 = await app.request("http://localhost/test", {
			headers: { "CF-Connecting-IP": "198.51.100.2" },
		});
		t.equal(resB1.status, 200);
	});
});

t.test("Cloudflare Worker Main App (src/index.js) Rate Limiting Integration Suite", async (t) => {
	const workerApp = require("../src/index");

	t.test("strict rate limit on /auth/login blocks after 15 requests per IP", async (t) => {
		const testIp = "203.0.113.99";

		// Make 15 requests to /auth/login
		for (let i = 0; i < 15; i++) {
			const res = await workerApp.request("http://localhost/auth/login", {
				method: "POST",
				headers: {
					"CF-Connecting-IP": testIp,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: `user${i}@example.com`, password: "wrong" }),
			});
			t.ok(res.status !== 429, `Request ${i + 1} should not be rate-limited`);
		}

		// 16th request to /auth/login must return HTTP 429
		const blockedRes = await workerApp.request("http://localhost/auth/login", {
			method: "POST",
			headers: {
				"CF-Connecting-IP": testIp,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: "user16@example.com", password: "wrong" }),
		});

		t.equal(blockedRes.status, 429);
		const body = await blockedRes.json();
		t.equal(body.code, "AUTH_RATE_LIMIT_EXCEEDED");
		t.ok(blockedRes.headers.get("Retry-After"));
	});
});
