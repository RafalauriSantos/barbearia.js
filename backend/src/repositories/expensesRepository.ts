const supabase = require("../lib/supabase");

export interface ApiExpense {
	id: string;
	name: string;
	value: number;
	date: string;
	barbearia_id: string;
}

function toApi(row: any): ApiExpense {
	return {
		id: row.id,
		name: row.descricao,
		value: Number(row.valor || 0),
		date: row.data,
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload: Record<string, any>): Record<string, any> {
	return {
		...(payload.name !== undefined ? { descricao: payload.name } : {}),
		...(payload.value !== undefined ? { valor: Number(payload.value) } : {}),
		...(payload.date !== undefined ? { data: payload.date } : {}),
	};
}

export async function findAll({
	date,
	startDate,
	endDate,
	barbeariaId,
}: {
	date?: string;
	startDate?: string;
	endDate?: string;
	barbeariaId: string;
}): Promise<ApiExpense[]> {
	let query = supabase
		.from("despesas")
		.select("*")
		.eq("barbearia_id", barbeariaId);
	if (date) query = query.eq("data", date);
	if (!date && startDate) query = query.gte("data", startDate);
	if (!date && endDate) query = query.lte("data", endDate);

	const { data, error } = await query.order("data", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
}

export async function findById(id: string, { barbeariaId }: { barbeariaId: string }): Promise<ApiExpense | null> {
	const { data, error } = await supabase
		.from("despesas")
		.select("*")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
}

export async function create(
	payload: { name: string; value: number; date: string },
	{ barbeariaId }: { barbeariaId: string },
): Promise<ApiExpense> {
	const row = {
		barbearia_id: barbeariaId,
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
}

export async function update(
	id: string,
	updates: Record<string, any>,
	{ barbeariaId }: { barbeariaId: string },
): Promise<ApiExpense> {
	const { data, error } = await supabase
		.from("despesas")
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
		.from("despesas")
		.delete()
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
export default module.exports;
