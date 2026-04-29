const supabase = require("../lib/supabase");
const { getDefaultBarbeariaId } = require("../lib/tenant");

function toApi(row) {
	return {
		id: row.id,
		name: row.descricao,
		value: Number(row.valor || 0),
		date: row.data,
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload) {
	return {
		...(payload.name !== undefined ? { descricao: payload.name } : {}),
		...(payload.value !== undefined ? { valor: Number(payload.value) } : {}),
		...(payload.date !== undefined ? { data: payload.date } : {}),
	};
}

exports.findAll = async function ({ date } = {}) {
	let query = supabase
		.from("despesas")
		.select("*")
		.eq("barbearia_id", getDefaultBarbeariaId());
	if (date) query = query.eq("data", date);

	const { data, error } = await query.order("data", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id) {
	const { data, error } = await supabase
		.from("despesas")
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
		descricao: payload.name,
		valor: Number(payload.value || 0),
		data: payload.date,
	};
	const { data, error } = await supabase
		.from("despesas")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.update = async function (id, updates) {
	const { data, error } = await supabase
		.from("despesas")
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
		.from("despesas")
		.delete()
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId());
	if (error) throw error;
	return true;
};
