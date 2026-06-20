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
		cliente_id: row.cliente_id || null,
		agendamento_id: row.agendamento_id || null,
		client_name: row.nome_cliente,
		description: row.descricao,
		notes: row.observacoes || "",
		value: toNumber(row.valor),
		debt_date: row.data_divida,
		debt_time:
			row.hora_divida ? String(row.hora_divida).slice(0, 5)
			: row.agendamentos?.hora ? String(row.agendamentos.hora).slice(0, 5)
			: null,
		due_date: row.vencimento_em || null,
		status: row.status,
		payment_method_id: row.forma_pagamento_id || null,
		payment_method_name: row.formas_pagamento?.nome || "",
		payment_method_code: row.formas_pagamento?.codigo || "",
		payment_fee_percent: toNumber(row.taxa_pagamento_percentual),
		payment_fee_value: toNumber(row.taxa_pagamento_valor),
		net_value: toNumber(row.valor_liquido),
		payment_date: row.data_pagamento || null,
		origin: row.agendamento_id ? "appointment" : "manual",
		created_at: row.criado_em,
		updated_at: row.atualizado_em,
	};
}

const selectFields =
	"*, barbeiros(id,nome,comissao_percent), formas_pagamento(id,codigo,nome), agendamentos(id,hora)";

exports.findAll = async function ({
	barbeariaId,
	barbeiroId,
	status = "aberto",
	startDate,
	endDate,
	search,
}) {
	let query = supabase
		.from("contas_receber")
		.select(selectFields)
		.eq("barbearia_id", barbeariaId);

	if (barbeiroId) query = query.eq("barbeiro_id", barbeiroId);
	if (status && status !== "todos") query = query.eq("status", status);
	if (search) {
		const cleanSearch = String(search).replace(/[,%()]/g, " ").trim();
		if (cleanSearch) {
			query = query.or(
				`nome_cliente.ilike.%${cleanSearch}%,descricao.ilike.%${cleanSearch}%`,
			);
		}
	}

	const dateColumn = status === "pago" ? "data_pagamento" : "data_divida";
	if (startDate) query = query.gte(dateColumn, startDate);
	if (endDate) query = query.lte(dateColumn, endDate);

	const { data, error } = await query.order(dateColumn, { ascending: false });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id, { barbeariaId, barbeiroId }) {
	let query = supabase
		.from("contas_receber")
		.select(selectFields)
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (barbeiroId) query = query.eq("barbeiro_id", barbeiroId);
	const { data, error } = await query.maybeSingle();
	if (error) throw error;
	return toApi(data);
};

exports.createManual = async function (payload, context) {
	const { data, error } = await supabase
		.from("contas_receber")
		.insert({
			barbearia_id: context.barbeariaId,
			barbeiro_id: context.barbeiroId,
			cliente_id: payload.cliente_id || null,
			nome_cliente: payload.client_name,
			descricao: payload.description,
			observacoes: payload.notes || null,
			valor: Number(payload.value || 0),
			data_divida: payload.debt_date,
			hora_divida: payload.debt_time || null,
			vencimento_em: payload.due_date || null,
			status: "aberto",
			criado_por_usuario_id: context.userId,
		})
		.select(selectFields)
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.update = async function (id, updates, { barbeariaId, barbeiroId }) {
	const row = {
		...(updates.client_name !== undefined ? { nome_cliente: updates.client_name } : {}),
		...(updates.description !== undefined ? { descricao: updates.description } : {}),
		...(updates.notes !== undefined ? { observacoes: updates.notes || null } : {}),
		...(updates.value !== undefined ? { valor: Number(updates.value || 0) } : {}),
		...(updates.debt_date !== undefined ? { data_divida: updates.debt_date } : {}),
		...(updates.debt_time !== undefined ? { hora_divida: updates.debt_time || null } : {}),
		...(updates.due_date !== undefined ? { vencimento_em: updates.due_date || null } : {}),
		...(updates.barbeiro_id !== undefined ? { barbeiro_id: updates.barbeiro_id } : {}),
		...(updates.status !== undefined ? { status: updates.status } : {}),
		...(updates.payment_method_id !== undefined ?
			{ forma_pagamento_id: updates.payment_method_id }
		: {}),
		...(updates.payment_fee_percent !== undefined ?
			{ taxa_pagamento_percentual: Number(updates.payment_fee_percent || 0) }
		: {}),
		...(updates.payment_fee_value !== undefined ?
			{ taxa_pagamento_valor: Number(updates.payment_fee_value || 0) }
		: {}),
		...(updates.net_value !== undefined ?
			{ valor_liquido: Number(updates.net_value || 0) }
		: {}),
		...(updates.payment_date !== undefined ?
			{ data_pagamento: updates.payment_date || null }
		: {}),
	};
	let query = supabase
		.from("contas_receber")
		.update(row)
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (barbeiroId) query = query.eq("barbeiro_id", barbeiroId);
	const { data, error } = await query.select(selectFields).single();
	if (error) throw error;
	return toApi(data);
};

exports.upsertFromAppointment = async function (appointment, { userId } = {}) {
	const row = {
		barbearia_id: appointment.barbearia_id,
		barbeiro_id: appointment.barbeiro_id || null,
		cliente_id: appointment.cliente_id || null,
		agendamento_id: appointment.id,
		nome_cliente: appointment.client_name,
		descricao: "Fiado do atendimento",
		observacoes: appointment.observacoes || null,
		valor: Number(appointment.value || 0),
		data_divida: appointment.day_key,
		hora_divida: appointment.time_slot || null,
		vencimento_em: appointment.prazo_date || null,
		status: "aberto",
		forma_pagamento_id: null,
		taxa_pagamento_percentual: 0,
		taxa_pagamento_valor: 0,
		valor_liquido: 0,
		data_pagamento: null,
		criado_por_usuario_id: userId || null,
	};
	const { data, error } = await supabase
		.from("contas_receber")
		.upsert(row, { onConflict: "agendamento_id" })
		.select(selectFields)
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.updateByAppointment = async function (appointmentId, updates) {
	const row = {
		...(updates.status !== undefined ? { status: updates.status } : {}),
		...(updates.payment_method_id !== undefined ?
			{ forma_pagamento_id: updates.payment_method_id }
		: {}),
		...(updates.payment_fee_percent !== undefined ?
			{ taxa_pagamento_percentual: Number(updates.payment_fee_percent || 0) }
		: {}),
		...(updates.payment_fee_value !== undefined ?
			{ taxa_pagamento_valor: Number(updates.payment_fee_value || 0) }
		: {}),
		...(updates.net_value !== undefined ? { valor_liquido: Number(updates.net_value || 0) } : {}),
		...(updates.payment_date !== undefined ? { data_pagamento: updates.payment_date || null } : {}),
	};
	const { data, error } = await supabase
		.from("contas_receber")
		.update(row)
		.eq("agendamento_id", appointmentId)
		.select(selectFields)
		.maybeSingle();
	if (error) throw error;
	return toApi(data);
};

exports.findPaidManual = async function ({ barbeariaId, barbeiroId, startDate, endDate }) {
	let query = supabase
		.from("contas_receber")
		.select(selectFields)
		.eq("barbearia_id", barbeariaId)
		.eq("status", "pago")
		.is("agendamento_id", null);
	if (barbeiroId) query = query.eq("barbeiro_id", barbeiroId);
	if (startDate) query = query.gte("data_pagamento", startDate);
	if (endDate) query = query.lte("data_pagamento", endDate);
	const { data, error } = await query.order("data_pagamento", { ascending: true });
	if (error) throw error;
	return data || [];
};

exports.toFinancialRow = function (row) {
	return {
		id: `receivable:${row.id}`,
		total: toNumber(row.valor),
		valor_manual: toNumber(row.valor),
		valor_liquido: toNumber(row.valor_liquido),
		taxa_pagamento_valor: toNumber(row.taxa_pagamento_valor),
		taxa_pagamento_percentual: toNumber(row.taxa_pagamento_percentual),
		data: row.data_pagamento,
		data_pagamento: row.data_pagamento,
		barbearia_id: row.barbearia_id,
		barbeiro_id: row.barbeiro_id,
		forma_pagamento_id: row.forma_pagamento_id,
		barbeiros: row.barbeiros,
		formas_pagamento: row.formas_pagamento,
		agendamento_produtos: [],
		source: "manual_receivable",
	};
};
