const supabase = require("../lib/supabase");

const { getDefaultBarbeariaId } = require("../lib/tenant");

const TABLES = [
	"agendamentos",
	"despesas",
	"produtos",
	"servicos",
];

exports.reset = async function () {
	const barbeariaId = getDefaultBarbeariaId();

	const { data: appointments, error: appointmentsError } = await supabase
		.from("agendamentos")
		.select("id")
		.eq("barbearia_id", barbeariaId);
	if (appointmentsError) throw appointmentsError;

	const appointmentIds = (appointments || []).map((appointment) => appointment.id);

	if (appointmentIds.length > 0) {
		for (const table of ["agendamento_produtos", "agendamento_servicos"]) {
			const { error } = await supabase
				.from(table)
				.delete()
				.in("agendamento_id", appointmentIds);
			if (error) throw error;
		}
	}

	for (const table of TABLES.slice(0, 2)) {
		const { error } = await supabase
			.from(table)
			.delete()
			.eq("barbearia_id", barbeariaId);
		if (error) throw error;
	}

	for (const table of TABLES.slice(2)) {
		const { error } = await supabase
			.from(table)
			.update({ ativo: false })
			.eq("barbearia_id", barbeariaId);
		if (error) throw error;
	}

	return true;
};
