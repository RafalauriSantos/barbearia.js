const supabase = require("../lib/supabase");
const { AppError } = require("../lib/errors");

async function findShop(barbeariaId) {
	const { data, error } = await supabase
		.from("barbearias")
		.select("*")
		.eq("id", barbeariaId)
		.maybeSingle();

	if (error && error.code !== "PGRST116") throw error;
	if (!data) {
		throw new AppError(404, "BARBEARIA_NOT_FOUND", "Barbearia nao encontrada.");
	}
	return data;
}

async function findBarber(user) {
	if (!user?.barbeiro_id) return null;

	const { data, error } = await supabase
		.from("barbeiros")
		.select("*")
		.eq("id", user.barbeiro_id)
		.eq("barbearia_id", user.barbearia_id)
		.maybeSingle();

	if (error && error.code !== "PGRST116") throw error;
	return data || null;
}

function toProfile({ shop, barber }) {
	return {
		shopName: shop?.nome || "",
		barberName: barber?.nome || "",
		barbearia_id: shop?.id,
		barbeiro_id: barber?.id,
	};
}

exports.get = async function (user) {
	const [shop, barber] = await Promise.all([
		findShop(user.barbearia_id),
		findBarber(user),
	]);

	return toProfile({ shop, barber });
};

exports.upsert = async function (payload, user) {
	let shop = await findShop(user.barbearia_id);

	if (user.role === "admin" && payload.shopName !== undefined) {
		const { data, error } = await supabase
			.from("barbearias")
			.update({ nome: payload.shopName || "" })
			.eq("id", user.barbearia_id)
			.select()
			.maybeSingle();

		if (error && error.code !== "PGRST116") throw error;
		if (!data) {
			throw new AppError(
				404,
				"BARBEARIA_NOT_FOUND",
				"Barbearia nao encontrada.",
			);
		}
		shop = data;
	}

	let barber = await findBarber(user);
	if (payload.barberName !== undefined && user.barbeiro_id) {
		const { data, error } = await supabase
			.from("barbeiros")
			.update({ nome: payload.barberName || "" })
			.eq("id", user.barbeiro_id)
			.eq("barbearia_id", user.barbearia_id)
			.select()
			.maybeSingle();

		if (error && error.code !== "PGRST116") throw error;
		barber = data || barber;
	}

	return toProfile({ shop, barber });
};
