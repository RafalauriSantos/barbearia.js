const test = require("tap").test;
const {
	Sentry,
	sanitizeSentryEvent,
	maskSensitiveFields,
	initSentry,
	resetRateLimitCounter,
	withSentry,
} = require("../src/lib/sentry");

test("Sentry Sanitizer Suite", (t) => {
	t.beforeEach(() => {
		resetRateLimitCounter();
	});

	t.test("masks sensitive fields matching comprehensive regex pattern", (st) => {
		const raw = {
			email: "user@example.com",
			senha: "super-secret-password-123",
			user_password: "my-password",
			jwt: "bearer-xyz-jwt-token",
			bearer: "bearer-token-secret",
			otp: "123456",
			auth_credentials: "user:pass",
			api_key: "ak_live_12345",
			turnstile_token: "0.XXXX.YYYY",
			cpf_number: "123.456.789-00",
			credit_card_num: "4111-2222-3333-4444",
			safeField: 42,
			alreadyNull: null,
			nestedObj: {
				nonSensitiveProp: "all-good",
			},
		};

		const sanitized = maskSensitiveFields(raw);
		st.equal(sanitized.email, "user@example.com");
		st.equal(sanitized.senha, "[FILTERED]");
		st.equal(sanitized.user_password, "[FILTERED]");
		st.equal(sanitized.jwt, "[FILTERED]");
		st.equal(sanitized.bearer, "[FILTERED]");
		st.equal(sanitized.otp, "[FILTERED]");
		st.equal(sanitized.auth_credentials, "[FILTERED]");
		st.equal(sanitized.api_key, "[FILTERED]");
		st.equal(sanitized.turnstile_token, "[FILTERED]");
		st.equal(sanitized.cpf_number, "[FILTERED]");
		st.equal(sanitized.credit_card_num, "[FILTERED]");
		st.equal(sanitized.safeField, 42);
		st.equal(sanitized.alreadyNull, null);
		st.equal(sanitized.nestedObj.nonSensitiveProp, "all-good");
		st.end();
	});

	t.test("handles null, primitive, string, array, invalid JSON and valid JSON string payloads", (st) => {
		st.equal(maskSensitiveFields(null), null);
		st.equal(maskSensitiveFields("normal text"), "normal text");
		st.equal(maskSensitiveFields(123), 123);

		const validJsonString = JSON.stringify({ senha: "123", api_key: "secret" });
		st.equal(
			maskSensitiveFields(validJsonString),
			JSON.stringify({ senha: "[FILTERED]", api_key: "[FILTERED]" }),
		);

		const validJsonArrayString = JSON.stringify([{ senha: "123" }, { otp: "456" }]);
		st.equal(
			maskSensitiveFields(validJsonArrayString),
			JSON.stringify([{ senha: "[FILTERED]" }, { otp: "[FILTERED]" }]),
		);

		const arrayPayload = [{ token: "abc" }, { ok: true }];
		st.same(maskSensitiveFields(arrayPayload), [{ token: "[FILTERED]" }, { ok: true }]);
		st.end();
	});

	t.test("sanitizes HTTP headers, body, extra, fingerprint and handles null event or empty sub-objects", (st) => {
		st.equal(sanitizeSentryEvent(null), null);

		const eventEmptyObj = {
			request: {},
		};
		const sanitizedEmpty = sanitizeSentryEvent(eventEmptyObj);
		st.ok(sanitizedEmpty);
		st.same(sanitizedEmpty.fingerprint, ["{{ default }}", "UnknownError", "global"]);

		const event = {
			request: {
				url: "https://api.barber.com/auth/login",
				headers: {
					authorization: "Bearer secret-jwt-token",
					cookie: "session=xyz123",
					"set-cookie": "session=xyz123",
					"x-api-key": "secret-key",
					"content-type": "application/json",
				},
				data: {
					senha: "secret-password",
					otp: "654321",
				},
			},
			extra: {
				secretToken: "123",
			},
			exception: {
				values: [{ type: "DatabaseError" }],
			},
		};

		const sanitizedEvent = sanitizeSentryEvent(event);
		st.equal(sanitizedEvent.request.headers.authorization, "[FILTERED]");
		st.equal(sanitizedEvent.request.headers.cookie, "[FILTERED]");
		st.equal(sanitizedEvent.request.headers["set-cookie"], "[FILTERED]");
		st.equal(sanitizedEvent.request.headers["x-api-key"], "[FILTERED]");
		st.equal(sanitizedEvent.request.headers["content-type"], "application/json");
		st.equal(sanitizedEvent.request.data.senha, "[FILTERED]");
		st.equal(sanitizedEvent.request.data.otp, "[FILTERED]");
		st.equal(sanitizedEvent.extra.secretToken, "[FILTERED]");
		st.same(sanitizedEvent.fingerprint, ["{{ default }}", "DatabaseError", "https://api.barber.com/auth/login"]);
		st.end();
	});

	t.test("samples HTTP 429 Rate Limit events (1 every 50 events)", (st) => {
		const rateLimitEvent = {
			tags: { status_code: 429 },
			request: { url: "https://api.barber.com/auth/login" },
		};

		// 1st 429 event -> CAPTURED
		st.ok(sanitizeSentryEvent(rateLimitEvent));

		// 2nd to 50th 429 events -> IGNORED (null)
		for (let i = 2; i <= 50; i++) {
			st.equal(sanitizeSentryEvent(rateLimitEvent), null, `Event ${i} should be ignored`);
		}

		// 51st 429 event -> CAPTURED again
		st.ok(sanitizeSentryEvent(rateLimitEvent));
		st.end();
	});

	t.test("initSentry enforces strict production environment check", (st) => {
		st.equal(initSentry(null), null);
		st.equal(initSentry({ SENTRY_DSN: "", NODE_ENV: "production" }), null);

		// Non-production environments MUST return null
		st.equal(
			initSentry({
				SENTRY_DSN: "https://public@sentry.example.com/1",
				NODE_ENV: "development",
			}),
			null,
		);
		st.equal(
			initSentry({
				SENTRY_DSN: "https://public@sentry.example.com/1",
				NODE_ENV: "test",
			}),
			null,
		);

		// Production environment branch
		const origInit = Sentry.init;
		Sentry.init = (opts) => ({ initialized: true, opts });
		const res = initSentry({
			SENTRY_DSN: "https://public@sentry.example.com/1",
			NODE_ENV: "production",
		});
		st.ok(res.initialized);

		// Test branch when Sentry.init is null
		delete Sentry.init;
		st.equal(
			initSentry({
				SENTRY_DSN: "https://public@sentry.example.com/1",
				NODE_ENV: "production",
			}),
			null,
		);

		// Test exception handling in initSentry
		Sentry.init = () => {
			throw new Error("Init failure");
		};
		st.equal(
			initSentry({
				SENTRY_DSN: "https://public@sentry.example.com/1",
				NODE_ENV: "production",
			}),
			null,
		);
		Sentry.init = origInit;

		st.ok(typeof withSentry === "function" || withSentry === null);
		st.end();
	});

	t.end();
});
