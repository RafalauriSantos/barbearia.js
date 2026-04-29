const supabase = require("../lib/supabase");
const { getDefaultBarbeariaId } = require("../lib/tenant");

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

exports.findAll = async function () {
	const { data, error } = await supabase
		.from("servicos")
		.select("*")
		.eq("barbearia_id", getDefaultBarbeariaId())
		.eq("ativo", true)
		.order("nome", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id) {
	const { data, error } = await supabase
		.from("servicos")
		.select("*")
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId())
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
};

exports.create = async function (payload) {
	const row = {
		barbearia_id: getDefaultBarbeariaId(),
		nome: payload.name,
		preco: Number(payload.price || 0),
		ativo: true,
	};
	const { data, error } = await supabase
		.from("servicos")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.update = async function (id, updates) {
	const { data, error } = await supabase
		.from("servicos")
		.update(toDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId())
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.remove = async function (id) {
	const { error } = await supabase
		.from("servicos")
		.update({ ativo: false })
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId());
	if (error) throw error;
	return true;
};
