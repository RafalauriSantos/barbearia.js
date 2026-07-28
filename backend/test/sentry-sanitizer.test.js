const test = require("tap").test;
const {
	Sentry,
	sanitizeSentryEvent,
	maskSensitiveFields,
	initSentry,
	withSentry,
} = require("../src/lib/sentry");

test("Sentry Sanitizer Suite", (t) => {
	t.test("masks sensitive fields in object payload", (st) => {
		const raw = {
			email: "user@example.com",
			senha: "super-secret-password-123",
			token: "bearer-xyz-jwt-token",
			nested: {
				user_password: "my-password",
				safeField: 42,
				alreadyNull: null,
			},
		};

		const sanitized = maskSensitiveFields(raw);
		st.equal(sanitized.email, "user@example.com");
		st.equal(sanitized.senha, "[FILTERED]");
		st.equal(sanitized.token, "[FILTERED]");
		st.equal(sanitized.nested.user_password, "[FILTERED]");
		st.equal(sanitized.nested.safeField, 42);
		st.equal(sanitized.nested.alreadyNull, null);
		st.end();
	});

	t.test("handles null, primitive, string, array, invalid JSON and valid JSON string payloads", (st) => {
		st.equal(maskSensitiveFields(null), null);
		st.equal(maskSensitiveFields("normal text"), "normal text");
		st.equal(maskSensitiveFields(123), 123);

		const validJsonString = JSON.stringify({ senha: "123" });
		st.equal(maskSensitiveFields(validJsonString), JSON.stringify({ senha: "[FILTERED]" }));

		const arrayPayload = [{ token: "abc" }, { ok: true }];
		st.same(maskSensitiveFields(arrayPayload), [{ token: "[FILTERED]" }, { ok: true }]);
		st.end();
	});

	t.test("sanitizes HTTP headers, body, extra and handles null event or empty sub-objects", (st) => {
		st.equal(sanitizeSentryEvent(null), null);

		const eventEmptyObj = {
			request: {},
		};
		st.ok(sanitizeSentryEvent(eventEmptyObj));

		const event = {
			request: {
				headers: {
					authorization: "Bearer secret-jwt-token",
					cookie: "session=xyz123",
					"set-cookie": "session=xyz123",
					"content-type": "application/json",
				},
				data: {
					senha: "secret-password",
				},
			},
			extra: {
				secretToken: "123",
			},
		};

		const sanitizedEvent = sanitizeSentryEvent(event);
		st.equal(sanitizedEvent.request.headers.authorization, "[FILTERED]");
		st.equal(sanitizedEvent.request.headers.cookie, "[FILTERED]");
		st.equal(sanitizedEvent.request.headers["set-cookie"], "[FILTERED]");
		st.equal(sanitizedEvent.request.headers["content-type"], "application/json");
		st.equal(sanitizedEvent.request.data.senha, "[FILTERED]");
		st.equal(sanitizedEvent.extra.secretToken, "[FILTERED]");
		st.end();
	});

	t.test("initSentry handles missing DSN, test env, and valid/invalid scenarios", (st) => {
		st.equal(initSentry(null), null);
		st.equal(initSentry({ SENTRY_DSN: "", NODE_ENV: "production" }), null);
		st.equal(
			initSentry({
				SENTRY_DSN: "https://public@sentry.example.com/1",
				NODE_ENV: "test",
			}),
			null,
		);

		// Test branch when Sentry.init is valid
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
