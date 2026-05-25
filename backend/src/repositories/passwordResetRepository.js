const supabase = require("../lib/supabase");

exports.invalidateForUser = async function (userId) {
	const { error } = await supabase
		.from("password_reset_codes")
		.update({ usado_em: new Date().toISOString() })
		.eq("user_id", userId)
		.is("usado_em", null);
	if (error) throw error;
};

exports.create = async function ({ userId, codeHash, expiresAt }) {
	const { data, error } = await supabase
		.from("password_reset_codes")
		.insert({
			user_id: userId,
			code_hash: codeHash,
			expira_em: expiresAt,
		})
		.select()
		.single();
	if (error) throw error;
	return data;
};

exports.findValidByUserAndHash = async function ({ userId, codeHash }) {
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from("password_reset_codes")
		.select("*")
		.eq("user_id", userId)
		.eq("code_hash", codeHash)
		.is("usado_em", null)
		.gt("expira_em", now)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return data || null;
};

exports.markUsed = async function (id) {
	const { data, error } = await supabase
		.from("password_reset_codes")
		.update({ usado_em: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
};
