const { randomUUID } = require("crypto");
const supabase = require("../lib/supabase");
const { AppError } = require("../lib/errors");

function paymentStatusToApi(status) {
	if (status === "pago") return "paid";
	if (status === "fiado") return "fiado";
	return "normal";
}

function paymentStatusToDatabase(status) {
	if (status === "paid") return "pago";
	if (status === "fiado") return "fiado";
	return "pendente";
}

function firstService(row) {
	return Array.isArray(row.agendamento_servicos) ?
			row.agendamento_servicos[0]
		:	null;
}

function normalizeItemList(items = []) {
	return (Array.isArray(items) ? items : [])
		.map((item) => ({
			id: item.servico_id || item.produto_id || item.id,
			catalog_id: item.servico_id || item.produto_id || item.catalog_id || item.id,
			name: item.name || item.nome_servico || item.nome_produto,
			price: Number(item.price ?? item.preco_unitario ?? 0),
			quantity: Number(item.quantity ?? item.quantidade ?? 1) || 1,
			purchase_type: item.purchase_type || item.tipo_compra || "avista",
			cost_price: Number(item.cost_price ?? item.custo_unitario ?? 0),
			supplier_name: item.supplier_name || item.fornecedor || "",
			seller_commission_percent: Number(
				item.seller_commission_percent ??
					item.comissao_venda_percentual ??
					0,
			),
		}))
		.filter((item) => item.id);
}

function normalizeServices(payload = {}) {
	const provided =
		Object.prototype.hasOwnProperty.call(payload, "services") ||
		Object.prototype.hasOwnProperty.call(payload, "service_id");
	if (!provided) return { provided: false, items: [] };

	if (Array.isArray(payload.services)) {
		return { provided: true, items: normalizeItemList(payload.services) };
	}

	if (payload.service_id) {
		return {
			provided: true,
			items: normalizeItemList([
				{
					id: payload.service_id,
					name: payload.service_name || "Servico",
					price: Number(payload.value || 0),
					quantity: 1,
				},
			]),
		};
	}

	return { provided: true, items: [] };
}

function normalizeProducts(payload = {}) {
	const provided = Object.prototype.hasOwnProperty.call(payload, "products");
	if (!provided) return { provided: false, items: [] };
	return {
		provided: true,
		items: normalizeItemList(payload.products),
	};
}

function sumItems(items = []) {
	return items.reduce(
		(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
		0,
	);
}

function toApi(row) {
	const service = firstService(row);
	const services = normalizeItemList(row.agendamento_servicos || []);
	const products = normalizeItemList(row.agendamento_produtos || []);
	return {
		id: row.id,
		cliente_nome: row.cliente_nome,
		data: row.data,
		hora: row.hora,
		client_name: row.cliente_nome,
		day_key: row.data,
		time_slot: row.hora,
		value: Number(row.total || row.valor_manual || 0),
		status: paymentStatusToApi(row.status_pagamento),
		service_id: service?.servico_id,
		service_name: service?.nome_servico,
		services,
		products,
		prazo_date: row.prazo_fiado_data,
		barber_name: row.barbeiros?.nome,
		barbearia_id: row.barbearia_id,
		barbeiro_id: row.barbeiro_id,
		cliente_id: row.cliente_id || null,
		forma_pagamento_id: row.forma_pagamento_id,
		payment_method_id: row.forma_pagamento_id,
		forma_pagamento: row.formas_pagamento?.codigo,
		payment_method_code: row.formas_pagamento?.codigo,
		payment_method_name: row.formas_pagamento?.nome,
		payment_date: row.data_pagamento || null,
		payment_fee_percent: Number(row.taxa_pagamento_percentual || 0),
		payment_fee_value: Number(row.taxa_pagamento_valor || 0),
		net_value: Number(row.valor_liquido || row.total || row.valor_manual || 0),
		observacoes: row.observacoes,
	};
}

function toAppointmentDatabase(payload) {
	const clientName = payload.client_name || payload.cliente_nome;
	const date = payload.day_key || payload.data;
	const time = payload.time_slot || payload.hora;
	const value = payload.value !== undefined ? Number(payload.value) : undefined;

	return {
		...(clientName !== undefined ? { cliente_nome: clientName } : {}),
		...(date !== undefined ? { data: date } : {}),
		...(time !== undefined ? { hora: time } : {}),
		...(value !== undefined ? { valor_manual: value, total: value } : {}),
		...(payload.status !== undefined ?
			{ status_pagamento: paymentStatusToDatabase(payload.status) }
		:	{}),
		...(payload.prazo_date !== undefined ?
			{ prazo_fiado_data: payload.prazo_date || null }
		:	{}),
		...(payload.observacoes !== undefined ?
			{ observacoes: payload.observacoes }
		:	{}),
		...(payload.forma_pagamento_id !== undefined ?
			{ forma_pagamento_id: payload.forma_pagamento_id || null }
		:	{}),
		...(payload.payment_method_id !== undefined ?
			{ forma_pagamento_id: payload.payment_method_id || null }
		:	{}),
		...(payload.payment_fee_percent !== undefined ?
			{ taxa_pagamento_percentual: Number(payload.payment_fee_percent || 0) }
		:	{}),
		...(payload.payment_fee_value !== undefined ?
			{ taxa_pagamento_valor: Number(payload.payment_fee_value || 0) }
		:	{}),
		...(payload.net_value !== undefined ?
			{ valor_liquido: Number(payload.net_value || 0) }
		:	{}),
		...(payload.barbeiro_id !== undefined ?
			{ barbeiro_id: payload.barbeiro_id || null }
		:	{}),
		...(payload.cliente_id !== undefined ?
			{ cliente_id: payload.cliente_id || null }
		:	{}),
		...(payload.payment_date !== undefined ?
			{ data_pagamento: payload.payment_date || null }
		:	{}),
	};
}

function stripPaymentSnapshotPayload(payload = {}) {
	const {
		payment_fee_percent,
		payment_fee_value,
		net_value,
		...legacyPayload
	} = payload;
	return legacyPayload;
}

function isMissingPaymentSnapshotColumn(error) {
	const text = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	return [
		"taxa_pagamento_percentual",
		"taxa_pagamento_valor",
		"valor_liquido",
	].some((column) => text.includes(column));
}

function isMissingProductSnapshotColumn(error) {
	const text = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	return [
		"tipo_compra",
		"custo_unitario",
		"fornecedor",
		"comissao_venda_percentual",
	].some((column) => text.includes(column));
}

function isMissingProductStockColumn(error) {
	const text = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	return text.includes("quantidade_estoque");
}

function stripProductSnapshotRows(rows) {
	return rows.map(
		({
			tipo_compra,
			custo_unitario,
			fornecedor,
			comissao_venda_percentual,
			...legacyRow
		}) => legacyRow,
	);
}

function toQuantityMap(items = []) {
	const quantities = new Map();
	for (const item of items) {
		const productId = item.produto_id || item.id;
		if (!productId) continue;
		quantities.set(
			productId,
			Number(quantities.get(productId) || 0) + Number(item.quantidade || item.quantity || 1),
		);
	}
	return quantities;
}

async function getAppointmentProductQuantities(appointmentId) {
	const { data, error } = await supabase
		.from("agendamento_produtos")
		.select("produto_id,quantidade")
		.eq("agendamento_id", appointmentId);
	if (error) throw error;
	return toQuantityMap(data || []);
}

async function adjustProductStock(previousQuantities, nextQuantities) {
	const productIds = new Set([
		...Array.from(previousQuantities.keys()),
		...Array.from(nextQuantities.keys()),
	]);

	for (const productId of productIds) {
		const previous = Number(previousQuantities.get(productId) || 0);
		const next = Number(nextQuantities.get(productId) || 0);
		const delta = next - previous;
		if (!delta) continue;

		const { data, error } = await supabase
			.from("produtos")
			.select("quantidade_estoque")
			.eq("id", productId)
			.maybeSingle();
		if (error && isMissingProductStockColumn(error)) return;
		if (error) throw error;

		const currentStock = Number(data?.quantidade_estoque || 0);
		const nextStock = Math.max(currentStock - delta, 0);
		const result = await supabase
			.from("produtos")
			.update({ quantidade_estoque: nextStock })
			.eq("id", productId);
		if (result.error && isMissingProductStockColumn(result.error)) return;
		if (result.error) throw result.error;
	}
}

async function upsertAppointmentService(appointmentId, payload) {
	const { provided, items } = normalizeServices(payload);
	if (!provided) return;

	await supabase
		.from("agendamento_servicos")
		.delete()
		.eq("agendamento_id", appointmentId);
	if (items.length === 0) return;

	const rows = items.map((item) => {
		const quantity = Number(item.quantity || 1) || 1;
		const price = Number(item.price || 0);
		return {
			agendamento_id: appointmentId,
			servico_id: item.id,
			nome_servico: item.name || "Servico",
			preco_unitario: price,
			quantidade: quantity,
			subtotal: price * quantity,
		};
	});

	const { error } = await supabase.from("agendamento_servicos").insert(rows);
	if (error) throw error;
}

async function upsertAppointmentProducts(appointmentId, payload) {
	const { provided, items } = normalizeProducts(payload);
	if (!provided) return;
	const previousQuantities = await getAppointmentProductQuantities(appointmentId);
	const nextQuantities = toQuantityMap(
		items.map((item) => ({
			produto_id: item.id,
			quantidade: item.quantity,
		})),
	);

	await supabase
		.from("agendamento_produtos")
		.delete()
		.eq("agendamento_id", appointmentId);
	if (items.length === 0) {
		await adjustProductStock(previousQuantities, nextQuantities);
		return;
	}

	const rows = items.map((item) => {
		const quantity = Number(item.quantity || 1) || 1;
		const price = Number(item.price || 0);
		const cost = Number(item.cost_price || 0);
		return {
			agendamento_id: appointmentId,
			produto_id: item.id,
			nome_produto: item.name || "Produto",
			preco_unitario: price,
			quantidade: quantity,
			subtotal: price * quantity,
			tipo_compra: item.purchase_type || "avista",
			custo_unitario: cost,
			fornecedor: item.supplier_name || null,
			comissao_venda_percentual: Number(
				item.seller_commission_percent || 0,
			),
		};
	});

	const { error } = await supabase.from("agendamento_produtos").insert(rows);
	if (error && isMissingProductSnapshotColumn(error)) {
		const legacyResult = await supabase
			.from("agendamento_produtos")
			.insert(stripProductSnapshotRows(rows));
		if (legacyResult.error) throw legacyResult.error;
		await adjustProductStock(previousQuantities, nextQuantities);
		return;
	}
	if (error) throw error;
	await adjustProductStock(previousQuantities, nextQuantities);
}

exports.findAll = async function ({ date, barbeariaId, barbeiroId } = {}) {
	let query = supabase
		.from("agendamentos")
		.select(
			"*, agendamento_servicos(*), agendamento_produtos(*), barbeiros(nome), formas_pagamento(codigo,nome)",
		)
		.eq("barbearia_id", barbeariaId);
	if (date) query = query.eq("data", date);
	if (barbeiroId) query = query.eq("barbeiro_id", barbeiroId);

	const { data, error } = await query.order("data", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id, { barbeariaId } = {}) {
	let query = supabase
		.from("agendamentos")
		.select(
			"*, agendamento_servicos(*), agendamento_produtos(*), barbeiros(nome), formas_pagamento(codigo,nome)",
		)
		.eq("id", id);
	if (barbeariaId) query = query.eq("barbearia_id", barbeariaId);

	const { data, error } = await query.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
};

exports.findConflict = async function ({
	barbeariaId,
	barbeiroId,
	date,
	time,
	excludeId,
}) {
	let query = supabase
		.from("agendamentos")
		.select("id")
		.eq("barbearia_id", barbeariaId)
		.eq("barbeiro_id", barbeiroId)
		.eq("data", date)
		.eq("hora", time)
		.neq("status_atendimento", "cancelado");
	if (excludeId) query = query.neq("id", excludeId);
	const { data, error } = await query.limit(1).maybeSingle();
	if (error) throw error;
	return data || null;
};

function toAtomicItems(items) {
	return items.map((item) => ({
		id: item.id,
		quantity: Number(item.quantity || 1),
	}));
}

function mapAtomicError(error) {
	const message = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	if (message.includes("PRODUCT_STOCK_INSUFFICIENT")) {
		return new AppError(
			409,
			"PRODUCT_STOCK_INSUFFICIENT",
			"Estoque insuficiente para concluir a venda.",
		);
	}
	if (message.includes("CATALOG_ITEM_INVALID")) {
		return new AppError(
			400,
			"CATALOG_ITEM_INVALID",
			"Servico ou produto invalido para esta barbearia.",
		);
	}
	if (
		message.includes("PGRST202") ||
		message.includes("salvar_agendamento_atomico") ||
		message.includes("excluir_agendamento_atomico")
	) {
		return new AppError(
			409,
			"APPOINTMENT_MIGRATION_REQUIRED",
			"Atualize o banco de dados antes de alterar atendimentos.",
		);
	}
	return error;
}

async function saveAtomic({ appointment, services, products, userId }) {
	const { data, error } = await supabase.rpc("salvar_agendamento_atomico", {
		p_agendamento: appointment,
		p_servicos: services,
		p_produtos: products,
		p_usuario_id: userId || null,
	});
	if (error) throw mapAtomicError(error);
	return data;
}

exports.create = async function (
	payload,
	{ barbeariaId, barbeiroId, userId } = {},
) {
	const { items: serviceItems } = normalizeServices(payload);
	const { items: productItems } = normalizeProducts(payload);
	const itemsTotal = sumItems(serviceItems) + sumItems(productItems);
	const manualValue =
		payload.value !== undefined ? Number(payload.value) : itemsTotal;
	const appointment = {
		id: payload.id || randomUUID(),
		barbearia_id: barbeariaId,
		barbeiro_id: barbeiroId,
		...toAppointmentDatabase({ ...payload, value: manualValue }),
		status_pagamento: paymentStatusToDatabase(payload.status),
		valor_manual: Number(manualValue || 0),
		total: Number(manualValue || 0),
	};

	const appointmentId = await saveAtomic({
		appointment,
		services: toAtomicItems(serviceItems),
		products: toAtomicItems(productItems),
		userId,
	});
	return exports.findById(appointmentId, { barbeariaId });
};

exports.update = async function (id, updates, { barbeariaId, userId } = {}) {
	const { provided: servicesProvided, items: serviceItems } =
		normalizeServices(updates);
	const { provided: productsProvided, items: productItems } =
		normalizeProducts(updates);
	const itemsTotal = sumItems(serviceItems) + sumItems(productItems);
	const shouldUpdateValue =
		updates.value !== undefined || servicesProvided || productsProvided;
	const payloadWithValue =
		shouldUpdateValue ?
			{ ...updates, value: updates.value ?? itemsTotal }
		:	updates;

	const appointmentId = await saveAtomic({
		appointment: {
			id,
			barbearia_id: barbeariaId,
			...toAppointmentDatabase(payloadWithValue),
		},
		services: servicesProvided ? toAtomicItems(serviceItems) : null,
		products: productsProvided ? toAtomicItems(productItems) : null,
		userId,
	});
	return exports.findById(appointmentId, { barbeariaId });
};

exports.remove = async function (id, { barbeariaId }) {
	const { error } = await supabase.rpc("excluir_agendamento_atomico", {
		p_agendamento_id: id,
		p_barbearia_id: barbeariaId,
	});
	if (error) throw mapAtomicError(error);
	return true;
};

exports._private = { normalizeItemList };
