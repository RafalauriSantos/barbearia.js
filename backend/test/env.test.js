const t = require("tap");

const envPath = require.resolve("../src/config/env");

function loadEnv(overrides) {
	const previous = {};
	for (const key of Object.keys(overrides)) {
		previous[key] = process.env[key];
		if (overrides[key] === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = overrides[key];
		}
	}

	delete require.cache[envPath];

	try {
		return require("../src/config/env").env;
	} finally {
		for (const key of Object.keys(overrides)) {
			if (previous[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = previous[key];
			}
		}
		delete require.cache[envPath];
	}
}

t.test("production app url falls back from localhost to public frontend", (t) => {
	const env = loadEnv({
		NODE_ENV: "production",
		JWT_SECRET: "production-test-secret-with-enough-length",
		APP_URL: "http://localhost:5173",
	});

	t.equal(env.APP_URL, "https://kurt-barbearia.vercel.app");
	t.end();
});

t.test("production app url keeps explicit public origin", (t) => {
	const env = loadEnv({
		NODE_ENV: "production",
		JWT_SECRET: "production-test-secret-with-enough-length",
		APP_URL: "https://app.example.com",
	});

	t.equal(env.APP_URL, "https://app.example.com");
	t.end();
});
