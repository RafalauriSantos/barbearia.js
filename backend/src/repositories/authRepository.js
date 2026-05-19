const supabase = require("../lib/supabase");
const { randomUUID } = require("crypto");
const { env } = require("../config/env");

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

function resolveDevUserContext() {
	// Legacy local fallback: only used when the user is not linked to a shop
	// owner record or a barber profile.
	if (!env.DEFAULT_BARBEARIA_ID) {
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

async function resolveUserContext(userId) {
	const { data: ownedBarbearia, error } = await supabase
		.from("barbearias")
		.select("id")
		.eq("usuario_dono_id", userId)
		.maybeSingle();

	if (error && error.code !== "PGRST116") throw error;

	if (ownedBarbearia) {
		const ownedBarber = await findBarberByUserId(userId, ownedBarbearia.id);
		return {
			role: "admin",
			barbearia_id: ownedBarbearia.id,
			barbeiro_id: ownedBarber?.id || null,
		};
	}

	const linkedBarber = await findBarberByUserId(userId);
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

	const context = await resolveUserContext(row.id);
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

exports.create = async function ({ email, password_hash, nome, email_verificado_em }) {
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
