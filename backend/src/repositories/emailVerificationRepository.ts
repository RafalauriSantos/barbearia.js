const supabase = require("../lib/supabase");

export async function invalidateForUser(userId: string): Promise<void> {
	const { error } = await supabase
		.from("email_verification_codes")
		.update({ usado_em: new Date().toISOString() })
		.eq("user_id", userId)
		.is("usado_em", null);
	if (error) throw error;
}

export async function create({ userId, codeHash, expiresAt }: { userId: string; codeHash: string; expiresAt: string }) {
	const { data, error } = await supabase
		.from("email_verification_codes")
		.insert({
			user_id: userId,
			code_hash: codeHash,
			expira_em: expiresAt,
		})
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function findValidByUserAndHash({ userId, codeHash }: { userId: string; codeHash: string }) {
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from("email_verification_codes")
		.select("*")
		.eq("user_id", userId)
		.eq("code_hash", codeHash)
		.is("usado_em", null)
		.gt("expira_em", now)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return data || null;
}

export async function markUsed(id: string) {
	const { data, error } = await supabase
		.from("email_verification_codes")
		.update({ usado_em: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function findActiveForUser(userId: string) {
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from("email_verification_codes")
		.select("*")
		.eq("user_id", userId)
		.is("usado_em", null)
		.gt("expira_em", now)
		.order("criado_em", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return data || null;
}

export async function incrementAttempts(id: string) {
	const { data, error } = await supabase.rpc("incrementar_tentativas_codigo_verificacao", { p_id: id });
	if (error) throw error;
	return data;
}

export async function findRecentCodesForUser(userId: string, windowMs: number) {
	const limitTime = new Date(Date.now() - windowMs).toISOString();
	const { data, error } = await supabase
		.from("email_verification_codes")
		.select("criado_em")
		.eq("user_id", userId)
		.gte("criado_em", limitTime);
	if (error) throw error;
	return data || [];
}

module.exports = {
	invalidateForUser,
	create,
	findValidByUserAndHash,
	markUsed,
	findActiveForUser,
	incrementAttempts,
	findRecentCodesForUser,
};
export default module.exports;
