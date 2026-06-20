const ReceivablesRepository = require("../repositories/receivablesRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const PaymentMethodsRepository = require("../repositories/paymentMethodsRepository");
const ClientsRepository = require("../repositories/clientsRepository");
const AppointmentsService = require("./appointmentsService");
const { AppError } = require("../lib/errors");

function todayInSaoPaulo() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function roundMoney(value) {
	return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getReadContext(user, requestedBarberId) {
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

async function resolveWriteBarber(user, requestedBarberId) {
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

async function ensureReceivable(id, user) {
	const context = getReadContext(user);
	const receivable = await ReceivablesRepository.findById(id, context);
	if (!receivable) {
		throw new AppError(404, "RECEIVABLE_NOT_FOUND", "Cobranca nao encontrada.");
	}
	return { receivable, context };
}

exports.list = async function (query, user) {
	const context = getReadContext(user, query.barbeiro_id);
	return ReceivablesRepository.findAll({
		...context,
		status: query.status || "aberto",
		startDate: query.start_date,
		endDate: query.end_date,
		search: query.search,
	});
};

exports.create = async function (payload, user) {
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
};

exports.update = async function (id, payload, user) {
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
};

exports.receive = async function (id, payload, user) {
	const { receivable, context } = await ensureReceivable(id, user);
	if (receivable.status === "pago") return receivable;
	if (receivable.status !== "aberto") {
		throw new AppError(409, "RECEIVABLE_CLOSED", "Esta cobranca nao esta aberta.");
	}

	const method = await PaymentMethodsRepository.findById(payload.payment_method_id);
	if (!method || !method.active || method.code === "fiado") {
		throw new AppError(400, "PAYMENT_METHOD_INVALID", "Forma de pagamento invalida.");
	}
	const paymentDate = payload.payment_date || todayInSaoPaulo();

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
		return ReceivablesRepository.findById(id, context);
	}

	const feePercent = Number(method.fee_percent || 0);
	const feeValue = roundMoney((receivable.value * feePercent) / 100);
	return ReceivablesRepository.update(
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
};

exports.cancel = async function (id, user) {
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
};
