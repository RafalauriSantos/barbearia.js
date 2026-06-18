const supabase = require("../lib/supabase");

function toApi(row) {
	const price = Number(row.preco || 0);
	const costPrice = Number(row.custo || 0);
	return {
		id: row.id,
		name: row.nome,
		price,
		purchase_type: row.tipo_compra || "avista",
		cost_price: costPrice,
		supplier_name: row.fornecedor || "",
		seller_commission_percent: Number(row.comissao_venda_percentual || 0),
		stock_quantity: Number(row.quantidade_estoque || 0),
		estimated_profit: Math.max(price - costPrice, 0),
		active: row.ativo,
		barbearia_id: row.barbearia_id,
	};
}

function toDatabase(payload) {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.price !== undefined ? { preco: Number(payload.price) } : {}),
		...(payload.purchase_type !== undefined ?
			{ tipo_compra: payload.purchase_type }
		:	{}),
		...(payload.cost_price !== undefined ?
			{ custo: Number(payload.cost_price || 0) }
		:	{}),
		...(payload.supplier_name !== undefined ?
			{ fornecedor: payload.supplier_name || null }
		:	{}),
		...(payload.seller_commission_percent !== undefined ?
			{
				comissao_venda_percentual: Number(
					payload.seller_commission_percent || 0,
				),
			}
		:	{}),
		...(payload.stock_quantity !== undefined ?
			{ quantidade_estoque: Number(payload.stock_quantity || 0) }
		:	{}),
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
		tipo_compra: payload.purchase_type || "avista",
		custo: Number(payload.cost_price || 0),
		fornecedor: payload.supplier_name || null,
		comissao_venda_percentual: Number(payload.seller_commission_percent || 0),
		quantidade_estoque: Number(payload.stock_quantity || 0),
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
