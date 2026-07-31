const supabase = require("../lib/supabase");
import { AppError } from "../lib/errors";
const AvatarStorageService = require("../services/avatarStorageService");

async function findShop(barbeariaId: string) {
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

async function findBarber(user: any) {
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

function toProfile({ shop, barber }: { shop: any; barber: any }) {
	return {
		shopName: shop?.nome || "",
		phone: shop?.telefone || "",
		address: shop?.endereco || "",
		openingTime: shop?.horario_abertura?.slice(0, 5) || "08:00",
		closingTime: shop?.horario_fechamento?.slice(0, 5) || "18:00",
		appointmentDuration: shop?.duracao_atendimento_min || 30,
		scheduleInterval: shop?.intervalo_agenda_min || 30,
		barberName: barber?.nome || "",
		barberPhotoUrl: barber?.foto_url || "",
		photo_url: barber?.foto_url || "",
		barbearia_id: shop?.id,
		barbeiro_id: barber?.id,
	};
}

export async function get(user: any) {
	const [shop, barber] = await Promise.all([
		findShop(user.barbearia_id),
		findBarber(user),
	]);

	return toProfile({ shop, barber });
}

export async function upsert(payload: Record<string, any>, user: any) {
	let shop = await findShop(user.barbearia_id);

	if (user.role === "admin") {
		const shopUpdates: Record<string, any> = {};

		if (payload.shopName !== undefined) shopUpdates.nome = payload.shopName;
		if (payload.phone !== undefined) shopUpdates.telefone = payload.phone || null;
		if (payload.address !== undefined) shopUpdates.endereco = payload.address || null;
		if (payload.openingTime !== undefined) {
			shopUpdates.horario_abertura = payload.openingTime || null;
		}
		if (payload.closingTime !== undefined) {
			shopUpdates.horario_fechamento = payload.closingTime || null;
		}
		if (payload.appointmentDuration !== undefined) {
			shopUpdates.duracao_atendimento_min = payload.appointmentDuration;
		}
		if (payload.scheduleInterval !== undefined) {
			shopUpdates.intervalo_agenda_min = payload.scheduleInterval;
		}

		if (Object.keys(shopUpdates).length > 0) {
			const { data, error } = await supabase
				.from("barbearias")
				.update(shopUpdates)
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
	}

	let barber = await findBarber(user);
	const barberUpdates: Record<string, any> = {};

	if (payload.barberName !== undefined) {
		barberUpdates.nome = payload.barberName || "";
	}

	if (payload.removeBarberPhoto) {
		barberUpdates.foto_url = null;
	}

	if (payload.barberPhoto?.dataUrl) {
		if (!user.barbeiro_id) {
			throw new AppError(
				400,
				"BARBER_PROFILE_NOT_FOUND",
				"Perfil de barbeiro nao encontrado.",
			);
		}

		barberUpdates.foto_url = await AvatarStorageService.uploadBarberAvatar({
			barbeariaId: user.barbearia_id,
			barbeiroId: user.barbeiro_id,
			dataUrl: payload.barberPhoto.dataUrl,
		});
	}

	if (Object.keys(barberUpdates).length > 0 && user.barbeiro_id) {
		const { data, error } = await supabase
			.from("barbeiros")
			.update(barberUpdates)
			.eq("id", user.barbeiro_id)
			.eq("barbearia_id", user.barbearia_id)
			.select()
			.maybeSingle();

		if (error && error.code !== "PGRST116") throw error;
		barber = data || barber;
	}

	return toProfile({ shop, barber });
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	get,
	upsert,
}; }
export default {
	get,
	upsert,
};
