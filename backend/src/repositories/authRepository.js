const supabase = require("../lib/supabase");
const { randomUUID } = require("crypto");

exports.findByEmail = async function (email) {
	const { data, error } = await supabase
		.from("usuarios")
		.select("*")
		.eq("email", email)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? { ...data, password_hash: data.senha_hash } : null;
};

exports.create = async function ({ email, password_hash }) {
	const row = {
		id: randomUUID(),
		nome: email.split("@")[0],
		email,
		senha_hash: password_hash,
	};
	const { data, error } = await supabase
		.from("usuarios")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return { ...data, password_hash: data.senha_hash };
};
