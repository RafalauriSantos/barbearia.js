const supabase = require("../lib/supabase");

function toNumber(value) {
	const number = Number(value || 0);
	return Number.isFinite(number) ? number : 0;
}

function toApi(row) {
	if (!row) return null;
	return {
		id: row.id,
		barbearia_id: row.barbearia_id,
		barbeiro_id: row.barbeiro_id || null,
		barber_name: row.barbeiros?.nome || "",
		agendamento_id: row.agendamento_id || null,
		produto_id: row.produto_id || null,
		supplier_name: row.fornecedor,
		description: row.descricao,
		value: toNumber(row.valor),
		origin_date: row.data_origem,
		status: row.status,
		payment_date: row.data_pagamento || null,
		expense_id: row.despesa_id || null,
		created_at: row.criado_em,
		updated_at: row.atualizado_em,
	};
}

const selectFields = "*, barbeiros(id,nome)";

function originKey(appointmentId, productId) {
	return `agendamento:${appointmentId}:produto:${productId}`;
}

exports.findAll = async function ({
	barbeariaId,
	status = "aberto",
	startDate,
	endDate,
}) {
	let query = supabase
		.from("contas_pagar_fornecedores")
		.select(selectFields)
		.eq("barbearia_id", barbeariaId);
	if (status && status !== "todos") query = query.eq("status", status);
	const dateColumn = status === "pago" ? "data_pagamento" : "data_origem";
	if (startDate) query = query.gte(dateColumn, startDate);
	if (endDate) query = query.lte(dateColumn, endDate);
	const { data, error } = await query.order(dateColumn, { ascending: false });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id, { barbeariaId }) {
	const { data, error } = await supabase
		.from("contas_pagar_fornecedores")
		.select(selectFields)
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.maybeSingle();
	if (error) throw error;
	return toApi(data);
};

exports.syncFromAppointment = async function (appointment) {
	const activeKeys = [];
	if (appointment.status === "paid") {
		for (const product of appointment.products || []) {
			if (product.purchase_type !== "consignado") continue;
			const productId = product.catalog_id || product.id;
			const value = toNumber(product.cost_price) * toNumber(product.quantity || 1);
			if (!productId || value <= 0) continue;
			const key = originKey(appointment.id, productId);
			activeKeys.push(key);
			const { data: existing, error: findError } = await supabase
				.from("contas_pagar_fornecedores")
				.select("id,status")
				.eq("origem_chave", key)
				.maybeSingle();
			if (findError) throw findError;
			if (existing?.status === "pago") continue;
			const row = {
				barbearia_id: appointment.barbearia_id,
				barbeiro_id: appointment.barbeiro_id || null,
				agendamento_id: appointment.id,
				produto_id: productId,
				origem_chave: key,
				fornecedor: product.supplier_name || "Sem fornecedor",
				descricao: `${product.name || "Produto"} - ${product.quantity || 1} un.`,
				valor: value,
				data_origem: appointment.day_key,
				status: "aberto",
				data_pagamento: null,
				despesa_id: null,
			};
			const { error } = await supabase
				.from("contas_pagar_fornecedores")
				.upsert(row, { onConflict: "origem_chave" });
			if (error) throw error;
		}
	}

	const { data: openRows, error: openError } = await supabase
		.from("contas_pagar_fornecedores")
		.select("id,origem_chave")
		.eq("agendamento_id", appointment.id)
		.eq("status", "aberto");
	if (openError) throw openError;
	const staleIds = (openRows || [])
		.filter((row) => !activeKeys.includes(row.origem_chave))
		.map((row) => row.id);
	if (staleIds.length > 0) {
		const { error: staleError } = await supabase
			.from("contas_pagar_fornecedores")
			.update({ status: "cancelado" })
			.in("id", staleIds);
		if (staleError) throw staleError;
	}
};

exports.pay = async function (id, paymentDate, { barbeariaId }) {
	const { error } = await supabase.rpc("baixar_conta_fornecedor", {
		p_conta_id: id,
		p_barbearia_id: barbeariaId,
		p_data_pagamento: paymentDate,
	});
	if (error) throw error;
	return exports.findById(id, { barbeariaId });
};

exports.createPurchase = async function (payload, { barbeariaId, barbeiroId }) {
	// First, update the stock in the produtos table.
	// Since Supabase doesn't have an easy atomic increment from the standard JS client without RPC,
	// and we don't know if there's an RPC for this, we'll do a read-modify-write.
	// In a real prod env, we'd use an RPC to avoid race conditions.
	
	const { data: product, error: fetchError } = await supabase
		.from("produtos")
		.select("quantidade_estoque, nome")
		.eq("id", payload.produto_id)
		.eq("barbearia_id", barbeariaId)
		.single();
		
	if (fetchError) throw fetchError;
	
	const newStock = Number(product.quantidade_estoque || 0) + payload.quantidade;
	
	const { error: updateError } = await supabase
		.from("produtos")
		.update({ quantidade_estoque: newStock })
		.eq("id", payload.produto_id)
		.eq("barbearia_id", barbeariaId);
		
	if (updateError) throw updateError;

	// Now insert the payable record
	const totalValue = payload.quantidade * payload.custo_unitario;
	const timestamp = new Date().getTime();
	
	const row = {
		barbearia_id: barbeariaId,
		barbeiro_id: barbeiroId,
		produto_id: payload.produto_id,
		origem_chave: `compra_manual:${timestamp}`,
		fornecedor: payload.fornecedor,
		descricao: `Compra Estoque: ${product.nome} - ${payload.quantidade} un.`,
		valor: totalValue,
		data_origem: payload.data_compra || new Date().toISOString().split("T")[0],
		status: payload.foi_pago_a_vista ? "pago" : "aberto",
		data_pagamento: payload.foi_pago_a_vista ? (payload.data_compra || new Date().toISOString().split("T")[0]) : null,
	};
	
	const { data: payable, error: insertError } = await supabase
		.from("contas_pagar_fornecedores")
		.insert(row)
		.select()
		.single();
		
	if (insertError) throw insertError;
	return toApi(payable);
};
