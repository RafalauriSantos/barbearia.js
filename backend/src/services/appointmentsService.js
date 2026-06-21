const AppointmentsRepository = require("../repositories/appointmentsRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const PaymentMethodsRepository = require("../repositories/paymentMethodsRepository");
const ClientsRepository = require("../repositories/clientsRepository");
const ServicesRepository = require("../repositories/servicesRepository");
const ProductsRepository = require("../repositories/productsRepository");
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

async function withPaymentSnapshot(
	payload,
	fallbackAppointment = null,
	barbeariaId,
) {
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
		const paymentMethod = await PaymentMethodsRepository.findById(
			paymentMethodId,
			{ barbeariaId },
		);
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
			payload.payment_date ||
			fallbackAppointment?.payment_date ||
			(fallbackAppointment ?
				todayInSaoPaulo()
			: 	payload.day_key || payload.data || todayInSaoPaulo()),
	};
}

async function resolveCatalogItems(items, repository, barbeariaId, type) {
	return Promise.all(
		(Array.isArray(items) ? items : []).map(async (item) => {
			const catalogItem = await repository.findById(item.id, { barbeariaId });
			if (!catalogItem || catalogItem.active === false) {
				throw new AppError(
					400,
					"CATALOG_ITEM_INVALID",
					`${type} nao pertence a esta barbearia ou esta inativo.`,
				);
			}

			if (type === "Servico") {
				return {
					id: catalogItem.id,
					name: catalogItem.name,
					price: Number(catalogItem.price || 0),
					quantity: Number(item.quantity || 1),
				};
			}

			return {
				id: catalogItem.id,
				name: catalogItem.name,
				price: Number(catalogItem.price || 0),
				quantity: Number(item.quantity || 1),
				purchase_type: catalogItem.purchase_type || "avista",
				cost_price: Number(catalogItem.cost_price || 0),
				supplier_name: catalogItem.supplier_name || "",
				seller_commission_percent: Number(
					catalogItem.seller_commission_percent || 0,
				),
			};
		}),
	);
}

async function withCanonicalCatalog(payload, barbeariaId, existing = null) {
	const servicesProvided =
		Array.isArray(payload.services) || payload.service_id !== undefined;
	const productsProvided = Array.isArray(payload.products);
	if (!servicesProvided && !productsProvided) return payload;

	let requestedServices = payload.services;
	if (!Array.isArray(requestedServices) && payload.service_id) {
		requestedServices = [{ id: payload.service_id, quantity: 1 }];
	}

	const services =
		servicesProvided ?
			await resolveCatalogItems(
				requestedServices || [],
				ServicesRepository,
				barbeariaId,
				"Servico",
			)
		: 	existing?.services || [];
	const products =
		productsProvided ?
			await resolveCatalogItems(
				payload.products,
				ProductsRepository,
				barbeariaId,
				"Produto",
			)
		: 	existing?.products || [];

	return {
		...payload,
		services,
		products,
		value: undefined,
		...(services.length === 1 ?
			{
				service_id: services[0].id,
				service_name: services[0].name,
			}
		: 	{}),
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
	const canonicalPayload = await withCanonicalCatalog(
		payload,
		user.barbearia_id,
	);
	await assertClientAccess(canonicalPayload.cliente_id, user, barbeiroId);
	await assertNoScheduleConflict({
		barbeariaId: user.barbearia_id,
		barbeiroId,
		date: canonicalPayload.data || canonicalPayload.day_key,
		time: canonicalPayload.hora || canonicalPayload.time_slot,
	});
	const payloadWithPayment = await withPaymentSnapshot(
		canonicalPayload,
		null,
		user.barbearia_id,
	);
	const appointment = await AppointmentsRepository.create(
		{ ...payloadWithPayment, barbeiro_id: barbeiroId },
		{ barbeariaId: user.barbearia_id, barbeiroId, userId: user.id },
	);
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

	payload = await withCanonicalCatalog(payload, user.barbearia_id, existing);
	payload = await withPaymentSnapshot(payload, existing, user.barbearia_id);
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
		userId: user.id,
	});
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
		userId: user.id,
	});
	return true;
};
