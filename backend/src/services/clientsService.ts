const ClientsRepository = require("../repositories/clientsRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const AppointmentsService = require("./appointmentsService");
const AuditService = require("./auditService");
import { AppError } from "../lib/errors";

function getBarbeariaContext(user: any, requestedBarberId?: string) {
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

async function getWriteContext(user: any, requestedBarberId?: string) {
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

async function ensureClient(clientId: string, context: any) {
	const client = await ClientsRepository.findFixedClientById(clientId, context);
	if (!client) throw new AppError(404, "NOT_FOUND", "Cliente nao encontrado.");
	return client;
}

async function ensureClientCut(clientId: string, cutId: string, context: any) {
	const cut = await ClientsRepository.findClientCutById(clientId, cutId, context);
	if (!cut) throw new AppError(404, "NOT_FOUND", "Corte nao encontrado.");
	return cut;
}

async function ensureWaitlistEntry(id: string, context: any) {
	const entry = await ClientsRepository.findWaitlistEntryById(id, context);
	if (!entry) {
		throw new AppError(404, "NOT_FOUND", "Cliente da espera nao encontrado.");
	}
	return entry;
}

export async function listFixedClients(user: any, query: Record<string, any> = {}) {
	return ClientsRepository.findFixedClients(
		getBarbeariaContext(user, query.barbeiro_id),
	);
}

function todayInSaoPaulo(): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

export async function createFixedClient(payload: Record<string, any>, user: any) {
	const context = await getWriteContext(user, payload.barbeiro_id);
	const client = await ClientsRepository.createFixedClient(payload, context);

	await AuditService.logResourceChange({
		action: "CLIENT_CREATED",
		resourceType: "client",
		resourceId: client.id,
		user,
		newValues: { name: client.name, phone: client.phone },
	});

	const startDate = payload.start_date || payload.first_cut_date || todayInSaoPaulo();
	const preferredTime = payload.preferred_time || payload.time || "17:30";

	try {
		await AppointmentsService.createAppointment(
			{
				client_name: client.name,
				cliente_id: client.id,
				barbeiro_id: context.barbeiroId,
				day_key: startDate,
				time_slot: preferredTime,
				status: "normal",
				observacoes: `[horario_fixo:${preferredTime}] Cliente Fixo`,
			},
			user,
		);
	} catch (_err) {
		// Non-fatal if schedule conflict; client creation completes
	}

	return client;
}

export async function updateFixedClient(id: string, payload: Record<string, any>, user: any) {
	const context = getBarbeariaContext(user);
	const existing = await ensureClient(id, context);
	let updates = payload;
	if (payload.barbeiro_id) {
		const writeContext = await getWriteContext(user, payload.barbeiro_id);
		updates = { ...payload, barbeiro_id: writeContext.barbeiroId };
	}
	const updated = await ClientsRepository.updateFixedClient(id, updates, context);

	await AuditService.logResourceChange({
		action: "CLIENT_UPDATED",
		resourceType: "client",
		resourceId: id,
		user,
		oldValues: { name: existing.name, phone: existing.phone },
		newValues: { name: updated.name, phone: updated.phone },
	});

	return updated;
}

export async function deleteFixedClient(id: string, user: any) {
	const context = getBarbeariaContext(user);
	const existing = await ensureClient(id, context);
	await ClientsRepository.removeFixedClient(id, context);

	await AuditService.logResourceChange({
		action: "CLIENT_DELETED",
		resourceType: "client",
		resourceId: id,
		user,
		oldValues: { name: existing.name, phone: existing.phone },
	});

	return true;
}

export async function createClientCut(clientId: string, payload: Record<string, any>, user: any) {
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
}

export async function updateClientCut(clientId: string, cutId: string, payload: Record<string, any>, user: any) {
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
}

export async function deleteClientCut(clientId: string, cutId: string, user: any) {
	const context = getBarbeariaContext(user);
	await ensureClient(clientId, context);
	const cut = await ensureClientCut(clientId, cutId, context);
	if (cut.agendamento_id) {
		await AppointmentsService.deleteAppointment(cut.agendamento_id, user);
	}
	await ClientsRepository.removeClientCut(clientId, cutId, context);
	return ClientsRepository.findFixedClientById(clientId, context);
}

export async function listWaitlist(user: any, query: Record<string, any> = {}) {
	return ClientsRepository.findWaitlist(
		getBarbeariaContext(user, query.barbeiro_id),
	);
}

export async function createWaitlistEntry(payload: Record<string, any>, user: any) {
	const context = await getWriteContext(user, payload.barbeiro_id);
	return ClientsRepository.createWaitlistEntry(payload, context);
}

export async function updateWaitlistEntry(id: string, payload: Record<string, any>, user: any) {
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
}

export async function deleteWaitlistEntry(id: string, user: any) {
	const context = getBarbeariaContext(user);
	await ensureWaitlistEntry(id, context);
	await ClientsRepository.removeWaitlistEntry(id, context);
	return true;
}

module.exports = {
	listFixedClients,
	createFixedClient,
	updateFixedClient,
	deleteFixedClient,
	createClientCut,
	updateClientCut,
	deleteClientCut,
	listWaitlist,
	createWaitlistEntry,
	updateWaitlistEntry,
	deleteWaitlistEntry,
};
