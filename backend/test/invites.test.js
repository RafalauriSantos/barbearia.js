process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");

function loadInvitesService({
	authRepository,
	barbersRepository,
	invitesRepository,
	emailService,
}) {
	require.cache[require.resolve("../src/repositories/authRepository")] = {
		exports: authRepository,
	};
	require.cache[require.resolve("../src/repositories/barbersRepository")] = {
		exports: barbersRepository,
	};
	require.cache[require.resolve("../src/repositories/invitesRepository")] = {
		exports: invitesRepository,
	};
	require.cache[require.resolve("../src/services/emailService")] = {
		exports: emailService,
	};
	delete require.cache[require.resolve("../src/services/invitesService")];
	return require("../src/services/invitesService");
}

const adminUser = {
	id: "admin-1",
	role: "admin",
	barbearia_id: "shop-1",
	barbeiro_id: "barber-admin",
};

t.test("admin creates barber invite and dev url", async (t) => {
	let storedTokenHash;
	let sentEmail;
	let revokeArgs;
	const service = loadInvitesService({
		authRepository: {},
		barbersRepository: {
			findByIdInBarbearia: async () => ({
				id: "barber-1",
				nome: "Joao",
				barbearia_id: "shop-1",
				usuario_id: null,
			}),
			update: async () => ({ id: "barber-1" }),
		},
		invitesRepository: {
			revokePendingForBarber: async (barbeiroId) => {
				revokeArgs = { barbeiroId };
			},
			create: async ({ tokenHash, email }) => {
				storedTokenHash = tokenHash;
				return {
					id: "invite-1",
					email,
					barbearia_id: "shop-1",
					barbeiro_id: "barber-1",
					expira_em: new Date(Date.now() + 1000).toISOString(),
					barbeiro: { id: "barber-1", nome: "Joao" },
					barbearia: { id: "shop-1", nome: "Gestor Barbearia" },
				};
			},
		},
		emailService: {
			sendBarberInviteEmail: async (payload) => {
				sentEmail = payload;
			},
		},
	});

	const result = await service.createBarberInvite(
		"barber-1",
		{ email: "joao@example.com" },
		adminUser,
	);

	t.equal(result.invite.email, "joao@example.com");
	t.match(result.inviteUrl, /\/accept-invite\?token=/);
	t.equal(storedTokenHash.length, 64);
	t.same(revokeArgs, {
		barbeiroId: "barber-1",
	});
	t.equal(sentEmail.to, "joao@example.com");
	t.match(sentEmail.inviteUrl, /\/accept-invite\?token=/);
});

t.test("accept invite creates verified user and links barber", async (t) => {
	let linkedUserId;
	const expires = new Date(Date.now() + 1000 * 60).toISOString();
	const service = loadInvitesService({
		authRepository: {
			findByEmail: async () => null,
			create: async ({ email, nome, email_verificado_em }) => ({
				id: "user-1",
				email,
				nome,
				email_verificado_em,
			}),
			findById: async () => ({
				id: "user-1",
				email: "joao@example.com",
				nome: "Joao",
				role: "barbeiro",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-1",
			}),
		},
		barbersRepository: {
			linkUser: async (id, barbeariaId, userId) => {
				linkedUserId = userId;
				return { id, barbearia_id: barbeariaId, usuario_id: userId };
			},
		},
		invitesRepository: {
			findByTokenHash: async () => ({
				id: "invite-1",
				email: "joao@example.com",
				barbearia_id: "shop-1",
				barbeiro_id: "barber-1",
				expira_em: expires,
				barbeiro: {
					id: "barber-1",
					nome: "Joao",
					usuario_id: null,
				},
				barbearia: { id: "shop-1", nome: "Gestor Barbearia" },
			}),
			markAccepted: async () => true,
		},
		emailService: {
			sendBarberInviteEmail: async () => true,
		},
	});

	const result = await service.acceptInvite("token-value", {
		password: "supersecret",
	});

	t.equal(linkedUserId, "user-1");
	t.equal(result.user.role, "barbeiro");
	t.ok(result.accessToken);
	t.ok(result.refreshToken);
});
