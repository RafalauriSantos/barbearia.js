const ClientsRepository = require("../repositories/clientsRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const AppointmentsService = require("./appointmentsService");
const { AppError } = require("../lib/errors");

function getBarbeariaContext(user, requestedBarberId) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
	if (user.role !== "admin" && !user.barbeiro_id) {
		throw new AppError(
			403,
			"BARBER_CONTEXT_REQUIRED",
			"Usuario sem barbeiro vinculado.",
		);
	}
	return {
		barbeariaId: user.barbearia_id,
		barbeiroId: user.role === "admin" ? requestedBarberId || null : user.barbeiro_id,
	};
}

async function getWriteContext(user, requestedBarberId) {
	const context = getBarbeariaContext(user);
	const barbeiroId =
		user.role === "admin" ? requestedBarberId || user.barbeiro_id : user.barbeiro_id;
	if (!barbeiroId) {
		throw new AppError(400, "BARBER_REQUIRED", "Informe o barbeiro responsavel.");
	}
	const barber = await BarbersRepository.findByIdInBarbearia(
		barbeiroId,
		context.barbeariaId,
	);
	if (!barber) {
		throw new AppError(403, "BARBER_FORBIDDEN", "Barbeiro nao pertence a esta barbearia.");
	}
	return { ...context, barbeiroId };
}

async function ensureClient(clientId, context) {
	const client = await ClientsRepository.findFixedClientById(clientId, context);
	if (!client) throw new AppError(404, "NOT_FOUND", "Cliente nao encontrado.");
	return client;
}

async function ensureClientCut(clientId, cutId, context) {
	const cut = await ClientsRepository.findClientCutById(clientId, cutId, context);
	if (!cut) throw new AppError(404, "NOT_FOUND", "Corte nao encontrado.");
	return cut;
}

async function ensureWaitlistEntry(id, context) {
	const entry = await ClientsRepository.findWaitlistEntryById(id, context);
	if (!entry) {
		throw new AppError(404, "NOT_FOUND", "Cliente da espera nao encontrado.");
	}
	return entry;
}

exports.listFixedClients = async function (user, query = {}) {
	return ClientsRepository.findFixedClients(
		getBarbeariaContext(user, query.barbeiro_id),
	);
};

exports.createFixedClient = async function (payload, user) {
	const context = await getWriteContext(user, payload.barbeiro_id);
	return ClientsRepository.createFixedClient(payload, context);
};

exports.updateFixedClient = async function (id, payload, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(id, context);
	let updates = payload;
	if (payload.barbeiro_id) {
		const writeContext = await getWriteContext(user, payload.barbeiro_id);
		updates = { ...payload, barbeiro_id: writeContext.barbeiroId };
	}
	return ClientsRepository.updateFixedClient(id, updates, context);
};

exports.deleteFixedClient = async function (id, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(id, context);
	await ClientsRepository.removeFixedClient(id, context);
	return true;
};

exports.createClientCut = async function (clientId, payload, user) {
	const context = getBarbeariaContext(user);
	const client = await ensureClient(clientId, context);
	const status = payload.status || (payload.paid ? "paid" : "normal");
	const appointment = await AppointmentsService.createAppointment(
		{
			client_name: client.name,
			cliente_id: client.id,
			barbeiro_id: client.barbeiro_id,
			day_key: payload.date,
			time_slot: payload.time || "09:00",
			value: Number(payload.value || 0),
			status,
			payment_method_id: payload.payment_method_id || undefined,
			payment_date: status === "paid" ? payload.payment_date || payload.date : null,
			prazo_date: status === "fiado" ? payload.due_date || null : null,
			observacoes: payload.notes || null,
		},
		user,
	);
	try {
		await ClientsRepository.createClientCut(
			clientId,
			{
				...payload,
				paid: status === "paid",
				agendamento_id: appointment.id,
			},
			context,
		);
	} catch (error) {
		await AppointmentsService.deleteAppointment(appointment.id, user).catch(() => null);
		throw error;
	}
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.updateClientCut = async function (clientId, cutId, payload, user) {
	const context = getBarbeariaContext(user);
	const client = await ensureClient(clientId, context);
	const cut = await ensureClientCut(clientId, cutId, context);
	const status =
		payload.status ||
		(payload.paid === true ? "paid" : payload.paid === false ? "normal" : undefined);
	let appointmentId = cut.agendamento_id;
	const appointmentPayload = {
		...(payload.date !== undefined ? { day_key: payload.date } : {}),
		...(payload.time !== undefined ? { time_slot: payload.time } : {}),
		...(payload.value !== undefined ? { value: Number(payload.value || 0) } : {}),
		...(status !== undefined ? { status } : {}),
		...(payload.payment_method_id !== undefined ?
			{ payment_method_id: payload.payment_method_id }
		: 	{}),
		...(payload.payment_date !== undefined ? { payment_date: payload.payment_date } : {}),
		...(payload.due_date !== undefined ? { prazo_date: payload.due_date } : {}),
		...(payload.notes !== undefined ? { observacoes: payload.notes } : {}),
	};
	if (appointmentId) {
		await AppointmentsService.updateAppointment(appointmentId, appointmentPayload, user);
	} else {
		const appointment = await AppointmentsService.createAppointment(
			{
				client_name: client.name,
				cliente_id: client.id,
				barbeiro_id: client.barbeiro_id,
				day_key: payload.date || cut.date,
				time_slot: payload.time || cut.time || "09:00",
				value: payload.value ?? cut.value,
				status: status || (cut.paid ? "paid" : "normal"),
				payment_method_id: payload.payment_method_id || undefined,
				payment_date: payload.payment_date || payload.date || cut.date,
				prazo_date: payload.due_date || null,
				observacoes: payload.notes ?? cut.notes,
			},
			user,
		);
		appointmentId = appointment.id;
	}
	await ClientsRepository.updateClientCut(
		clientId,
		cutId,
		{
			...payload,
			...(status !== undefined ? { paid: status === "paid" } : {}),
			agendamento_id: appointmentId,
		},
		context,
	);
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.deleteClientCut = async function (clientId, cutId, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(clientId, context);
	const cut = await ensureClientCut(clientId, cutId, context);
	if (cut.agendamento_id) {
		await AppointmentsService.deleteAppointment(cut.agendamento_id, user);
	}
	await ClientsRepository.removeClientCut(clientId, cutId, context);
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.listWaitlist = async function (user, query = {}) {
	return ClientsRepository.findWaitlist(
		getBarbeariaContext(user, query.barbeiro_id),
	);
};

exports.createWaitlistEntry = async function (payload, user) {
	const context = await getWriteContext(user, payload.barbeiro_id);
	return ClientsRepository.createWaitlistEntry(payload, context);
};

exports.updateWaitlistEntry = async function (id, payload, user) {
	const context = getBarbeariaContext(user);
	await ensureWaitlistEntry(id, context);
	let updates = payload;
	if (payload.barbeiro_id) {
		const writeContext = await getWriteContext(user, payload.barbeiro_id);
		updates = { ...payload, barbeiro_id: writeContext.barbeiroId };
	}
	return ClientsRepository.updateWaitlistEntry(
		id,
		updates,
		context,
	);
};

exports.deleteWaitlistEntry = async function (id, user) {
	const context = getBarbeariaContext(user);
	await ensureWaitlistEntry(id, context);
	await ClientsRepository.removeWaitlistEntry(id, context);
	return true;
};
