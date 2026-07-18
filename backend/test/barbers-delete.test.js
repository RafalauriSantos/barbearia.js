process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";
const t = require("tap");
const jwt = require("jsonwebtoken");

function clearAppCache() {
	for (const modulePath of [
		"../src/app",
		"../src/routes/barbers",
		"../src/controllers/barbersController",
		"../src/services/barbersService",
		"../src/services/authService",
	]) {
		const resolved = require.resolve(modulePath);
		delete require.cache[resolved];
	}
}

function mockAuthRepository() {
	require.cache[require.resolve("../src/repositories/authRepository")] = {
		exports: {
			findById: async (id) => ({
				id,
				email: "admin@example.com",
				role: "admin",
				barbearia_id: "barbearia-1",
				barbeiro_id: "barber-admin",
			}),
		},
	};
}

function authHeaders() {
	const { env } = require("../src/config/env");
	const token = jwt.sign({ userId: "user-1" }, env.JWT_SECRET);
	return { authorization: `Bearer ${token}` };
}

t.test("DELETE /barbers/:id tests", async (t) => {
	const repoPath = require.resolve("../src/repositories/barbersRepository");

	t.test("Deletes physically (hard delete) when barber has no appointments", async (t) => {
		mockAuthRepository();

		let hardDeleted = false;
		let invitesDeleted = false;

		const mock = {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
				nome: "Barbeiro Teste",
				cargo: "barbeiro",
				ativo: true,
			}),
			countAppointments: async (id) => 0,
			deletePendingInvites: async (id) => {
				invitesDeleted = true;
			},
			hardDelete: async (id, barbeariaId) => {
				hardDeleted = true;
			},
		};

		require.cache[repoPath] = { exports: mock };
		clearAppCache();

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/barbers/barber-to-delete",
			headers: authHeaders(),
		});

		t.equal(res.statusCode, 200);
		const payload = JSON.parse(res.payload);
		t.equal(payload.success, true);
		t.equal(payload.mode, "hard");
		t.equal(hardDeleted, true);
		t.equal(invitesDeleted, true);
	});

	t.test("Inactivates (soft delete) when barber has appointments", async (t) => {
		mockAuthRepository();

		let softDeleted = false;
		let invitesDeleted = false;

		const mock = {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
				nome: "Barbeiro Historico",
				cargo: "barbeiro",
				ativo: true,
			}),
			countAppointments: async (id) => 10,
			deletePendingInvites: async (id) => {
				invitesDeleted = true;
			},
			update: async (id, barbeariaId, updates) => {
				if (updates.ativo === false) {
					softDeleted = true;
				}
				return { id, ...updates };
			},
		};

		require.cache[repoPath] = { exports: mock };
		clearAppCache();

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/barbers/barber-to-soft-delete",
			headers: authHeaders(),
		});

		t.equal(res.statusCode, 200);
		const payload = JSON.parse(res.payload);
		t.equal(payload.success, true);
		t.equal(payload.mode, "soft");
		t.equal(softDeleted, true);
		t.equal(invitesDeleted, true);
	});

	t.test("Fails with 400 when trying to delete the shop owner (dono)", async (t) => {
		mockAuthRepository();

		const mock = {
			findByIdInBarbearia: async (id, barbeariaId) => ({
				id,
				barbearia_id: barbeariaId,
				nome: "Dono da Barbearia",
				cargo: "dono",
				ativo: true,
			}),
		};

		require.cache[repoPath] = { exports: mock };
		clearAppCache();

		const { buildApp } = require("../src/app");
		const app = await buildApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/barbers/owner-barber",
			headers: authHeaders(),
		});

		t.equal(res.statusCode, 400);
		const payload = JSON.parse(res.payload);
		t.equal(payload.code, "CANNOT_DELETE_OWNER");
	});
});
