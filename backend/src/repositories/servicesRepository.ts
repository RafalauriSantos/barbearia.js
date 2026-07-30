const supabase = require("../lib/supabase");

export interface ApiServiceItem {
	id: string;
	name: string;
	price: number;
	active: boolean;
	barbearia_id: string;
}

function toApi(row: any): ApiServiceItem {
	return {
		id: row.id,
		name: row.nome,
		price: Number(row.preco || 0),
		active: row.ativo,
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload: Record<string, any>): Record<string, any> {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.price !== undefined ? { preco: Number(payload.price) } : {}),
		...(payload.active !== undefined ? { ativo: payload.active } : {}),
	};
}

export async function findAll({ barbeariaId }: { barbeariaId: string }): Promise<ApiServiceItem[]> {
	const { data, error } = await supabase
		.from("servicos")
		.select("*")
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true)
		.order("nome", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
}

export async function findById(id: string, { barbeariaId }: { barbeariaId: string }): Promise<ApiServiceItem | null> {
	const { data, error } = await supabase
		.from("servicos")
		.select("*")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
}

export async function create(
	payload: { name: string; price: number },
	{ barbeariaId }: { barbeariaId: string },
): Promise<ApiServiceItem> {
	const row = {
		barbearia_id: barbeariaId,
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
}

export async function update(
	id: string,
	updates: Record<string, any>,
	{ barbeariaId }: { barbeariaId: string },
): Promise<ApiServiceItem> {
	const { data, error } = await supabase
		.from("servicos")
		.update(toDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select()
		.single();
	if (error) throw error;
	return toApi(data);
}

export async function remove(id: string, { barbeariaId }: { barbeariaId: string }): Promise<boolean> {
	const { error } = await supabase
		.from("servicos")
		.update({ ativo: false })
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
	return true;
}

module.exports = {
	findAll,
	findById,
	create,
	update,
	remove,
};
