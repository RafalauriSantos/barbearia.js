const t = require("tap");
const bcrypt = require("bcryptjs");
const { verifyCredentials } = require("../src/services/authService");

t.test("User Identity Based Login Lockout Suite", async (t) => {
	t.test("valid login succeeds when account is not locked", async (t) => {
		const passwordHash = await bcrypt.hash("correctpassword", 10);
		const userRepoPath = require.resolve("../src/repositories/authRepository");

		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async (email) => {
					if (email === "user@example.com") {
						return {
							id: "u1",
							email: "user@example.com",
							senha_hash: passwordHash,
							password_hash: passwordHash,
							email_verificado_em: "2026-01-01T00:00:00Z",
							role: "admin",
							barbearia_id: "b1",
							barbeiro_id: "b1",
							tentativas_login_falhas: 0,
							bloqueado_ate: null,
						};
					}
					return null;
				},
				resetUserFailedLogin: async () => {},
				recordUserFailedLogin: async () => ({ found: true, attempts: 1, locked: false }),
			},
		};

		const user = await verifyCredentials("user@example.com", "correctpassword");
		t.ok(user, "User should successfully log in");
		t.equal(user.id, "u1");
	});

	t.test("incorrect password increments failed counter and returns null without enumerating user", async (t) => {
		const passwordHash = await bcrypt.hash("correctpassword", 10);
		let recordCalled = false;

		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => ({
					id: "u1",
					email: "user@example.com",
					senha_hash: passwordHash,
					password_hash: passwordHash,
					email_verificado_em: "2026-01-01T00:00:00Z",
					tentativas_login_falhas: 2,
					bloqueado_ate: null,
				}),
				recordUserFailedLogin: async (email) => {
					recordCalled = true;
					t.equal(email, "user@example.com");
					return { found: true, attempts: 3, locked: false };
				},
				resetUserFailedLogin: async () => {},
			},
		};

		const result = await verifyCredentials("user@example.com", "wrongpassword");
		t.equal(result, null);
		t.ok(recordCalled, "recordUserFailedLogin should have been called");
	});

	t.test("locks account on 5th consecutive failed attempt and throws HTTP 429", async (t) => {
		const passwordHash = await bcrypt.hash("correctpassword", 10);

		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => ({
					id: "u1",
					email: "user@example.com",
					senha_hash: passwordHash,
					password_hash: passwordHash,
					email_verificado_em: "2026-01-01T00:00:00Z",
					tentativas_login_falhas: 4,
					bloqueado_ate: null,
				}),
				recordUserFailedLogin: async () => ({
					found: true,
					attempts: 5,
					locked: true,
					locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
				}),
				resetUserFailedLogin: async () => {},
			},
		};

		try {
			await verifyCredentials("user@example.com", "wrongpassword");
			t.fail("Should have thrown ACCOUNT_LOCKED error");
		} catch (err) {
			t.equal(err.status, 429);
			t.equal(err.code, "ACCOUNT_LOCKED");
			t.ok(err.message.includes("bloqueada"));
		}
	});

	t.test("blocks login immediately if account is currently locked", async (t) => {
		const futureLock = new Date(Date.now() + 10 * 60 * 1000).toISOString();

		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => ({
					id: "u1",
					email: "locked@example.com",
					senha_hash: "hash",
					password_hash: "hash",
					tentativas_login_falhas: 5,
					bloqueado_ate: futureLock,
				}),
			},
		};

		try {
			await verifyCredentials("locked@example.com", "anypassword");
			t.fail("Should have blocked locked account");
		} catch (err) {
			t.equal(err.status, 429);
			t.equal(err.code, "ACCOUNT_LOCKED");
		}
	});

	t.test("resets failed counter on successful login after previous failed attempts", async (t) => {
		const passwordHash = await bcrypt.hash("correctpassword", 10);
		let resetCalled = false;

		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => ({
					id: "u1",
					email: "user@example.com",
					senha_hash: passwordHash,
					password_hash: passwordHash,
					email_verificado_em: "2026-01-01T00:00:00Z",
					tentativas_login_falhas: 3,
					bloqueado_ate: null,
				}),
				resetUserFailedLogin: async (userId) => {
					resetCalled = true;
					t.equal(userId, "u1");
				},
				recordUserFailedLogin: async () => ({}),
			},
		};

		const user = await verifyCredentials("user@example.com", "correctpassword");
		t.ok(user);
		t.ok(resetCalled, "resetUserFailedLogin should be called on successful login");
	});

	t.test("allows login after 15-minute lockout period expires", async (t) => {
		const passwordHash = await bcrypt.hash("correctpassword", 10);
		const expiredLock = new Date(Date.now() - 60 * 1000).toISOString();
		let resetCalled = false;

		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => ({
					id: "u1",
					email: "expired@example.com",
					senha_hash: passwordHash,
					password_hash: passwordHash,
					email_verificado_em: "2026-01-01T00:00:00Z",
					tentativas_login_falhas: 5,
					bloqueado_ate: expiredLock,
				}),
				resetUserFailedLogin: async () => {
					resetCalled = true;
				},
				recordUserFailedLogin: async () => ({}),
			},
		};

		const user = await verifyCredentials("expired@example.com", "correctpassword");
		t.ok(user, "User should be able to log in after lockout expiration");
		t.ok(resetCalled);
	});

	t.test("non-existent email returns null without enumerating user existence", async (t) => {
		const userRepoPath = require.resolve("../src/repositories/authRepository");
		require.cache[userRepoPath] = {
			exports: {
				findByEmail: async () => null,
				recordUserFailedLogin: async () => ({}),
				resetUserFailedLogin: async () => {},
			},
		};

		const result = await verifyCredentials("nonexistent@example.com", "password");
		t.equal(result, null);
	});
});
