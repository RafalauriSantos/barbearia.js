const supabase = require("../lib/supabase");

function toNumber(value) {
	const numeric = Number(value || 0);
	return Number.isFinite(numeric) ? numeric : 0;
}

function addDays(dayKey, days) {
	const date = new Date(`${dayKey}T00:00:00`);
	date.setDate(date.getDate() + Number(days || 0));
	return date.toISOString().slice(0, 10);
}

function sortCuts(cuts = []) {
	return [...cuts].sort((first, second) => {
		return String(second.data).localeCompare(String(first.data));
	});
}

function toCutApi(row) {
	return {
		id: row.id,
		client_id: row.cliente_id,
		date: row.data,
		paid: Boolean(row.pago),
		value: toNumber(row.valor),
		notes: row.observacoes || "",
		created_at: row.criado_em,
	};
}

function toClientApi(row) {
	const cuts = sortCuts(row.cliente_cortes || []).map(toCutApi);
	const cutsCount = cuts.length;
	const paidCutsCount = cuts.filter((cut) => cut.paid).length;
	const pendingPaymentCount = cuts.filter((cut) => !cut.paid).length;
	const paymentDueValue = cuts.reduce(
		(sum, cut) => sum + (cut.paid ? 0 : toNumber(cut.value)),
		0,
	);
	const lastCutDate = cuts[0]?.date || null;
	const packageTotalCuts = Number(row.pacote_total_cortes || 0);
	return {
		id: row.id,
		name: row.nome,
		phone: row.telefone || "",
		notes: row.observacoes || "",
		active: Boolean(row.ativo),
		interval_days: Number(row.intervalo_dias || 15),
		package_total_cuts: packageTotalCuts,
		cuts,
		cuts_count: cutsCount,
		paid_cuts_count: paidCutsCount,
		pending_payment_count: pendingPaymentCount,
		remaining_cuts:
			packageTotalCuts > 0 ? Math.max(packageTotalCuts - cutsCount, 0) : 0,
		payment_due_value: paymentDueValue,
		last_cut_date: lastCutDate,
		next_due_date:
			lastCutDate ? addDays(lastCutDate, Number(row.intervalo_dias || 15)) : null,
		created_at: row.criado_em,
		updated_at: row.atualizado_em,
	};
}

function toWaitlistApi(row) {
	return {
		id: row.id,
		name: row.nome,
		phone: row.telefone || "",
		preference: row.preferencia || "",
		notes: row.observacoes || "",
		status: row.status,
		created_at: row.criado_em,
		updated_at: row.atualizado_em,
	};
}

function toClientDatabase(payload) {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.phone !== undefined ? { telefone: payload.phone || null } : {}),
		...(payload.notes !== undefined ? { observacoes: payload.notes || null } : {}),
		...(payload.active !== undefined ? { ativo: payload.active } : {}),
		...(payload.interval_days !== undefined ?
			{ intervalo_dias: Number(payload.interval_days) }
		:	{}),
		...(payload.package_total_cuts !== undefined ?
			{ pacote_total_cortes: Number(payload.package_total_cuts) }
		:	{}),
	};
}

function toCutDatabase(payload) {
	return {
		...(payload.date !== undefined ? { data: payload.date } : {}),
		...(payload.paid !== undefined ? { pago: payload.paid } : {}),
		...(payload.value !== undefined ? { valor: Number(payload.value || 0) } : {}),
		...(payload.notes !== undefined ? { observacoes: payload.notes || null } : {}),
	};
}

function toWaitlistDatabase(payload) {
	return {
		...(payload.name !== undefined ? { nome: payload.name } : {}),
		...(payload.phone !== undefined ? { telefone: payload.phone || null } : {}),
		...(payload.preference !== undefined ?
			{ preferencia: payload.preference || null }
		:	{}),
		...(payload.notes !== undefined ? { observacoes: payload.notes || null } : {}),
		...(payload.status !== undefined ? { status: payload.status } : {}),
	};
}

exports.findFixedClients = async function ({ barbeariaId }) {
	const { data, error } = await supabase
		.from("clientes")
		.select("*, cliente_cortes(*)")
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true)
		.order("nome", { ascending: true });
	if (error) throw error;
	return (data || []).map(toClientApi);
};

exports.findFixedClientById = async function (id, { barbeariaId }) {
	const { data, error } = await supabase
		.from("clientes")
		.select("*, cliente_cortes(*)")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.maybeSingle();
	if (error) throw error;
	return data ? toClientApi(data) : null;
};

exports.createFixedClient = async function (payload, { barbeariaId }) {
	const row = {
		barbearia_id: barbeariaId,
		nome: payload.name,
		telefone: payload.phone || null,
		observacoes: payload.notes || null,
		intervalo_dias: Number(payload.interval_days || 15),
		pacote_total_cortes: Number(payload.package_total_cuts ?? 4),
		ativo: true,
	};
	const { data, error } = await supabase
		.from("clientes")
		.insert(row)
		.select("*, cliente_cortes(*)")
		.single();
	if (error) throw error;
	return toClientApi(data);
};

exports.updateFixedClient = async function (id, updates, { barbeariaId }) {
	const { data, error } = await supabase
		.from("clientes")
		.update(toClientDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select("*, cliente_cortes(*)")
		.single();
	if (error) throw error;
	return toClientApi(data);
};

exports.removeFixedClient = async function (id, { barbeariaId }) {
	const { error } = await supabase
		.from("clientes")
		.update({ ativo: false })
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
	return true;
};

exports.createClientCut = async function (clientId, payload, { barbeariaId }) {
	const row = {
		cliente_id: clientId,
		barbearia_id: barbeariaId,
		data: payload.date,
		pago: Boolean(payload.paid),
		valor: Number(payload.value || 0),
		observacoes: payload.notes || null,
	};
	const { data, error } = await supabase
		.from("cliente_cortes")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return toCutApi(data);
};

exports.findClientCutById = async function (clientId, cutId, { barbeariaId }) {
	const { data, error } = await supabase
		.from("cliente_cortes")
		.select("*")
		.eq("id", cutId)
		.eq("cliente_id", clientId)
		.eq("barbearia_id", barbeariaId)
		.maybeSingle();
	if (error) throw error;
	return data ? toCutApi(data) : null;
};

exports.updateClientCut = async function (
	clientId,
	cutId,
	updates,
	{ barbeariaId },
) {
	const { data, error } = await supabase
		.from("cliente_cortes")
		.update(toCutDatabase(updates))
		.eq("id", cutId)
		.eq("cliente_id", clientId)
		.eq("barbearia_id", barbeariaId)
		.select()
		.single();
	if (error) throw error;
	return toCutApi(data);
};

exports.removeClientCut = async function (clientId, cutId, { barbeariaId }) {
	const { error } = await supabase
		.from("cliente_cortes")
		.delete()
		.eq("id", cutId)
		.eq("cliente_id", clientId)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
	return true;
};

exports.findWaitlist = async function ({ barbeariaId }) {
	const { data, error } = await supabase
		.from("lista_espera")
		.select("*")
		.eq("barbearia_id", barbeariaId)
		.eq("status", "aguardando")
		.order("criado_em", { ascending: true });
	if (error) throw error;
	return (data || []).map(toWaitlistApi);
};

exports.createWaitlistEntry = async function (payload, { barbeariaId }) {
	const row = {
		barbearia_id: barbeariaId,
		nome: payload.name,
		telefone: payload.phone || null,
		preferencia: payload.preference || null,
		observacoes: payload.notes || null,
		status: payload.status || "aguardando",
	};
	const { data, error } = await supabase
		.from("lista_espera")
		.insert(row)
		.select()
		.single();
	if (error) throw error;
	return toWaitlistApi(data);
};

exports.findWaitlistEntryById = async function (id, { barbeariaId }) {
	const { data, error } = await supabase
		.from("lista_espera")
		.select("*")
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.maybeSingle();
	if (error) throw error;
	return data ? toWaitlistApi(data) : null;
};

exports.updateWaitlistEntry = async function (id, updates, { barbeariaId }) {
	const { data, error } = await supabase
		.from("lista_espera")
		.update(toWaitlistDatabase(updates))
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select()
		.single();
	if (error) throw error;
	return toWaitlistApi(data);
};

exports.removeWaitlistEntry = async function (id, { barbeariaId }) {
	const { error } = await supabase
		.from("lista_espera")
		.update({ status: "cancelado" })
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
	return true;
};
