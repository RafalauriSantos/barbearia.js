const AppointmentsRepository = require("../repositories/appointmentsRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const { AppError } = require("../lib/errors");

function isAdmin(user) {
	return user?.role === "admin";
}

function assertBarbeariaContext(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
}

function assertBarberContext(user) {
	if (!user?.barbeiro_id) {
		throw new AppError(
			403,
			"BARBER_CONTEXT_REQUIRED",
			"Usuario sem barbeiro vinculado.",
		);
	}
}

async function assertBarberBelongsToShop(barbeiroId, barbeariaId) {
	const barber = await BarbersRepository.findByIdInBarbearia(
		barbeiroId,
		barbeariaId,
	);
	if (!barber) {
		throw new AppError(
			403,
			"BARBER_FORBIDDEN",
			"Barbeiro nao pertence a esta barbearia.",
		);
	}
	return barber;
}

async function resolveTargetBarber(user, payload = {}) {
	assertBarbeariaContext(user);

	if (!isAdmin(user)) {
		assertBarberContext(user);
		return user.barbeiro_id;
	}

	const requestedBarberId = payload.barbeiro_id || user.barbeiro_id;
	if (!requestedBarberId) {
		throw new AppError(
			400,
			"BARBER_REQUIRED",
			"Informe o barbeiro do atendimento.",
		);
	}

	await assertBarberBelongsToShop(requestedBarberId, user.barbearia_id);
	return requestedBarberId;
}

exports.listAppointments = async function (
	{ data, day_key, barbeiro_id, barber_id } = {},
	user,
) {
	assertBarbeariaContext(user);

	let filterBarberId = barbeiro_id || barber_id;
	if (!isAdmin(user)) {
		assertBarberContext(user);
		filterBarberId = user.barbeiro_id;
	} else if (filterBarberId) {
		await assertBarberBelongsToShop(filterBarberId, user.barbearia_id);
	}

	return AppointmentsRepository.findAll({
		date: data || day_key,
		barbeariaId: user.barbearia_id,
		barbeiroId: filterBarberId,
	});
};

exports.createAppointment = async function (payload, user) {
	const barbeiroId = await resolveTargetBarber(user, payload);
	return AppointmentsRepository.create(
		{ ...payload, barbeiro_id: barbeiroId },
		{ barbeariaId: user.barbearia_id, barbeiroId },
	);
};

exports.updateAppointment = async function (id, updates, user) {
	assertBarbeariaContext(user);

	const existing = await AppointmentsRepository.findById(id, {
		barbeariaId: user.barbearia_id,
	});
	if (!existing) throw new AppError(404, "NOT_FOUND", "Appointment not found");

	let payload = updates;
	if (!isAdmin(user)) {
		assertBarberContext(user);
		if (existing.barbeiro_id !== user.barbeiro_id) {
			throw new AppError(
				403,
				"APPOINTMENT_FORBIDDEN",
				"Voce nao pode editar atendimento de outro barbeiro.",
			);
		}
		payload = { ...updates, barbeiro_id: user.barbeiro_id };
	} else if (updates.barbeiro_id) {
		await assertBarberBelongsToShop(updates.barbeiro_id, user.barbearia_id);
	}

	return AppointmentsRepository.update(id, payload, {
		barbeariaId: user.barbearia_id,
	});
};

exports.deleteAppointment = async function (id, user) {
	assertBarbeariaContext(user);

	const existing = await AppointmentsRepository.findById(id, {
		barbeariaId: user.barbearia_id,
	});
	if (!existing) throw new AppError(404, "NOT_FOUND", "Appointment not found");
	if (!isAdmin(user)) {
		assertBarberContext(user);
		if (existing.barbeiro_id !== user.barbeiro_id) {
			throw new AppError(
				403,
				"APPOINTMENT_FORBIDDEN",
				"Voce nao pode excluir atendimento de outro barbeiro.",
			);
		}
	}

	await AppointmentsRepository.remove(id, {
		barbeariaId: user.barbearia_id,
	});
	return true;
};
