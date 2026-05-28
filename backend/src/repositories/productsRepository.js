const supabase = require("../lib/supabase");

function toApi(row) {
	return {
		id: row.id,
		name: row.nome,
		price: Number(row.preco || 0),
		active: row.ativo,
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload) {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.price !== undefined ? { preco: Number(payload.price) } : {}),
		...(payload.active !== undefined ? { ativo: payload.active } : {}),
	};
}

exports.findAll = async function ({ barbeariaId }) {
	const { data, error } = await supabase
		.from("produtos")
		.select("*")
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true)
		.order("nome", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id, { barbeariaId }) {
	const { data, error } = await supabase
		.from("produtos")
		.select("*")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
};

exports.create = async function (payload, { barbeariaId }) {
	const row = {
		barbearia_id: barbeariaId,
		nome: payload.name,
		preco: Number(payload.price || 0),
		ativo: true,
	};
	const { data, error } = await supabase
		.from("produtos")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.update = async function (id, updates, { barbeariaId }) {
	const { data, error } = await supabase
		.from("produtos")
		.update(toDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.remove = async function (id, { barbeariaId }) {
	const { error } = await supabase
		.from("produtos")
		.update({ ativo: false })
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
	return true;
};
