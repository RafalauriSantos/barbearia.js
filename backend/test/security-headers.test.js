const t = require("tap");
const { getSecurityHeaders } = require("../src/middleware/securityHeaders");
const workerApp = require("../src/index");

t.test("OWASP Security Headers & Content Security Policy (CSP) Suite", async (t) => {
	t.test("getSecurityHeaders returns OWASP compliant headers for non-production", async (t) => {
		const headers = getSecurityHeaders(false);

		t.equal(headers["X-Content-Type-Options"], "nosniff");
		t.equal(headers["X-Frame-Options"], "DENY");
		t.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
		t.equal(headers["X-Permitted-Cross-Domain-Policies"], "none");
		t.equal(headers["X-DNS-Prefetch-Control"], "off");
		t.ok(headers["Permissions-Policy"].includes("camera=()"));
		t.ok(headers["Content-Security-Policy"].includes("default-src 'self'"));
		t.ok(headers["Content-Security-Policy"].includes("https://challenges.cloudflare.com"));
		t.notOk(headers["Strict-Transport-Security"], "HSTS should not be set in non-production");
	});

	t.test("getSecurityHeaders returns strict HSTS and CSP in production", async (t) => {
		const headers = getSecurityHeaders(true);

		t.equal(headers["Strict-Transport-Security"], "max-age=31536000; includeSubDomains; preload");
		t.ok(headers["Content-Security-Policy"].includes("upgrade-insecure-requests"));
		t.notOk(headers["Content-Security-Policy"].includes("'unsafe-eval'"));
	});

	t.test("Worker app includes security headers on responses", async (t) => {
		const res = await workerApp.request("http://localhost/health", {}, {});
		t.equal(res.status, 200);
		t.equal(res.headers.get("x-content-type-options"), "nosniff");
		t.equal(res.headers.get("x-frame-options"), "DENY");
		t.ok(res.headers.get("content-security-policy").includes("default-src 'self'"));
	});
});
