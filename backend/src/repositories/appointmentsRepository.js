const { randomUUID } = require("crypto");
const supabase = require("../lib/supabase");
const {
	getDefaultBarbeariaId,
	getDefaultBarbeiroId,
} = require("../lib/tenant");

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

function toApi(row) {
	const service = firstService(row);
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
		prazo_date: row.prazo_fiado_data,
		barber_name: row.barbeiros?.nome,
		barbearia_id: row.barbearia_id,
		barbeiro_id: row.barbeiro_id,
		forma_pagamento_id: row.forma_pagamento_id,
		forma_pagamento: row.formas_pagamento?.codigo,
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
	};
}

async function upsertAppointmentService(appointmentId, payload) {
	if (!payload.service_id) return;

	const subtotal = Number(payload.value || 0);
	const row = {
		agendamento_id: appointmentId,
		servico_id: payload.service_id,
		nome_servico: payload.service_name || "Servico",
		preco_unitario: subtotal,
		quantidade: 1,
		subtotal,
	};

	await supabase.from("agendamento_servicos").delete().eq("agendamento_id", appointmentId);
	const { error } = await supabase.from("agendamento_servicos").insert(row);
	if (error) throw error;
}

exports.findAll = async function ({ date } = {}) {
	let query = supabase
		.from("agendamentos")
		.select("*, agendamento_servicos(*), barbeiros(nome), formas_pagamento(codigo,nome)")
		.eq("barbearia_id", getDefaultBarbeariaId());
	if (date) query = query.eq("data", date);

	const { data, error } = await query.order("data", { ascending: true });
	if (error) throw error;
	return (data || []).map(toApi);
};

exports.findById = async function (id) {
	const { data, error } = await supabase
		.from("agendamentos")
		.select("*, agendamento_servicos(*), barbeiros(nome), formas_pagamento(codigo,nome)")
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId())
		.single();
	if (error && error.code !== "PGRST116") throw error;
	return data ? toApi(data) : null;
};

exports.create = async function (payload) {
	const row = {
		id: payload.id || randomUUID(),
		barbearia_id: getDefaultBarbeariaId(),
		barbeiro_id: getDefaultBarbeiroId(),
		status_atendimento: "agendado",
		status_pagamento: paymentStatusToDatabase(payload.status),
		valor_manual: Number(payload.value || 0),
		total: Number(payload.value || 0),
		...toAppointmentDatabase(payload),
	};

	const { data, error } = await supabase
		.from("agendamentos")
		.insert(row)
		.select()
		.single();
	if (error) throw error;

	await upsertAppointmentService(data.id, payload);
	return exports.findById(data.id);
};

exports.update = async function (id, updates) {
	const { data, error } = await supabase
		.from("agendamentos")
		.update(toAppointmentDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId())
		.select()
		.single();
	if (error) throw error;

	await upsertAppointmentService(id, updates);
	return exports.findById(data.id);
};

exports.remove = async function (id) {
	await supabase.from("agendamento_servicos").delete().eq("agendamento_id", id);
	await supabase.from("agendamento_produtos").delete().eq("agendamento_id", id);

	const { error } = await supabase
		.from("agendamentos")
		.delete()
		.eq("id", id)
		.eq("barbearia_id", getDefaultBarbeariaId());
	if (error) throw error;
	return true;
};
