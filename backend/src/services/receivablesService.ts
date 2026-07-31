const ReceivablesRepository = require("../repositories/receivablesRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const PaymentMethodsRepository = require("../repositories/paymentMethodsRepository");
const ClientsRepository = require("../repositories/clientsRepository");
const AppointmentsService = require("./appointmentsService");
const AuditService = require("./auditService");
import { AppError } from "../lib/errors";

function todayInSaoPaulo(): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function roundMoney(value: any): number {
	return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getReadContext(user: any, requestedBarberId?: string) {
	if (!user?.barbearia_id) {
		throw new AppError(403, "BARBEARIA_CONTEXT_REQUIRED", "Usuario sem barbearia vinculada.");
	}
	if (user.role !== "admin" && !user.barbeiro_id) {
		throw new AppError(403, "BARBER_CONTEXT_REQUIRED", "Usuario sem barbeiro vinculado.");
	}
	return {
		barbeariaId: user.barbearia_id,
		barbeiroId: user.role === "admin" ? requestedBarberId || null : user.barbeiro_id,
	};
}

async function resolveWriteBarber(user: any, requestedBarberId?: string) {
	const context = getReadContext(user);
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

async function ensureReceivable(id: string, user: any) {
	const context = getReadContext(user);
	const receivable = await ReceivablesRepository.findById(id, context);
	if (!receivable) {
		throw new AppError(404, "RECEIVABLE_NOT_FOUND", "Cobranca nao encontrada.");
	}
	return { receivable, context };
}

export async function list(query: Record<string, any> = {}, user: any) {
	const context = getReadContext(user, query.barbeiro_id);
	return ReceivablesRepository.findAll({
		...context,
		status: query.status || "aberto",
		startDate: query.start_date,
		endDate: query.end_date,
		search: query.search,
	});
}

function assertAdminWrite(user: any) {
	if (user?.role !== "admin") {
		throw new AppError(
			403,
			"RECEIVABLES_FORBIDDEN",
			"Apenas administradores podem gerenciar cobrancas.",
		);
	}
}

export async function create(payload: Record<string, any>, user: any) {
	assertAdminWrite(user);
	const context = await resolveWriteBarber(user, payload.barbeiro_id);
	if (payload.cliente_id) {
		const client = await ClientsRepository.findFixedClientById(payload.cliente_id, {
			barbeariaId: context.barbeariaId,
			barbeiroId: user.role === "admin" ? null : context.barbeiroId,
		});
		if (!client || (client.barbeiro_id && client.barbeiro_id !== context.barbeiroId)) {
			throw new AppError(404, "CLIENT_NOT_FOUND", "Cliente fixo nao encontrado.");
		}
	}
	return ReceivablesRepository.createManual(payload, {
		...context,
		userId: user.id,
	});
}

export async function update(id: string, payload: Record<string, any>, user: any) {
	assertAdminWrite(user);
	const { receivable, context } = await ensureReceivable(id, user);
	if (receivable.status !== "aberto") {
		throw new AppError(409, "RECEIVABLE_CLOSED", "Apenas cobrancas abertas podem ser editadas.");
	}
	if (receivable.agendamento_id) {
		throw new AppError(
			409,
			"APPOINTMENT_RECEIVABLE",
			"Edite os dados desta cobranca diretamente no agendamento.",
		);
	}
	let updates = payload;
	if (payload.barbeiro_id) {
		const writeContext = await resolveWriteBarber(user, payload.barbeiro_id);
		updates = { ...payload, barbeiro_id: writeContext.barbeiroId };
	}
	return ReceivablesRepository.update(id, updates, context);
}

export async function receive(id: string, payload: Record<string, any>, user: any) {
	assertAdminWrite(user);
	const { receivable, context } = await ensureReceivable(id, user);
	if (receivable.status === "pago") return receivable;
	if (receivable.status !== "aberto") {
		throw new AppError(409, "RECEIVABLE_CLOSED", "Esta cobranca nao esta aberta.");
	}

	const method = await PaymentMethodsRepository.findById(payload.payment_method_id, {
		barbeariaId: context.barbeariaId,
	});
	if (!method || !method.active || method.code === "fiado") {
		throw new AppError(400, "PAYMENT_METHOD_INVALID", "Forma de pagamento invalida.");
	}
	const paymentDate = payload.payment_date || todayInSaoPaulo();

	let updatedResult: any;
	if (receivable.agendamento_id) {
		await AppointmentsService.updateAppointment(
			receivable.agendamento_id,
			{
				status: "paid",
				payment_method_id: method.id,
				payment_date: paymentDate,
			},
			user,
		);
		updatedResult = await ReceivablesRepository.findById(id, context);
	} else {
		const feePercent = Number(method.fee_percent || 0);
		const feeValue = roundMoney((receivable.value * feePercent) / 100);
		updatedResult = await ReceivablesRepository.update(
			id,
			{
				status: "pago",
				payment_method_id: method.id,
				payment_fee_percent: feePercent,
				payment_fee_value: feeValue,
				net_value: roundMoney(receivable.value - feeValue),
				payment_date: paymentDate,
			},
			context,
		);
	}

	await AuditService.logResourceChange({
		action: "RECEIVABLE_RECEIVED",
		resourceType: "receivable",
		resourceId: id,
		user,
		oldValues: { status: receivable.status },
		newValues: { status: "pago", payment_method_id: method.id, payment_date: paymentDate },
	});

	return updatedResult;
}

export async function cancel(id: string, user: any) {
	assertAdminWrite(user);
	const { receivable, context } = await ensureReceivable(id, user);
	if (receivable.agendamento_id) {
		throw new AppError(
			409,
			"APPOINTMENT_RECEIVABLE",
			"Edite o pagamento diretamente no agendamento.",
		);
	}
	if (receivable.status === "pago") {
		throw new AppError(409, "RECEIVABLE_PAID", "Cobranca paga nao pode ser cancelada.");
	}
	return ReceivablesRepository.update(id, { status: "cancelado" }, context);
}

module.exports = {
	list,
	create,
	update,
	receive,
	cancel,
};
export default module.exports;
