const supabase = require("../lib/supabase");

exports.findPaidAppointments = async function ({
	barbeariaId,
	barbeiroId,
	startDate,
	endDate,
}) {
	let query = supabase
		.from("agendamentos")
		.select(
			"id,total,valor_manual,data,barbearia_id,barbeiro_id,status_pagamento,barbeiros(id,nome,comissao_percent)",
		)
		.eq("barbearia_id", barbeariaId)
		.eq("status_pagamento", "pago");

	if (barbeiroId) {
		query = query.eq("barbeiro_id", barbeiroId);
	}
	if (startDate) {
		query = query.gte("data", startDate);
	}
	if (endDate) {
		query = query.lte("data", endDate);
	}

	const { data, error } = await query.order("data", { ascending: true });
	if (error) throw error;
	return data || [];
};
