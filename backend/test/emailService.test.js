const t = require("tap");

const ENV_KEYS = [
	"EMAIL_PROVIDER",
	"EMAIL_TIMEOUT_MS",
	"EMAIL_FROM",
	"EMAIL_BRAND_NAME",
	"BREVO_API_KEY",
	"SMTP_HOST",
	"SMTP_PORT",
	"SMTP_SECURE",
	"SMTP_USER",
	"SMTP_PASS",
	"NODE_ENV",
];

function loadEmailService(overrides = {}) {
	for (const key of ENV_KEYS) {
		delete process.env[key];
	}

	Object.assign(process.env, {
		NODE_ENV: "test",
		EMAIL_FROM: "Marque’s Barbearia <no-reply@example.com>",
		EMAIL_TIMEOUT_MS: "1000",
		SMTP_HOST: "",
		SMTP_PORT: "587",
		SMTP_SECURE: "false",
		SMTP_USER: "",
		SMTP_PASS: "",
		...overrides,
	});

	delete require.cache[require.resolve("../src/config/env")];
	delete require.cache[require.resolve("../src/services/emailService")];
	return require("../src/services/emailService");
}

t.test("sendVerificationCodeEmail uses Brevo HTTP API", async (t) => {
	const originalFetch = global.fetch;
	let capturedRequest;

	global.fetch = async (url, options) => {
		capturedRequest = { url, options };
		return {
			ok: true,
			status: 201,
			text: async () => JSON.stringify({ messageId: "message-1" }),
		};
	};

	t.teardown(() => {
		global.fetch = originalFetch;
	});

	const emailService = loadEmailService({
		EMAIL_PROVIDER: "brevo",
		BREVO_API_KEY: "xkeysib-test",
	});

	const result = await emailService.sendVerificationCodeEmail({
		to: "Rafael <rafael@example.com>",
		code: "123456",
		shopName: "Marque’s Barbearia",
	});

	const body = JSON.parse(capturedRequest.options.body);

	t.equal(capturedRequest.url, "https://api.brevo.com/v3/smtp/email");
	t.equal(capturedRequest.options.method, "POST");
	t.equal(capturedRequest.options.headers["api-key"], "xkeysib-test");
	t.same(body.sender, {
		name: "Marque’s Barbearia",
		email: "no-reply@example.com",
	});
	t.same(body.to, [{ name: "Rafael", email: "rafael@example.com" }]);
	t.match(body.subject, /Codigo de confirmacao/);
	t.match(body.htmlContent, /123456/);
	t.notOk(body.textContent);
	t.same(result, { messageId: "message-1" });
});

t.test("Brevo errors include response status", async (t) => {
	const originalFetch = global.fetch;

	global.fetch = async () => ({
		ok: false,
		status: 401,
		text: async () => JSON.stringify({ message: "bad key" }),
	});

	t.teardown(() => {
		global.fetch = originalFetch;
	});

	const emailService = loadEmailService({
		EMAIL_PROVIDER: "brevo",
		BREVO_API_KEY: "xkeysib-test",
	});

	await t.rejects(
		emailService.sendCustomEmail({
			to: "rafael@example.com",
			subject: "Teste",
			text: "Mensagem",
		}),
		/Brevo email API failed with status 401/,
	);
});

t.test("brand name does not depend on EMAIL_FROM display name", async (t) => {
	const originalFetch = global.fetch;
	let capturedRequest;

	global.fetch = async (url, options) => {
		capturedRequest = { url, options };
		return {
			ok: true,
			status: 201,
			text: async () => JSON.stringify({ messageId: "message-2" }),
		};
	};

	t.teardown(() => {
		global.fetch = originalFetch;
	});

	const emailService = loadEmailService({
		EMAIL_PROVIDER: "brevo",
		BREVO_API_KEY: "xkeysib-test",
		EMAIL_FROM: "Kash Flow <rafa69lauri@gmail.com>",
	});

	await emailService.sendPasswordResetCodeEmail({
		to: "rafael@example.com",
		code: "654321",
	});

	const body = JSON.parse(capturedRequest.options.body);

	t.same(body.sender, {
		name: "Marque’s Barbearia",
		email: "rafa69lauri@gmail.com",
	});
	t.equal(body.subject, "Codigo para redefinir senha - Marque’s Barbearia");
	t.match(body.htmlContent, /Marque’s Barbearia/);
	t.notMatch(body.htmlContent, /Kash Flow/);
});

t.test("without Brevo or SMTP, email is logged with stream transport", async (t) => {
	const originalLog = console.log;
	const logs = [];

	console.log = (...args) => logs.push(args);

	t.teardown(() => {
		console.log = originalLog;
	});

	const emailService = loadEmailService();

	await emailService.sendPasswordResetCodeEmail({
		to: "rafael@example.com",
		code: "654321",
		shopName: "Marque’s Barbearia",
	});

	t.same(logs, [["[password-reset-code]", "654321"]]);
});
