const supabase = require("../lib/supabase");

const DEFAULT_ORDER = {
	pix: 10,
	dinheiro: 20,
	cartao_debito: 30,
	cartao_credito: 40,
	credito_parcelado: 50,
	fiado: 60,
	outro: 100,
};

function toApi(row) {
	return {
		id: row.id,
		code: row.codigo,
		name: row.nome,
		fee_percent: Number(row.taxa_percentual || 0),
		active: row.ativo,
		order: Number(row.ordem || DEFAULT_ORDER[row.codigo] || 100),
	};
}

function toDatabase(payload) {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.fee_percent !== undefined ?
			{ taxa_percentual: Number(payload.fee_percent || 0) }
		:	{}),
		...(payload.active !== undefined ? { ativo: Boolean(payload.active) } : {}),
		...(payload.order !== undefined ? { ordem: Number(payload.order || 100) } : {}),
	};
}

exports.findAll = async function ({ includeInactive = false } = {}) {
	let query = supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,taxa_percentual,ordem");
	if (!includeInactive) {
		query = query.eq("ativo", true);
	}
	const { data, error } = await query
		.order("ordem", { ascending: true })
		.order("nome", { ascending: true });
	if (!error) return (data || []).map(toApi);

	let legacyQuery = supabase.from("formas_pagamento").select("id,codigo,nome,ativo");
	if (!includeInactive) {
		legacyQuery = legacyQuery.eq("ativo", true);
	}
	const legacyResult = await legacyQuery.order("nome", { ascending: true });
	if (legacyResult.error) throw legacyResult.error;
	return (legacyResult.data || [])
		.map(toApi)
		.sort((first, second) => first.order - second.order);
};

exports.findById = async function (id) {
	const { data, error } = await supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,taxa_percentual,ordem")
		.eq("id", id)
		.single();
	if (!error) return data ? toApi(data) : null;
	if (error.code === "PGRST116") return null;

	const legacyResult = await supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo")
		.eq("id", id)
		.single();
	if (legacyResult.error && legacyResult.error.code !== "PGRST116") {
		throw legacyResult.error;
	}
	return legacyResult.data ? toApi(legacyResult.data) : null;
};

exports.update = async function (id, updates) {
	const { data, error } = await supabase
		.from("formas_pagamento")
		.update(toDatabase(updates))
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
};
