const supabase = require("../lib/supabase");
const { randomUUID } = require("crypto");
const { env } = require("../config/env");

function getDisplayName(row) {
	return row.nome || row.email?.split("@")[0] || "Dono";
}

async function findBarberByUserId(userId, barbeariaId) {
	let query = supabase
		.from("barbeiros")
		.select("id, barbearia_id")
		.eq("usuario_id", userId)
		.eq("ativo", true);

	if (barbeariaId) {
		query = query.eq("barbearia_id", barbeariaId);
	}

	const { data, error } = await query.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return data || null;
}

async function createOwnerBarber(user, barbeariaId) {
	const { data, error } = await supabase
		.from("barbeiros")
		.insert({
			barbearia_id: barbeariaId,
			usuario_id: user.id,
			email: user.email,
			nome: getDisplayName(user),
			cargo: "dono",
			comissao_percent: 0,
			ativo: true,
		})
		.select("id, barbearia_id")
		.single();
	if (error) throw error;
	return data;
}

async function linkExistingOwnerBarber(user, barbeariaId) {
	const { data, error } = await supabase
		.from("barbeiros")
		.select("id,nome,email,usuario_id")
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true);
	if (error) throw error;

	const rows = data || [];
	const userEmail = String(user.email || "").trim().toLowerCase();
	const userName = getDisplayName(user).trim().toLowerCase();
	const unlinkedRows = rows.filter((row) => !row.usuario_id);
	const candidate =
		unlinkedRows.find(
			(row) => row.email && row.email.trim().toLowerCase() === userEmail,
		) ||
		unlinkedRows.find(
			(row) => row.nome && row.nome.trim().toLowerCase() === userName,
		) ||
		(unlinkedRows.length === 1 ? unlinkedRows[0] : null);

	if (!candidate) return null;

	const { data: linked, error: linkError } = await supabase
		.from("barbeiros")
		.update({
			usuario_id: user.id,
			email: candidate.email || user.email,
			cargo: candidate.cargo || "dono",
		})
		.eq("id", candidate.id)
		.eq("barbearia_id", barbeariaId)
		.is("usuario_id", null)
		.select("id, barbearia_id")
		.maybeSingle();
	if (linkError && linkError.code !== "PGRST116") throw linkError;
	return linked || null;
}

async function ensureOwnerBarber(user, barbeariaId) {
	const linkedBarber = await findBarberByUserId(user.id, barbeariaId);
	if (linkedBarber) return linkedBarber;

	const legacyBarber = await linkExistingOwnerBarber(user, barbeariaId);
	if (legacyBarber) return legacyBarber;

	return createOwnerBarber(user, barbeariaId);
}

async function ensureOwnerWorkspace(user) {
	const { data: existingBarbearia, error: findError } = await supabase
		.from("barbearias")
		.select("id")
		.eq("usuario_dono_id", user.id)
		.maybeSingle();
	if (findError && findError.code !== "PGRST116") throw findError;

	let barbearia = existingBarbearia;
	if (!barbearia) {
		const { data, error } = await supabase
			.from("barbearias")
			.insert({
				usuario_dono_id: user.id,
				nome: "Minha Barbearia",
			})
			.select("id")
			.single();
		if (error) throw error;
		barbearia = data;
	}

	const barber = await ensureOwnerBarber(user, barbearia.id);
	return { barbearia, barber };
}

function resolveDevUserContext() {
	// Legacy local fallback: only used when the user is not linked to a shop
	// owner record or a barber profile.
	if (env.NODE_ENV === "production" || !env.DEFAULT_BARBEARIA_ID) {
		return {
			role: "admin",
			barbearia_id: null,
			barbeiro_id: null,
		};
	}

	return {
		role: env.DEFAULT_BARBEIRO_ID ? "barbeiro" : "admin",
		barbearia_id: env.DEFAULT_BARBEARIA_ID,
		barbeiro_id: env.DEFAULT_BARBEIRO_ID || null,
	};
}

async function resolveUserContext(user) {
	const { data: ownedBarbearia, error } = await supabase
		.from("barbearias")
		.select("id")
		.eq("usuario_dono_id", user.id)
		.maybeSingle();

	if (error && error.code !== "PGRST116") throw error;

	if (ownedBarbearia) {
		const ownedBarber = await ensureOwnerBarber(user, ownedBarbearia.id);
		return {
			role: "admin",
			barbearia_id: ownedBarbearia.id,
			barbeiro_id: ownedBarber?.id || null,
		};
	}

	const linkedBarber = await findBarberByUserId(user.id);
	if (linkedBarber) {
		return {
			role: "barbeiro",
			barbearia_id: linkedBarber.barbearia_id,
			barbeiro_id: linkedBarber.id,
		};
	}

	return resolveDevUserContext();
}

async function toAuthUser(row) {
	if (!row) return null;

	const context = await resolveUserContext(row);
	return {
		...row,
		password_hash: row.senha_hash,
		email_verificado_em: row.email_verificado_em || null,
		role: row.role || context.role,
		barbearia_id: row.barbearia_id || context.barbearia_id,
		barbeiro_id: row.barbeiro_id || context.barbeiro_id,
	};
}

exports.findByEmail = async function (email) {
	const { data, error } = await supabase
		.from("usuarios")
		.select("*")
		.eq("email", email)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return toAuthUser(data);
};

exports.findById = async function (id) {
	const { data, error } = await supabase
		.from("usuarios")
		.select("*")
		.eq("id", id)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return toAuthUser(data);
};

exports.create = async function ({
	email,
	password_hash,
	nome,
	email_verificado_em,
	create_workspace,
}) {
	const row = {
		id: randomUUID(),
		nome: nome || email.split("@")[0],
		email,
		senha_hash: password_hash,
		...(email_verificado_em ? { email_verificado_em } : {}),
	};
	const { data, error } = await supabase
		.from("usuarios")
		.insert(row)
		.select()
		.single();
	if (error) throw error;

	if (create_workspace) {
		await ensureOwnerWorkspace(data);
	}

	return toAuthUser(data);
};

exports.markEmailVerified = async function (userId) {
	const { data, error } = await supabase
		.from("usuarios")
		.update({ email_verificado_em: new Date().toISOString() })
		.eq("id", userId)
		.select()
		.single();
	if (error) throw error;
	return toAuthUser(data);
};

exports.updatePassword = async function (
	userId,
	password_hash,
	{ markEmailVerified = false } = {},
) {
	const updates = {
		senha_hash: password_hash,
		...(markEmailVerified ?
			{ email_verificado_em: new Date().toISOString() }
		:	{}),
	};

	const { data, error } = await supabase
		.from("usuarios")
		.update(updates)
		.eq("id", userId)
		.select()
		.single();
	if (error) throw error;
	return toAuthUser(data);
};
