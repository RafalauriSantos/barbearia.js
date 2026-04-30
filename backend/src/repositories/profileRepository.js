const supabase = require("../lib/supabase");
const {
	getDefaultBarbeariaId,
	getDefaultBarbeiroId,
} = require("../lib/tenant");

exports.get = async function () {
	const barbeariaId = getDefaultBarbeariaId();
	const { data: barbearia, error: barbeariaError } = await supabase
		.from("barbearias")
		.select("*")
		.eq("id", barbeariaId)
		.single();

	if (barbeariaError && barbeariaError.code !== "PGRST116") {
		throw barbeariaError;
	}

	let barbeiro = null;
	const barbeiroId = getDefaultBarbeiroId();

	if (barbeiroId) {
		const { data, error } = await supabase
			.from("barbeiros")
			.select("*")
			.eq("id", barbeiroId)
			.eq("barbearia_id", barbeariaId)
			.single();
		if (error && error.code !== "PGRST116") throw error;
		barbeiro = data;
	} else {
		const { data, error } = await supabase
			.from("barbeiros")
			.select("*")
			.eq("barbearia_id", barbeariaId)
			.eq("ativo", true)
			.limit(1)
			.maybeSingle();
		if (error) throw error;
		barbeiro = data;
	}

	return {
		shopName: barbearia?.nome || "",
		barberName: barbeiro?.nome || "",
		barbearia_id: barbeariaId,
		barbeiro_id: barbeiro?.id,
	};
};

exports.upsert = async function (payload) {
	const barbeariaId = getDefaultBarbeariaId();
	const { data, error } = await supabase
		.from("barbearias")
		.update({ nome: payload.shopName || "" })
		.eq("id", barbeariaId)
		.select()
		.single();
	if (error) throw error;

	const barbeiroId = getDefaultBarbeiroId();
	if (barbeiroId && payload.barberName !== undefined) {
		const { error: barberError } = await supabase
			.from("barbeiros")
			.update({ nome: payload.barberName || "" })
			.eq("id", barbeiroId)
			.eq("barbearia_id", barbeariaId);
		if (barberError) throw barberError;
	} else if (!barbeiroId && payload.barberName !== undefined) {
		// No explicit barber id configured: try to find an active barber for this shop
		const { data: existingBarber, error: findError } = await supabase
			.from("barbeiros")
			.select("*")
			.eq("barbearia_id", barbeariaId)
			.eq("ativo", true)
			.limit(1)
			.maybeSingle();
		if (findError) throw findError;

		if (existingBarber) {
			const { error: updateErr } = await supabase
				.from("barbeiros")
				.update({ nome: payload.barberName || "" })
				.eq("id", existingBarber.id);
			if (updateErr) throw updateErr;
		} else {
			const { error: insertErr } = await supabase
				.from("barbeiros")
				.insert([
					{
						nome: payload.barberName || "",
						barbearia_id: barbeariaId,
						ativo: true,
					},
				]);
			if (insertErr) throw insertErr;
		}
	}

	return {
		shopName: data.nome || "",
		barberName: payload.barberName || "",
		barbearia_id: barbeariaId,
		barbeiro_id: barbeiroId,
	};
};
