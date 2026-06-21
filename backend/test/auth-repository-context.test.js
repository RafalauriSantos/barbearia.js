const t = require("tap");

const envPath = require.resolve("../src/config/env");
const supabasePath = require.resolve("../src/lib/supabase");
const repositoryPath = require.resolve("../src/repositories/authRepository");

function createSupabaseStub() {
	return {
		from(table) {
			const query = {
				select() {
					return query;
				},
				eq() {
					return query;
				},
				async single() {
					return table === "usuarios" ?
						{
							data: {
								id: "user-without-workspace",
								email: "user@example.com",
								senha_hash: "hash",
							},
							error: null,
						}
					: { data: null, error: null };
				},
				async maybeSingle() {
					return { data: null, error: null };
				},
			};
			return query;
		},
	};
}

function loadRepository(overrides) {
	const previous = {};
	for (const [key, value] of Object.entries(overrides)) {
		previous[key] = process.env[key];
		process.env[key] = value;
	}

	delete require.cache[envPath];
	delete require.cache[repositoryPath];
	require.cache[supabasePath] = { exports: createSupabaseStub() };

	const repository = require("../src/repositories/authRepository");
	return {
		repository,
		restore() {
			for (const key of Object.keys(overrides)) {
				if (previous[key] === undefined) delete process.env[key];
				else process.env[key] = previous[key];
			}
			delete require.cache[envPath];
			delete require.cache[repositoryPath];
			delete require.cache[supabasePath];
		},
	};
}

t.test("production never assigns the development default workspace", async (t) => {
	const loaded = loadRepository({
		NODE_ENV: "production",
		JWT_SECRET: "production-test-secret-with-enough-length",
		DEFAULT_BARBEARIA_ID: "11111111-1111-4111-8111-111111111111",
		DEFAULT_BARBEIRO_ID: "22222222-2222-4222-8222-222222222222",
	});
	t.teardown(loaded.restore);

	const user = await loaded.repository.findById("user-without-workspace");

	t.equal(user.barbearia_id, null);
	t.equal(user.barbeiro_id, null);
	t.equal(user.role, "admin");
});
