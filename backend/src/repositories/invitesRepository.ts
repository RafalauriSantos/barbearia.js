import supabase from "../lib/supabase";

function toApi(row: any) {
	if (!row) return null;
	return {
		id: row.id,
		barbearia_id: row.barbearia_id,
		barbeiro_id: row.barbeiro_id,
		email: row.email,
		token_hash: row.token_hash,
		expira_em: row.expira_em,
		aceito_em: row.aceito_em,
		revogado_em: row.revogado_em,
		criado_por_usuario_id: row.criado_por_usuario_id,
		criado_em: row.criado_em,
		barbeiro: row.barbeiros || null,
		barbearia: row.barbearias || null,
	};
}

export async function revokePendingForBarber(barbeiroId: string): Promise<void> {
	const { error } = await supabase
		.from("convites_barbeiros")
		.update({ revogado_em: new Date().toISOString() })
		.eq("barbeiro_id", barbeiroId)
		.is("aceito_em", null)
		.is("revogado_em", null);
	if (error) throw error;
}

export async function create({
	barbeariaId,
	barbeiroId,
	email,
	tokenHash,
	expiresAt,
	createdByUserId,
}: {
	barbeariaId: string;
	barbeiroId: string;
	email: string;
	tokenHash: string;
	expiresAt: string;
	createdByUserId?: string;
}) {
	const { data, error } = await supabase
		.from("convites_barbeiros")
		.insert({
			barbearia_id: barbeariaId,
			barbeiro_id: barbeiroId,
			email,
			token_hash: tokenHash,
			expira_em: expiresAt,
			criado_por_usuario_id: createdByUserId,
		})
		.select("*, barbeiros(id,nome,email,usuario_id,barbearia_id), barbearias(id,nome)")
		.single();
	if (error) throw error;
	return toApi(data);
}

export async function findByTokenHash(tokenHash: string) {
	const { data, error } = await supabase
		.from("convites_barbeiros")
		.select("*, barbeiros(id,nome,email,usuario_id,barbearia_id), barbearias(id,nome)")
		.eq("token_hash", tokenHash)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return toApi(data);
}

export async function markAccepted(id: string) {
	const { data, error } = await supabase
		.from("convites_barbeiros")
		.update({ aceito_em: new Date().toISOString() })
		.eq("id", id)
		.select("*, barbeiros(id,nome,email,usuario_id,barbearia_id), barbearias(id,nome)")
		.single();
	if (error) throw error;
	return toApi(data);
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	revokePendingForBarber,
	create,
	findByTokenHash,
	markAccepted,
}; }
export default {
	revokePendingForBarber,
	create,
	findByTokenHash,
	markAccepted,
};
