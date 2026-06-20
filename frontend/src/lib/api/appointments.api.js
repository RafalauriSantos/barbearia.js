import { apiClient } from "./client";

function addIfDefined(target, key, value) {
	if (value !== undefined) {
		target[key] = value;
	}
}

function normalizeAppointment(raw) {
	const services = Array.isArray(raw.services) ? raw.services : [];
	const products = Array.isArray(raw.products) ? raw.products : [];
	const serviceNames = services.map((item) => item.name).filter(Boolean);
	const productNames = products.map((item) => item.name).filter(Boolean);
	const summaryName = [...serviceNames, ...productNames].join(", ");
	return {
		id: raw.id,
		client_name: raw.client_name || raw.cliente_nome || "",
		day_key: raw.day_key || raw.data || "",
		time_slot: raw.time_slot || raw.hora || "09:00",
		value: Number(raw.value || 0),
		status: raw.status || "normal",
		service_id: raw.service_id,
		service_name: raw.service_name || summaryName,
		prazo_date: raw.prazo_date,
		barber_name: raw.barber_name,
		barbearia_id: raw.barbearia_id,
		barbeiro_id: raw.barbeiro_id,
		cliente_id: raw.cliente_id || null,
		forma_pagamento_id: raw.forma_pagamento_id || raw.payment_method_id,
		payment_method_id: raw.payment_method_id || raw.forma_pagamento_id,
		payment_method_code: raw.payment_method_code || raw.forma_pagamento,
		payment_method_name: raw.payment_method_name || "",
		payment_date: raw.payment_date || null,
		payment_fee_percent: Number(raw.payment_fee_percent || 0),
		payment_fee_value: Number(raw.payment_fee_value || 0),
		net_value: Number(raw.net_value ?? raw.value ?? 0),
		services,
		products,
	};
}

function toApiPayload(appt) {
	const payload = {};

	addIfDefined(payload, "cliente_nome", appt.client_name);
	addIfDefined(payload, "data", appt.day_key);
	addIfDefined(payload, "hora", appt.time_slot);
	addIfDefined(payload, "client_name", appt.client_name);
	addIfDefined(payload, "day_key", appt.day_key);
	addIfDefined(payload, "time_slot", appt.time_slot);
	addIfDefined(payload, "value", appt.value);
	addIfDefined(payload, "status", appt.status);
	addIfDefined(payload, "service_id", appt.service_id);
	addIfDefined(payload, "service_name", appt.service_name);
	addIfDefined(payload, "services", appt.services);
	addIfDefined(payload, "products", appt.products);
	addIfDefined(payload, "prazo_date", appt.prazo_date);
	addIfDefined(payload, "barber_name", appt.barber_name);
	addIfDefined(payload, "barbeiro_id", appt.barbeiro_id);
	addIfDefined(payload, "cliente_id", appt.cliente_id);
	addIfDefined(payload, "forma_pagamento_id", appt.forma_pagamento_id);
	addIfDefined(payload, "payment_method_id", appt.payment_method_id);
	addIfDefined(payload, "payment_date", appt.payment_date);

	return payload;
}

export async function listAppointmentsByDay(dayKey, filters = {}) {
	const params = { data: dayKey };
	if (filters.barbeiro_id) {
		params.barbeiro_id = filters.barbeiro_id;
	}

	const response = await apiClient.get("/agendamentos", {
		params,
	});

	return response.data
		.map(normalizeAppointment)
		.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
}

export async function createAppointment(appt) {
	const response = await apiClient.post("/agendamentos", toApiPayload(appt));
	return normalizeAppointment(response.data);
}

export async function updateAppointmentById(id, updates) {
	const response = await apiClient.patch(
		`/agendamentos/${id}`,
		toApiPayload(updates),
	);
	return normalizeAppointment(response.data);
}

export async function deleteAppointmentById(id) {
	await apiClient.delete(`/agendamentos/${id}`);
}
