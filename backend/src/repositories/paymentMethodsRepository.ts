import supabase from "../lib/supabase";

const DEFAULT_ORDER: Record<string, number> = {
	pix: 10,
	dinheiro: 20,
	cartao_debito: 30,
	cartao_credito: 40,
	credito_parcelado: 50,
	fiado: 60,
};

export interface ApiPaymentMethodRow {
	id: string;
	code: string;
	name: string;
	fee_percent: number;
	active: boolean;
	order: number;
	barbearia_id: string;
}

function toApi(row: any): ApiPaymentMethodRow {
	return {
		id: row.id,
		code: row.codigo,
		name: row.nome,
		fee_percent: Number(row.taxa_percentual || 0),
		active: row.ativo,
		order: Number(row.ordem || DEFAULT_ORDER[row.codigo] || 100),
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload: Record<string, any>): Record<string, any> {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.fee_percent !== undefined ?
			{ taxa_percentual: Number(payload.fee_percent || 0) }
		:	{}),
		...(payload.active !== undefined ? { ativo: Boolean(payload.active) } : {}),
		...(payload.order !== undefined ? { ordem: Number(payload.order || 100) } : {}),
	};
}

export async function findAll({ barbeariaId, includeInactive = false }: { barbeariaId: string; includeInactive?: boolean }): Promise<ApiPaymentMethodRow[]> {
	let query = supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,taxa_percentual,ordem,barbearia_id")
		.eq("barbearia_id", barbeariaId);
	if (!includeInactive) {
		query = query.eq("ativo", true);
	}
	const { data, error } = await query
		.order("ordem", { ascending: true })
		.order("nome", { ascending: true });
	if (!error) return (data || []).map(toApi);

	let legacyQuery = supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,barbearia_id")
		.eq("barbearia_id", barbeariaId);
	if (!includeInactive) {
		legacyQuery = legacyQuery.eq("ativo", true);
	}
	const legacyResult = await legacyQuery.order("nome", { ascending: true });
	if (legacyResult.error) throw legacyResult.error;
	return (legacyResult.data || [])
		.map(toApi)
		.sort((first: ApiPaymentMethodRow, second: ApiPaymentMethodRow) => first.order - second.order);
}

export async function findById(id: string, { barbeariaId }: { barbeariaId?: string } = {}): Promise<ApiPaymentMethodRow | null> {
	const { data, error } = await supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,taxa_percentual,ordem,barbearia_id")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.single();
	if (!error) return data ? toApi(data) : null;
	if (error.code === "PGRST116") return null;

	const legacyResult = await supabase
		.from("formas_pagamento")
		.select("id,codigo,nome,ativo,barbearia_id")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.single();
	if (legacyResult.error && legacyResult.error.code !== "PGRST116") {
		throw legacyResult.error;
	}
	return legacyResult.data ? toApi(legacyResult.data) : null;
}

export async function update(id: string, updates: Record<string, any>, { barbeariaId }: { barbeariaId?: string } = {}): Promise<ApiPaymentMethodRow> {
	const { data, error } = await supabase
		.from("formas_pagamento")
		.update(toDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	findAll,
	findById,
	update,
}; }
export default {
	findAll,
	findById,
	update,
};
