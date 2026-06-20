const AppointmentsRepository = require("../repositories/appointmentsRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const PaymentMethodsRepository = require("../repositories/paymentMethodsRepository");
const ClientsRepository = require("../repositories/clientsRepository");
const ReceivablesRepository = require("../repositories/receivablesRepository");
const { AppError } = require("../lib/errors");

function isAdmin(user) {
	return user?.role === "admin";
}

function roundMoney(value) {
	return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function todayInSaoPaulo() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function sumItems(items = []) {
	return (Array.isArray(items) ? items : []).reduce(
		(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
		0,
	);
}

function resolveGrossValue(payload, fallbackAppointment) {
	if (payload.value !== undefined) return Number(payload.value || 0);
	if (Array.isArray(payload.services) || Array.isArray(payload.products)) {
		return sumItems(payload.services) + sumItems(payload.products);
	}
	return Number(fallbackAppointment?.value || 0);
}

async function withPaymentSnapshot(payload, fallbackAppointment = null) {
	const effectiveStatus =
		payload.status !== undefined ? payload.status : fallbackAppointment?.status;
	const hasPaymentMethodPayload =
		payload.payment_method_id !== undefined ||
		payload.forma_pagamento_id !== undefined;
	const paymentMethodId =
		payload.payment_method_id ??
		payload.forma_pagamento_id ??
		fallbackAppointment?.payment_method_id ??
		fallbackAppointment?.forma_pagamento_id ??
		null;
	const shouldRecalculate =
		effectiveStatus === "paid" &&
		(
			payload.status !== undefined ||
			payload.value !== undefined ||
			payload.services !== undefined ||
			payload.products !== undefined ||
			hasPaymentMethodPayload
		);

	if (effectiveStatus !== "paid" && payload.status !== undefined) {
		return {
			...payload,
			payment_method_id: null,
			forma_pagamento_id: null,
			payment_fee_percent: 0,
			payment_fee_value: 0,
			net_value: resolveGrossValue(payload, fallbackAppointment),
			payment_date: null,
		};
	}

	if (!shouldRecalculate) return payload;

	const gross = resolveGrossValue(payload, fallbackAppointment);
	let feePercent = 0;
	if (!paymentMethodId) {
		throw new AppError(
			400,
			"PAYMENT_METHOD_REQUIRED",
			"Informe a forma de pagamento.",
		);
	}
	if (paymentMethodId) {
		const paymentMethod = await PaymentMethodsRepository.findById(paymentMethodId);
		if (!paymentMethod || !paymentMethod.active) {
			throw new AppError(
				400,
				"PAYMENT_METHOD_INVALID",
				"Forma de pagamento invalida.",
			);
		}
		feePercent = Number(paymentMethod.fee_percent || 0);
	}
	const feeValue = roundMoney((gross * feePercent) / 100);
	const netValue = roundMoney(Math.max(gross - feeValue, 0));

	return {
		...payload,
		payment_method_id: paymentMethodId,
		forma_pagamento_id: paymentMethodId,
		payment_fee_percent: feePercent,
		payment_fee_value: feeValue,
		net_value: netValue,
		payment_date:
			payload.payment_date || fallbackAppointment?.payment_date || todayInSaoPaulo(),
	};
}

async function assertClientAccess(clientId, user, targetBarberId) {
	if (!clientId) return null;
	const client = await ClientsRepository.findFixedClientById(clientId, {
		barbeariaId: user.barbearia_id,
		barbeiroId: user.role === "admin" ? null : user.barbeiro_id,
	});
	if (!client) {
		throw new AppError(404, "CLIENT_NOT_FOUND", "Cliente fixo nao encontrado.");
	}
	if (client.barbeiro_id && client.barbeiro_id !== targetBarberId) {
		throw new AppError(
			409,
			"CLIENT_BARBER_MISMATCH",
			"O cliente fixo pertence a outro barbeiro.",
		);
	}
	return client;
}

async function assertNoScheduleConflict({
	id,
	barbeariaId,
	barbeiroId,
	date,
	time,
}) {
	if (!barbeiroId || !date || !time) return;
	if (typeof AppointmentsRepository.findConflict !== "function") return;
	const conflict = await AppointmentsRepository.findConflict({
		barbeariaId,
		barbeiroId,
		date,
		time,
		excludeId: id,
	});
	if (conflict) {
		throw new AppError(
			409,
			"APPOINTMENT_CONFLICT",
			"Este barbeiro ja possui um agendamento nesse horario.",
		);
	}
}

async function syncReceivable(appointment, userId) {
	if (appointment.status === "fiado") {
		await ReceivablesRepository.upsertFromAppointment(appointment, { userId });
		return;
	}
	if (appointment.status === "paid") {
		await ReceivablesRepository.updateByAppointment(appointment.id, {
			status: "pago",
			payment_method_id: appointment.payment_method_id,
			payment_fee_percent: appointment.payment_fee_percent,
			payment_fee_value: appointment.payment_fee_value,
			net_value: appointment.net_value,
			payment_date: appointment.payment_date || todayInSaoPaulo(),
		});
		return;
	}
	await ReceivablesRepository.updateByAppointment(appointment.id, {
		status: "cancelado",
	});
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
	await assertClientAccess(payload.cliente_id, user, barbeiroId);
	await assertNoScheduleConflict({
		barbeariaId: user.barbearia_id,
		barbeiroId,
		date: payload.data || payload.day_key,
		time: payload.hora || payload.time_slot,
	});
	const payloadWithPayment = await withPaymentSnapshot(payload);
	const appointment = await AppointmentsRepository.create(
		{ ...payloadWithPayment, barbeiro_id: barbeiroId },
		{ barbeariaId: user.barbearia_id, barbeiroId },
	);
	if (appointment.status === "fiado") {
		await syncReceivable(appointment, user.id);
	}
	return appointment;
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

	payload = await withPaymentSnapshot(payload, existing);
	const targetBarberId = payload.barbeiro_id || existing.barbeiro_id;
	await assertClientAccess(payload.cliente_id ?? existing.cliente_id, user, targetBarberId);
	await assertNoScheduleConflict({
		id,
		barbeariaId: user.barbearia_id,
		barbeiroId: targetBarberId,
		date: payload.data || payload.day_key || existing.day_key,
		time: payload.hora || payload.time_slot || existing.time_slot,
	});

	const appointment = await AppointmentsRepository.update(id, payload, {
		barbeariaId: user.barbearia_id,
	});
	await syncReceivable(appointment, user.id);
	return appointment;
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
