import { apiClient } from "./client";

function addIfDefined(target, key, value) {
	if (value !== undefined) {
		target[key] = value;
	}
}

function normalizeAppointment(raw) {
	return {
		id: raw.id,
		client_name: raw.client_name || raw.cliente_nome || "",
		day_key: raw.day_key || raw.data || "",
		time_slot: raw.time_slot || raw.hora || "09:00",
		value: Number(raw.value || 0),
		status: raw.status || "normal",
		service_id: raw.service_id,
		service_name: raw.service_name,
		prazo_date: raw.prazo_date,
		barber_name: raw.barber_name,
		barbearia_id: raw.barbearia_id || 1,
	};
}

function toApiPayload(appt, options = { includeDefaults: false }) {
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
	addIfDefined(payload, "prazo_date", appt.prazo_date);
	addIfDefined(payload, "barber_name", appt.barber_name);

	if (appt.barbearia_id !== undefined) {
		payload.barbearia_id = appt.barbearia_id;
	} else if (options.includeDefaults) {
		payload.barbearia_id = 1;
	}

	return payload;
}

export async function listAppointmentsByDay(dayKey) {
	const response = await apiClient.get("/agendamentos", {
		params: { data: dayKey },
	});

	return response.data
		.map(normalizeAppointment)
		.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
}

export async function createAppointment(appt) {
	const response = await apiClient.post(
		"/agendamentos",
		toApiPayload(appt, { includeDefaults: true }),
	);
	return normalizeAppointment(response.data);
}

export async function updateAppointmentById(id, updates) {
	const response = await apiClient.put(
		`/agendamentos/${id}`,
		toApiPayload(updates),
	);
	return normalizeAppointment(response.data);
}

export async function deleteAppointmentById(id) {
	await apiClient.delete(`/agendamentos/${id}`);
}
